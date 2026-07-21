import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompanyProfile } from '../hooks/useCompanyProfile'

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, error: profileError, refetch } = useCompanyProfile()
  const location = useLocation()

  // 1. Block on loading — never render children or navigate
  if (authLoading || profileLoading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading…</p>
      </div>
    )
  }

  // 2. Block on error — retryable, never pass through
  if (profileError) {
    return (
      <div style={styles.center}>
        <p style={styles.errorText}>Something went wrong loading your profile.</p>
        <button
          id="auth-guard-retry"
          onClick={() => refetch()}
          style={styles.retryButton}
        >
          Retry
        </button>
      </div>
    )
  }

  // 3. Unauthenticated → login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 4. Needs onboarding → /onboarding (but don't redirect if already there)
  const needsOnboarding = !profile || !profile.onboarding_complete
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  // 5. Render protected children
  return <>{children}</>
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#F8F9FA',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #DEE2E6',
    borderTopColor: '#1A5276',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: '#6C757D',
    fontSize: '14px',
    margin: 0,
  },
  errorText: {
    color: '#DC3545',
    fontSize: '16px',
    textAlign: 'center' as const,
    margin: 0,
  },
  retryButton: {
    minHeight: '48px',
    padding: '12px 32px',
    background: '#1A5276',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
