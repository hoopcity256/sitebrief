import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '../lib/auth'
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

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await updatePassword(password)
      if (authError) {
        setError(sanitizeAuthError(authError))
      } else {
        navigate('/projects')
      }
    } catch (err: unknown) {
      setError(sanitizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout subtitle="Choose a new password for your account.">
      {error && <div style={errorStyle}>{error}</div>}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <label style={labelStyle}>
          New Password
          <div style={{ position: 'relative' }}>
            <input
              id="update-password"
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

        <label style={labelStyle}>
          Confirm Password
          <input
            id="update-confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
          />
        </label>

        <button
          id="update-password-submit"
          type="submit"
          disabled={loading}
          style={{ ...buttonStyle, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Updating…' : 'Update Password'}
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
