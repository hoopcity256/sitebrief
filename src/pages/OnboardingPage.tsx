import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { upsertCompanyProfile } from '../lib/companyProfile'

/**
 * Company profile setup — presented once after signup.
 * All form fields, validation, and upsertCompanyProfile logic preserved unchanged.
 * Styling migrated to CSS classes in index.css (CP3).
 */
export const OnboardingPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [brandColor, setBrandColor] = useState('#1A5276')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preserve existing submit logic — unchanged
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!companyName.trim()) {
      setError('Company name is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await upsertCompanyProfile(user.id, {
        company_name: companyName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        brand_color: brandColor || null,
        onboarding_complete: true,
      })
      navigate('/projects')
    } catch {
      setError('Could not save your company profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-card">
        <header className="auth-header">
          <h1 className="auth-wordmark">SiteBrief</h1>
          <p className="auth-subtitle">Set up your company profile to get started.</p>
        </header>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Company Name */}
          <div className="auth-field">
            <label htmlFor="onboarding-company-name" className="auth-field-label">
              Company Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="onboarding-company-name"
              className="auth-input"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company LLC"
              required
              autoComplete="organization"
            />
          </div>

          {/* Phone */}
          <div className="auth-field">
            <label htmlFor="onboarding-phone" className="auth-field-label">
              Phone
            </label>
            <input
              id="onboarding-phone"
              className="auth-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              autoComplete="tel"
            />
          </div>

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="onboarding-email" className="auth-field-label">
              Email
            </label>
            <input
              id="onboarding-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="office@company.com"
              autoComplete="email"
            />
          </div>

          {/* Brand Color */}
          <div className="auth-field">
            <label htmlFor="onboarding-brand-color" className="auth-field-label">
              Brand Color
            </label>
            <div className="auth-color-row">
              <input
                id="onboarding-brand-color"
                className="auth-color-swatch"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
              />
              <span className="auth-color-value">{brandColor}</span>
            </div>
            <p className="auth-field-hint">Used as an accent in your PDF reports.</p>
          </div>

          {/* Logo placeholder */}
          <div className="auth-logo-placeholder" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="7" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 13l4-3 3 3 3-4 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span>Logo upload coming soon</span>
          </div>

          {error && (
            <div className="auth-message auth-message--error" role="alert">
              {error}
            </div>
          )}

          <button
            id="onboarding-submit"
            type="submit"
            disabled={submitting}
            className="auth-btn-primary"
          >
            {submitting ? 'Saving…' : 'Get Started'}
          </button>
        </form>
      </main>
    </div>
  )
}
