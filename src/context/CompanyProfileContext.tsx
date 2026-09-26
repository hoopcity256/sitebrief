/**
 * CompanyProfileContext
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * Previously, both AuthGuard and OnboardingPage each called useCompanyProfile()
 * as independent hook instances. This means:
 *
 *   1. They each had their OWN state (profile, loading, error).
 *   2. Calling setProfile() in OnboardingPage's instance had NO effect on
 *      AuthGuard's instance.
 *   3. After onboarding, AuthGuard still saw the OLD (profile=null,
 *      onboarding_complete=false) state from its own hook and redirected
 *      the user back to /onboarding — the "page refreshes / remains on setup"
 *      bug.
 *
 * The CORRECT fix is to hoist company profile state into a shared Context
 * that wraps the entire authenticated tree. All consumers (AuthGuard,
 * OnboardingPage, and any future page) share the same profile state.
 *
 * Calling setProfile() anywhere in the tree updates ALL consumers.
 *
 * ── STATE MACHINE ────────────────────────────────────────────────────────────
 * Identical to the previous useCompanyProfile hook — see that file for docs.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────
 * Wrap the router in <CompanyProfileProvider> (inside <AuthProvider>).
 * Consume with useCompanyProfile() — same call site, same returned shape.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getCompanyProfile } from '../lib/companyProfile'
import type { Database } from '../lib/database.types'

type CompanyProfile =
  Database['public']['Tables']['company_profiles']['Row']

export interface CompanyProfileContextType {
  profile: CompanyProfile | null
  loading: boolean
  error: string | null
  /** Imperative refresh from the server. Use after a mutation. */
  refetch: () => Promise<void>
  /**
   * Optimistic update — set the in-memory profile without a server round-trip.
   * Used by OnboardingPage immediately after upsert so AuthGuard sees the
   * updated state before navigation resolves.
   */
  setProfile: (p: CompanyProfile | null) => void
}

const CompanyProfileContext = createContext<CompanyProfileContextType>({
  profile: null,
  loading: true,
  error: null,
  refetch: async () => {},
  setProfile: () => {},
})

// ── Provider ─────────────────────────────────────────────────────────────────

export function CompanyProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [asyncLoading, setAsyncLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tracks which user ID the current profile was fetched for.
  // Ref (not state) so the comparison is synchronous during render.
  const fetchedForUserRef = useRef<string | null>(null)

  // loading is computed synchronously: true whenever the current user's
  // profile has not yet been fetched (or is currently being fetched).
  const loading =
    asyncLoading || (user !== null && fetchedForUserRef.current !== user.id)

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setError(null)
      fetchedForUserRef.current = null
      return
    }

    setAsyncLoading(true)
    setError(null)

    try {
      const data = await getCompanyProfile(user.id)
      fetchedForUserRef.current = user.id
      setProfile(data)
    } catch (e: unknown) {
      // Mark fetch as attempted so AuthGuard shows retry instead of spinner.
      fetchedForUserRef.current = user.id
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setAsyncLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.id !== fetchedForUserRef.current) {
      setProfile(null)
      setError(null)
    }
    refetch()
  }, [refetch, user])

  return (
    <CompanyProfileContext.Provider
      value={{ profile, loading, error, refetch, setProfile }}
    >
      {children}
    </CompanyProfileContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the shared company profile state.
 * Must be used inside <CompanyProfileProvider>.
 */
export function useCompanyProfile(): CompanyProfileContextType {
  return useContext(CompanyProfileContext)
}
