import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReport, listPhotosForReport } from '../lib/reports'
import { supabase } from '../lib/supabase'

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

export const ReportPreviewPage = () => {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportData | null>(null)
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    try {
      const r = await getReport(reportId)
      setReport(r as ReportData)
      const p = await listPhotosForReport(reportId)
      setPhotos(p)

      // Load signed URLs for photos
      const urls: Record<string, string> = {}
      for (const photo of p) {
        const { data } = await supabase.storage
          .from('report-photos')
          .createSignedUrl(photo.storage_path, 3600)
        if (data?.signedUrl) {
          urls[photo.id] = data.signedUrl
        }
      }
      setPhotoUrls(urls)
    } catch {
      setError('Could not load report.')
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => { loadReport() }, [loadReport])

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

  if (error || !report) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={styles.errorText}>{error ?? 'Report not found.'}</p>
          <button onClick={() => loadReport()} style={styles.retryButton}>Retry</button>
          <button onClick={() => navigate('/projects')} style={styles.backLink}>← Back to Projects</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          onClick={() => navigate(`/projects/${report.project_id}`)}
          style={styles.backBtn}
          aria-label="Back to project"
        >
          ←
        </button>
        <h1 style={styles.heading}>Report #{report.report_number}</h1>
        <span style={report.is_draft ? styles.badgeDraft : styles.badgeFinal}>
          {report.is_draft ? 'Draft' : 'Final'}
        </span>
      </header>

      <div style={styles.body}>
        <div style={styles.meta}>
          <span>Created {new Date(report.created_at).toLocaleDateString()}</span>
          <span>Updated {new Date(report.updated_at).toLocaleString()}</span>
        </div>

        {report.work_completed && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Work Completed</h2>
            <p style={styles.sectionContent}>{report.work_completed}</p>
          </div>
        )}

        {report.problems && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Problems</h2>
            <p style={styles.sectionContent}>{report.problems}</p>
          </div>
        )}

        {report.next_steps && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Next Steps</h2>
            <p style={styles.sectionContent}>{report.next_steps}</p>
          </div>
        )}

        {photos.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📷 Photos ({photos.length})</h2>
            <div style={styles.photoGrid}>
              {photos.map((p) => (
                <div key={p.id} style={styles.photoSlot}>
                  {photoUrls[p.id] ? (
                    <img src={photoUrls[p.id]} alt={`Photo ${p.display_order + 1}`} style={styles.photoImg} />
                  ) : (
                    <div style={styles.photoLoading}><div style={styles.spinnerSm} /></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={() => navigate(`/update/${report.project_id}/new?reportId=${report.id}`)}
            style={styles.editBtn}
          >
            ✏️ Edit Report
          </button>
          {/* PDF generation — Day 4 */}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' },
  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px' },
  spinner: { width: '32px', height: '32px', border: '3px solid #DEE2E6', borderTopColor: '#1A5276', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  spinnerSm: { width: '20px', height: '20px', border: '2px solid #DEE2E6', borderTopColor: '#1A5276', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#6C757D', fontSize: '14px', margin: 0 },
  errorText: { color: '#DC3545', fontSize: '16px', margin: 0, textAlign: 'center' },
  retryButton: { minHeight: '48px', padding: '12px 32px', background: '#1A5276', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  backLink: { background: 'none', border: 'none', color: '#1A5276', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' },
  header: { display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', paddingTop: 'max(16px, env(safe-area-inset-top))', background: '#FFFFFF', borderBottom: '1px solid #DEE2E6' },
  backBtn: { width: '40px', height: '40px', background: 'none', border: '1px solid #DEE2E6', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heading: { fontSize: '20px', fontWeight: 700, color: '#1A5276', margin: 0, flex: 1 },
  badgeDraft: { fontSize: '12px', fontWeight: 600, color: '#E67E22', background: '#FFF8F0', padding: '4px 10px', borderRadius: '12px', flexShrink: 0 },
  badgeFinal: { fontSize: '12px', fontWeight: 600, color: '#198754', background: '#F0FFF4', padding: '4px 10px', borderRadius: '12px', flexShrink: 0 },
  body: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, paddingBottom: 'max(24px, env(safe-area-inset-bottom))' },
  meta: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6C757D' },
  section: { background: '#FFFFFF', borderRadius: '10px', border: '1px solid #DEE2E6', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#1A5276', margin: 0 },
  sectionContent: { fontSize: '15px', color: '#212529', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' },
  photoSlot: { aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #DEE2E6', background: '#F1F3F5' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoLoading: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actions: { display: 'flex', gap: '8px', marginTop: '8px' },
  editBtn: { flex: 1, minHeight: '48px', background: '#1A5276', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
}
