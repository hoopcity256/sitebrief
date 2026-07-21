import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { upsertCompanyProfile } from '../lib/companyProfile'

export const OnboardingPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [brandColor, setBrandColor] = useState('#1A5276')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err: unknown) {
      setError('Could not save your company profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Welcome to SiteBrief</h1>
        <p style={styles.subheading}>
          Set up your company profile to get started.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Company Name *
            <input
              id="onboarding-company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company LLC"
              required
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Phone
            <input
              id="onboarding-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              id="onboarding-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="office@company.com"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Brand Color
            <div style={styles.colorRow}>
              <input
                id="onboarding-brand-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                style={styles.colorInput}
              />
              <span style={styles.colorValue}>{brandColor}</span>
            </div>
          </label>

          <div style={styles.logoPlaceholder}>
            <span style={styles.logoIcon}>📷</span>
            <span>Logo upload coming soon</span>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            id="onboarding-submit"
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Saving…' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: '#F8F9FA',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1A5276',
    margin: '0 0 4px',
  },
  subheading: {
    fontSize: '14px',
    color: '#6C757D',
    margin: '0 0 24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#495057',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #DEE2E6',
    fontSize: '16px',
    outline: 'none',
    minHeight: '48px',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colorInput: {
    width: '48px',
    height: '48px',
    border: '1px solid #DEE2E6',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: '2px',
  },
  colorValue: {
    fontSize: '14px',
    color: '#6C757D',
    fontFamily: 'monospace',
  },
  logoPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    border: '2px dashed #DEE2E6',
    borderRadius: '8px',
    color: '#ADB5BD',
    fontSize: '14px',
  },
  logoIcon: {
    fontSize: '20px',
  },
  error: {
    color: '#DC3545',
    fontSize: '14px',
    margin: 0,
    padding: '8px 12px',
    background: '#FFF3F3',
    borderRadius: '6px',
  },
  button: {
    minHeight: '48px',
    background: '#1A5276',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
}
