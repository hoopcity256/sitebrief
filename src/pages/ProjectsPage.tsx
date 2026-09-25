import React, { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../hooks/useProjects'
import { createProject, archiveProject } from '../lib/projects'
import type { ProjectRow } from '../lib/projects'
import { AppShell } from '../components/AppShell'
import { BuildingIcon, PlusIcon, EllipsisHIcon, ArchiveIcon } from '../components/icons'

// ── ProjectsPage ───────────────────────────────────────────────────────────


export const ProjectsPage = () => {
  const { user } = useAuth()
  const { projects, loading, error, refetch } = useProjects()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)

  // ── Loading: skeleton cards (spec §J) ──────────────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div className="projects-page">
          <header className="projects-header">
            <h1 className="projects-wordmark">SiteBrief</h1>
            <div style={{ width: 48, height: 48 }} aria-hidden="true" />
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
            <div style={{ width: 48, height: 48 }} aria-hidden="true" />
          </header>
          <div className="projects-error">
            <p className="projects-error__text">Could not load projects.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="projects-error__retry"
            >
              Retry
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Archive handler (behavior unchanged from original) ─────────────────
  const handleArchive = async (projectId: string, projectName: string) => {
    if (!confirm(`Archive "${projectName}"? It will be hidden from your list.`)) return
    try {
      await archiveProject(projectId)
      await refetch()
    } catch {
      alert('Could not archive project. Please try again.')
    }
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="projects-page">
        <header className="projects-header">
          {/* Mobile: wordmark as de-facto logo; hidden on desktop (sidebar covers it) */}
          <h1 className="projects-wordmark">SiteBrief</h1>

          {/* FAB — 48×48 per global rule */}
          <button
            id="new-project-btn"
            type="button"
            className="projects-fab"
            onClick={() => setShowForm(true)}
            aria-label="New Project"
            title="New Project"
          >
            <PlusIcon size={22} />
          </button>
        </header>

        {/* New Project inline form */}
        {showForm && user && (
          <NewProjectForm
            userId={user.id}
            onCreated={() => { setShowForm(false); refetch() }}
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
            <p className="projects-empty__sub">Tap + to create your first project.</p>
            <button
              type="button"
              className="projects-empty__btn"
              onClick={() => setShowForm(true)}
            >
              New Project
            </button>
          </div>
        )}

        {/* Project list */}
        {projects.length > 0 && (
          <ul className="projects-list" role="list">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard
                  project={p}
                  onNavigate={() => navigate(`/projects/${p.id}`)}
                  onArchive={handleArchive}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}

// ── ProjectCard ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectRow
  onNavigate: () => void
  onArchive: (id: string, name: string) => Promise<void>
}

function ProjectCard({ project: p, onNavigate, onArchive }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(prev => !prev)
  }, [])

  // Close menu on outside interaction — simple blur-based approach
  const handleMenuBlur = useCallback((e: React.FocusEvent) => {
    // Only close if focus leaves the menu zone entirely
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

  const hasCustomer = Boolean(p.customer_name)
  const hasAddress  = Boolean(p.address)

  return (
    <div
      className="project-card-wrap"
      onBlur={handleMenuBlur}
    >
      <div className="project-card">
        {/* Main tap area → navigate to project detail */}
        <button
          type="button"
          className="project-card__body"
          onClick={onNavigate}
          aria-label={`Open project: ${p.name}`}
        >
          {/* Optional building icon anchor */}
          <span className="project-card__icon" aria-hidden="true">
            <BuildingIcon size={20} />
          </span>

          <div className="project-card__text">
            <p className="project-card__name">{p.name}</p>
            {hasCustomer && (
              <p className="project-card__meta">{p.customer_name}</p>
            )}
            {hasAddress && (
              <p className="project-card__meta">{p.address}</p>
            )}
          </div>
        </button>

        {/* Three-dot menu trigger */}
        <div className="project-card__menu-zone">
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
              ? <span className="spinner-sm" aria-label="Archiving…" />
              : <EllipsisHIcon size={20} />
            }
          </button>
        </div>
      </div>

      {/* Inline archive action — shown when menu is open */}
      {menuOpen && (
        <div
          className="project-card__menu-popover"
          role="menu"
          aria-label={`Options for ${p.name}`}
        >
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


// ── SkeletonList ────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="projects-skeleton" aria-label="Loading projects" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="projects-skeleton__card" aria-hidden="true">
          <div className="skeleton projects-skeleton__line projects-skeleton__line--title" />
          <div className="skeleton projects-skeleton__line projects-skeleton__line--meta" />
          <div className="skeleton projects-skeleton__line projects-skeleton__line--meta"
               style={{ width: '30%' }} />
        </div>
      ))}
    </div>
  )
}

// ── NewProjectForm ──────────────────────────────────────────────────────────

interface NewProjectFormProps {
  userId: string
  onCreated: () => void
  onCancel: () => void
}

function NewProjectForm({ userId, onCreated, onCancel }: NewProjectFormProps) {
  const [name, setName]                 = useState('')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress]           = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState<string | null>(null)

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
            <button
              type="button"
              onClick={onCancel}
              className="new-project-form__cancel"
            >
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
