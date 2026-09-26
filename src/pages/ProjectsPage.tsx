import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../hooks/useProjects'
import { createProject, archiveProject } from '../lib/projects'
import { uploadCoverPhoto, removeCoverPhoto, getCoverPhotoUrl } from '../lib/projectCoverPhoto'
import { useSubscription } from '../hooks/useSubscription'
import { redirectToCheckout } from '../lib/subscription'
import type { ProjectRow } from '../lib/projects'
import { AppShell } from '../components/AppShell'
import { PlusIcon, EllipsisHIcon, ArchiveIcon, CameraIcon, XIcon } from '../components/icons'

// Vite inlines these at build time; they are public-safe price IDs.
const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID as string | undefined
const ANNUAL_PRICE_ID  = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID  as string | undefined


// ── ProjectsPage ─────────────────────────────────────────────────────────────

export const ProjectsPage = () => {
  const { user } = useAuth()
  const { projects, loading, error, refetch } = useProjects()
  const { subscription, loading: subLoading } = useSubscription()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false)
  const [trialLoading, setTrialLoading] = useState<'monthly' | 'annual' | null>(null)
  const [trialError, setTrialError] = useState<string | null>(null)

  // Show trial banner to brand-new users (no subscription row at all)
  const showTrialBanner = !subLoading && !subscription.row && !trialBannerDismissed

  const handleStartTrial = async (plan: 'monthly' | 'annual') => {
    if (trialLoading) return
    const priceId = plan === 'monthly' ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID
    if (!priceId) { setTrialError('Configuration error. Please contact support.'); return }
    setTrialLoading(plan)
    setTrialError(null)
    try {
      await redirectToCheckout(priceId)
    } catch (e: unknown) {
      setTrialError(e instanceof Error ? e.message : 'Could not start checkout.')
      setTrialLoading(null)
    }
  }

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

        {/* ── Trial CTA banner — shown to new users with no subscription row ── */}
        {showTrialBanner && (
          <div className="trial-banner" role="region" aria-label="Start your free trial">
            <button
              className="trial-banner__dismiss"
              onClick={() => setTrialBannerDismissed(true)}
              aria-label="Dismiss"
              type="button"
            >
              ✕
            </button>
            <p className="trial-banner__title">Start your 14-day free trial</p>
            <p className="trial-banner__body">
              Create unlimited reports and PDFs. Cancel anytime — no charge until the trial ends.
            </p>
            {trialError && (
              <p className="trial-banner__error" role="alert">{trialError}</p>
            )}
            <div className="trial-banner__actions">
              <button
                id="trial-monthly-btn"
                type="button"
                className="trial-banner__btn trial-banner__btn--primary"
                disabled={!!trialLoading}
                onClick={() => handleStartTrial('monthly')}
              >
                {trialLoading === 'monthly' ? 'Redirecting…' : 'Monthly — $9.99/mo'}
              </button>
              <button
                id="trial-annual-btn"
                type="button"
                className="trial-banner__btn trial-banner__btn--secondary"
                disabled={!!trialLoading}
                onClick={() => handleStartTrial('annual')}
              >
                {trialLoading === 'annual' ? 'Redirecting…' : 'Annual — $79.99/yr'}
              </button>
            </div>
          </div>
        )}

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

/**
 * Format a raw digit string as a US phone number: (XXX) XXX-XXXX
 * Called on every keystroke; preserves only digits and reformats.
 */
function formatUSPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Returns true if the string looks like a plausible email. Not RFC-level. */
function isValidEmail(v: string): boolean {
  if (!v) return true // Optional field — empty is fine
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function NewProjectForm({ userId, onCreated, onCancel }: NewProjectFormProps) {
  const [name, setName]                   = useState('')
  const [customerName, setCustomerName]   = useState('')
  const [address, setAddress]             = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [emailError, setEmailError]       = useState<string | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  // Cover photo state
  const [coverFile, setCoverFile]         = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const coverInputRef                     = useRef<HTMLInputElement>(null)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => { if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl) }
  }, [coverPreviewUrl])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUSPhone(e.target.value)
    setCustomerPhone(formatted)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerEmail(e.target.value)
    setEmailError(null)
  }

  const handleEmailBlur = () => {
    if (customerEmail && !isValidEmail(customerEmail)) {
      setEmailError('Please enter a valid email address.')
    }
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveCoverPreview = () => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverFile(null)
    setCoverPreviewUrl(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required.'); return }
    if (customerEmail && !isValidEmail(customerEmail)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Step 1: Create the project
      const project = await createProject(userId, {
        name: name.trim(),
        customer_name: customerName.trim() || undefined,
        address: address.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone || undefined,
      })

      // Step 2: Upload cover photo if selected
      // If this fails, keep the project — show a non-blocking notice.
      if (coverFile && project?.id) {
        try {
          await uploadCoverPhoto(coverFile, userId, project.id)
        } catch {
          // Project was created successfully; photo upload failed.
          // Do not lose the project — onCreated() will still be called.
          setError('Project created, but cover photo could not be uploaded. You can add it from the project page.')
          onCreated()
          return
        }
      }

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
                className={`new-project-form__input${emailError ? ' new-project-form__input--error' : ''}`}
                value={customerEmail}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="customer@email.com"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              {emailError && (
                <p className="new-project-form__field-error" role="alert">{emailError}</p>
              )}
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
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                autoComplete="off"
                inputMode="numeric"
              />
            </div>

            {/* Optional cover photo */}
            <div className="new-project-form__field">
              <span className="new-project-form__label">
                Project Photo
                <span className="new-project-form__hint"> Optional</span>
              </span>
              {coverPreviewUrl ? (
                <div className="new-project-form__cover-preview">
                  <img
                    src={coverPreviewUrl}
                    alt="Cover preview"
                    className="new-project-form__cover-img"
                  />
                  <button
                    type="button"
                    className="new-project-form__cover-remove"
                    onClick={handleRemoveCoverPreview}
                    aria-label="Remove cover photo"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="new-project-form__cover-pick">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    style={{ display: 'none' }}
                  />
                  <CameraIcon size={16} />
                  <span>Choose photo</span>
                </label>
              )}
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
