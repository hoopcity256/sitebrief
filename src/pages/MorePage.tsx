import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompanyProfile } from '../hooks/useCompanyProfile'
import { useSubscription } from '../hooks/useSubscription'
import { signOut } from '../lib/auth'
import { redirectToCheckout, redirectToPortal } from '../lib/subscription'
import { AppShell } from '../components/AppShell'

// Price IDs are public-safe — they identify a price object, not a secret.
// Vite will inline these at build time.
const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID as string | undefined
const ANNUAL_PRICE_ID  = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID  as string | undefined

// ── SubscriptionSection ────────────────────────────────────────────────────

interface SubscriptionSectionProps {
  onPortalError: (msg: string) => void
}

const SubscriptionSection = ({ onPortalError }: SubscriptionSectionProps) => {
  const { subscription, loading } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'annual' | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={{ ...styles.cardRow, borderBottom: 'none', justifyContent: 'center' }}>
          <div style={styles.spinner} />
        </div>
      </div>
    )
  }

  const { entitled, isTrialing, trialEnd, cancelAtPeriodEnd, row } = subscription

  const handlePortal = async () => {
    if (portalLoading) return
    setPortalLoading(true)
    try {
      await redirectToPortal()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not open billing portal.'
      onPortalError(msg)
      setPortalLoading(false)
    }
  }

  const handleCheckout = async (plan: 'monthly' | 'annual') => {
    if (checkoutLoading) return
    const priceId = plan === 'monthly' ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID
    if (!priceId) {
      onPortalError('Stripe price IDs are not configured. Contact support.')
      return
    }
    setCheckoutLoading(plan)
    try {
      await redirectToCheckout(priceId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start checkout.'
      onPortalError(msg)
      setCheckoutLoading(null)
    }
  }

  // ── No subscription row yet → show upgrade options ─────────────────────
  if (!row) {
    return (
      <div style={styles.card}>
        <div style={styles.cardRow}>
          <span style={styles.rowLabel}>Status</span>
          <span style={styles.badgeExpired}>No active plan</span>
        </div>
        <div style={{ ...styles.cardRow, borderBottom: 'none', flexDirection: 'column', gap: '10px' }}>
          <p style={styles.upgradeNote}>
            Start a 14-day free trial — no charge until the trial ends.
          </p>
          <div style={styles.planRow}>
            <button
              id="subscribe-monthly-btn"
              style={{ ...styles.planBtn, opacity: checkoutLoading ? 0.6 : 1 }}
              disabled={!!checkoutLoading}
              onClick={() => handleCheckout('monthly')}
            >
              {checkoutLoading === 'monthly' ? 'Redirecting…' : 'Monthly — $9.99/mo'}
            </button>
            <button
              id="subscribe-annual-btn"
              style={{ ...styles.planBtn, background: 'var(--color-success)', opacity: checkoutLoading ? 0.6 : 1 }}
              disabled={!!checkoutLoading}
              onClick={() => handleCheckout('annual')}
            >
              {checkoutLoading === 'annual' ? 'Redirecting…' : 'Annual — $79.99/yr'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Has a subscription row ─────────────────────────────────────────────
  const statusLabel = (() => {
    if (isTrialing) {
      const days = trialEnd
        ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86_400_000))
        : 0
      return `Trial — ${days} day${days !== 1 ? 's' : ''} left`
    }
    if (row.status === 'active') return cancelAtPeriodEnd ? 'Active (cancels at period end)' : 'Active'
    return row.status.charAt(0).toUpperCase() + row.status.slice(1)
  })()

  const endDateFormatted = (() => {
    const targetDate = isTrialing ? trialEnd : row.current_period_end
    if (!targetDate) return null
    return new Date(targetDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  })()

  const badge = entitled
    ? isTrialing ? styles.badgeTrial : styles.badgeActive
    : styles.badgeExpired

  return (
    <div style={styles.card}>
      <div style={styles.cardRow}>
        <span style={styles.rowLabel}>Status</span>
        <span style={badge}>{statusLabel}</span>
      </div>

      {/* Cancellation Notice if cancel_at_period_end is scheduled */}
      {entitled && cancelAtPeriodEnd && (
        <div style={{ ...styles.cardRow, flexDirection: 'column', gap: '6px', alignItems: 'flex-start', background: 'rgba(230,81,0,0.06)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warning, #E65100)' }}>
            Automatic renewal canceled
          </span>
          <p style={styles.upgradeNote}>
            Your {isTrialing ? 'trial' : 'subscription'} will end on {endDateFormatted ?? 'the end of period'}. Access remains active until then.
          </p>
        </div>
      )}

      {/* Upsell if expired */}
      {!entitled && (
        <div style={{ ...styles.cardRow, flexDirection: 'column', gap: '10px' }}>
          <p style={styles.upgradeNote}>
            Your subscription has lapsed. Subscribe to continue creating reports.
          </p>
          <div style={styles.planRow}>
            <button
              id="resubscribe-monthly-btn"
              style={{ ...styles.planBtn, opacity: checkoutLoading ? 0.6 : 1 }}
              disabled={!!checkoutLoading}
              onClick={() => handleCheckout('monthly')}
            >
              {checkoutLoading === 'monthly' ? 'Redirecting…' : 'Monthly — $9.99/mo'}
            </button>
            <button
              id="resubscribe-annual-btn"
              style={{ ...styles.planBtn, background: 'var(--color-success)', opacity: checkoutLoading ? 0.6 : 1 }}
              disabled={!!checkoutLoading}
              onClick={() => handleCheckout('annual')}
            >
              {checkoutLoading === 'annual' ? 'Redirecting…' : 'Annual — $79.99/yr'}
            </button>
          </div>
        </div>
      )}

      {/* Manage subscription via Stripe Portal */}
      {entitled && (
        <div style={{ ...styles.cardRow, borderBottom: 'none' }}>
          <span style={styles.rowLabel}>Billing</span>
          <button
            id="manage-subscription-btn"
            style={{ ...styles.manageBtn, opacity: portalLoading ? 0.6 : 1 }}
            disabled={portalLoading}
            onClick={handlePortal}
          >
            {portalLoading ? 'Opening…' : 'Manage'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── MorePage ───────────────────────────────────────────────────────────────

export const MorePage = () => {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useCompanyProfile()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)

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
            {billingError && (
              <p style={styles.errorText} role="alert">{billingError}</p>
            )}
            <SubscriptionSection onPortalError={setBillingError} />
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

// ── Styles ─────────────────────────────────────────────────────────────────

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
  badgeActive: {
    fontSize: '12px', fontWeight: 700,
    color: 'var(--color-success)', background: 'var(--color-success-soft)',
    padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
  },
  badgeTrial: {
    fontSize: '12px', fontWeight: 700,
    color: 'var(--color-primary)', background: 'rgba(26,82,118,0.1)',
    padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
  },
  badgeExpired: {
    fontSize: '12px', fontWeight: 700,
    color: 'var(--color-danger)', background: 'var(--color-danger-soft)',
    padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
  },
  upgradeNote: {
    fontSize: '13px', color: 'var(--color-text-muted)',
    margin: 0, lineHeight: 1.5,
  },
  planRow: {
    display: 'flex', gap: '8px', flexWrap: 'wrap' as const,
    width: '100%',
  },
  planBtn: {
    flex: 1, minHeight: '44px', padding: '0 12px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  manageBtn: {
    minHeight: '36px', padding: '0 16px',
    background: 'transparent', color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  spinner: {
    width: '20px', height: '20px',
    border: '2px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
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
