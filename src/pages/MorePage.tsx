import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompanyProfile } from '../hooks/useCompanyProfile'
import { signOut } from '../lib/auth'
import { AppShell } from '../components/AppShell'

export const MorePage = () => {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useCompanyProfile()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('Could not sign out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <AppShell activeTab="more">
      <div style={styles.page}>
        {/* ── Header ── */}
        <header style={styles.header}>
          <h1 style={styles.heading}>More</h1>
        </header>

        <div style={styles.body}>
          {/* ── Account section ── */}
          <section aria-labelledby="account-heading">
            <p id="account-heading" style={styles.sectionLabel}>Account</p>
            <div style={styles.card}>
              <div style={styles.cardRow}>
                <span style={styles.rowLabel}>Company</span>
                <span style={styles.rowValue}>
                  {profileLoading ? '…' : (profile?.company_name ?? '—')}
                </span>
              </div>
              <div style={{ ...styles.cardRow, borderBottom: 'none' }}>
                <span style={styles.rowLabel}>Email</span>
                <span style={styles.rowValue}>
                  {user?.email ?? '—'}
                </span>
              </div>
            </div>
          </section>

          {/* ── Billing section ── */}
          <section aria-labelledby="billing-heading">
            <p id="billing-heading" style={styles.sectionLabel}>Subscription</p>
            <div style={styles.card}>
              <div style={{ ...styles.cardRow, borderBottom: 'none' }}>
                <span style={styles.rowLabel}>Billing</span>
                <span style={styles.comingSoon}>Coming soon</span>
              </div>
            </div>
          </section>

          {/* ── Sign out ── */}
          <section style={{ marginTop: '8px' }}>
            {signOutError && (
              <p style={styles.errorText} role="alert">{signOutError}</p>
            )}
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{ ...styles.signOutBtn, opacity: signingOut ? 0.6 : 1 }}
            >
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-background)',
  },
  header: {
    padding: '16px 20px 12px',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: 0,
  },
  body: {
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
    margin: '0 0 6px 4px',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid var(--color-border)',
    gap: '12px',
  },
  rowLabel: {
    fontSize: '15px',
    color: 'var(--color-text)',
    flexShrink: 0,
  },
  rowValue: {
    fontSize: '15px',
    color: 'var(--color-text-muted)',
    textAlign: 'right' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    minWidth: 0,
  },
  comingSoon: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-warning)',
    background: 'var(--color-warning-soft)',
    padding: '3px 10px',
    borderRadius: '20px',
  },
  errorText: {
    color: 'var(--color-danger)',
    fontSize: '14px',
    background: 'var(--color-danger-soft)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    margin: '0 0 10px',
  },
  signOutBtn: {
    width: '100%',
    minHeight: '48px',
    background: 'var(--color-surface)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
}
