/**
 * OnboardingPage — company profile setup, presented once after signup.
 *
 * Instrumentation added per hardening pass 2 requirements:
 *   console.log('[onboarding] <stage>') traces are present in sandbox builds.
 *   They log only non-sensitive data (stage name, boolean flags, counts).
 *
 * Architecture note:
 *   setProfile() now updates the shared CompanyProfileContext — AuthGuard
 *   reads from the same context, so it immediately sees onboarding_complete=true
 *   and does not bounce the user back here.
 *
 * Logo upload:
 *   - Optional company logo uploaded to 'company-logos' bucket.
 *   - Compressed client-side before upload (JPEG, max 400 KB).
 *   - Stored as logo_storage_path on company_profiles.
 *   - Signed URL used for display.
 */
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompanyProfile } from '../hooks/useCompanyProfile'
import { upsertCompanyProfile } from '../lib/companyProfile'
import { compressImage } from '../lib/imageCompression'
import { supabase } from '../lib/supabase'
import { isValidEmail, formatUSPhone } from '../lib/validation'
import { BuildingIcon, CameraIcon, XIcon } from '../components/icons'

// ── Logo bucket config ──────────────────────────────────────────────────────

const LOGO_BUCKET = 'company-logos'

async function uploadLogo(file: File, userId: string): Promise<string> {
  // Compress before upload
  const { blob } = await compressImage(file, {
    maxLongEdge: 800,
    targetBytes: 150_000,
    hardCeilingBytes: 400_000,
  })

  const ext = 'jpg'
  const path = `${userId}/logo.${ext}`
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  if (error) throw error
  return path
}

// ── OnboardingPage ──────────────────────────────────────────────────────────

export const OnboardingPage = () => {
  const { user } = useAuth()
  const { setProfile } = useCompanyProfile()
  const navigate = useNavigate()

  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#1A5276')

  // Logo
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Phone formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatUSPhone(e.target.value))
  }

  // Email validation on blur
  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError('Please enter a valid email address (e.g. office@company.com).')
    } else {
      setEmailError(null)
    }
  }

  // Logo selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  const handleLogoRemove = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoFile(null)
    setLogoPreviewUrl(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    console.log('[onboarding] submit started')

    if (!user) {
      console.log('[onboarding] no user — aborting')
      return
    }

    // Client-side validation
    if (!companyName.trim()) {
      setError('Company name is required.')
      return
    }
    if (email && !isValidEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    setError(null)

    let logoStoragePath: string | undefined = undefined

    try {
      // Stage 1: Upload logo if selected
      if (logoFile) {
        console.log('[onboarding] logo upload start')
        try {
          logoStoragePath = await uploadLogo(logoFile, user.id)
          console.log('[onboarding] logo upload success')
        } catch (logoErr: unknown) {
          console.warn('[onboarding] logo upload failed — continuing without logo', logoErr instanceof Error ? logoErr.message : logoErr)
          // Non-blocking: proceed without logo
        }
      }

      // Stage 2: Upsert company profile
      console.log('[onboarding] upsert start', {
        hasPhone: Boolean(phone),
        hasEmail: Boolean(email),
        hasLogo: Boolean(logoStoragePath),
      })

      const saved = await upsertCompanyProfile(user.id, {
        company_name: companyName.trim(),
        phone: phone || null,
        email: email.trim() || null,
        brand_color: brandColor || null,
        onboarding_complete: true,
        ...(logoStoragePath !== undefined && { logo_storage_path: logoStoragePath }),
      })

      console.log('[onboarding] upsert success', {
        onboarding_complete: saved?.onboarding_complete,
        hasProfile: Boolean(saved),
      })

      // Stage 3: Update shared CompanyProfileContext BEFORE navigation.
      // This is the critical step: AuthGuard reads from the same Context,
      // so it immediately sees onboarding_complete=true and allows /projects.
      setProfile(saved)
      setSubmitSuccess(true)

      console.log('[onboarding] setProfile called, navigating to /projects')

      navigate('/projects', { replace: true })
    } catch (err: unknown) {
      console.error('[onboarding] upsert error', err instanceof Error ? err.message : err)
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
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
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

            {/* Phone — optional, US formatted */}
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
                onChange={handlePhoneChange}
                placeholder="(912) 555-1234"
                autoComplete="tel"
                inputMode="numeric"
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
                className={`auth-input${emailError ? ' auth-input--error' : ''}`}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
                onBlur={handleEmailBlur}
                placeholder="office@company.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
              />
              {emailError && (
                <p className="auth-field-error" role="alert">{emailError}</p>
              )}
            </div>

            {/* Company Logo — optional */}
            <div className="auth-field">
              <span className="auth-field-label">
                Company Logo
                <span className="auth-field-label__hint">Optional</span>
              </span>
              <p className="auth-field-hint">Used in your PDF report headers.</p>

              {logoPreviewUrl ? (
                <div className="onboarding-logo-preview">
                  <img
                    src={logoPreviewUrl}
                    alt="Logo preview"
                    className="onboarding-logo-preview__img"
                  />
                  <div className="onboarding-logo-preview__actions">
                    <button
                      type="button"
                      className="onboarding-logo-preview__btn"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className="onboarding-logo-preview__btn onboarding-logo-preview__btn--remove"
                      onClick={handleLogoRemove}
                      aria-label="Remove logo"
                    >
                      <XIcon size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="onboarding-logo-pick">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoSelect}
                    style={{ display: 'none' }}
                  />
                  <CameraIcon size={16} />
                  <span>Add Logo</span>
                </label>
              )}
            </div>

            {/* Brand Color */}
            <div className="auth-field">
              <label htmlFor="onboarding-brand-color" className="auth-field-label">
                Report Accent Color
              </label>
              <div className="onboarding-color-row">
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

            {submitSuccess && (
              <div className="auth-message auth-message--success" role="status">
                Profile saved! Taking you to your projects…
              </div>
            )}

            <button
              id="onboarding-submit"
              type="submit"
              disabled={submitting || submitSuccess}
              className="auth-btn-primary"
            >
              {submitting ? 'Saving…' : submitSuccess ? 'Done!' : 'Get Started'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
