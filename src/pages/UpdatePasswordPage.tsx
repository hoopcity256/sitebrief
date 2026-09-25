import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '../lib/auth'
import { sanitizeAuthError } from '../lib/authErrors'
import { AuthLayout } from '../components/AuthLayout'
import { EyeIcon, EyeOffIcon } from '../components/icons'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Preserve existing validation and updatePassword logic — unchanged
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
      {error && (
        <div className="auth-message auth-message--error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="update-password" className="auth-field-label">
            New Password
          </label>
          <div className="auth-input-wrap">
            <input
              id="update-password"
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

        <div className="auth-field">
          <label htmlFor="update-confirm-password" className="auth-field-label">
            Confirm Password
          </label>
          <input
            id="update-confirm-password"
            className="auth-input"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <button
          id="update-password-submit"
          type="submit"
          disabled={loading}
          className="auth-btn-primary"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </AuthLayout>
  )
}
