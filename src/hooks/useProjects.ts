import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listProjects } from '../lib/projects'
import type { ProjectRow } from '../lib/projects'

export function useProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const data = await listProjects(user.id)
      setProjects(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  return { projects, loading, error, refetch }
}
