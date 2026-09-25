import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../lib/projects'
import { createReport, listReportsForProject } from '../lib/reports'
import type { ProjectRow } from '../lib/projects'
import { AppShell } from '../components/AppShell'
import { useSubscription } from '../hooks/useSubscription'
import { uploadCoverPhoto, removeCoverPhoto, getCoverPhotoUrl } from '../lib/projectCoverPhoto'
import {
  ChevronLeftIcon,
  PlusIcon,
  ChevronRightIcon,
  FileTextIcon,
  CameraIcon,
} from '../components/icons'

// ── Type for report list items ──────────────────────────────────────────────
type ReportListItem = {
  id: string
  report_number: number
  is_draft: boolean
  created_at: string
  generated_at: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function buildMetaLine(project: ProjectRow): string {
  const parts: string[] = []
  if (project.customer_name) parts.push(project.customer_name)
  if (project.address) parts.push(project.address)
  return parts.join(' · ')
}

// ── ProjectDetailPage ────────────────────────────────────────────────────────

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  // Photo menu popover — single "Edit photo" button reveals Change / Remove
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      // Load signed cover URL
      const url = await getCoverPhotoUrl(proj.cover_photo_path)
      setCoverUrl(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void fetchData() }, [fetchData])

  // Cover photo upload handler
  const handleCoverChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !project) return
    setCoverError(null)
    setCoverUploading(true)
    try {
      await uploadCoverPhoto(file, project.user_id, project.id)
      // Re-fetch to get updated cover_photo_path and signed URL
      const newProject = await getProject(project.id)
      setProject(newProject)
      const url = await getCoverPhotoUrl(newProject.cover_photo_path)
      setCoverUrl(url)
    } catch {
      setCoverError('Photo couldn\u2019t be uploaded. Try again.')
    } finally {
      setCoverUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [project])

  // Cover photo remove handler
  const handleRemoveCover = useCallback(async () => {
    if (!project) return
    setCoverError(null)
    setCoverUploading(true)
    try {
      await removeCoverPhoto(project.user_id, project.id)
      setProject(prev => prev ? { ...prev, cover_photo_path: null } : prev)
      setCoverUrl(null)
    } catch {
      setCoverError('Photo couldn\u2019t be removed. Try again.')
    } finally {
      setCoverUploading(false)
    }
  }, [project])

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
        <div className="detail-page" aria-label="Loading project" aria-busy="true">
          <div className="detail-skeleton">
            <div className="skeleton detail-skeleton__hero" aria-hidden="true" />
            <div className="skeleton detail-skeleton__strip" aria-hidden="true" />
            <div className="skeleton detail-skeleton__btn" aria-hidden="true" />
            <div className="skeleton detail-skeleton__card" aria-hidden="true" />
            <div className="skeleton detail-skeleton__card" aria-hidden="true" />
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error || !project) {
    return (
      <AppShell>
        <div className="detail-page">
          <div className="detail-center">
            <p className="detail-error-text">Could not load project.</p>
            <button type="button" onClick={() => void fetchData()} className="detail-retry-btn">
              Retry
            </button>
            <button type="button" onClick={() => navigate('/projects')} className="detail-back-link">
              Back to Projects
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  const metaLine = buildMetaLine(project)
  const reportSummary = formatReportSummary(reports)
  const notEntitled = !subLoading && !subscription.entitled
  const initial = project.name.charAt(0).toUpperCase()

  // ── Report navigation — AUTHORIZED FIX (owner decision 15) ─────────────
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

        {/* ── NS: Hero image with overlaid back button ── */}
        <div className="detail-hero">
          {coverUrl ? (
            <img src={coverUrl} alt={`Cover photo for ${project.name}`} className="detail-hero__img" />
          ) : (
            <div className="detail-hero__fallback" aria-hidden="true">{initial}</div>
          )}
          <div className="detail-hero__overlay" aria-hidden="true" />

          {/* Back button — overlaid */}
          <button
            type="button"
            className="detail-hero__back"
            onClick={() => navigate('/projects')}
            aria-label="Back to projects"
          >
            <ChevronLeftIcon size={18} />
          </button>

          {/* Cover photo input + action buttons */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-hidden="true"
            tabIndex={-1}
            className="detail-hero__file-input"
            onChange={handleCoverChange}
          />
          {coverUploading ? (
            <div className="detail-hero__uploading" aria-label="Updating cover photo">
              <span className="spinner-sm" aria-hidden="true" />
            </div>
          ) : coverUrl ? (
            /* When cover exists: single "Edit photo" button → small popover */
            <div className="detail-hero__photo-actions">
              <button
                type="button"
                className="detail-hero__photo-btn"
                onClick={() => setPhotoMenuOpen(prev => !prev)}
                aria-haspopup="menu"
                aria-expanded={photoMenuOpen}
                aria-label="Edit cover photo"
              >
                <CameraIcon size={12} />
                Edit photo
              </button>
              {photoMenuOpen && (
                <div className="detail-hero__photo-popover" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="detail-hero__photo-menu-item"
                    onClick={() => {
                      setPhotoMenuOpen(false)
                      setCoverError(null)
                      fileInputRef.current?.click()
                    }}
                  >
                    Change photo
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="detail-hero__photo-menu-item detail-hero__photo-menu-item--remove"
                    onClick={() => {
                      setPhotoMenuOpen(false)
                      void handleRemoveCover()
                    }}
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* When no cover: plain "Add photo" button */
            <button
              type="button"
              className="detail-hero__photo-btn"
              onClick={() => { setCoverError(null); fileInputRef.current?.click() }}
              aria-label="Add cover photo"
            >
              <CameraIcon size={12} />
              Add photo
            </button>
          )}
        </div>

        {/* Cover photo error — shown beneath hero, above identity */}
        {coverError && (
          <p className="detail-cover-error" role="alert">{coverError}</p>
        )}

        {/* ── Project identity ── */}
        <div className="detail-identity">
          <h1 className="detail-project-name">{project.name}</h1>
          {metaLine && (
            <p className="detail-meta-line">{metaLine}</p>
          )}
          <p className="detail-report-summary">{reportSummary}</p>
        </div>

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
            <span>{creating ? 'Creating…' : 'New Daily Report'}</span>
          </button>
          {createError && (
            <div className="detail-create-error" role="alert">{createError}</div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="detail-section">
          <p className="detail-section-label">Recent Reports</p>
          {reports.length === 0 ? (
            <div className="detail-reports-empty">
              <p className="detail-reports-empty__text">
                No reports yet. Tap New Daily Report above.
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
