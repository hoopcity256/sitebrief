import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../lib/projects'
import { createReport, listReportsForProject } from '../lib/reports'
import type { ProjectRow } from '../lib/projects'
import { AppShell } from '../components/AppShell'

// ── SVG Icons ──────────────────────────────────────────────────────────────

const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ── ProjectDetailPage ──────────────────────────────────────────────────────

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
      <AppShell activeTab="projects">
        <div style={styles.page}>
          {renderHeader(navigate)}
          <div style={styles.center}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading project…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !project) {
    return (
      <AppShell activeTab="projects">
        <div style={styles.page}>
          {renderHeader(navigate)}
          <div style={styles.center}>
            <p style={styles.errorText}>Could not load project.</p>
            <button onClick={() => fetchData()} style={styles.retryButton}>Retry</button>
            <button onClick={() => navigate('/projects')} style={styles.textLink}>
              ← Back to Projects
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell activeTab="projects">
      <div style={styles.page}>
        <header style={styles.header}>
          <button
            onClick={() => navigate('/projects')}
            style={styles.backBtn}
            aria-label="Back to projects"
          >
            <IconBack />
          </button>
          <h1 style={styles.heading}>{project.name}</h1>
        </header>

        {/* Project metadata */}
        {(project.customer_name || project.address) && (
          <div style={styles.metaCard}>
            {project.customer_name && (
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Customer</span>
                <span style={styles.metaValue}>{project.customer_name}</span>
              </div>
            )}
            {project.address && (
              <div style={{ ...styles.metaRow, borderBottom: 'none' }}>
                <span style={styles.metaLabel}>Address</span>
                <span style={styles.metaValue}>{project.address}</span>
              </div>
            )}
          </div>
        )}

        {/* New report CTA */}
        <div style={styles.ctaArea}>
          <button
            id="new-report-btn"
            style={{ ...styles.newReportBtn, opacity: creating ? 0.6 : 1 }}
            onClick={handleNewReport}
            disabled={creating}
          >
            <IconPlus />
            <span>{creating ? 'Creating…' : 'New Daily Report'}</span>
          </button>
          {createError && (
            <p style={styles.createError} role="alert">{createError}</p>
          )}
        </div>

        {/* Report history */}
        <div style={styles.section}>
          <h2 style={styles.sectionHeading}>Report History</h2>
          {reports.length === 0 ? (
            <div style={styles.emptyReports}>
              <p style={styles.emptyText}>No reports yet. Create your first daily report above.</p>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/update/${id}/new?reportId=${r.id}`)
                  }}
                >
                  <div style={styles.reportInfo}>
                    <span style={styles.reportNumber}>Report #{r.report_number}</span>
                    <span style={styles.reportDate}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.reportRight}>
                    <span style={r.is_draft ? styles.badgeDraft : styles.badgeFinal}>
                      {r.is_draft ? 'Draft' : 'Final'}
                    </span>
                    <IconChevron />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// Shared header for loading/error states
function renderHeader(navigate: ReturnType<typeof useNavigate>) {
  return (
    <header style={styles.header}>
      <button onClick={() => navigate('/projects')} style={styles.backBtn} aria-label="Back to projects">
        <IconBack />
      </button>
      <h1 style={styles.heading}>Project</h1>
    </header>
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
  loadingText: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  errorText:   { color: 'var(--color-danger)', fontSize: '15px', margin: 0 },
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
    fontSize: '18px', fontWeight: 700,
    color: 'var(--color-primary)', margin: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    flex: 1,
  },
  metaCard: {
    margin: '12px 16px 0',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  metaRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
    gap: '12px',
  },
  metaLabel: { fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', flexShrink: 0 },
  metaValue: {
    fontSize: '14px', color: 'var(--color-text)',
    textAlign: 'right' as const, minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  ctaArea: { padding: '16px 16px 0' },
  newReportBtn: {
    width: '100%', minHeight: '52px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    boxShadow: '0 2px 6px rgba(26,82,118,0.25)',
  },
  createError: {
    color: 'var(--color-danger)', fontSize: '14px',
    padding: '10px 14px', background: 'var(--color-danger-soft)',
    borderRadius: 'var(--radius-sm)', margin: '10px 0 0',
  },
  section: { padding: '16px' },
  sectionHeading: {
    fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)', margin: '0 0 8px',
  },
  emptyReports: {
    padding: '28px 16px', border: '2px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)', textAlign: 'center',
  },
  emptyText: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  reportList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  reportCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    border: '1px solid var(--color-border)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer', gap: '12px',
    boxShadow: 'var(--shadow-sm)',
  },
  reportInfo: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
  reportNumber: { fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' },
  reportDate:   { fontSize: '12px', color: 'var(--color-text-muted)' },
  reportRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, color: 'var(--color-text-muted)' },
  badgeDraft: {
    fontSize: '11px', fontWeight: 700,
    color: 'var(--color-warning)', background: 'var(--color-warning-soft)',
    padding: '3px 10px', borderRadius: '20px',
  },
  badgeFinal: {
    fontSize: '11px', fontWeight: 700,
    color: 'var(--color-success)', background: 'var(--color-success-soft)',
    padding: '3px 10px', borderRadius: '20px',
  },
}
