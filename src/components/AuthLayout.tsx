import React from 'react'

export interface AuthLayoutProps {
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Centered auth card shell — used by Login, SignUp, PasswordReset, UpdatePassword.
 * Styling is driven by .auth-page / .auth-card CSS classes in index.css.
 * No inline hex values — all tokens are in CSS.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  subtitle,
  children,
  footer,
}) => {
  return (
    <div className="auth-page">
      <main className="auth-card">
        <header className="auth-header">
          <h1 className="auth-wordmark">SiteBrief</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </header>

        <div>{children}</div>

        {footer && <footer className="auth-footer">{footer}</footer>}
      </main>
    </div>
  )
}

export default AuthLayout
