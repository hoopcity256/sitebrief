import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../lib/projects'
import type { ProjectRow } from '../lib/projects'

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await getProject(id)
      setProject(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchProject() }, [fetchProject])

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
          <button onClick={() => fetchProject()} style={styles.retryButton}>
            Retry
          </button>
          <button onClick={() => navigate('/projects')} style={styles.backLink}>
            ← Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          onClick={() => navigate('/projects')}
          style={styles.backBtn}
          aria-label="Back to projects"
        >
          ←
        </button>
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
        {project.customer_email && (
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Email</span>
            <span style={styles.detailValue}>{project.customer_email}</span>
          </div>
        )}
        {project.customer_phone && (
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Phone</span>
            <span style={styles.detailValue}>{project.customer_phone}</span>
          </div>
        )}
      </div>

      {/* New Report button — creation flow wired in T3.5 */}
      <button
        id="new-report-btn"
        style={styles.newReportBtn}
        disabled
        title="Reports — coming in the next update"
      >
        📝 New Report
      </button>

      <div style={styles.placeholder}>
        <p style={styles.placeholderText}>Reports will appear here.</p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: '#F8F9FA',
    display: 'flex',
    flexDirection: 'column',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #DEE2E6',
    borderTopColor: '#1A5276',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { color: '#6C757D', fontSize: '14px', margin: 0 },
  errorText: { color: '#DC3545', fontSize: '16px', margin: 0 },
  retryButton: {
    minHeight: '48px',
    padding: '12px 32px',
    background: '#1A5276',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#1A5276',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    background: '#FFFFFF',
    borderBottom: '1px solid #DEE2E6',
  },
  backBtn: {
    width: '40px',
    height: '40px',
    background: 'none',
    border: '1px solid #DEE2E6',
    borderRadius: '8px',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heading: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1A5276',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  details: {
    background: '#FFFFFF',
    margin: '12px 16px 0',
    borderRadius: '10px',
    border: '1px solid #DEE2E6',
    overflow: 'hidden',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #F1F3F5',
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6C757D',
  },
  detailValue: {
    fontSize: '14px',
    color: '#212529',
    textAlign: 'right',
  },
  newReportBtn: {
    margin: '16px 16px 0',
    minHeight: '48px',
    background: '#1A5276',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    opacity: 0.5,
  },
  placeholder: {
    margin: '16px',
    padding: '32px 16px',
    border: '2px dashed #DEE2E6',
    borderRadius: '10px',
    textAlign: 'center',
  },
  placeholderText: {
    color: '#ADB5BD',
    fontSize: '14px',
    margin: 0,
  },
}
