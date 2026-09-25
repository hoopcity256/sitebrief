import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signIn } from '../lib/auth'
import { sanitizeAuthError } from '../lib/authErrors'
import { AuthLayout } from '../components/AuthLayout'
import { EyeIcon, EyeOffIcon } from '../components/icons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Preserve existing redirect-back logic — unchanged
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/projects'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await signIn(email, password)
      if (authError) {
        setError(sanitizeAuthError(authError))
      } else {
        navigate(from, { replace: true })
      }
    } catch (err: unknown) {
      setError(sanitizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      subtitle="Sign in to manage your jobsite reports."
      footer={
        <>
          <Link to="/signup" className="auth-link">
            Don&apos;t have an account? <strong>Sign up</strong>
          </Link>
          <Link to="/reset-password" className="auth-link">
            Forgot password?
          </Link>
        </>
      }
    >
      {error && (
        <div className="auth-message auth-message--error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="login-email" className="auth-field-label">
            Email
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password" className="auth-field-label">
            Password
          </label>
          <div className="auth-input-wrap">
            <input
              id="login-password"
              className="auth-input auth-input--has-toggle"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
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
          id="login-submit"
          type="submit"
          disabled={loading}
          className="auth-btn-primary"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  )
}
