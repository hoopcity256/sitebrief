import React, { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../hooks/useProjects'
import { createProject, archiveProject } from '../lib/projects'
import { AppShell } from '../components/AppShell'

// ── SVG icons ──────────────────────────────────────────────────────────────

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconArchive = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" rx="1" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)

const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ── ProjectsPage ───────────────────────────────────────────────────────────

export const ProjectsPage = () => {
  const { user } = useAuth()
  const { projects, loading, error, refetch } = useProjects()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [archiving, setArchiving] = useState<string | null>(null)

  if (loading) {
    return (
      <AppShell activeTab="projects">
        <div style={styles.page}>
          <header style={styles.header}>
            <h1 style={styles.heading}>Projects</h1>
          </header>
          <div style={styles.center}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading projects…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeTab="projects">
        <div style={styles.page}>
          <header style={styles.header}>
            <h1 style={styles.heading}>Projects</h1>
          </header>
          <div style={styles.center}>
            <p style={styles.errorText}>Could not load projects.</p>
            <button onClick={() => refetch()} style={styles.retryButton}>Retry</button>
          </div>
        </div>
      </AppShell>
    )
  }

  const handleArchive = async (projectId: string, projectName: string) => {
    if (!confirm(`Archive "${projectName}"? It will be hidden from your list.`)) return
    setArchiving(projectId)
    try {
      await archiveProject(projectId)
      await refetch()
    } catch {
      alert('Could not archive project. Please try again.')
    } finally {
      setArchiving(null)
    }
  }

  return (
    <AppShell activeTab="projects">
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.heading}>Projects</h1>
          <button
            id="new-project-btn"
            onClick={() => setShowForm(true)}
            style={styles.fab}
            aria-label="New Project"
          >
            <IconPlus />
          </button>
        </header>

        {showForm && user && (
          <NewProjectForm
            userId={user.id}
            onCreated={() => { setShowForm(false); refetch() }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {projects.length === 0 && !showForm ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg viewBox="0 0 48 48" fill="none" stroke="var(--color-border)" strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round" width="52" height="52" aria-hidden="true">
                <path d="M6 14a4 4 0 0 1 4-4h8l4 4h16a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V14z" />
              </svg>
            </div>
            <p style={styles.emptyText}>No projects yet</p>
            <p style={styles.emptySubtext}>Tap + to create your first project.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={styles.card}
                onClick={() => navigate(`/projects/${p.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/projects/${p.id}`) }}
              >
                <div style={styles.cardContent}>
                  <h2 style={styles.cardTitle}>{p.name}</h2>
                  {p.customer_name && <p style={styles.cardMeta}>{p.customer_name}</p>}
                  {p.address && <p style={styles.cardMeta}>{p.address}</p>}
                </div>
                <div style={styles.cardRight}>
                  <IconChevron />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleArchive(p.id, p.name) }}
                    disabled={archiving === p.id}
                    style={styles.archiveBtn}
                    aria-label={`Archive ${p.name}`}
                  >
                    {archiving === p.id ? (
                      <div style={styles.spinnerSm} />
                    ) : (
                      <IconArchive />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── New Project Form ───────────────────────────────────────────────────────

interface NewProjectFormProps {
  userId: string
  onCreated: () => void
  onCancel: () => void
}

function NewProjectForm({ userId, onCreated, onCancel }: NewProjectFormProps) {
  const [name, setName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div style={styles.formCard}>
      <h2 style={styles.formTitle}>New Project</h2>

      {error && <p style={styles.formError} role="alert">{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Project Name <span style={styles.required}>*</span>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="123 Main St Renovation"
            required
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Customer Name
          <input id="project-customer" type="text" value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Smith" style={styles.input} />
        </label>
        <label style={styles.label}>
          Address
          <input id="project-address" type="text" value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Anytown" style={styles.input} />
        </label>
        <label style={styles.label}>
          Customer Email
          <input id="project-email" type="email" value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="customer@email.com" style={styles.input} />
        </label>
        <label style={styles.label}>
          Customer Phone
          <input id="project-phone" type="tel" value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="(555) 123-4567" style={styles.input} />
        </label>

        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          <button
            id="project-submit"
            type="submit"
            disabled={submitting}
            style={{ ...styles.submitBtn, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
    background: 'var(--color-background)',
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
    width: '30px', height: '30px',
    border: '2.5px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerSm: {
    width: '16px', height: '16px',
    border: '2px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  errorText:   { color: 'var(--color-danger)', fontSize: '15px', margin: 0 },
  retryButton: {
    minHeight: '48px', padding: '0 32px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 14px',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
  },
  heading: {
    fontSize: '26px', fontWeight: 700,
    color: 'var(--color-primary)', margin: 0,
  },
  fab: {
    width: '44px', height: '44px',
    borderRadius: '50%',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(26,82,118,0.30)',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  list: {
    display: 'flex', flexDirection: 'column',
    gap: '8px', padding: '12px 16px',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    border: '1px solid var(--color-border)',
    display: 'flex', alignItems: 'center', gap: '12px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'box-shadow 0.15s',
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: '16px', fontWeight: 600,
    color: 'var(--color-text)', margin: '0 0 2px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardMeta: {
    fontSize: '13px', color: 'var(--color-text-muted)', margin: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardRight: {
    display: 'flex', alignItems: 'center', gap: '4px',
    color: 'var(--color-text-muted)', flexShrink: 0,
  },
  archiveBtn: {
    width: '36px', height: '36px',
    background: 'none', border: 'none',
    cursor: 'pointer', borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-text-muted)',
  },
  emptyState: {
    flex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', textAlign: 'center', gap: '8px',
  },
  emptyIcon: { marginBottom: '8px', color: 'var(--color-border)' },
  emptyText: {
    fontSize: '17px', fontWeight: 600,
    color: 'var(--color-text)', margin: 0,
  },
  emptySubtext: {
    fontSize: '14px', color: 'var(--color-text-muted)', margin: 0,
  },
  // Form
  formCard: {
    margin: '10px 16px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 16px',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
  },
  formTitle: {
    fontSize: '18px', fontWeight: 600,
    color: 'var(--color-primary)', margin: '0 0 16px',
  },
  formError: {
    color: 'var(--color-danger)', fontSize: '14px',
    padding: '10px 14px',
    background: 'var(--color-danger-soft)',
    borderRadius: 'var(--radius-sm)', margin: '0 0 12px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: {
    display: 'flex', flexDirection: 'column', gap: '5px',
    fontSize: '13px', fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
  required: { color: 'var(--color-danger)' },
  input: {
    padding: '0 14px', height: '48px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontSize: '16px', outline: 'none',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
  },
  formActions: { display: 'flex', gap: '10px', marginTop: '4px' },
  cancelBtn: {
    flex: 1, minHeight: '48px',
    background: 'var(--color-background)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: 500, cursor: 'pointer',
  },
  submitBtn: {
    flex: 1, minHeight: '48px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer',
  },
}
