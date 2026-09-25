import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { upsertCompanyProfile } from '../lib/companyProfile'
import { BuildingIcon } from '../components/icons'

/**
 * Company profile setup — presented once after signup.
 * All form fields, validation, and upsertCompanyProfile logic preserved unchanged.
 * Visual: uses auth-page / onboarding-* CSS classes for the North Star treatment.
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
    <div className="auth-page auth-page--onboarding">
      {/* ── Branded hero ── */}
      <div className="auth-hero" aria-hidden="true">
        <span className="auth-hero__wordmark">SiteBrief</span>
        <span className="auth-hero__tagline">One last step before you start documenting.</span>
      </div>

      {/* ── Onboarding panel ── */}
      <main className="auth-panel">
        <header className="auth-panel__header">
          <div className="onboarding-icon" aria-hidden="true">
            <BuildingIcon size={22} />
          </div>
          <h1 className="auth-panel__title">Set Up SiteBrief</h1>
          <p className="auth-panel__subtitle">Tell us about your company.</p>
        </header>

        <div className="auth-panel__body">
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Company Name — required */}
            <div className="auth-field">
              <label htmlFor="onboarding-company-name" className="auth-field-label">
                Company Name <span className="auth-field-label__required" aria-hidden="true">*</span>
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

            {/* Phone — optional */}
            <div className="auth-field">
              <label htmlFor="onboarding-phone" className="auth-field-label">
                Phone
                <span className="auth-field-label__hint">Optional</span>
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

            {/* Email — optional */}
            <div className="auth-field">
              <label htmlFor="onboarding-email" className="auth-field-label">
                Company Email
                <span className="auth-field-label__hint">Optional</span>
              </label>
              <input
                id="onboarding-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="office@company.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            {/* Brand Color */}
            <div className="auth-field">
              <label htmlFor="onboarding-brand-color" className="auth-field-label">
                Report Accent Color
              </label>
              <div className="onboarding-color-row">
                {/* Color swatch — clickable */}
                <div
                  className="onboarding-color-preview"
                  style={{ background: brandColor }}
                  aria-hidden="true"
                />
                <input
                  id="onboarding-brand-color"
                  className="onboarding-color-input"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  aria-label="Choose brand color"
                />
                <span className="onboarding-color-value">{brandColor.toUpperCase()}</span>
              </div>
              <p className="auth-field-hint">Used as an accent in your PDF reports.</p>
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
        </div>
      </main>
    </div>
  )
}
