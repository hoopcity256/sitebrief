import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../lib/projects'
import { createReport, listReportsForProject } from '../lib/reports'
import type { ProjectRow } from '../lib/projects'
import { AppShell } from '../components/AppShell'
import { useSubscription } from '../hooks/useSubscription'
import {
  ChevronLeftIcon,
  PlusIcon,
  ChevronRightIcon,
  FileTextIcon,
  PersonIcon,
  MapPinIcon,
  MailIcon,
} from '../components/icons'

// ── Type for report list items ─────────────────────────────────────────────
type ReportListItem = {
  id: string
  report_number: number
  is_draft: boolean
  created_at: string
  generated_at: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatReportSummary(reports: ReportListItem[]): string {
  const count = reports.length
  if (count === 0) return 'No reports yet'
  const last = reports[0] // ordered desc so index 0 is latest
  const dateStr = formatDate(last.created_at)
  return `${count} ${count === 1 ? 'Report' : 'Reports'} · Last ${dateStr}`
}

// ── ProjectDetailPage ──────────────────────────────────────────────────────

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { subscription, loading: subLoading } = useSubscription()

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

  // One-shot handler — never from useEffect; subscription guard preserved
  const handleNewReport = async () => {
    if (!id || creating) return
    if (!subscription.entitled) return
    setCreating(true)
    setCreateError(null)
    try {
      const result = await createReport(id)
      navigate(`/update/${id}/new?reportId=${result.report_id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('active subscription') || msg.includes('has_active_access')) {
        setCreateError('An active subscription is required to create reports.')
      } else {
        setCreateError('Could not create report. Please try again.')
      }
    } finally {
      setCreating(false)
    }
  }

  // ── Loading state: skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div className="detail-page">
          <DetailHeader onBack={() => navigate('/projects')} title="Project" />
          <div className="detail-skeleton" aria-label="Loading project" aria-busy="true">
            <div className="skeleton detail-skeleton__strip" aria-hidden="true" />
            <div className="skeleton detail-skeleton__btn" aria-hidden="true" />
            <div className="skeleton detail-skeleton__card" aria-hidden="true" />
            <div className="skeleton detail-skeleton__card" aria-hidden="true" />
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error || !project) {
    return (
      <AppShell>
        <div className="detail-page">
          <DetailHeader onBack={() => navigate('/projects')} title="Project" />
          <div className="detail-center">
            <p className="detail-error-text">Could not load project.</p>
            <button type="button" onClick={() => fetchData()} className="detail-retry-btn">
              Retry
            </button>
            <button type="button" onClick={() => navigate('/projects')} className="detail-back-link">
              ← Back to Projects
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  const hasCustomer = Boolean(project.customer_name)
  const hasAddress  = Boolean(project.address)
  const hasPhone    = Boolean(project.customer_phone)
  const hasEmail    = Boolean(project.customer_email)
  const hasInfo     = hasCustomer || hasAddress || hasPhone || hasEmail
  const reportSummary = formatReportSummary(reports)
  const notEntitled = !subLoading && !subscription.entitled

  // ── Report navigation — AUTHORIZED FIX (owner decision 15) ────────────
  // Draft  → editor  (/update/:projectId/new?reportId=...)
  // Final  → preview (/preview/:reportId)
  const handleReportClick = (r: ReportListItem) => {
    if (r.is_draft) {
      navigate(`/update/${id}/new?reportId=${r.id}`)
    } else {
      navigate(`/preview/${r.id}`)
    }
  }

  return (
    <AppShell>
      <div className="detail-page">
        {/* Header */}
        <DetailHeader onBack={() => navigate('/projects')} title={project.name} />

        {/* Info strip */}
        {(hasInfo || reports.length >= 0) && (
          <div className="detail-info-strip">
            {hasCustomer && (
              <div className="detail-info-row">
                <span className="detail-info-icon" aria-hidden="true">
                  <PersonIcon size={16} />
                </span>
                <span className="detail-info-text">{project.customer_name}</span>
              </div>
            )}
            {hasAddress && (
              <div className="detail-info-row">
                <span className="detail-info-icon" aria-hidden="true">
                  <MapPinIcon size={16} />
                </span>
                <span className="detail-info-text">{project.address}</span>
              </div>
            )}
            {hasPhone && (
              <div className="detail-info-row">
                <span className="detail-info-icon" aria-hidden="true">
                  {/* Phone icon — inline SVG since PhoneIcon not in lib yet */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={1.75}
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.56 3.44 2 2 0 0 1 3.53 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16z" />
                  </svg>
                </span>
                <span className="detail-info-text">{project.customer_phone}</span>
              </div>
            )}
            {hasEmail && (
              <div className="detail-info-row">
                <span className="detail-info-icon" aria-hidden="true">
                  <MailIcon size={16} />
                </span>
                <span className="detail-info-text">{project.customer_email}</span>
              </div>
            )}
            {/* Report count / last date — derived from already-loaded reports */}
            <div className="detail-info-row">
              <span className="detail-info-icon" aria-hidden="true">
                <FileTextIcon size={16} />
              </span>
              <span className="detail-info-text detail-info-text--muted">{reportSummary}</span>
            </div>
          </div>
        )}

        {/* Upsell banner — shown when subscription not entitled */}
        {notEntitled && (
          <div className="detail-upsell" role="alert">
            <span className="detail-upsell__text">
              {subscription.row
                ? 'Your trial or subscription has expired. Subscribe to create new reports.'
                : 'A subscription is required to create reports.'}
            </span>
            <button
              id="subscribe-cta-btn"
              type="button"
              className="detail-upsell__btn"
              onClick={() => navigate('/more')}
            >
              View Plans
            </button>
          </div>
        )}

        {/* New Daily Report CTA */}
        <div className="detail-cta">
          <button
            id="new-report-btn"
            type="button"
            className="detail-new-report-btn"
            onClick={handleNewReport}
            disabled={creating || !subscription.entitled}
            aria-disabled={!subscription.entitled}
          >
            <PlusIcon size={20} />
            <span>{creating ? 'Creating…' : '+ New Daily Report'}</span>
          </button>
          {createError && (
            <div className="detail-create-error" role="alert">{createError}</div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="detail-section">
          <p className="detail-section-label" aria-label="Recent Reports">Recent Reports</p>
          {reports.length === 0 ? (
            <div className="detail-reports-empty">
              <p className="detail-reports-empty__text">
                No reports yet. Tap + New Daily Report above.
              </p>
            </div>
          ) : (
            <ul className="detail-report-list" role="list">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="detail-report-card"
                    onClick={() => handleReportClick(r)}
                    aria-label={
                      `Report #${r.report_number}, ${r.is_draft ? 'Draft' : 'Final'}, ${formatDate(r.created_at)}`
                    }
                  >
                    {/* Doc icon */}
                    <span className="detail-report-icon" aria-hidden="true">
                      <FileTextIcon size={18} />
                    </span>

                    {/* Report info */}
                    <div className="detail-report-info">
                      <span className="detail-report-number">Report #{r.report_number}</span>
                      <span className="detail-report-date">{formatDate(r.created_at)}</span>
                    </div>

                    {/* Right: badge + chevron */}
                    <div className="detail-report-right">
                      {/* Status conveyed textually via badge text and aria-label — not color alone */}
                      <span
                        className={`badge ${r.is_draft ? 'badge--draft' : 'badge--final'}`}
                        aria-hidden="true"
                      >
                        {r.is_draft ? 'Draft' : 'Final'}
                      </span>
                      <ChevronRightIcon size={16} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// ── DetailHeader — shared across loading/error/main states ─────────────────

interface DetailHeaderProps {
  onBack: () => void
  title: string
}

function DetailHeader({ onBack, title }: DetailHeaderProps) {
  return (
    <header className="detail-header">
      <button
        type="button"
        className="detail-back-btn"
        onClick={onBack}
        aria-label="Back to projects"
      >
        <ChevronLeftIcon size={18} />
      </button>
      <h1 className="detail-heading">{title}</h1>
    </header>
  )
}
