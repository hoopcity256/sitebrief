import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCompanyProfile } from '../lib/companyProfile'
import type { Database } from '../lib/database.types'

type CompanyProfile =
  Database['public']['Tables']['company_profiles']['Row']

/**
 * Loads the company profile for the currently authenticated user.
 *
 * Race-condition safety:
 *   The hook tracks which user ID the current profile was fetched for.
 *   Until a successful fetch completes for the CURRENT user, `loading`
 *   remains true.  This prevents AuthGuard from briefly seeing
 *   (authenticated, loading=false, profile=null) and redirecting to
 *   /onboarding between the auth-session restore and the DB fetch.
 *
 * State machine:
 *   - No user              → loading=false, profile=null  (not our concern)
 *   - user exists, fetch pending → loading=true
 *   - fetch succeeded      → loading=false, profile=<row|null>
 *   - fetch errored        → loading=false, error=<message>
 *   - user changes/logout  → immediately resets to loading=true (stale data cleared)
 */
export function useCompanyProfile() {
  const { user } = useAuth()

  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  // Start loading=true: we don't know the profile state until we fetch.
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track which user ID the current profile data belongs to.
  // Avoids a stale profile from a previous user being shown.
  const fetchedForUserRef = useRef<string | null>(null)

  const refetch = useCallback(async () => {
    if (!user) {
      // No authenticated user — clear everything, not loading
      setProfile(null)
      setError(null)
      setLoading(false)
      fetchedForUserRef.current = null
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getCompanyProfile(user.id)
      // Guard against a stale response if the user changed while fetching
      fetchedForUserRef.current = user.id
      setProfile(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // When the user identity changes (login, logout, session restore),
    // immediately mark as loading and clear stale profile data before
    // the new fetch completes.  This is the key fix: there must be no
    // frame where (loading=false, profile=null, user!=null) is observed
    // for a user whose profile has not yet been fetched.
    if (user?.id !== fetchedForUserRef.current) {
      setProfile(null)
      setError(null)
      setLoading(true)
    }
    refetch()
  }, [refetch, user])

  return { profile, loading, error, refetch, setProfile }
}
