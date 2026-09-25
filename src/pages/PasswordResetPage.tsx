import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../lib/auth'
import { sanitizeAuthError } from '../lib/authErrors'
import { AuthLayout } from '../components/AuthLayout'
import { MailIcon } from '../components/icons'

export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Preserve existing resetPassword logic — unchanged
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { error: authError } = await resetPassword(email)
      if (authError) {
        setError(sanitizeAuthError(authError))
      } else {
        setSubmitted(true)
        setMessage('If that email is registered, a reset link has been sent.')
      }
    } catch (err: unknown) {
      setError(sanitizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email and we'll send you a link to set a new password."
      footer={
        <Link to="/login" className="auth-link auth-link--primary">
          ← Back to Sign In
        </Link>
      }
    >
      {/* ── Polished success state ── */}
      {submitted ? (
        <div className="auth-sent-state">
          <div className="auth-sent-state__icon" aria-hidden="true">
            <MailIcon size={28} />
          </div>
          <p className="auth-sent-state__heading">Check your email</p>
          <p className="auth-sent-state__body">{message}</p>
          <p className="auth-sent-state__note">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => { setSubmitted(false); setMessage(''); setEmail('') }}
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="auth-message auth-message--error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="reset-email" className="auth-field-label">
                Email
              </label>
              <input
                id="reset-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            <button
              id="reset-submit"
              type="submit"
              disabled={loading}
              className="auth-btn-primary"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
