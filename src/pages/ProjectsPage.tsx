import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../hooks/useProjects'
import { createProject, archiveProject } from '../lib/projects'
import { uploadCoverPhoto, removeCoverPhoto, getCoverPhotoUrl } from '../lib/projectCoverPhoto'
import type { ProjectRow } from '../lib/projects'
import { AppShell } from '../components/AppShell'
import { PlusIcon, EllipsisHIcon, ArchiveIcon, CameraIcon, XIcon } from '../components/icons'

// ── ProjectsPage ─────────────────────────────────────────────────────────────

export const ProjectsPage = () => {
  const { user } = useAuth()
  const { projects, loading, error, refetch } = useProjects()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)

  // ── Loading: NS skeleton cards ──────────────────────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div className="projects-page">
          <header className="projects-header">
            <h1 className="projects-wordmark">SiteBrief</h1>
            <div style={{ width: 44, height: 44 }} aria-hidden="true" />
          </header>
          <SkeletonList />
        </div>
      </AppShell>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <AppShell>
        <div className="projects-page">
          <header className="projects-header">
            <h1 className="projects-wordmark">SiteBrief</h1>
            <div style={{ width: 44, height: 44 }} aria-hidden="true" />
          </header>
          <div className="projects-error">
            <p className="projects-error__text">Could not load projects.</p>
            <button type="button" onClick={() => refetch()} className="projects-error__retry">
              Retry
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Archive handler ─────────────────────────────────────────────────────
  const handleArchive = async (projectId: string, projectName: string) => {
    if (!confirm(`Archive "${projectName}"? It will be hidden from your list.`)) return
    try {
      await archiveProject(projectId)
      await refetch()
    } catch {
      alert('Could not archive project. Please try again.')
    }
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="projects-page">
        <header className="projects-header">
          {/* Mobile: wordmark as de-facto logo; hidden on desktop (sidebar covers it) */}
          <h1 className="projects-wordmark">SiteBrief</h1>

          {/* NS: pill CTA button instead of circular FAB */}
          <button
            id="new-project-btn"
            type="button"
            className="projects-new-btn"
            onClick={() => setShowForm(true)}
            aria-label="New Project"
          >
            <PlusIcon size={16} />
            New Project
          </button>
        </header>

        {/* New Project inline form */}
        {showForm && user && (
          <NewProjectForm
            userId={user.id}
            onCreated={() => { setShowForm(false); void refetch() }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Empty state */}
        {projects.length === 0 && !showForm && (
          <div className="projects-empty">
            <div className="projects-empty__icon" aria-hidden="true">
              <svg
                viewBox="0 0 48 48" fill="none"
                stroke="currentColor" strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round"
                width="56" height="56" aria-hidden="true"
              >
                <path d="M6 14a4 4 0 0 1 4-4h8l4 4h16a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V14z" />
              </svg>
            </div>
            <p className="projects-empty__heading">No projects yet</p>
            <p className="projects-empty__sub">Create your first project to get started.</p>
            <button
              type="button"
              className="projects-empty__btn"
              onClick={() => setShowForm(true)}
            >
              New Project
            </button>
          </div>
        )}

        {/* Project list — NS image cards */}
        {projects.length > 0 && (
          <ul className="projects-list" role="list">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard
                  project={p}
                  userId={user?.id ?? ''}
                  onNavigate={() => navigate(`/projects/${p.id}`)}
                  onArchive={handleArchive}
                  onCoverUpdated={() => void refetch()}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}

// ── ProjectCard — NS image-first design ──────────────────────────────────────

interface ProjectCardProps {
  project: ProjectRow
  userId: string
  onNavigate: () => void
  onArchive: (id: string, name: string) => Promise<void>
  onCoverUpdated: () => void
}

function ProjectCard({ project: p, userId, onNavigate, onArchive, onCoverUpdated }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load signed URL for cover photo
  useEffect(() => {
    let cancelled = false
    if (p.cover_photo_path) {
      getCoverPhotoUrl(p.cover_photo_path).then((url) => {
        if (!cancelled) setCoverUrl(url)
      }).catch(() => { /* no-op */ })
    } else {
      setCoverUrl(null)
    }
    return () => { cancelled = true }
  }, [p.cover_photo_path])

  // ── Whole-card navigation ────────────────────────────────────────────────
  // The card wrapper is the navigation target (div[role=button]).
  // Interactive child controls call e.stopPropagation() to prevent navigation.

  const handleCardClick = useCallback(() => {
    // Guard: ignore if menu is open (close menu instead)
    if (menuOpen) { setMenuOpen(false); return }
    onNavigate()
  }, [menuOpen, onNavigate])

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onNavigate()
    }
  }, [onNavigate])

  // ── Menu ─────────────────────────────────────────────────────────────────
  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(prev => !prev)
  }, [])

  const handleMenuBlur = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setMenuOpen(false)
    }
  }, [])

  const handleArchiveClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    setArchiving(true)
    try {
      await onArchive(p.id, p.name)
    } finally {
      setArchiving(false)
    }
  }, [onArchive, p.id, p.name])

  // ── Photo management ─────────────────────────────────────────────────────
  // Photo management lives in the three-dot menu; no overlay on the cover image.

  const handleCoverChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setCoverError(null)
    setUploading(true)
    try {
      await uploadCoverPhoto(file, userId, p.id)
      onCoverUpdated()
    } catch {
      setCoverError('Photo couldn\u2019t be uploaded. Try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [userId, p.id, onCoverUpdated])

  const handlePhotoMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    setCoverError(null)
    fileInputRef.current?.click()
  }, [])

  const handleRemoveCover = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (!userId) return
    setCoverError(null)
    setUploading(true)
    try {
      await removeCoverPhoto(userId, p.id)
      onCoverUpdated()
    } catch {
      setCoverError('Photo couldn\u2019t be removed. Try again.')
    } finally {
      setUploading(false)
    }
  }, [userId, p.id, onCoverUpdated])

  const initial = p.name.charAt(0).toUpperCase()
  const hasCustomer = Boolean(p.customer_name)
  const hasAddress  = Boolean(p.address)
  const hasCover    = Boolean(p.cover_photo_path)

  return (
    <div className="project-card-wrap" onBlur={handleMenuBlur}>
      {/* Hidden file input — at top level, outside the card button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabIndex={-1}
        className="detail-hero__file-input"
        onChange={handleCoverChange}
      />

      {/* Whole card is the navigation target */}
      <div
        className="project-card"
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        aria-label={`Open project: ${p.name}`}
      >
        {/* ── Cover photo region — pure display, image triggers navigation ── */}
        <div className="project-card__cover" aria-hidden="true">
          {uploading ? (
            <div className="project-card__cover-uploading" aria-label="Updating cover photo">
              <span className="spinner-sm" aria-hidden="true" />
            </div>
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="project-card__cover-img"
            />
          ) : (
            <div className="project-card__cover-fallback">
              {initial}
            </div>
          )}
        </div>

        {/* ── Body: text + three-dot menu ── */}
        <div className="project-card__body">
          <div className="project-card__text">
            <p className="project-card__name">{p.name}</p>
            {hasCustomer && (
              <p className="project-card__customer">{p.customer_name}</p>
            )}
            {hasAddress && (
              <div className="project-card__meta-row">
                <p className="project-card__meta">{p.address}</p>
              </div>
            )}
          </div>

          {/* Three-dot menu — stopPropagation prevents card navigation */}
          <div
            className="project-card__menu-zone"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="project-card__menu-btn"
              onClick={toggleMenu}
              aria-label={`More options for ${p.name}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              disabled={archiving}
            >
              {archiving
                ? <span className="spinner-sm" aria-label="Archiving" />
                : <EllipsisHIcon size={20} />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Inline cover error — beneath card */}
      {coverError && (
        <p className="project-card__cover-error" role="alert">
          {coverError}
        </p>
      )}

      {/* Three-dot popover menu */}
      {menuOpen && (
        <div
          className="project-card__menu-popover"
          role="menu"
          aria-label={`Options for ${p.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Add / Change project photo */}
          <button
            type="button"
            role="menuitem"
            className="project-card__menu-item"
            onClick={handlePhotoMenuClick}
          >
            <CameraIcon size={16} />
            {hasCover ? 'Change project photo' : 'Add project photo'}
          </button>

          {/* Remove photo — only when cover exists */}
          {hasCover && (
            <button
              type="button"
              role="menuitem"
              className="project-card__menu-item"
              onClick={handleRemoveCover}
            >
              <XIcon size={16} />
              Remove photo
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            className="project-card__menu-item project-card__menu-item--danger"
            onClick={handleArchiveClick}
          >
            <ArchiveIcon size={16} />
            Archive project
          </button>
        </div>
      )}
    </div>
  )
}



// ── SkeletonList — NS image-card shape ───────────────────────────────────────

function SkeletonList() {
  return (
    <div className="projects-skeleton" aria-label="Loading projects" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="projects-skeleton__card" aria-hidden="true">
          <div className="skeleton projects-skeleton__cover" />
          <div className="projects-skeleton__body">
            <div className="skeleton projects-skeleton__line projects-skeleton__line--title" />
            <div className="skeleton projects-skeleton__line projects-skeleton__line--meta" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── NewProjectForm ────────────────────────────────────────────────────────────

interface NewProjectFormProps {
  userId: string
  onCreated: () => void
  onCancel: () => void
}

function NewProjectForm({ userId, onCreated, onCancel }: NewProjectFormProps) {
  const [name, setName]                   = useState('')
  const [customerName, setCustomerName]   = useState('')
  const [address, setAddress]             = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  // Business logic preserved verbatim
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await createProject(userId, {
        name: name.trim(),
        customer_name: customerName.trim() || undefined,
        address: address.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
      })
      onCreated()
    } catch {
      setError('Could not create project. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="new-project-form-wrap">
      <div className="new-project-form">
        <h2 className="new-project-form__title">New Project</h2>

        {error && (
          <div className="new-project-form__error" role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="new-project-form__fields">
            <div className="new-project-form__field">
              <label htmlFor="project-name" className="new-project-form__label">
                Project Name <span className="new-project-form__required" aria-hidden="true">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                className="new-project-form__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="123 Main St Renovation"
                required
                autoComplete="off"
              />
            </div>

            <div className="new-project-form__field">
              <label htmlFor="project-customer" className="new-project-form__label">
                Customer Name
              </label>
              <input
                id="project-customer"
                type="text"
                className="new-project-form__input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Smith"
                autoComplete="off"
              />
            </div>

            <div className="new-project-form__field">
              <label htmlFor="project-address" className="new-project-form__label">
                Address
              </label>
              <input
                id="project-address"
                type="text"
                className="new-project-form__input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Anytown"
                autoComplete="off"
              />
            </div>

            <div className="new-project-form__field">
              <label htmlFor="project-email" className="new-project-form__label">
                Customer Email
              </label>
              <input
                id="project-email"
                type="email"
                className="new-project-form__input"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@email.com"
                autoComplete="off"
              />
            </div>

            <div className="new-project-form__field">
              <label htmlFor="project-phone" className="new-project-form__label">
                Customer Phone
              </label>
              <input
                id="project-phone"
                type="tel"
                className="new-project-form__input"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="new-project-form__actions">
            <button type="button" onClick={onCancel} className="new-project-form__cancel">
              Cancel
            </button>
            <button
              id="project-submit"
              type="submit"
              disabled={submitting}
              className="new-project-form__submit"
            >
              {submitting ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
