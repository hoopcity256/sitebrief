import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getReport, updateReport, listPhotosForReport } from '../lib/reports'
import { saveDraft, loadDraft, clearDraft } from '../lib/draftRecovery'
import { uploadPhoto } from '../lib/photoUpload'
import { deletePhoto } from '../lib/photoDelete'
import { supabase } from '../lib/supabase'
import { ChevronLeftIcon, XIcon, CameraIcon } from '../components/icons'

// ── Types ──────────────────────────────────────────────────────────────────

interface PhotoSlot {
  photoId: string
  storagePath: string
  thumbnailUrl: string
  uploading?: boolean
  deleting?: boolean
  error?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format report date as "Mon, Sep 24, 2026" */
function formatReportDate(isoString: string | null): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Auto-grow: set height to auto first so it can shrink, then to scrollHeight */
function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// ── Spinner (inline, small) ─────────────────────────────────────────────────
const EditorSpinner = () => (
  <span
    style={{
      display: 'inline-block',
      width: 16,
      height: 16,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }}
    aria-hidden="true"
  />
)

// ── CreateReportPage ────────────────────────────────────────────────────────

export const CreateReportPage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()
  const reportId = searchParams.get('reportId')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [photos, setPhotos] = useState<PhotoSlot[]>([])
  const photoUrlsRef = useRef<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportNumber, setReportNumber] = useState<number | null>(null)
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null)

  const [workCompleted, setWorkCompleted] = useState('')
  const [problems, setProblems] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)
  const [recoveryBanner, setRecoveryBanner] = useState(false)
  const recoveredDraftRef = useRef<{ work_completed: string; problems: string; next_steps: string } | null>(null)

  const fieldsRef = useRef({ workCompleted: '', problems: '', nextSteps: '' })
  const nextOrderRef = useRef(0)

  // Revision counter for stale-save protection
  const revisionRef = useRef(0)

  // Refs to textareas for auto-grow re-trigger on load
  const workRef = useRef<HTMLTextAreaElement>(null)
  const problemsRef = useRef<HTMLTextAreaElement>(null)
  const nextStepsRef = useRef<HTMLTextAreaElement>(null)

  // ── Guard: redirect if no reportId ────────────────────────────────────
  useEffect(() => {
    if (!reportId) {
      navigate(`/projects/${projectId}`, { replace: true })
    }
  }, [reportId, projectId, navigate])

  // ── Load existing report ───────────────────────────────────────────────
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
      setReportCreatedAt(report.created_at)
      setWorkCompleted(report.work_completed ?? '')
      setProblems(report.problems ?? '')
      setNextSteps(report.next_steps ?? '')
      fieldsRef.current = {
        workCompleted: report.work_completed ?? '',
        problems: report.problems ?? '',
        nextSteps: report.next_steps ?? '',
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

  // Re-trigger auto-grow after initial load fills textareas
  useEffect(() => {
    if (!loading) {
      if (workRef.current) autoGrow(workRef.current)
      if (problemsRef.current) autoGrow(problemsRef.current)
      if (nextStepsRef.current) autoGrow(nextStepsRef.current)
    }
  }, [loading])

  // ── Autosave ───────────────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)
  const idbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleIdbSave = useCallback(() => {
    if (!reportId) return
    if (idbTimerRef.current) clearTimeout(idbTimerRef.current)
    idbTimerRef.current = setTimeout(() => {
      const { workCompleted: wc, problems: pr, nextSteps: ns } = fieldsRef.current
      saveDraft(reportId, {
        work_completed: wc,
        problems: pr,
        next_steps: ns,
        revision: revisionRef.current,
        savedAt: Date.now(),
      }).catch(() => { /* IDB save is best-effort */ })
    }, 500)
  }, [reportId])

  const flushSave = useCallback(async () => {
    if (!reportId || !dirtyRef.current) return
    const capturedRevision = revisionRef.current
    dirtyRef.current = false
    setSaving(true)

    const { workCompleted: wc, problems: pr, nextSteps: ns } = fieldsRef.current

    // Immediate IDB save
    try {
      await saveDraft(reportId, {
        work_completed: wc,
        problems: pr,
        next_steps: ns,
        revision: capturedRevision,
        savedAt: Date.now(),
      })
    } catch { /* best-effort */ }

    try {
      const result = await updateReport(reportId, {
        work_completed: wc,
        problems: pr,
        next_steps: ns,
      })
      // Only update lastSaved if revision hasn't advanced
      if (capturedRevision === revisionRef.current) {
        setLastSaved(new Date(result.updated_at).toLocaleTimeString())
        setSaveError(null)
        clearDraft(reportId).catch(() => {})
      }
    } catch {
      setSaveError('Not saved — check your connection')
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

  // Flush on visibility change / pagehide
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

  // ── Recovery handlers ──────────────────────────────────────────────────
  const handleRecoverDraft = () => {
    if (recoveredDraftRef.current) {
      const d = recoveredDraftRef.current
      setWorkCompleted(d.work_completed)
      setProblems(d.problems)
      setNextSteps(d.next_steps)
      fieldsRef.current = {
        workCompleted: d.work_completed,
        problems: d.problems,
        nextSteps: d.next_steps,
      }
      recoveredDraftRef.current = null
      // Re-trigger auto-grow after restoring content
      setTimeout(() => {
        if (workRef.current) autoGrow(workRef.current)
        if (problemsRef.current) autoGrow(problemsRef.current)
        if (nextStepsRef.current) autoGrow(nextStepsRef.current)
      }, 0)
    }
    setRecoveryBanner(false)
  }

  const handleDismissRecovery = () => {
    setRecoveryBanner(false)
    recoveredDraftRef.current = null
    if (reportId) clearDraft(reportId).catch(() => {})
  }

  // ── Photo handlers ─────────────────────────────────────────────────────

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
      // Failed upload slot — remove immediately
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
    const urlSet = photoUrlsRef.current
    return () => {
      urlSet.forEach(url => URL.revokeObjectURL(url))
      urlSet.clear()
    }
  }, [])

  // ── Finalization ───────────────────────────────────────────────────────
  const handleDone = async () => {
    if (!reportId || finishing) return
    setFinishing(true)
    setFinishError(null)
    try {
      const { workCompleted: wc, problems: pr, nextSteps: ns } = fieldsRef.current
      // Flush latest snapshot and mark final in a single server call
      await updateReport(reportId, {
        work_completed: wc,
        problems: pr,
        next_steps: ns,
        is_draft: false,
      })
      // Clear IndexedDB draft on confirmed finalization
      await clearDraft(reportId).catch(() => {})
      // Navigate to preview only after server confirmation
      navigate(`/preview/${reportId}`)
    } catch {
      setFinishError('Could not finalize report. Check your connection and try again.')
    } finally {
      setFinishing(false)
    }
  }

  if (!reportId) return null

  // ── Save status label / class ──────────────────────────────────────────
  const saveStatusClass = saving
    ? 'editor-save-status editor-save-status--saving'
    : saveError
      ? 'editor-save-status editor-save-status--error'
      : lastSaved
        ? 'editor-save-status editor-save-status--saved'
        : 'editor-save-status'

  const saveStatusText = saving
    ? 'Saving…'
    : saveError
      ? saveError
      : lastSaved
        ? `Saved ${lastSaved}`
        : ''

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="editor-page">
        <div className="editor-center" aria-label="Loading report" aria-busy="true">
          <div
            style={{
              width: 28, height: 28,
              border: '2.5px solid var(--color-border)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
            aria-hidden="true"
          />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
            Loading report…
          </p>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="editor-page">
        <div className="editor-center">
          <p className="editor-error-text">{error}</p>
          <button type="button" onClick={() => loadReport()} className="editor-retry-btn">
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="editor-back-link"
          >
            ← Back to Project
          </button>
        </div>
      </div>
    )
  }

  // ── Main editor ────────────────────────────────────────────────────────
  return (
    <div className="editor-page">

      {/* Sticky header */}
      <header className="editor-header">
        <button
          type="button"
          className="editor-header__back"
          onClick={() => { flushSave(); navigate(`/projects/${projectId}`) }}
          aria-label="Back to project"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div className="editor-header__title-block">
          <h1 className="editor-header__report-num">
            Report #{reportNumber}
          </h1>
          {reportCreatedAt && (
            <span className="editor-header__date">
              {formatReportDate(reportCreatedAt)}
            </span>
          )}
        </div>

        <div className={saveStatusClass} aria-live="polite" aria-atomic="true">
          {saveStatusText}
        </div>
      </header>

      {/* Recovery banner — no emoji */}
      {recoveryBanner && (
        <div className="editor-recovery" role="alert">
          <span className="editor-recovery__text">Unsaved draft recovered.</span>
          <div className="editor-recovery__actions">
            <button
              type="button"
              className="editor-recovery__restore"
              onClick={handleRecoverDraft}
            >
              Restore
            </button>
            <button
              type="button"
              className="editor-recovery__dismiss"
              onClick={handleDismissRecovery}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Editor body — divider-led sections, no card soup */}
      <div className="editor-body">

        {/* Work Completed */}
        <div className="editor-section">
          <label htmlFor="report-work-completed" className="editor-section__label">
            Work Completed
          </label>
          <textarea
            ref={workRef}
            id="report-work-completed"
            className="textarea-autogrow"
            value={workCompleted}
            placeholder="e.g. Framing, rough plumbing completed — crew of 4"
            onInput={(e) => autoGrow(e.currentTarget)}
            onChange={(e) => {
              setWorkCompleted(e.target.value)
              fieldsRef.current.workCompleted = e.target.value
              scheduleSave()
            }}
            onBlur={() => flushSave()}
          />
        </div>

        {/* Problems */}
        <div className="editor-section">
          <label htmlFor="report-problems" className="editor-section__label">
            Problems / Delays
          </label>
          <textarea
            ref={problemsRef}
            id="report-problems"
            className="textarea-autogrow"
            value={problems}
            placeholder="e.g. Material delivery delayed, weather hold"
            onInput={(e) => autoGrow(e.currentTarget)}
            onChange={(e) => {
              setProblems(e.target.value)
              fieldsRef.current.problems = e.target.value
              scheduleSave()
            }}
            onBlur={() => flushSave()}
          />
        </div>

        {/* Next Steps */}
        <div className="editor-section">
          <label htmlFor="report-next-steps" className="editor-section__label">
            Next Steps
          </label>
          <textarea
            ref={nextStepsRef}
            id="report-next-steps"
            className="textarea-autogrow"
            value={nextSteps}
            placeholder="e.g. Electrical rough-in Monday, inspector call Tuesday"
            onInput={(e) => autoGrow(e.currentTarget)}
            onChange={(e) => {
              setNextSteps(e.target.value)
              fieldsRef.current.nextSteps = e.target.value
              scheduleSave()
            }}
            onBlur={() => flushSave()}
          />
        </div>

        {/* Photos — last section, no border-bottom */}
        <div className="editor-section" style={{ borderBottom: 'none', marginBottom: 0 }}>
          <span className="editor-section__label">
            Photos ({photos.length}/10)
          </span>

          <div className="photo-grid" role="list" aria-label="Report photos">
            {photos.map((p, i) => (
              <div key={p.photoId} className="photo-slot" role="listitem">
                {p.uploading ? (
                  <div className="photo-slot--uploading" aria-label="Uploading photo">
                    <div
                      style={{
                        width: 24, height: 24,
                        border: '2.5px solid var(--color-border)',
                        borderTopColor: 'var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                      aria-hidden="true"
                    />
                  </div>
                ) : p.error ? (
                  <div className="photo-slot--error" role="alert">
                    {p.error}
                  </div>
                ) : (
                  <img
                    src={p.thumbnailUrl}
                    alt={`Site photo ${i + 1}`}
                    className="photo-slot__img"
                  />
                )}

                {/* Delete button: 44×44 transparent hit area, 28×28 visible circle inside */}
                <button
                  type="button"
                  className="photo-delete-btn"
                  onClick={() => handleDeletePhoto(i)}
                  disabled={p.deleting}
                  aria-label={`Delete photo ${i + 1}`}
                >
                  <span className="photo-delete-visual" aria-hidden="true">
                    <XIcon size={14} />
                  </span>
                </button>
              </div>
            ))}

            {/* Add Photo slot */}
            {photos.length < 10 && (
              <label className="photo-add-slot" aria-label="Add photo">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoSelect(e.target.files)}
                  style={{ display: 'none' }}
                />
                <CameraIcon size={24} />
                <span className="photo-add-slot__label">Add Photo</span>
              </label>
            )}
          </div>
        </div>

      </div>{/* /editor-body */}

      {/* Finalization error — sits just above the sticky action bar */}
      {finishError && (
        <div className="editor-finish-error" role="alert">
          <span>{finishError}</span>
          <button
            type="button"
            className="editor-finish-error__retry"
            onClick={handleDone}
            disabled={finishing}
          >
            Retry
          </button>
        </div>
      )}

      {/* Sticky bottom action bar */}
      <div className="editor-action-bar">
        <button
          id="report-done-btn"
          type="button"
          className="editor-finalize-btn"
          onClick={handleDone}
          disabled={finishing}
          aria-disabled={finishing}
        >
          {finishing ? (
            <>
              <EditorSpinner />
              <span>Finalizing…</span>
            </>
          ) : (
            <span>Mark as Final</span>
          )}
        </button>
      </div>

    </div>
  )
}
