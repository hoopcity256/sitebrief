import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from '../lib/auth'
import { sanitizeAuthError } from '../lib/authErrors'
import { AuthLayout } from '../components/AuthLayout'
import { EyeIcon, EyeOffIcon } from '../components/icons'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Preserve existing validation and signUp logic — unchanged
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await signUp(email, password)
      if (authError) {
        setError(sanitizeAuthError(authError))
      } else {
        setMessage('Check your email to confirm your account before signing in.')
      }
    } catch (err: unknown) {
      setError(sanitizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start documenting your jobsites."
      footer={
        <Link to="/login" className="auth-link auth-link--primary">
          Already have an account? <strong>Sign in</strong>
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
          <label htmlFor="signup-email" className="auth-field-label">
            Email
          </label>
          <input
            id="signup-email"
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

        <div className="auth-field">
          <label htmlFor="signup-password" className="auth-field-label">
            Password
            <span className="auth-field-label__hint">Minimum 8 characters</span>
          </label>
          <div className="auth-input-wrap">
            <input
              id="signup-password"
              className="auth-input auth-input--has-toggle"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-pw-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
        </div>

        <button
          id="signup-submit"
          type="submit"
          disabled={loading}
          className="auth-btn-primary"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  )
}
