import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../lib/auth'
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

export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        <Link to="/login" style={linkStyle}>
          ← Back to Sign In
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
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </label>

        <button
          id="reset-submit"
          type="submit"
          disabled={loading}
          style={{ ...buttonStyle, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
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
