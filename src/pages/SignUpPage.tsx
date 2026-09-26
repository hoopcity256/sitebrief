/**
 * SignUpPage
 *
 * Changes in hardening pass 2:
 *
 *   1. Confirm Password field added (passwords must match, inline error,
 *      Create Account disabled until valid).
 *
 *   2. Auth flow corrected to match SANDBOX configuration:
 *      Supabase sandbox has `enable_confirmations = false`, meaning
 *      signUp() returns an active session immediately — no email needed.
 *      The UI now reflects this:
 *        - If session is returned → navigate to /onboarding
 *        - If no session (e.g. production mode with confirmation enabled)
 *          → show "Check your email" state with Create Account disabled
 *
 *   3. Duplicate submit prevention: once signup succeeds, the Create Account
 *      button transitions to a disabled success state. The "account already
 *      exists" error on second click no longer occurs because the form is
 *      locked after success.
 *
 *   4. Shared email validator used (replaces browser-only type="email").
 */
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../lib/auth'
import { sanitizeAuthError } from '../lib/authErrors'
import { isValidEmail } from '../lib/validation'
import { AuthLayout } from '../components/AuthLayout'
import { EyeIcon, EyeOffIcon } from '../components/icons'

type SignupState = 'idle' | 'loading' | 'check-email' | 'success'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [state, setState] = useState<SignupState>('idle')
  const [error, setError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [emailError, setEmailError] = useState('')

  const loading = state === 'loading'
  const succeeded = state === 'check-email' || state === 'success'

  // Real-time confirm-password mismatch
  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setConfirmPassword(val)
    if (password && val && val !== password) {
      setConfirmError('Passwords do not match.')
    } else {
      setConfirmError('')
    }
  }

  // Re-check confirm when primary password changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setPassword(val)
    if (confirmPassword && val !== confirmPassword) {
      setConfirmError('Passwords do not match.')
    } else {
      setConfirmError('')
    }
  }

  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError('Please enter a valid email address (e.g. you@company.com).')
    } else {
      setEmailError('')
    }
  }

  const canSubmit =
    !loading &&
    !succeeded &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword === password &&
    confirmError === '' &&
    emailError === ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Final client-side checks
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.')
      return
    }

    setState('loading')
    try {
      const { data, error: authError } = await signUp(email, password)

      if (authError) {
        setError(sanitizeAuthError(authError))
        setState('idle')
        return
      }

      // Supabase sandbox: `enable_confirmations = false`
      // signUp() returns a session immediately — navigate straight to onboarding.
      //
      // If a session is NOT returned (production with confirmation enabled),
      // show the check-email state and lock the form.
      if (data?.session) {
        // Session returned → email confirmation is disabled → proceed to app
        setState('success')
        navigate('/onboarding', { replace: true })
      } else {
        // No session → confirmation email would have been sent
        setState('check-email')
      }
    } catch (err: unknown) {
      setError(sanitizeAuthError(err))
      setState('idle')
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

      {state === 'check-email' && (
        <div className="auth-message auth-message--success" role="status">
          <strong>Check your email!</strong> We sent a confirmation link to{' '}
          <strong>{email}</strong>. Click it to activate your account.
        </div>
      )}

      {/* Hide form fields once email confirmation is required */}
      {state !== 'check-email' && (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email */}
          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-field-label">
              Email
            </label>
            <input
              id="signup-email"
              className={`auth-input${emailError ? ' auth-input--error' : ''}`}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
              onBlur={handleEmailBlur}
              placeholder="you@company.com"
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={succeeded}
            />
            {emailError && (
              <p className="auth-field-error" role="alert">{emailError}</p>
            )}
          </div>

          {/* Password */}
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
                onChange={handlePasswordChange}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={succeeded}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="auth-field">
            <label htmlFor="signup-confirm-password" className="auth-field-label">
              Confirm Password
            </label>
            <div className="auth-input-wrap">
              <input
                id="signup-confirm-password"
                className={`auth-input auth-input--has-toggle${confirmError ? ' auth-input--error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleConfirmChange}
                placeholder="Re-enter your password"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={succeeded}
                aria-describedby={confirmError ? 'confirm-pw-error' : undefined}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
            {confirmError && (
              <p id="confirm-pw-error" className="auth-field-error" role="alert">
                {confirmError}
              </p>
            )}
          </div>

          <button
            id="signup-submit"
            type="submit"
            disabled={!canSubmit}
            className="auth-btn-primary"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
