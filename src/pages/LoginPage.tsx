import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signIn } from '../lib/auth'
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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

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
          <Link to="/signup" style={linkStyle}>
            Don&apos;t have an account? <strong>Sign up</strong>
          </Link>
          <Link to="/reset-password" style={linkStyle}>
            Forgot password?
          </Link>
        </>
      }
    >
      {error && <div style={errorStyle}>{error}</div>}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <label style={labelStyle}>
          Email
          <input
            id="login-email"
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
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
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
          id="login-submit"
          type="submit"
          disabled={loading}
          style={{ ...buttonStyle, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
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
