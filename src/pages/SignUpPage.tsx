import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from '../lib/auth'
import { sanitizeAuthError } from '../lib/authErrors'
import { AuthLayout } from '../components/AuthLayout'

const inputStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #DEE2E6',
  fontSize: '16px',
  minHeight: '48px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const buttonStyle: React.CSSProperties = {
  minHeight: '48px',
  background: '#1A5276',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      subtitle="Create your account to start documenting jobsites."
      footer={
        <Link to="/login" style={linkStyle}>
          Already have an account? <strong>Sign in</strong>
        </Link>
      }
    >
      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <label style={labelStyle}>
          Email
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Password
          <div style={{ position: 'relative' }}>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: '48px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={toggleStyle}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>

        <button
          id="signup-submit"
          type="submit"
          disabled={loading}
          style={{ ...buttonStyle, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#495057',
}

const errorStyle: React.CSSProperties = {
  color: '#DC3545',
  fontSize: '14px',
  padding: '10px 12px',
  background: '#FFF3F3',
  borderRadius: '8px',
  marginBottom: '16px',
  lineHeight: 1.4,
}

const successStyle: React.CSSProperties = {
  color: '#198754',
  fontSize: '14px',
  padding: '10px 12px',
  background: '#F0FFF4',
  borderRadius: '8px',
  marginBottom: '16px',
  lineHeight: 1.4,
}

const linkStyle: React.CSSProperties = {
  color: '#1A5276',
  textDecoration: 'none',
  fontSize: '14px',
}

const toggleStyle: React.CSSProperties = {
  position: 'absolute',
  right: '8px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '18px',
  padding: '4px',
  lineHeight: 1,
}
