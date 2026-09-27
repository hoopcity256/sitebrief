/**
 * ReportPreviewPage — Professional report preview + PDF generation
 *
 * Preview design:
 *   Mobile-first. Mirrors the PDF's information hierarchy on screen.
 *   Company identity → Daily Field Report → Project → Report meta →
 *   Project info → Narrative sections → Photo grid → Actions
 *
 * PDF generation pipeline (proven on real iPhone):
 *   Stage 1  load report
 *   Stage 2  load company profile (+ signed logo URL → data URL)
 *   Stage 3  load project
 *   Stage 4  load photo records
 *   Stage 5  create signed photo URLs
 *   Stage 6  count available signed URLs
 *   Stage 7  fetch + decode each photo to data URL (HEIC detection)
 *   Stage 8  construct ReportPdfData
 *   Stage 9  render PDF blob (requires 'wasm-unsafe-eval' in CSP)
 *   Stage 10 validate blob
 *   Stage 11 share or download
 *
 * Blob caching:
 *   Both Share and Download reuse the same generated Blob.
 *   Blob is invalidated when the page reloads (report data changes).
 *
 * Error states:
 *   generation-failed → both Share + Download show error, retry available
 *   share-failed      → Share shows error; Download still works
 *   download-failed   → Download shows error; Share still available
 *
 * CSP requirement (public/_headers):
 *   script-src must include 'wasm-unsafe-eval'
 *   DO NOT remove this directive — @react-pdf/renderer uses WebAssembly.
 */
import { useCallback, useEffect, useState } from 'react'
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

interface CompanyData {
  company_name: string
  phone: string | null
  email: string | null
  logo_storage_path: string | null
}

// ── PDF status state ────────────────────────────────────────────────────────

type PdfStatus =
  | 'idle'
  | 'generating'
  | 'generation-failed'
  | 'blob-ready'
  | 'share-failed'
  | 'download-failed'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format 10-digit phone → (555) 123-4567 */
function formatPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return raw
}

/** Zero-padded report number "004" */
function padReport(n: number): string {
  return String(n).padStart(3, '0')
}

/** Long date for display: "September 26, 2026" */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

/**
 * Fetch a URL, convert to data URL.
 * Returns null on failure (logs to console; does not throw).
 * Skips HEIC/HEIF — not renderable in @react-pdf/renderer.
 */
async function fetchAsDataUrl(url: string, label: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) {
      console.warn(`[pdf] ${label} fetch failed: HTTP ${res.status}`)
      return null
    }
    const blob = await res.blob()
    const mime = blob.type || 'unknown'
    if (mime.includes('heic') || mime.includes('heif')) {
      console.warn(`[pdf] ${label} is HEIC/HEIF — skipping`)
      return null
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('FileReader failed'))
      reader.readAsDataURL(blob)
    })
  } catch (err: unknown) {
    console.warn(`[pdf] ${label} error:`, err instanceof Error ? err.message : err)
    return null
  }
}

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
  const navigate     = useNavigate()
  const { user }     = useAuth()

  // Report data
  const [report, setReport]             = useState<ReportData | null>(null)
  const [photos, setPhotos]             = useState<PhotoData[]>([])
  const [photoUrls, setPhotoUrls]       = useState<Record<string, string>>({})
  const [projectName, setProjectName]   = useState('')
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [address, setAddress]           = useState<string | null>(null)
  const [company, setCompany]           = useState<CompanyData>({
    company_name: 'SiteBrief',
    phone: null,
    email: null,
    logo_storage_path: null,
  })
  // Preview-time signed logo URL (for <img> on screen)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // PDF state
  const [pdfStatus, setPdfStatus]   = useState<PdfStatus>('idle')
  const [pdfError, setPdfError]     = useState<string | null>(null)
  const [cachedBlob, setCachedBlob] = useState<{ blob: Blob; filename: string } | null>(null)

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    try {
      // Stage 1: load report
      const r = await getReport(reportId) as ReportData
      setReport(r)

      // Stage 2-4: parallel load
      const [proj, photoList, companyProfile] = await Promise.all([
        getProject(r.project_id),
        listPhotosForReport(reportId),
        user ? getCompanyProfile(user.id) : Promise.resolve(null),
      ])

      setProjectName(proj.name)
      setCustomerName(proj.customer_name ?? null)
      setAddress(proj.address ?? null)

      if (companyProfile) {
        setCompany({
          company_name: companyProfile.company_name,
          phone:              companyProfile.phone ?? null,
          email:              companyProfile.email ?? null,
          logo_storage_path:  companyProfile.logo_storage_path ?? null,
        })

        // Resolve preview logo signed URL (for on-screen display)
        if (companyProfile.logo_storage_path) {
          const { data: logoData } = await supabase.storage
            .from('company-logos')
            .createSignedUrl(companyProfile.logo_storage_path, 3600)
          if (logoData?.signedUrl) setLogoPreviewUrl(logoData.signedUrl)
        }
      }

      setPhotos(photoList)

      // Stage 5: create signed photo URLs for preview
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

  // ── PDF generation ───────────────────────────────────────────────────────

  const generatePdfBlob = async (): Promise<{ blob: Blob; filename: string }> => {
    if (!report) throw new Error('[pdf:1] no report loaded')

    // Stage 6: count photos with signed URLs
    const orderedPhotos = [...photos].sort((a, b) => a.display_order - b.display_order)
    const available     = orderedPhotos.filter(p => photoUrls[p.id]).length
    console.log(`[pdf:6] photos with signed URLs: ${available} of ${orderedPhotos.length}`)

    // Stage 7: convert photos to data URLs
    const dataUrls: string[] = []
    for (let i = 0; i < orderedPhotos.length; i++) {
      const p = orderedPhotos[i]
      if (!photoUrls[p.id]) {
        console.log(`[pdf:7] photo ${i} — no signed URL, skipping`)
        continue
      }
      const dataUrl = await fetchAsDataUrl(photoUrls[p.id], `photo ${i}`)
      if (dataUrl) dataUrls.push(dataUrl)
    }
    console.log(`[pdf:7] data URLs resolved: ${dataUrls.length}`)

    // Stage 7b: resolve logo as data URL (non-blocking — logo failure OK)
    let logoDataUrl: string | null = null
    if (company.logo_storage_path) {
      try {
        const { data: logoSigned } = await supabase.storage
          .from('company-logos')
          .createSignedUrl(company.logo_storage_path, 300)
        if (logoSigned?.signedUrl) {
          logoDataUrl = await fetchAsDataUrl(logoSigned.signedUrl, 'logo')
        }
      } catch {
        console.warn('[pdf:7b] logo resolution failed — using company name fallback')
      }
    }

    // Stage 8: construct PDF data
    console.log('[pdf:8] constructing ReportPdfData')
    const { reportPdfFilename } = await import('../lib/pdf.tsx')

    const pdfData = {
      reportNumber:  report.report_number,
      isDraft:       report.is_draft,
      createdAt:     report.created_at,
      companyName:   company.company_name,
      companyPhone:  company.phone,
      companyEmail:  company.email,
      logoDataUrl,
      projectName,
      customerName,
      address,
      workCompleted: report.work_completed,
      problems:      report.problems,
      nextSteps:     report.next_steps,
      photoUrls:     dataUrls,
    }

    // Stage 9: render blob
    console.log('[pdf:9] rendering PDF blob')
    const { generateReportPdfBlob } = await import('../lib/pdf.tsx')
    const blob = await generateReportPdfBlob(pdfData)

    // Stage 10: validate
    console.log(`[pdf:10] blob produced — ${Math.round(blob.size / 1024)} KB, ${blob.type}`)
    if (blob.size === 0) throw new Error('[pdf:10] generated blob is empty')

    const filename = reportPdfFilename({
      companyName:  company.company_name,
      projectName,
      reportNumber: report.report_number,
      createdAt:    report.created_at,
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
      if (!blobPair) {
        blobPair = await generatePdfBlob()
        setCachedBlob(blobPair)
        setPdfStatus('blob-ready')
      }

      console.log('[pdf:11] Web Share API')
      await shareBlob(
        blobPair.blob,
        blobPair.filename,
        `Report #${padReport(report!.report_number)} — ${projectName}`,
      )
      setPdfStatus('idle')
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setPdfStatus(cachedBlob ? 'blob-ready' : 'idle')
        return
      }
      const msg = e instanceof Error ? e.message : String(e)
      const isGenFail = msg.startsWith('[pdf:')
      console.error('[pdf] share error:', msg)
      if (isGenFail || !cachedBlob) {
        setPdfError('Could not generate PDF. Please try again.')
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
    setPdfStatus('generating')

    try {
      let blobPair = cachedBlob
      if (!blobPair) {
        blobPair = await generatePdfBlob()
        setCachedBlob(blobPair)
        setPdfStatus('blob-ready')
      }

      console.log('[pdf:11] download')
      downloadBlob(blobPair.blob, blobPair.filename)
      setPdfStatus('idle')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      const isGenFail = msg.startsWith('[pdf:')
      console.error('[pdf] download error:', msg)
      if (isGenFail || !cachedBlob) {
        setPdfError('Could not generate PDF. Please try again.')
        setPdfStatus('generation-failed')
      } else {
        setPdfError('Download failed. Please try again.')
        setPdfStatus('download-failed')
      }
    }
  }

  // ── Render: loading / error ───────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell activeTab="projects">
        <div className="rp-page">
          <div className="rp-center">
            <div className="rp-spinner" aria-label="Loading" role="status" />
            <p className="rp-loading-text">Loading report…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !report) {
    return (
      <AppShell activeTab="projects">
        <div className="rp-page">
          <div className="rp-center">
            <p className="rp-error-msg">{error ?? 'Report not found.'}</p>
            <button onClick={() => loadReport()} className="rp-btn-primary">
              Retry
            </button>
            <button onClick={() => navigate('/projects')} className="rp-text-link">
              ← Back to Projects
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  const isGenerating = pdfStatus === 'generating'
  const supportsShare = canShareFiles()
  const orderedPhotos = [...photos].sort((a, b) => a.display_order - b.display_order)
  const phone = formatPhone(company.phone)
  const contactParts = [phone, company.email].filter(Boolean)

  return (
    <AppShell activeTab="projects">
      <div className="rp-page">

        {/* ── Navigation header ── */}
        <header className="rp-nav">
          <button
            onClick={() => navigate(`/projects/${report.project_id}`)}
            className="rp-nav-back"
            aria-label="Back to project"
          >
            <IconBack />
          </button>
          <span className="rp-nav-label">Field Report</span>
          <button
            onClick={() => navigate(`/update/${report.project_id}/new?reportId=${report.id}`)}
            className="rp-nav-edit"
            aria-label="Edit report"
          >
            <IconEdit />
            <span>Edit</span>
          </button>
        </header>

        <div className="rp-body">

          {/* ── Company identity ── */}
          <div className="rp-company-block">
            {logoPreviewUrl ? (
              <img
                src={logoPreviewUrl}
                alt={`${company.company_name} logo`}
                className="rp-company-logo"
              />
            ) : (
              <p className="rp-company-name">{company.company_name}</p>
            )}
            {contactParts.length > 0 && (
              <p className="rp-company-contact">{contactParts.join('  ·  ')}</p>
            )}
          </div>

          {/* ── Report identity ── */}
          <div className="rp-report-id">
            <p className="rp-doc-type">Daily Field Report</p>
            <h1 className="rp-project-name">{projectName}</h1>
            <div className="rp-report-meta">
              <span className="rp-report-number">
                Report #{padReport(report.report_number)}
              </span>
              <span className="rp-report-date">{longDate(report.created_at)}</span>
              <span
                className={report.is_draft ? 'rp-badge-draft' : 'rp-badge-final'}
                role="status"
                aria-label={report.is_draft ? 'Draft report' : 'Final report'}
              >
                {report.is_draft ? 'Draft' : 'Final'}
              </span>
            </div>
          </div>

          {/* ── Project info ── */}
          {(customerName || address) && (
            <div className="rp-info-grid">
              {customerName && (
                <div className="rp-info-cell">
                  <span className="rp-info-label">Customer</span>
                  <span className="rp-info-value">{customerName}</span>
                </div>
              )}
              {address && (
                <div className="rp-info-cell">
                  <span className="rp-info-label">Address</span>
                  <span className="rp-info-value">{address}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Rule ── */}
          <hr className="rp-rule" aria-hidden="true" />

          {/* ── Narrative sections ── */}
          {report.work_completed && (
            <div className="rp-section">
              <h2 className="rp-section-heading">Work Completed</h2>
              <p className="rp-section-body">{report.work_completed}</p>
            </div>
          )}
          {report.problems && (
            <div className="rp-section">
              <h2 className="rp-section-heading">Problems / Delays</h2>
              <p className="rp-section-body">{report.problems}</p>
            </div>
          )}
          {report.next_steps && (
            <div className="rp-section">
              <h2 className="rp-section-heading">Next Steps</h2>
              <p className="rp-section-body">{report.next_steps}</p>
            </div>
          )}

          {/* ── Photo grid ── */}
          {orderedPhotos.length > 0 && (
            <div className="rp-section">
              <h2 className="rp-section-heading">
                Site Photos ({orderedPhotos.length})
              </h2>
              <div className="rp-photo-grid">
                {orderedPhotos.map((p) => (
                  <div key={p.id} className="rp-photo-cell">
                    {photoUrls[p.id] ? (
                      <img
                        src={photoUrls[p.id]}
                        alt={`Site photo ${p.display_order + 1}`}
                        className="rp-photo-img"
                      />
                    ) : (
                      <div className="rp-photo-loading" aria-hidden="true">
                        <div className="rp-spinner-sm" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PDF error message ── */}
          {pdfError && (
            <div className="rp-pdf-error" role="alert">
              {pdfError}
            </div>
          )}

          {/* ── PDF actions ── */}
          {!report.is_draft && (
            <div className="rp-pdf-actions">
              {supportsShare && (
                <button
                  id="preview-share-btn"
                  onClick={handleShare}
                  disabled={isGenerating}
                  className="rp-btn-pdf-primary"
                  aria-label="Share PDF"
                >
                  {isGenerating
                    ? <><div className="rp-spinner-btn" aria-hidden="true" /><span>Generating…</span></>
                    : <><IconShare /><span>Share PDF</span></>
                  }
                </button>
              )}
              <button
                id="preview-download-btn"
                onClick={handleDownload}
                disabled={isGenerating}
                className={supportsShare ? 'rp-btn-pdf-secondary' : 'rp-btn-pdf-primary'}
                aria-label="Download PDF"
              >
                {isGenerating
                  ? <><div className="rp-spinner-btn" aria-hidden="true" /><span>Generating…</span></>
                  : <><IconDownload /><span>Download PDF</span></>
                }
              </button>
            </div>
          )}

          {/* Draft note */}
          {report.is_draft && (
            <div className="rp-draft-note" role="note">
              This is a draft report. Finalize it to generate a PDF.
            </div>
          )}

          {isGenerating && (
            <p className="rp-generating-note" role="status" aria-live="polite">
              Building your PDF — this may take a moment if there are photos.
            </p>
          )}

          {/* ── Footer attribution ── */}
          <p className="rp-footer-note">Generated with SiteBrief</p>
        </div>
      </div>
    </AppShell>
  )
}
