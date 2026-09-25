import React from 'react'

export interface AuthLayoutProps {
  /** Page title shown inside the form panel as an h2 (e.g. "Sign In") */
  title: string
  /** Optional supporting line below the title */
  subtitle?: string
  children: React.ReactNode
  /** Links / text below the form */
  footer?: React.ReactNode
}

/**
 * North Star auth shell.
 *
 * Mobile: two-zone layout — branded navy hero (top) + white form panel (bottom).
 * Desktop: centred card with navy accent bar at top.
 *
 * Styling lives entirely in .auth-* CSS classes.
 * No inline hex values.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  footer,
}) => {
  return (
    <div className="auth-page">
      {/* ── Branded hero panel ── */}
      <div className="auth-hero" aria-hidden="true">
        <span className="auth-hero__wordmark">SiteBrief</span>
        <span className="auth-hero__tagline">Professional jobsite reports, without the paperwork.</span>
      </div>

      {/* ── Form panel ── */}
      <main className="auth-panel">
        <header className="auth-panel__header">
          <h1 className="auth-panel__title">{title}</h1>
          {subtitle && <p className="auth-panel__subtitle">{subtitle}</p>}
        </header>

        <div className="auth-panel__body">{children}</div>

        {footer && (
          <footer className="auth-footer">{footer}</footer>
        )}
      </main>
    </div>
  )
}

export default AuthLayout
