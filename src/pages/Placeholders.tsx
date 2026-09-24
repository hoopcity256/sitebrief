/**
 * Placeholder pages — lightweight pages that don't warrant their own files.
 *
 * SettingsPage      — reserved for Day 6
 * BillingSuccessPage — shown after Stripe Checkout; auto-redirects to /more
 * BillingCancelPage  — shown when user cancels Stripe Checkout; goes to /more
 */

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Shared styles ──────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 24px',
  background: 'var(--color-background)',
  gap: '16px',
  textAlign: 'center',
}

const headingStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'var(--color-primary)',
  margin: 0,
}

const bodyStyle: React.CSSProperties = {
  fontSize: '15px',
  color: 'var(--color-text-muted)',
  margin: 0,
  lineHeight: 1.6,
  maxWidth: '300px',
}

const btnStyle: React.CSSProperties = {
  minHeight: '48px',
  padding: '0 32px',
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '8px',
}

// ── Settings (Day 6) ───────────────────────────────────────────────────────

export const SettingsPage = () => <div>SettingsPage</div>

// ── BillingSuccessPage ─────────────────────────────────────────────────────

export const BillingSuccessPage = () => {
  const navigate = useNavigate()

  // Auto-redirect after 4 seconds to allow Stripe webhook to settle
  useEffect(() => {
    const t = setTimeout(() => navigate('/more', { replace: true }), 4000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div style={pageStyle}>
      <span style={{ fontSize: '48px' }}>🎉</span>
      <h1 style={headingStyle}>You're all set!</h1>
      <p style={bodyStyle}>
        Your subscription is active. You can now create reports and generate PDFs.
      </p>
      <p style={{ ...bodyStyle, fontSize: '13px' }}>
        Redirecting you to Subscription settings…
      </p>
      <button
        id="billing-success-continue-btn"
        style={btnStyle}
        onClick={() => navigate('/more', { replace: true })}
      >
        Go to Account
      </button>
    </div>
  )
}

// ── BillingCancelPage ──────────────────────────────────────────────────────

export const BillingCancelPage = () => {
  const navigate = useNavigate()

  return (
    <div style={pageStyle}>
      <span style={{ fontSize: '48px' }}>↩</span>
      <h1 style={{ ...headingStyle, color: 'var(--color-text)' }}>
        Checkout cancelled
      </h1>
      <p style={bodyStyle}>
        No charge was made. You can subscribe any time from your account page.
      </p>
      <button
        id="billing-cancel-continue-btn"
        style={btnStyle}
        onClick={() => navigate('/more', { replace: true })}
      >
        Back to Account
      </button>
    </div>
  )
}
