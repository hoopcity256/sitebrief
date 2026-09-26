/**
 * ReportPreviewPage
 *
 * PDF Generation Architecture (hardening pass 2):
 *
 * Both "Share PDF" and "Download PDF" are always visible.
 * They share the same generated Blob to avoid redundant generation.
 *
 * PDF generation is broken into explicit numbered stages with
 * console.log instrumentation so the EXACT failing stage is captured:
 *
 *   [pdf:1] load report
 *   [pdf:2] load company profile
 *   [pdf:3] load project
 *   [pdf:4] resolve report photos
 *   [pdf:5] create signed URLs
 *   [pdf:6] fetch each image (shows count)
 *   [pdf:7] convert each image to data URL (shows MIME)
 *   [pdf:8] construct ReportPdfData
 *   [pdf:9] render document to Blob (shows size/type)
 *   [pdf:10] validate Blob
 *   [pdf:11] share or download
 *
 * Only stage name, error type/message, counts, and Blob metadata are logged.
 * NO signed URLs, auth tokens, or image data are logged.
 *
 * State machine:
 *   idle           → buttons available
 *   generating     → spinner shown on active button; other button disabled
 *   blob-ready     → Blob in memory; if share fails, Download remains usable
 *   share-failed   → Share PDF shows error; Download PDF still works
 *   download-failed → Download PDF shows error
 *   generation-failed → both show error with retry
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReport, listPhotosForReport } from '../lib/reports'
import { getProject } from '../lib/projects'
import { getCompanyProfile } from '../lib/companyProfile'
import { canShareFiles, shareBlob, downloadBlob } from '../lib/share'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { AppShell } from '../components/AppShell'

// ── Types ──────────────────────────────────────────────────────────────────

interface ReportData {
  id: string
  project_id: string
  report_number: number
  is_draft: boolean
  work_completed: string | null
  problems: string | null
  next_steps: string | null
  created_at: string
  updated_at: string
}

interface PhotoData {
  id: string
  storage_path: string
  display_order: number
}

// ── PDF generation state ────────────────────────────────────────────────────

type PdfStatus =
  | 'idle'
  | 'generating'
  | 'generation-failed'
  | 'blob-ready'
  | 'share-failed'
  | 'download-failed'

// ── SVG Icons ──────────────────────────────────────────────────────────────

const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const IconShare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

// ── ReportPreviewPage ──────────────────────────────────────────────────────

export const ReportPreviewPage = () => {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [report, setReport] = useState<ReportData | null>(null)
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [projectName, setProjectName] = useState('')
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('SiteBrief')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // PDF state
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle')
  const [pdfError, setPdfError] = useState<string | null>(null)
  // Cached Blob — reused for Download when Share fails
  const [cachedBlob, setCachedBlob] = useState<{ blob: Blob; filename: string } | null>(null)

  const loadReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    try {
      const r = await getReport(reportId) as ReportData
      setReport(r)

      const [proj, photoList, company] = await Promise.all([
        getProject(r.project_id),
        listPhotosForReport(reportId),
        user ? getCompanyProfile(user.id) : Promise.resolve(null),
      ])

      setProjectName(proj.name)
      setCustomerName(proj.customer_name ?? null)
      setAddress(proj.address ?? null)
      if (company?.company_name) setCompanyName(company.company_name)

      setPhotos(photoList)

      const urls: Record<string, string> = {}
      await Promise.all(
        photoList.map(async (photo) => {
          const { data } = await supabase.storage
            .from('report-photos')
            .createSignedUrl(photo.storage_path, 3600)
          if (data?.signedUrl) urls[photo.id] = data.signedUrl
        })
      )
      setPhotoUrls(urls)
    } catch {
      setError('Could not load report.')
    } finally {
      setLoading(false)
    }
  }, [reportId, user])

  useEffect(() => { loadReport() }, [loadReport])

  // ── PDF generation pipeline ──────────────────────────────────────────────

  /**
   * Stage 7: Fetch a signed URL, convert to data URL.
   *
   * @react-pdf/renderer v4 uses a Web Worker which cannot resolve
   * Supabase signed URLs (CORS + CSP constraints in worker context).
   * Converting to data URL in the main thread avoids this entirely.
   *
   * Logs MIME type to detect HEIC/HEIF from iPhone uploads.
   * iPhone HEIC that was compressed through our pipeline should be JPEG
   * (compressImage always uses canvas.toBlob('image/jpeg')).
   */
  const fetchPhotoAsDataUrl = async (
    signedUrl: string,
    photoIndex: number,
  ): Promise<string | null> => {
    try {
      console.log(`[pdf:7] fetching photo ${photoIndex}`)
      const res = await fetch(signedUrl, { mode: 'cors' })
      if (!res.ok) {
        console.warn(`[pdf:7] photo ${photoIndex} fetch failed: HTTP ${res.status}`)
        return null
      }

      const blob = await res.blob()
      const mime = blob.type || 'unknown'
      const sizekb = Math.round(blob.size / 1024)
      console.log(`[pdf:7] photo ${photoIndex} fetched — MIME: ${mime}, size: ${sizekb} KB`)

      // HEIC/HEIF cannot be rendered by @react-pdf/renderer — skip them.
      // Our compressImage pipeline should have converted them to JPEG,
      // but verify here as a safety net.
      if (mime.includes('heic') || mime.includes('heif')) {
        console.warn(`[pdf:7] photo ${photoIndex} is HEIC/HEIF — skipping (not renderable in PDF)`)
        return null
      }

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => {
          console.warn(`[pdf:7] photo ${photoIndex} FileReader failed`)
          reject(new Error('FileReader failed'))
        }
        reader.readAsDataURL(blob)
      })
    } catch (err: unknown) {
      console.warn(`[pdf:7] photo ${photoIndex} error:`, err instanceof Error ? err.message : err)
      return null
    }
  }

  /**
   * Generate the PDF Blob. Returns the Blob and filename.
   * Throws with a descriptive stage-annotated error on failure.
   */
  const generatePdfBlob = async (): Promise<{ blob: Blob; filename: string }> => {
    if (!report) throw new Error('[pdf] no report loaded')

    console.log('[pdf:8] constructing PDF data')
    const orderedPhotos = [...photos].sort((a, b) => a.display_order - b.display_order)

    // Stage 6: count how many photos have signed URLs
    const availablePhotoCount = orderedPhotos.filter(p => photoUrls[p.id]).length
    console.log(`[pdf:6] photos with signed URLs: ${availablePhotoCount} of ${orderedPhotos.length}`)

    // Stage 7: convert all available photos to data URLs
    const dataUrls: string[] = []
    for (let i = 0; i < orderedPhotos.length; i++) {
      const p = orderedPhotos[i]
      const signedUrl = photoUrls[p.id]
      if (!signedUrl) {
        console.log(`[pdf:7] photo ${i} has no signed URL — skipping`)
        continue
      }
      const dataUrl = await fetchPhotoAsDataUrl(signedUrl, i)
      if (dataUrl) {
        dataUrls.push(dataUrl)
      }
    }

    console.log(`[pdf:8] data URLs resolved: ${dataUrls.length}`)

    // Stage 8: build PDF data object
    const pdfData = {
      reportNumber: report.report_number,
      isDraft: report.is_draft,
      createdAt: report.created_at,
      companyName,
      projectName,
      customerName,
      address,
      workCompleted: report.work_completed,
      problems: report.problems,
      nextSteps: report.next_steps,
      photoUrls: dataUrls,
    }

    // Stage 9: render to Blob (dynamic import keeps bundle small)
    console.log('[pdf:9] importing @react-pdf/renderer and rendering')
    const { generateReportPdfBlob, reportPdfFilename } = await import('../lib/pdf.tsx')

    const blob = await generateReportPdfBlob(pdfData)

    // Stage 10: validate Blob
    const blobSizeKb = Math.round(blob.size / 1024)
    const blobType = blob.type
    console.log(`[pdf:10] blob produced — size: ${blobSizeKb} KB, type: ${blobType}`)

    if (blob.size === 0) {
      throw new Error('[pdf:10] generated Blob is empty (0 bytes)')
    }
    if (!blobType.includes('pdf')) {
      console.warn(`[pdf:10] unexpected blob type: ${blobType}`)
    }

    const filename = reportPdfFilename({
      companyName,
      reportNumber: report.report_number,
      createdAt: report.created_at,
    })

    return { blob, filename }
  }

  // ── Share PDF ─────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (pdfStatus === 'generating') return
    setPdfError(null)
    setPdfStatus('generating')

    try {
      let blobPair = cachedBlob

      // Stage 9: generate if not already cached
      if (!blobPair) {
        blobPair = await generatePdfBlob()
        setCachedBlob(blobPair)
        setPdfStatus('blob-ready')
      }

      // Stage 11: share
      console.log('[pdf:11] attempting Web Share API')
      await shareBlob(
        blobPair.blob,
        blobPair.filename,
        `Report #${report!.report_number} — ${projectName}`,
      )
      setPdfStatus('idle')
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        // User dismissed the share sheet — not an error
        setPdfStatus(cachedBlob ? 'blob-ready' : 'idle')
        return
      }
      const msg = e instanceof Error ? e.message : String(e)
      const isGenFail = msg.startsWith('[pdf:')
      console.error('[pdf] error:', msg)

      if (isGenFail || !cachedBlob) {
        setPdfError('Could not generate PDF. See console for the exact failing stage.')
        setPdfStatus('generation-failed')
      } else {
        // PDF was generated but share failed (Web Share API issue)
        setPdfError('Share failed. Use Download PDF to save to your device.')
        setPdfStatus('share-failed')
      }
    }
  }

  // ── Download PDF ──────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (pdfStatus === 'generating') return
    setPdfError(null)
    setPdfStatus('generating')

    try {
      let blobPair = cachedBlob

      if (!blobPair) {
        blobPair = await generatePdfBlob()
        setCachedBlob(blobPair)
        setPdfStatus('blob-ready')
      }

      console.log('[pdf:11] triggering download')
      downloadBlob(blobPair.blob, blobPair.filename)
      setPdfStatus('idle')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[pdf] download error:', msg)
      setPdfError('Download failed. Please try again.')
      setPdfStatus('download-failed')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell activeTab="projects">
        <div style={styles.page}>
          <div style={styles.center}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading report…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !report) {
    return (
      <AppShell activeTab="projects">
        <div style={styles.page}>
          <div style={styles.center}>
            <p style={styles.errorText}>{error ?? 'Report not found.'}</p>
            <button onClick={() => loadReport()} style={styles.retryButton}>Retry</button>
            <button onClick={() => navigate('/projects')} style={styles.textLink}>
              ← Back to Projects
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  const isGenerating = pdfStatus === 'generating'
  const supportsShare = canShareFiles()

  // Status label for generating button
  const generatingLabel = (
    <><div style={styles.spinnerBtn} /><span>Generating PDF…</span></>
  )

  return (
    <AppShell activeTab="projects">
      <div style={styles.page}>
        <header style={styles.header}>
          <button
            onClick={() => navigate(`/projects/${report.project_id}`)}
            style={styles.backBtn}
            aria-label="Back to project"
          >
            <IconBack />
          </button>
          <h1 style={styles.heading}>Report #{report.report_number}</h1>
          <span style={report.is_draft ? styles.badgeDraft : styles.badgeFinal}>
            {report.is_draft ? 'Draft' : 'Final'}
          </span>
        </header>

        <div style={styles.body}>
          {/* Meta */}
          <div style={styles.meta}>
            <span>{projectName}</span>
            <span>{new Date(report.created_at).toLocaleDateString()}</span>
          </div>

          {/* Content */}
          {report.work_completed && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Work Completed</h2>
              <p style={styles.sectionContent}>{report.work_completed}</p>
            </div>
          )}
          {report.problems && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Problems / Delays</h2>
              <p style={styles.sectionContent}>{report.problems}</p>
            </div>
          )}
          {report.next_steps && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Next Steps</h2>
              <p style={styles.sectionContent}>{report.next_steps}</p>
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Photos ({photos.length})</h2>
              <div style={styles.photoGrid}>
                {photos
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((p) => (
                    <div key={p.id} style={styles.photoSlot}>
                      {photoUrls[p.id] ? (
                        <img
                          src={photoUrls[p.id]}
                          alt={`Site photo ${p.display_order + 1}`}
                          style={styles.photoImg}
                        />
                      ) : (
                        <div style={styles.photoLoading}>
                          <div style={styles.spinnerSm} />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* PDF error / status */}
          {pdfError && (
            <div style={styles.pdfError} role="alert">
              {pdfError}
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            {/* Edit — always visible */}
            <button
              id="preview-edit-btn"
              onClick={() => navigate(`/update/${report.project_id}/new?reportId=${report.id}`)}
              style={styles.editBtn}
            >
              <IconEdit />
              <span>Edit</span>
            </button>

            {/*
              PRODUCT DECISION: Download PDF is ALWAYS visible from the start.
              Share PDF is shown on devices that support the Web Share API.
              Both share the same Blob when it has been generated.
            */}

            {/* Share PDF — only on devices that support it */}
            {supportsShare && (
              <button
                id="preview-share-btn"
                onClick={handleShare}
                disabled={isGenerating}
                style={{ ...styles.pdfBtn, opacity: isGenerating ? 0.6 : 1 }}
              >
                {isGenerating ? generatingLabel : <><IconShare /><span>Share PDF</span></>}
              </button>
            )}

            {/* Download PDF — ALWAYS visible (product decision) */}
            <button
              id="preview-download-btn"
              onClick={handleDownload}
              disabled={isGenerating}
              style={{
                ...styles.pdfBtn,
                opacity: isGenerating ? 0.6 : 1,
                // Slightly muted when share is also shown
                ...(supportsShare ? styles.pdfBtnSecondary : {}),
              }}
            >
              {isGenerating ? generatingLabel : <><IconDownload /><span>Download PDF</span></>}
            </button>
          </div>

          {isGenerating && (
            <p style={styles.generatingNote} role="status" aria-live="polite">
              Building your PDF — this may take a moment if there are photos.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex', flexDirection: 'column',
    minHeight: '100dvh', background: 'var(--color-background)',
  },
  center: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px', gap: '16px',
  },
  spinner: {
    width: '30px', height: '30px',
    border: '2.5px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  spinnerSm: {
    width: '18px', height: '18px',
    border: '2px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  spinnerBtn: {
    width: '16px', height: '16px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  loadingText: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  errorText: { color: 'var(--color-danger)', fontSize: '15px', margin: 0, textAlign: 'center' },
  retryButton: {
    minHeight: '48px', padding: '0 32px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer',
  },
  textLink: {
    background: 'none', border: 'none',
    color: 'var(--color-primary)', fontSize: '14px',
    cursor: 'pointer', textDecoration: 'underline', padding: 0,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 20px',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
  },
  backBtn: {
    width: '40px', height: '40px',
    background: 'none', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, color: 'var(--color-text)',
  },
  heading: {
    fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)',
    margin: 0, flex: 1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  badgeDraft: {
    fontSize: '11px', fontWeight: 700,
    color: 'var(--color-warning)', background: 'var(--color-warning-soft)',
    padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
  },
  badgeFinal: {
    fontSize: '11px', fontWeight: 700,
    color: 'var(--color-success)', background: 'var(--color-success-soft)',
    padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
  },
  body: {
    padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    flex: 1,
    paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
  },
  meta: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: '12px', color: 'var(--color-text-muted)',
    flexWrap: 'wrap' as const, gap: '4px',
  },
  section: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: '8px',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionTitle: {
    fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)', margin: 0,
  },
  sectionContent: {
    fontSize: '15px', color: 'var(--color-text)',
    margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap',
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
    gap: '8px',
  },
  photoSlot: {
    aspectRatio: '1', borderRadius: 'var(--radius-sm)',
    overflow: 'hidden', border: '1px solid var(--color-border)',
    background: 'var(--color-background)',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoLoading: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pdfError: {
    padding: '12px 14px',
    background: 'var(--color-danger-soft)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-danger)',
    fontSize: '14px',
  },
  actions: { display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' as const },
  editBtn: {
    flex: '0 0 auto', minWidth: '96px', minHeight: '48px',
    background: 'var(--color-surface)', color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
  },
  pdfBtn: {
    flex: 1, minWidth: '130px', minHeight: '48px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    transition: 'opacity 0.15s',
  },
  // Secondary styling for Download when Share is also shown
  pdfBtnSecondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
  },
  generatingNote: {
    fontSize: '12px', color: 'var(--color-text-muted)',
    textAlign: 'center', margin: 0,
  },
}
