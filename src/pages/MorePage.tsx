import { useState } from 'react'
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

// ── SubscriptionSection ──────────────────────────────────────────────────────
// NOTE: All billing logic in this component is preserved VERBATIM.
// Only the JSX markup is updated to use CSS classes instead of inline styles.

interface SubscriptionSectionProps {
  onPortalError: (msg: string) => void
}

const SubscriptionSection = ({ onPortalError }: SubscriptionSectionProps) => {
  const { subscription, loading } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'annual' | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  if (loading) {
    return (
      <div className="more-card">
        <div className="more-row" style={{ borderBottom: 'none', justifyContent: 'center' }}>
          <div className="more-spinner" role="status" aria-label="Loading subscription" />
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
      <div className="more-card">
        <div className="more-row">
          <span className="more-row__label">Status</span>
          <span className="more-badge-expired">No active plan</span>
        </div>
        <div className="more-row" style={{ borderBottom: 'none', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
          <p className="more-upgrade-note">
            Start a 14-day free trial — no charge until the trial ends.
          </p>
          <div className="more-plan-row">
            <button
              id="subscribe-monthly-btn"
              className="more-plan-btn"
              disabled={!!checkoutLoading}
              onClick={() => handleCheckout('monthly')}
            >
              {checkoutLoading === 'monthly' ? 'Redirecting…' : 'Monthly — $9.99/mo'}
            </button>
            <button
              id="subscribe-annual-btn"
              className="more-plan-btn"
              style={{ background: 'var(--color-success)' }}
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

  const badgeClass = entitled
    ? isTrialing ? 'more-badge-trial' : 'more-badge-active'
    : 'more-badge-expired'

  return (
    <div className="more-card">
      <div className="more-row">
        <span className="more-row__label">Status</span>
        <span className={badgeClass}>{statusLabel}</span>
      </div>

      {/* Cancellation Notice if cancel_at_period_end is scheduled */}
      {entitled && cancelAtPeriodEnd && (
        <div className="more-cancel-notice">
          <p className="more-cancel-title">Automatic renewal canceled</p>
          <p className="more-cancel-body">
            Your {isTrialing ? 'trial' : 'subscription'} will end on{' '}
            {endDateFormatted ?? 'the end of period'}. Access remains active until then.
          </p>
        </div>
      )}

      {/* Upsell if expired */}
      {!entitled && (
        <div className="more-row" style={{ flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
          <p className="more-upgrade-note">
            Your subscription has lapsed. Subscribe to continue creating reports.
          </p>
          <div className="more-plan-row">
            <button
              id="resubscribe-monthly-btn"
              className="more-plan-btn"
              disabled={!!checkoutLoading}
              onClick={() => handleCheckout('monthly')}
            >
              {checkoutLoading === 'monthly' ? 'Redirecting…' : 'Monthly — $9.99/mo'}
            </button>
            <button
              id="resubscribe-annual-btn"
              className="more-plan-btn"
              style={{ background: 'var(--color-success)' }}
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
        <div className="more-row" style={{ borderBottom: 'none' }}>
          <span className="more-row__label">Billing</span>
          <button
            id="manage-subscription-btn"
            className="more-manage-btn"
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

// ── MorePage ─────────────────────────────────────────────────────────────────

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
      <div className="more-page">
        {/* ── Header ── */}
        <header className="more-header">
          <h1 className="more-heading">More</h1>
        </header>

        <div className="more-body">
          {/* ── Account section ── */}
          <section className="more-section" aria-labelledby="account-heading">
            <p id="account-heading" className="more-section-label">Account</p>
            <div className="more-card">
              <div className="more-row">
                <span className="more-row__label">Company</span>
                <span className="more-row__value">
                  {profileLoading ? '…' : (profile?.company_name ?? '—')}
                </span>
              </div>
              <div className="more-row" style={{ borderBottom: 'none' }}>
                <span className="more-row__label">Email</span>
                <span className="more-row__value">
                  {user?.email ?? '—'}
                </span>
              </div>
            </div>
          </section>

          {/* ── Billing section ── */}
          <section className="more-section" aria-labelledby="billing-heading">
            <p id="billing-heading" className="more-section-label">Subscription</p>
            {billingError && (
              <p className="more-error" role="alert">{billingError}</p>
            )}
            <SubscriptionSection onPortalError={setBillingError} />
          </section>

          {/* ── Sign out ── */}
          <section style={{ marginTop: '8px' }}>
            {signOutError && (
              <p className="more-error" role="alert">{signOutError}</p>
            )}
            <button
              id="sign-out-btn"
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="more-sign-out-btn"
            >
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
