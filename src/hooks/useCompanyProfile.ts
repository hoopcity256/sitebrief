import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCompanyProfile } from '../lib/companyProfile'
import type { Database } from '../lib/database.types'

type CompanyProfile =
  Database['public']['Tables']['company_profiles']['Row']

export function useCompanyProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const data = await getCompanyProfile(user.id)
      setProfile(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  return { profile, loading, error, refetch, setProfile }
}
