import React, { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../hooks/useProjects'
import { createProject, archiveProject } from '../lib/projects'

export const ProjectsPage = () => {
  const { user } = useAuth()
  const { projects, loading, error, refetch } = useProjects()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [archiving, setArchiving] = useState<string | null>(null)

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading projects…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={styles.errorText}>Could not load projects.</p>
          <button onClick={() => refetch()} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const handleArchive = async (projectId: string) => {
    if (!confirm('Archive this project? It will be hidden from your list.')) return
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
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.heading}>Projects</h1>
        <button
          id="new-project-btn"
          onClick={() => setShowForm(true)}
          style={styles.fab}
          aria-label="New Project"
        >
          +
        </button>
      </header>

      {showForm && user && (
        <NewProjectForm
          userId={user.id}
          onCreated={() => { setShowForm(false); refetch() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {projects.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>📋</p>
          <p style={styles.emptyText}>No projects yet.</p>
          <p style={styles.emptySubtext}>Tap + to create your first.</p>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/projects/${p.id}`)
              }}
            >
              <div style={styles.cardContent}>
                <h2 style={styles.cardTitle}>{p.name}</h2>
                {p.customer_name && (
                  <p style={styles.cardMeta}>{p.customer_name}</p>
                )}
                {p.address && (
                  <p style={styles.cardMeta}>{p.address}</p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleArchive(p.id) }}
                disabled={archiving === p.id}
                style={styles.archiveBtn}
                aria-label={`Archive ${p.name}`}
              >
                {archiving === p.id ? '…' : '🗃️'}
              </button>
            </div>
          ))}
        </div>
      )}

      <nav style={styles.tabBar}>
        <div style={{ ...styles.tab, ...styles.tabActive }}>
          <span style={styles.tabIcon}>📋</span>
          <span style={styles.tabLabel}>Projects</span>
        </div>
        <div
          style={styles.tab}
          onClick={() => navigate('/settings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/settings') }}
        >
          <span style={styles.tabIcon}>⚙️</span>
          <span style={styles.tabLabel}>Settings</span>
        </div>
      </nav>
    </div>
  )
}

// --- New Project Form ---

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

      {error && <p style={styles.formError}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Project Name *
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
          <input
            id="project-customer"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Smith"
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Address
          <input
            id="project-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Anytown"
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Customer Email
          <input
            id="project-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="customer@email.com"
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Customer Phone
          <input
            id="project-phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="(555) 123-4567"
            style={styles.input}
          />
        </label>

        <div style={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
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

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: '#F8F9FA',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: '72px',
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 16px 8px',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1A5276',
    margin: 0,
  },
  fab: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#1A5276',
    color: '#FFF',
    border: 'none',
    fontSize: '24px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(26,82,118,0.3)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 16px',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #DEE2E6',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#212529',
    margin: '0 0 2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    fontSize: '13px',
    color: '#6C757D',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  archiveBtn: {
    width: '40px',
    height: '40px',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    borderRadius: '8px',
    flexShrink: 0,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '48px', margin: '0 0 8px' },
  emptyText: { fontSize: '18px', fontWeight: 600, color: '#495057', margin: '0 0 4px' },
  emptySubtext: { fontSize: '14px', color: '#6C757D', margin: 0 },

  // Tab bar
  tabBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    background: '#FFFFFF',
    borderTop: '1px solid #DEE2E6',
    display: 'flex',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    cursor: 'pointer',
    color: '#ADB5BD',
    fontSize: '11px',
  },
  tabActive: { color: '#1A5276' },
  tabIcon: { fontSize: '20px' },
  tabLabel: { fontWeight: 500 },

  // New project form
  formCard: {
    margin: '8px 16px',
    background: '#FFFFFF',
    borderRadius: '10px',
    padding: '20px 16px',
    border: '1px solid #DEE2E6',
  },
  formTitle: { fontSize: '18px', fontWeight: 600, color: '#1A5276', margin: '0 0 16px' },
  formError: {
    color: '#DC3545',
    fontSize: '14px',
    padding: '8px 12px',
    background: '#FFF3F3',
    borderRadius: '6px',
    margin: '0 0 12px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#495057',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #DEE2E6',
    fontSize: '16px',
    minHeight: '48px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  cancelBtn: {
    flex: 1,
    minHeight: '48px',
    background: '#F8F9FA',
    color: '#495057',
    border: '1px solid #DEE2E6',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    minHeight: '48px',
    background: '#1A5276',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
