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

  // PDF / share state
  const [pdfState, setPdfState] = useState<'idle' | 'generating' | 'error'>('idle')
  const [pdfError, setPdfError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    try {
      // Load report, project, and company profile in parallel
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

      // Load signed URLs for all photos
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

  // ── PDF generation + share/download ─────────────────────────────────────

  const handlePdfAction = async (mode: 'share' | 'download') => {
    if (!report || pdfState === 'generating') return
    setPdfState('generating')
    setPdfError(null)

    try {
      // Dynamic import — defers the ~1.5 MB @react-pdf/renderer bundle
      // until the user actually requests a PDF.
      const { generateReportPdfBlob, reportPdfFilename } = await import('../lib/pdf.tsx')

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
        photoUrls: photos
          .sort((a, b) => a.display_order - b.display_order)
          .map(p => photoUrls[p.id])
          .filter(Boolean),
      }

      const blob = await generateReportPdfBlob(pdfData)
      const filename = reportPdfFilename({
        companyName,
        reportNumber: report.report_number,
        createdAt: report.created_at,
      })

      if (mode === 'share' && canShareFiles()) {
        await shareBlob(blob, filename, `Report #${report.report_number} — ${projectName}`)
      } else {
        downloadBlob(blob, filename)
      }

      setPdfState('idle')
    } catch (e: unknown) {
      // User cancelling the share sheet is not an error
      if (e instanceof Error && e.name === 'AbortError') {
        setPdfState('idle')
        return
      }
      setPdfError('Could not generate PDF. Please try again.')
      setPdfState('idle')
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────

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

  const isGenerating = pdfState === 'generating'
  const supportsShare = canShareFiles()

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

          {/* Content sections */}
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

          {/* PDF error */}
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

            {/* Share or Download — adaptive */}
            {supportsShare ? (
              <button
                id="preview-share-btn"
                onClick={() => handlePdfAction('share')}
                disabled={isGenerating}
                style={{ ...styles.pdfBtn, opacity: isGenerating ? 0.6 : 1 }}
              >
                {isGenerating ? (
                  <><div style={styles.spinnerBtn} /><span>Generating…</span></>
                ) : (
                  <><IconShare /><span>Share PDF</span></>
                )}
              </button>
            ) : (
              <button
                id="preview-download-btn"
                onClick={() => handlePdfAction('download')}
                disabled={isGenerating}
                style={{ ...styles.pdfBtn, opacity: isGenerating ? 0.6 : 1 }}
              >
                {isGenerating ? (
                  <><div style={styles.spinnerBtn} /><span>Generating…</span></>
                ) : (
                  <><IconDownload /><span>Download PDF</span></>
                )}
              </button>
            )}
          </div>

          {/* Generating progress note */}
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
  photoImg:     { width: '100%', height: '100%', objectFit: 'cover' },
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
  actions: { display: 'flex', gap: '10px', marginTop: '4px' },
  editBtn: {
    flex: '0 0 auto', minWidth: '96px', minHeight: '48px',
    background: 'var(--color-surface)', color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
  },
  pdfBtn: {
    flex: 1, minHeight: '48px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    transition: 'opacity 0.15s',
  },
  generatingNote: {
    fontSize: '12px', color: 'var(--color-text-muted)',
    textAlign: 'center', margin: 0,
  },
}
