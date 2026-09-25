import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../lib/auth'
import { sanitizeAuthError } from '../lib/authErrors'
import { AuthLayout } from '../components/AuthLayout'

export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      subtitle="Enter your email and we'll send a link to reset your password."
      footer={
        <Link to="/login" className="auth-link">
          ← Back to Sign In
        </Link>
      }
    >
      {error && (
        <div className="auth-message auth-message--error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="auth-message auth-message--success" role="status">
          {message}
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
    </AuthLayout>
  )
}
