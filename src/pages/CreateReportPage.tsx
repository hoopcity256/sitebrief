import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getReport, updateReport, listPhotosForReport } from '../lib/reports'
import { saveDraft, loadDraft, clearDraft } from '../lib/draftRecovery'
import { uploadPhoto } from '../lib/photoUpload'
import { deletePhoto } from '../lib/photoDelete'
import { supabase } from '../lib/supabase'

export const CreateReportPage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()
  const reportId = searchParams.get('reportId')
  const navigate = useNavigate()
  const { user } = useAuth()

  interface PhotoSlot {
    photoId: string
    storagePath: string
    thumbnailUrl: string
    uploading?: boolean
    deleting?: boolean
    error?: string
  }
  const [photos, setPhotos] = useState<PhotoSlot[]>([])
  const photoUrlsRef = useRef<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportNumber, setReportNumber] = useState<number | null>(null)

  const [workCompleted, setWorkCompleted] = useState('')
  const [problems, setProblems] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [recoveryBanner, setRecoveryBanner] = useState(false)
  const recoveredDraftRef = useRef<{ work_completed: string; problems: string; next_steps: string } | null>(null)

  const fieldsRef = useRef({ workCompleted: '', problems: '', nextSteps: '' })
  const nextOrderRef = useRef(0)

  // Revision counter for stale-save protection
  const revisionRef = useRef(0)

  // Redirect if no reportId in query string — never read from location.state
  useEffect(() => {
    if (!reportId) {
      navigate(`/projects/${projectId}`, { replace: true })
    }
  }, [reportId, projectId, navigate])

  // Load existing report
  const loadReport = useCallback(async () => {
    if (!reportId || !projectId) return
    setLoading(true)
    setError(null)
    try {
      const report = await getReport(reportId)
      // Verify ownership: report.project_id must match route param
      if (report.project_id !== projectId) {
        navigate('/projects', { replace: true })
        return
      }
      setReportNumber(report.report_number)
      setWorkCompleted(report.work_completed ?? '')
      setProblems(report.problems ?? '')
      setNextSteps(report.next_steps ?? '')
      fieldsRef.current = {
        workCompleted: report.work_completed ?? '',
        problems: report.problems ?? '',
        nextSteps: report.next_steps ?? ''
      }

      const existingPhotos = await listPhotosForReport(reportId)
      const hydratedPhotos: PhotoSlot[] = []
      for (const p of existingPhotos) {
        const { data } = await supabase.storage
          .from('report-photos')
          .createSignedUrl(p.storage_path, 3600)
        const url = data?.signedUrl ?? ''
        if (url) photoUrlsRef.current.add(url)
        hydratedPhotos.push({
          photoId: p.id,
          storagePath: p.storage_path,
          thumbnailUrl: url,
        })
      }
      setPhotos(hydratedPhotos)
      nextOrderRef.current = existingPhotos.length

      // Check IndexedDB for a recovered draft
      try {
        const draft = await loadDraft(reportId)
        if (draft && draft.savedAt > new Date(report.updated_at).getTime()) {
          recoveredDraftRef.current = {
            work_completed: draft.work_completed,
            problems: draft.problems,
            next_steps: draft.next_steps,
          }
          setRecoveryBanner(true)
        }
      } catch {
        // IndexedDB unavailable — proceed without recovery
      }
    } catch {
      setError('Could not load report.')
    } finally {
      setLoading(false)
    }
  }, [reportId, projectId, navigate])

  useEffect(() => { loadReport() }, [loadReport])

  // Debounced save to Supabase
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)

  // Save to IndexedDB (shorter debounce)
  const idbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleIdbSave = useCallback(() => {
    if (!reportId) return
    if (idbTimerRef.current) clearTimeout(idbTimerRef.current)
    idbTimerRef.current = setTimeout(() => {
      const { workCompleted, problems, nextSteps } = fieldsRef.current
      saveDraft(reportId, {
        work_completed: workCompleted,
        problems,
        next_steps: nextSteps,
        revision: revisionRef.current,
        savedAt: Date.now(),
      }).catch(() => { /* IndexedDB save is best-effort */ })
    }, 500)
  }, [reportId])

  const flushSave = useCallback(async () => {
    if (!reportId || !dirtyRef.current) return
    const capturedRevision = revisionRef.current
    dirtyRef.current = false
    setSaving(true)

    const { workCompleted, problems, nextSteps } = fieldsRef.current

    // Immediate IDB save
    try {
      await saveDraft(reportId, {
        work_completed: workCompleted,
        problems,
        next_steps: nextSteps,
        revision: capturedRevision,
        savedAt: Date.now(),
      })
    } catch { /* best-effort */ }

    try {
      const result = await updateReport(reportId, {
        work_completed: workCompleted,
        problems,
        next_steps: nextSteps,
      })
      // Only update lastSaved and clear IDB if revision hasn't advanced
      if (capturedRevision === revisionRef.current) {
        setLastSaved(new Date(result.updated_at).toLocaleTimeString())
        clearDraft(reportId).catch(() => {})
      }
    } catch {
      // Silent — autosave failure is non-blocking
    } finally {
      setSaving(false)
    }
  }, [reportId])

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    revisionRef.current += 1
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(flushSave, 800)
    scheduleIdbSave()
  }, [flushSave, scheduleIdbSave])

  // Flush on blur and visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave()
    }
    const handlePageHide = () => flushSave()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (idbTimerRef.current) clearTimeout(idbTimerRef.current)
    }
  }, [flushSave])

  // 30-second safety interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current) flushSave()
    }, 30_000)
    return () => clearInterval(interval)
  }, [flushSave])

  const handleRecoverDraft = () => {
    if (recoveredDraftRef.current) {
      setWorkCompleted(recoveredDraftRef.current.work_completed)
      setProblems(recoveredDraftRef.current.problems)
      setNextSteps(recoveredDraftRef.current.next_steps)
      fieldsRef.current = {
        workCompleted: recoveredDraftRef.current.work_completed,
        problems: recoveredDraftRef.current.problems,
        nextSteps: recoveredDraftRef.current.next_steps
      }
      recoveredDraftRef.current = null
    }
    setRecoveryBanner(false)
  }

  const handleDismissRecovery = () => {
    setRecoveryBanner(false)
    recoveredDraftRef.current = null
    if (reportId) clearDraft(reportId).catch(() => {})
  }

  // --- Photo handlers ---

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !reportId) return
    if (photos.length >= 10) return
    const file = files[0]
    const tempId = crypto.randomUUID()
    const tempSlot: PhotoSlot = { photoId: tempId, storagePath: '', thumbnailUrl: '', uploading: true }
    setPhotos(prev => [...prev, tempSlot])

    const order = nextOrderRef.current
    nextOrderRef.current += 1

    try {
      const result = await uploadPhoto(file, user.id, reportId, order)
      const thumbUrl = URL.createObjectURL(result.thumbnailBlob)
      photoUrlsRef.current.add(thumbUrl)
      setPhotos(prev => prev.map(p =>
        p.photoId === tempId
          ? { photoId: result.photoId, storagePath: result.storagePath, thumbnailUrl: thumbUrl }
          : p
      ))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setPhotos(prev => prev.map(p =>
        p.photoId === tempId
          ? { ...p, uploading: false, error: msg.length > 60 ? 'Photo could not be uploaded.' : msg }
          : p
      ))
    }
  }

  const handleDeletePhoto = async (index: number) => {
    const photo = photos[index]
    if (!photo || photo.uploading || photo.deleting) return

    if (!photo.storagePath) {
      // Failed upload or error slot - remove immediately
      if (photo.thumbnailUrl) {
        URL.revokeObjectURL(photo.thumbnailUrl)
        photoUrlsRef.current.delete(photo.thumbnailUrl)
      }
      setPhotos(prev => prev.filter((_, i) => i !== index))
      return
    }

    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, deleting: true } : p))

    try {
      await deletePhoto(photo.photoId, photo.storagePath)
      if (photo.thumbnailUrl) {
        URL.revokeObjectURL(photo.thumbnailUrl)
        photoUrlsRef.current.delete(photo.thumbnailUrl)
      }
      setPhotos(prev => prev.filter((_, i) => i !== index))
    } catch {
      setPhotos(prev => prev.map((p, i) => i === index ? { ...p, deleting: false, error: 'Could not delete photo.' } : p))
    }
  }

  // Cleanup all object URLs on unmount
  useEffect(() => {
    return () => {
      photoUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
      photoUrlsRef.current.clear()
    }
  }, [])

  const handleDone = async () => {
    if (!reportId || finishing) return
    setFinishing(true)
    try {
      const { workCompleted, problems, nextSteps } = fieldsRef.current
      // Flush latest draft
      await updateReport(reportId, {
        work_completed: workCompleted,
        problems,
        next_steps: nextSteps,
        is_draft: false,
      })
      // Clear IndexedDB draft on successful finalization
      await clearDraft(reportId).catch(() => {})
      navigate(`/preview/${reportId}`)
    } catch {
      setError('Could not finalize report. Please try again.')
    } finally {
      setFinishing(false)
    }
  }

  if (!reportId) return null

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading report…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={styles.errorText}>{error}</p>
          <button onClick={() => loadReport()} style={styles.retryButton}>Retry</button>
          <button onClick={() => navigate(`/projects/${projectId}`)} style={styles.backLink}>← Back to Project</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          onClick={() => { flushSave(); navigate(`/projects/${projectId}`) }}
          style={styles.backBtn}
          aria-label="Back to project"
        >
          ←
        </button>
        <h1 style={styles.heading}>
          Report #{reportNumber}
        </h1>
        <div style={styles.saveStatus}>
          {saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved}` : ''}
        </div>
      </header>

      {recoveryBanner && (
        <div style={styles.recoveryBanner}>
          <span>📝 Unsaved draft recovered.</span>
          <div style={styles.recoveryActions}>
            <button onClick={handleRecoverDraft} style={styles.recoveryRestore}>Restore</button>
            <button onClick={handleDismissRecovery} style={styles.recoveryDismiss}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={styles.editorBody}>
        <label style={styles.label}>
          Work Completed
          <textarea
            id="report-work-completed"
            value={workCompleted}
            onChange={(e) => { setWorkCompleted(e.target.value); fieldsRef.current.workCompleted = e.target.value; scheduleSave() }}
            onBlur={() => flushSave()}
            placeholder="Describe work completed today…"
            style={styles.textarea}
            rows={4}
          />
        </label>

        <label style={styles.label}>
          Problems
          <textarea
            id="report-problems"
            value={problems}
            onChange={(e) => { setProblems(e.target.value); fieldsRef.current.problems = e.target.value; scheduleSave() }}
            onBlur={() => flushSave()}
            placeholder="Any issues or blockers…"
            style={styles.textarea}
            rows={4}
          />
        </label>

        <label style={styles.label}>
          Next Steps
          <textarea
            id="report-next-steps"
            value={nextSteps}
            onChange={(e) => { setNextSteps(e.target.value); fieldsRef.current.nextSteps = e.target.value; scheduleSave() }}
            onBlur={() => flushSave()}
            placeholder="What happens next…"
            style={styles.textarea}
            rows={4}
          />
        </label>

        {/* Photo section */}
        <div style={styles.photoSection}>
          <h3 style={styles.photoHeading}>📷 Photos ({photos.length}/10)</h3>
          <div style={styles.photoGrid}>
            {photos.map((p, i) => (
              <div key={p.photoId} style={styles.photoSlot}>
                {p.uploading ? (
                  <div style={styles.photoUploading}><div style={styles.spinner} /></div>
                ) : p.error ? (
                  <div style={styles.photoError}>{p.error}</div>
                ) : (
                  <img src={p.thumbnailUrl} alt={`Photo ${i + 1}`} style={styles.photoThumb} />
                )}
                <button
                  onClick={() => handleDeletePhoto(i)}
                  disabled={p.deleting}
                  style={{...styles.photoDeleteBtn, opacity: p.deleting ? 0.5 : 1}}
                  aria-label={`Delete photo ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 10 && (
              <label style={styles.photoAddSlot}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoSelect(e.target.files)}
                  style={{ display: 'none' }}
                />
                <span style={styles.photoAddIcon}>+</span>
                <span style={styles.photoAddLabel}>Add Photo</span>
              </label>
            )}
          </div>
        </div>

        <button
          id="report-done-btn"
          onClick={handleDone}
          disabled={finishing}
          style={{ ...styles.doneBtn, opacity: finishing ? 0.6 : 1 }}
        >
          {finishing ? 'Finalizing…' : '✅ Done — Mark as Final'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' },
  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px' },
  spinner: { width: '32px', height: '32px', border: '3px solid #DEE2E6', borderTopColor: '#1A5276', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#6C757D', fontSize: '14px', margin: 0 },
  errorText: { color: '#DC3545', fontSize: '16px', margin: 0, textAlign: 'center' },
  retryButton: { minHeight: '48px', padding: '12px 32px', background: '#1A5276', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  backLink: { background: 'none', border: 'none', color: '#1A5276', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' },
  header: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))', background: '#FFFFFF', borderBottom: '1px solid #DEE2E6' },
  backBtn: { width: '40px', height: '40px', background: 'none', border: '1px solid #DEE2E6', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heading: { fontSize: '18px', fontWeight: 700, color: '#1A5276', margin: 0, flex: 1 },
  saveStatus: { fontSize: '12px', color: '#6C757D', flexShrink: 0 },
  editorBody: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, paddingBottom: 'max(24px, env(safe-area-inset-bottom))' },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', fontWeight: 600, color: '#495057' },
  textarea: { padding: '12px', borderRadius: '8px', border: '1px solid #DEE2E6', fontSize: '16px', fontFamily: 'inherit', resize: 'vertical' as const, outline: 'none', minHeight: '96px' },
  photoSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  photoHeading: { fontSize: '14px', fontWeight: 600, color: '#495057', margin: 0 },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' },
  photoSlot: { position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #DEE2E6', background: '#FFFFFF' },
  photoThumb: { width: '100%', height: '100%', objectFit: 'cover' },
  photoUploading: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F3F5' },
  photoError: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF3F3', color: '#DC3545', fontSize: '11px', padding: '4px', textAlign: 'center' },
  photoDeleteBtn: { position: 'absolute', top: '2px', right: '2px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#FFF', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  photoAddSlot: { aspectRatio: '1', borderRadius: '8px', border: '2px dashed #DEE2E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', background: '#F8F9FA' },
  photoAddIcon: { fontSize: '24px', color: '#6C757D' },
  photoAddLabel: { fontSize: '11px', color: '#6C757D' },
  doneBtn: { minHeight: '48px', background: '#198754', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' },
  recoveryBanner: { margin: '8px 16px 0', padding: '12px 16px', background: '#FFF8E1', border: '1px solid #FFCA28', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#795548', gap: '8px' },
  recoveryActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  recoveryRestore: { padding: '6px 14px', background: '#1A5276', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  recoveryDismiss: { padding: '6px 14px', background: 'none', color: '#6C757D', border: '1px solid #DEE2E6', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
}
