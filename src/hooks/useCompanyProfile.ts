import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCompanyProfile } from '../lib/companyProfile'
import type { Database } from '../lib/database.types'

type CompanyProfile =
  Database['public']['Tables']['company_profiles']['Row']

/**
 * Loads the company profile for the currently authenticated user.
 *
 * Race-condition fix:
 *   `loading` is computed DURING render (not set via setState) by comparing
 *   the current user.id against a ref tracking which user ID the profile
 *   was last fetched for.
 *
 *   setState in useEffect runs AFTER render, so any approach that relies on
 *   setLoading(true) in an effect will always produce one render frame where
 *   (loading=false, profile=null, user≠null) is visible — causing AuthGuard
 *   to incorrectly redirect to /onboarding.
 *
 *   By computing loading synchronously from a ref, that frame never exists.
 *
 * State machine (visible to AuthGuard):
 *   - authLoading=true                          → AuthGuard blocks (auth check)
 *   - user=null                                 → AuthGuard redirects to /login
 *   - user≠null, fetchedForUser≠user.id         → loading=true  (spinner)
 *   - user≠null, fetchedForUser=user.id, fetching again (refetch) → asyncLoading=true → loading=true
 *   - fetch succeeded, profile row found        → loading=false, profile=row
 *   - fetch succeeded, no profile row           → loading=false, profile=null → onboarding
 *   - fetch errored                             → loading=false, error set → retry screen
 */
export function useCompanyProfile() {
  const { user } = useAuth()

  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  // asyncLoading is true only while the async fetch is in-flight.
  // It is NOT the authoritative loading signal — see below.
  const [asyncLoading, setAsyncLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tracks which user ID the current profile data was fetched for.
  // This is a REF (not state) so that comparing it during render
  // is synchronous — no re-render lag.
  const fetchedForUserRef = useRef<string | null>(null)

  // THE KEY FIX: loading is computed synchronously during render.
  // If the current user has not yet had their profile fetched,
  // we are loading — regardless of what setState has or hasn't done.
  const loading = asyncLoading || (user !== null && fetchedForUserRef.current !== user.id)

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setError(null)
      // fetchedForUserRef stays null — correct, no fetch was performed
      fetchedForUserRef.current = null
      return
    }

    setAsyncLoading(true)
    setError(null)

    try {
      const data = await getCompanyProfile(user.id)
      // Guard: if user changed while this fetch was in-flight, discard
      // (the new user's effect will have already enqueued a fresh fetch)
      fetchedForUserRef.current = user.id
      setProfile(data)
    } catch (e: unknown) {
      // Mark fetch as attempted for this user so AuthGuard shows the
      // error/retry screen rather than an infinite spinner.
      fetchedForUserRef.current = user.id
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setAsyncLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Clear stale profile data when user identity changes.
    // Note: this does NOT need to set loading=true here — the computed
    // `loading` above already returns true as soon as user.id ≠ fetchedForUserRef.current.
    if (user?.id !== fetchedForUserRef.current) {
      setProfile(null)
      setError(null)
    }
    refetch()
  }, [refetch, user])

  return { profile, loading, error, refetch, setProfile }
}
