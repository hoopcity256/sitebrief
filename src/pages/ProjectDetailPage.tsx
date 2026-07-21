import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../lib/projects'
import { createReport, listReportsForProject } from '../lib/reports'
import type { ProjectRow } from '../lib/projects'

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [reports, setReports] = useState<{
    id: string
    report_number: number
    is_draft: boolean
    created_at: string
    generated_at: string | null
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [proj, reps] = await Promise.all([
        getProject(id),
        listReportsForProject(id),
      ])
      setProject(proj)
      setReports(reps)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // One-shot button handler — never from useEffect
  const handleNewReport = async () => {
    if (!id || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const result = await createReport(id)
      navigate(`/update/${id}/new?reportId=${result.report_id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('Active subscription required') || msg.includes('has_active_access')) {
        setCreateError('An active subscription is required to create reports.')
      } else {
        setCreateError('Could not create report. Please try again.')
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading project…</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={styles.errorText}>Could not load project.</p>
          <button onClick={() => fetchData()} style={styles.retryButton}>Retry</button>
          <button onClick={() => navigate('/projects')} style={styles.backLink}>← Back to Projects</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button onClick={() => navigate('/projects')} style={styles.backBtn} aria-label="Back to projects">←</button>
        <h1 style={styles.heading}>{project.name}</h1>
      </header>

      <div style={styles.details}>
        {project.customer_name && (
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Customer</span>
            <span style={styles.detailValue}>{project.customer_name}</span>
          </div>
        )}
        {project.address && (
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Address</span>
            <span style={styles.detailValue}>{project.address}</span>
          </div>
        )}
      </div>

      <button
        id="new-report-btn"
        style={{ ...styles.newReportBtn, opacity: creating ? 0.6 : 1 }}
        onClick={handleNewReport}
        disabled={creating}
      >
        {creating ? 'Creating…' : '📝 New Report'}
      </button>

      {createError && <p style={styles.createError}>{createError}</p>}

      {reports.length === 0 ? (
        <div style={styles.emptyReports}>
          <p style={styles.emptyText}>No reports yet. Tap "New Report" to create one.</p>
        </div>
      ) : (
        <div style={styles.reportList}>
          {reports.map((r) => (
            <div
              key={r.id}
              style={styles.reportCard}
              onClick={() => navigate(`/update/${id}/new?reportId=${r.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/update/${id}/new?reportId=${r.id}`) }}
            >
              <div style={styles.reportInfo}>
                <span style={styles.reportNumber}>Report #{r.report_number}</span>
                <span style={styles.reportDate}>
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <span style={r.is_draft ? styles.badgeDraft : styles.badgeFinal}>
                {r.is_draft ? 'Draft' : 'Final'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' },
  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px' },
  spinner: { width: '32px', height: '32px', border: '3px solid #DEE2E6', borderTopColor: '#1A5276', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#6C757D', fontSize: '14px', margin: 0 },
  errorText: { color: '#DC3545', fontSize: '16px', margin: 0 },
  retryButton: { minHeight: '48px', padding: '12px 32px', background: '#1A5276', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  backLink: { background: 'none', border: 'none', color: '#1A5276', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' },
  header: { display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', paddingTop: 'max(16px, env(safe-area-inset-top))', background: '#FFFFFF', borderBottom: '1px solid #DEE2E6' },
  backBtn: { width: '40px', height: '40px', background: 'none', border: '1px solid #DEE2E6', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heading: { fontSize: '20px', fontWeight: 700, color: '#1A5276', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  details: { background: '#FFFFFF', margin: '12px 16px 0', borderRadius: '10px', border: '1px solid #DEE2E6', overflow: 'hidden' },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #F1F3F5' },
  detailLabel: { fontSize: '13px', fontWeight: 500, color: '#6C757D' },
  detailValue: { fontSize: '14px', color: '#212529', textAlign: 'right' },
  newReportBtn: { margin: '16px 16px 0', minHeight: '48px', background: '#1A5276', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  createError: { color: '#DC3545', fontSize: '14px', padding: '8px 12px', background: '#FFF3F3', borderRadius: '6px', margin: '8px 16px 0' },
  emptyReports: { margin: '16px', padding: '32px 16px', border: '2px dashed #DEE2E6', borderRadius: '10px', textAlign: 'center' },
  emptyText: { color: '#ADB5BD', fontSize: '14px', margin: 0 },
  reportList: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px' },
  reportCard: { background: '#FFFFFF', borderRadius: '10px', padding: '14px 16px', border: '1px solid #DEE2E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  reportInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  reportNumber: { fontSize: '15px', fontWeight: 600, color: '#212529' },
  reportDate: { fontSize: '12px', color: '#6C757D' },
  badgeDraft: { fontSize: '12px', fontWeight: 600, color: '#E67E22', background: '#FFF8F0', padding: '4px 10px', borderRadius: '12px' },
  badgeFinal: { fontSize: '12px', fontWeight: 600, color: '#198754', background: '#F0FFF4', padding: '4px 10px', borderRadius: '12px' },
}
