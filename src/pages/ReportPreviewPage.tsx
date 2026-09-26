/**
 * ReportPreviewPage
 *
 * PDF Generation Architecture (hardening pass 2 + sandbox diagnostics):
 *
 * Both "Share PDF" and "Download PDF" are always visible.
 * They share the same generated Blob to avoid redundant generation.
 *
 * PDF generation is broken into 11 explicit numbered stages with
 * console.log instrumentation AND in-UI sandbox diagnostics so the
 * exact failing stage is surfaced directly on the device.
 *
 * Stages:
 *   [pdf:1]  load report
 *   [pdf:2]  load company profile
 *   [pdf:3]  load project
 *   [pdf:4]  load photo records
 *   [pdf:5]  create signed photo URLs
 *   [pdf:6]  count available signed URLs
 *   [pdf:7]  fetch + decode each photo to data URL
 *   [pdf:8]  construct PDF data object
 *   [pdf:9]  render PDF blob
 *   [pdf:10] validate blob
 *   [pdf:11] share or download
 *
 * Sandbox diagnostic panel:
 *   - Shown when generation fails
 *   - Displays stage number/label, error.name, sanitized error.message,
 *     photo counts, MIME type, blob info
 *   - "Copy diagnostic" button for paste-able text report
 *   - "Test Text-Only PDF" button isolates renderer vs. image problems
 *   - NEVER exposes: signed URLs, auth tokens, storage paths, raw image data
 *
 * State machine:
 *   idle            → buttons available
 *   generating      → spinner shown
 *   blob-ready      → Blob in memory; Download still usable if Share fails
 *   share-failed    → Share shows error; Download still works
 *   download-failed → Download shows error
 *   generation-failed → both show error with diagnostic panel
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

// ── PDF stage definitions ───────────────────────────────────────────────────

const PDF_STAGES = {
  1:  'load report',
  2:  'load company profile',
  3:  'load project',
  4:  'load photo records',
  5:  'create signed photo URLs',
  6:  'count available signed URLs',
  7:  'fetch + decode photo',
  8:  'construct PDF data',
  9:  'render PDF blob',
  10: 'validate PDF blob',
  11: 'share or download',
} as const

type StageNumber = keyof typeof PDF_STAGES

// ── Sandbox diagnostic state ───────────────────────────────────────────────

interface PdfDiagnostic {
  stage: StageNumber
  stageLabel: string
  errorName: string
  errorMessage: string
  /** Total photos in the report */
  photoCount: number
  /** Photos that had signed URLs */
  signedUrlCount: number
  /** Photos successfully converted to data URLs */
  resolvedCount: number
  /** Index of photo being processed when error occurred (if stage 7) */
  photoIndex: number | null
  /** MIME type of the photo that caused the error (if stage 7) */
  lastMime: string | null
  /** Whether a blob was produced before the error */
  blobProduced: boolean
  blobSizeKb: number | null
  blobType: string | null
  /** Whether this was a text-only test run */
  textOnly: boolean
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

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sanitize an error message for safe display.
 * Strips any content that looks like a URL, token, or file path.
 */
function sanitizeErrorMessage(msg: string): string {
  return msg
    // Remove URLs (signed URL parameters are long)
    .replace(/https?:\/\/[^\s"')]+/gi, '[URL removed]')
    // Remove anything that looks like a JWT or token (long base64 strings)
    .replace(/[A-Za-z0-9+/=]{60,}/g, '[token removed]')
    // Remove storage paths (anything starting with a UUID-like prefix)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\s"')]+/gi, '[path removed]')
    .slice(0, 300) // Hard cap to prevent large dumps
}

/** Build a paste-friendly diagnostic string from a PdfDiagnostic record. */
function buildDiagnosticText(d: PdfDiagnostic): string {
  const lines = [
    'SiteBrief PDF Diagnostic',
    '========================',
    `Stage: ${d.stage}  ${d.stageLabel}`,
    `Error: ${d.errorName}`,
    `Message: ${d.errorMessage}`,
    '',
    `Photo count: ${d.photoCount}`,
    `Signed URL count: ${d.signedUrlCount}`,
    `Resolved (data URL) count: ${d.resolvedCount}`,
    d.photoIndex !== null ? `Error at photo index: ${d.photoIndex}` : null,
    d.lastMime ? `Last photo MIME: ${d.lastMime}` : null,
    '',
    `Blob produced: ${d.blobProduced ? 'yes' : 'no'}`,
    d.blobProduced ? `Blob size: ${d.blobSizeKb} KB` : null,
    d.blobProduced ? `Blob type: ${d.blobType}` : null,
    '',
    `Text-only run: ${d.textOnly ? 'yes' : 'no'}`,
    `User agent: ${navigator.userAgent}`,
  ]
  return lines.filter(l => l !== null).join('\n')
}

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
  // Sandbox diagnostic
  const [diagnostic, setDiagnostic] = useState<PdfDiagnostic | null>(null)
  const [copyLabel, setCopyLabel] = useState<'copy' | 'copied'>('copy')

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
   * Stage 7: Fetch a single photo signed URL → data URL.
   *
   * @react-pdf/renderer v4 uses a Web Worker which cannot resolve
   * Supabase signed URLs (CORS + CSP constraints in worker context).
   * Converting to data URL in the main thread avoids this entirely.
   *
   * Returns null + logs MIME if the image cannot be used (HEIC, fetch fail, etc).
   */
  const fetchPhotoAsDataUrl = async (
    signedUrl: string,
    photoIndex: number,
    diagRef: { lastMime: string | null },
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
      diagRef.lastMime = mime

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
   *
   * @param textOnly - When true, skip all photos. Used for diagnostic isolation.
   * @throws A structured Error whose message begins with `[pdf:N]` on failure.
   */
  const generatePdfBlob = async (
    textOnly = false,
  ): Promise<{ blob: Blob; filename: string; diag: Partial<PdfDiagnostic> }> => {
    if (!report) throw new Error('[pdf:1] no report loaded')

    // Diagnostic accumulator — safe fields only (no URLs/paths/tokens)
    const diagAcc: Partial<PdfDiagnostic> & {
      lastMime: string | null
      photoIndex: number | null
    } = {
      photoCount: photos.length,
      signedUrlCount: 0,
      resolvedCount: 0,
      photoIndex: null,
      lastMime: null,
      blobProduced: false,
      blobSizeKb: null,
      blobType: null,
      textOnly,
    }

    const orderedPhotos = [...photos].sort((a, b) => a.display_order - b.display_order)

    // ── Stage 6: count photos with signed URLs ──────────────────────────────
    console.log('[pdf:6] counting photos with signed URLs')
    const availablePhotoCount = orderedPhotos.filter(p => photoUrls[p.id]).length
    diagAcc.signedUrlCount = availablePhotoCount
    console.log(`[pdf:6] photos with signed URLs: ${availablePhotoCount} of ${orderedPhotos.length}`)

    // ── Stage 7: convert photos to data URLs ────────────────────────────────
    const dataUrls: string[] = []

    if (!textOnly) {
      for (let i = 0; i < orderedPhotos.length; i++) {
        const p = orderedPhotos[i]
        const signedUrl = photoUrls[p.id]
        if (!signedUrl) {
          console.log(`[pdf:7] photo ${i} has no signed URL — skipping`)
          continue
        }
        diagAcc.photoIndex = i
        const dataUrl = await fetchPhotoAsDataUrl(signedUrl, i, diagAcc)
        if (dataUrl) {
          dataUrls.push(dataUrl)
        }
      }
    } else {
      console.log('[pdf:7] TEXT-ONLY run — skipping all photos')
    }

    diagAcc.resolvedCount = dataUrls.length
    console.log(`[pdf:8] data URLs resolved: ${dataUrls.length}${textOnly ? ' (text-only run)' : ''}`)

    // ── Stage 8: build PDF data object ──────────────────────────────────────
    console.log('[pdf:8] constructing PDF data')
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

    // ── Stage 9: render to Blob (dynamic import keeps bundle small) ─────────
    console.log('[pdf:9] importing @react-pdf/renderer and rendering')
    const { generateReportPdfBlob, reportPdfFilename } = await import('../lib/pdf.tsx')

    const blob = await generateReportPdfBlob(pdfData)

    // ── Stage 10: validate Blob ──────────────────────────────────────────────
    const blobSizeKb = Math.round(blob.size / 1024)
    const blobType = blob.type
    diagAcc.blobProduced = true
    diagAcc.blobSizeKb = blobSizeKb
    diagAcc.blobType = blobType
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

    return { blob, filename, diag: diagAcc }
  }

  /**
   * Parse a stage-annotated error message like "[pdf:9] ..."
   * and return the stage number, or fall back to the given default.
   */
  const parseFailedStage = (
    msg: string,
    defaultStage: StageNumber,
  ): StageNumber => {
    const match = /\[pdf:(\d+)\]/.exec(msg)
    if (match) {
      const n = parseInt(match[1], 10) as StageNumber
      if (n in PDF_STAGES) return n
    }
    return defaultStage
  }

  /**
   * Build a PdfDiagnostic from a caught error + partial accumulator.
   */
  const buildDiagnostic = (
    err: unknown,
    partialDiag: Partial<PdfDiagnostic>,
    defaultStage: StageNumber,
    textOnly: boolean,
  ): PdfDiagnostic => {
    const errorName = err instanceof Error ? err.name : 'UnknownError'
    const rawMsg = err instanceof Error ? err.message : String(err)
    const stage = parseFailedStage(rawMsg, defaultStage)
    return {
      stage,
      stageLabel: PDF_STAGES[stage],
      errorName,
      errorMessage: sanitizeErrorMessage(rawMsg),
      photoCount: partialDiag.photoCount ?? 0,
      signedUrlCount: partialDiag.signedUrlCount ?? 0,
      resolvedCount: partialDiag.resolvedCount ?? 0,
      photoIndex: partialDiag.photoIndex ?? null,
      lastMime: partialDiag.lastMime ?? null,
      blobProduced: partialDiag.blobProduced ?? false,
      blobSizeKb: partialDiag.blobSizeKb ?? null,
      blobType: partialDiag.blobType ?? null,
      textOnly,
    }
  }

  // ── Copy diagnostic to clipboard ──────────────────────────────────────────

  const handleCopyDiagnostic = async () => {
    if (!diagnostic) return
    const text = buildDiagnosticText(diagnostic)
    try {
      await navigator.clipboard.writeText(text)
      setCopyLabel('copied')
      setTimeout(() => setCopyLabel('copy'), 2500)
    } catch {
      // Clipboard API may be blocked — select the text area as fallback
      const el = document.getElementById('pdf-diag-text')
      if (el instanceof HTMLTextAreaElement) {
        el.select()
        document.execCommand('copy')
        setCopyLabel('copied')
        setTimeout(() => setCopyLabel('copy'), 2500)
      }
    }
  }

  // ── Share PDF ─────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (pdfStatus === 'generating') return
    setPdfError(null)
    setDiagnostic(null)
    setPdfStatus('generating')

    try {
      let blobPair = cachedBlob

      if (!blobPair) {
        const result = await generatePdfBlob(false)
        blobPair = { blob: result.blob, filename: result.filename }
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
      console.error('[pdf] share error:', msg)

      if (isGenFail || !cachedBlob) {
        const diag = buildDiagnostic(e, {}, 9, false)
        setDiagnostic(diag)
        setPdfError('Could not generate PDF.')
        setPdfStatus('generation-failed')
      } else {
        setPdfError('Share failed. Use Download PDF to save to your device.')
        setPdfStatus('share-failed')
      }
    }
  }

  // ── Download PDF ──────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (pdfStatus === 'generating') return
    setPdfError(null)
    setDiagnostic(null)
    setPdfStatus('generating')

    try {
      let blobPair = cachedBlob

      if (!blobPair) {
        const result = await generatePdfBlob(false)
        blobPair = { blob: result.blob, filename: result.filename }
        setCachedBlob(blobPair)
        setPdfStatus('blob-ready')
      }

      console.log('[pdf:11] triggering download')
      downloadBlob(blobPair.blob, blobPair.filename)
      setPdfStatus('idle')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      const isGenFail = msg.startsWith('[pdf:')
      console.error('[pdf] download error:', msg)

      if (isGenFail || !cachedBlob) {
        const diag = buildDiagnostic(e, {}, 9, false)
        setDiagnostic(diag)
        setPdfError('Could not generate PDF.')
        setPdfStatus('generation-failed')
      } else {
        setPdfError('Download failed. Please try again.')
        setPdfStatus('download-failed')
      }
    }
  }

  // ── Text-only PDF test ────────────────────────────────────────────────────

  /**
   * SANDBOX DIAGNOSTIC ONLY — generates the same report without photos.
   * If this succeeds and the normal path fails, image handling is the problem.
   * If this also fails, the core react-pdf rendering pipeline is the problem.
   */
  const handleTextOnlyTest = async () => {
    if (pdfStatus === 'generating') return
    setPdfError(null)
    setDiagnostic(null)
    setPdfStatus('generating')

    try {
      const result = await generatePdfBlob(true /* textOnly */)
      // Success: download the text-only PDF so the result is visible
      console.log('[pdf] text-only test succeeded — downloading')
      downloadBlob(result.blob, `text-only-test-${result.filename}`)
      setPdfStatus('idle')
      setPdfError(null)
      // Surface success to the user via a brief diagnostic note
      setDiagnostic({
        stage: 11,
        stageLabel: PDF_STAGES[11],
        errorName: 'Success',
        errorMessage: 'Text-only PDF generated successfully. Image handling may be the issue.',
        photoCount: photos.length,
        signedUrlCount: Object.keys(photoUrls).length,
        resolvedCount: 0,
        photoIndex: null,
        lastMime: null,
        blobProduced: true,
        blobSizeKb: Math.round(result.blob.size / 1024),
        blobType: result.blob.type,
        textOnly: true,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[pdf] text-only test failed:', msg)
      const diag = buildDiagnostic(e, {
        photoCount: photos.length,
        signedUrlCount: 0,
        resolvedCount: 0,
      }, 9, true)
      setDiagnostic(diag)
      setPdfError('Text-only PDF also failed. Problem is in the PDF renderer itself.')
      setPdfStatus('generation-failed')
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
  const isGenFailed = pdfStatus === 'generation-failed'

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

          {/* PDF user-visible error */}
          {pdfError && (
            <div style={styles.pdfError} role="alert">
              {pdfError}
            </div>
          )}

          {/* ── Sandbox PDF Diagnostic Panel ─────────────────────────────── */}
          {diagnostic && (
            <div style={styles.diagPanel} role="region" aria-label="Sandbox PDF diagnostic">
              <div style={styles.diagHeader}>
                <span style={styles.diagBadge}>Sandbox PDF diagnostic</span>
                <button
                  onClick={handleCopyDiagnostic}
                  style={styles.diagCopyBtn}
                  aria-label="Copy diagnostic text"
                >
                  {copyLabel === 'copied' ? '✓ Copied' : 'Copy diagnostic'}
                </button>
              </div>

              <table style={styles.diagTable}>
                <tbody>
                  <tr>
                    <td style={styles.diagKey}>Stage</td>
                    <td style={styles.diagVal}>
                      <strong>{diagnostic.stage}</strong> — {diagnostic.stageLabel}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.diagKey}>Error</td>
                    <td style={styles.diagVal}>{diagnostic.errorName}</td>
                  </tr>
                  <tr>
                    <td style={styles.diagKey}>Message</td>
                    <td style={{ ...styles.diagVal, wordBreak: 'break-word' }}>
                      {diagnostic.errorMessage}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.diagKey}>Photos total</td>
                    <td style={styles.diagVal}>{diagnostic.photoCount}</td>
                  </tr>
                  <tr>
                    <td style={styles.diagKey}>Signed URLs</td>
                    <td style={styles.diagVal}>{diagnostic.signedUrlCount}</td>
                  </tr>
                  <tr>
                    <td style={styles.diagKey}>Data URLs resolved</td>
                    <td style={styles.diagVal}>{diagnostic.resolvedCount}</td>
                  </tr>
                  {diagnostic.photoIndex !== null && (
                    <tr>
                      <td style={styles.diagKey}>Error at photo</td>
                      <td style={styles.diagVal}>#{diagnostic.photoIndex}</td>
                    </tr>
                  )}
                  {diagnostic.lastMime && (
                    <tr>
                      <td style={styles.diagKey}>Last photo MIME</td>
                      <td style={styles.diagVal}>{diagnostic.lastMime}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={styles.diagKey}>Blob produced</td>
                    <td style={styles.diagVal}>
                      {diagnostic.blobProduced
                        ? `yes — ${diagnostic.blobSizeKb} KB, ${diagnostic.blobType}`
                        : 'no'}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.diagKey}>Text-only run</td>
                    <td style={styles.diagVal}>{diagnostic.textOnly ? 'yes' : 'no'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Hidden textarea for fallback clipboard copy */}
              <textarea
                id="pdf-diag-text"
                readOnly
                value={diagnostic ? buildDiagnosticText(diagnostic) : ''}
                style={styles.diagHiddenText}
                aria-hidden="true"
              />
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

          {/* ── Sandbox: Text-Only PDF Test ───────────────────────────────── */}
          {(isGenFailed || !isGenerating) && (
            <div style={styles.diagActions}>
              <p style={styles.diagActionsLabel}>Sandbox diagnostic tools:</p>
              <button
                id="preview-text-only-btn"
                onClick={handleTextOnlyTest}
                disabled={isGenerating}
                style={styles.diagTestBtn}
                title="Generate PDF without photos to isolate whether image handling or the PDF renderer is failing"
              >
                Test Text-Only PDF
              </button>
            </div>
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
    lineHeight: 1.5,
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

  // ── Sandbox diagnostic panel ────────────────────────────────────────────
  diagPanel: {
    background: '#1a1a2e',
    border: '1px solid #3a3a5c',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  diagHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '8px', flexWrap: 'wrap' as const,
  },
  diagBadge: {
    fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    color: '#7c7cff',
    padding: '2px 7px',
    border: '1px solid #3a3a5c',
    borderRadius: '4px',
  },
  diagCopyBtn: {
    fontSize: '11px', fontWeight: 600,
    color: '#a0a0c0',
    background: 'transparent',
    border: '1px solid #3a3a5c',
    borderRadius: '4px',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'color 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  diagTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  diagKey: {
    color: '#7c7cff',
    fontWeight: 600,
    padding: '2px 10px 2px 0',
    verticalAlign: 'top',
    whiteSpace: 'nowrap' as const,
    width: '40%',
  },
  diagVal: {
    color: '#e0e0f0',
    padding: '2px 0',
    lineHeight: 1.5,
  },
  diagHiddenText: {
    position: 'absolute',
    left: '-9999px',
    top: 0,
    width: '1px',
    height: '1px',
    opacity: 0,
  },

  // ── Sandbox diagnostic actions ──────────────────────────────────────────
  diagActions: {
    display: 'flex', flexDirection: 'column', gap: '6px',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '10px',
    marginTop: '2px',
  },
  diagActionsLabel: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    margin: 0,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  diagTestBtn: {
    alignSelf: 'flex-start',
    minHeight: '40px',
    padding: '0 16px',
    background: 'transparent',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
}
