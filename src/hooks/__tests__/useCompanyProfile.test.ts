/**
 * CompanyProfileContext / useCompanyProfile tests.
 *
 * Tests the shared Context that replaced the standalone hook.
 * All renderHook calls use { wrapper } to provide CompanyProfileProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { CompanyProfileProvider, useCompanyProfile } from '../../context/CompanyProfileContext'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/companyProfile', () => ({
  getCompanyProfile: vi.fn(),
}))

import { useAuth } from '../../context/AuthContext'
import { getCompanyProfile } from '../../lib/companyProfile'

// ── Wrapper ───────────────────────────────────────────────────────────────────

// All renderHook calls must use this wrapper so the Context value is provided.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(CompanyProfileProvider, null, children)

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser = (id: string) => ({ id, email: `${id}@test.com` })

const profileRow = {
  id: 'prof-1',
  user_id: 'user-1',
  company_name: 'Acme',
  onboarding_complete: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  email: null,
  phone: null,
  brand_color: null,
  logo_storage_path: null,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCompanyProfile (via CompanyProfileContext)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts loading=true when user is present on first render', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser('user-1') as any, session: null, loading: false })

    let resolveFetch!: (v: typeof profileRow) => void
    vi.mocked(getCompanyProfile).mockReturnValue(new Promise(r => { resolveFetch = r }))

    const { result } = renderHook(() => useCompanyProfile(), { wrapper })

    // Immediately after render — must still be loading
    expect(result.current.loading).toBe(true)
    expect(result.current.profile).toBeNull()

    // Now resolve
    await act(async () => { resolveFetch(profileRow) })
    expect(result.current.loading).toBe(false)
    expect(result.current.profile).toEqual(profileRow)
  })

  it('never exposes (loading=false, profile=null) for a user whose profile has not been fetched', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser('user-1') as any, session: null, loading: false })

    let resolveFetch!: (v: typeof profileRow | null) => void
    vi.mocked(getCompanyProfile).mockReturnValue(new Promise(r => { resolveFetch = r }))

    const { result } = renderHook(() => useCompanyProfile(), { wrapper })

    // Before fetch completes — must be loading=true (not the dangerous state)
    expect(result.current.loading).toBe(true)

    // Simulate the fetch returning null (no profile row)
    await act(async () => { resolveFetch(null) })

    // loading=false, profile=null is allowed ONLY after the fetch completed
    expect(result.current.loading).toBe(false)
    expect(result.current.profile).toBeNull()
  })

  it('immediately resets to loading=true when the user changes to prevent stale profile', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser('user-1') as any, session: null, loading: false })
    vi.mocked(getCompanyProfile).mockResolvedValue(profileRow)

    const { result, rerender } = renderHook(() => useCompanyProfile(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile?.user_id).toBe('user-1')

    // Simulate user change (e.g. login as different user)
    const profile2 = { ...profileRow, id: 'prof-2', user_id: 'user-2' }
    vi.mocked(useAuth).mockReturnValue({ user: mockUser('user-2') as any, session: null, loading: false })

    let resolveUser2!: (v: typeof profile2) => void
    vi.mocked(getCompanyProfile).mockReturnValue(new Promise(r => { resolveUser2 = r }))

    rerender()

    // Immediately after user change — stale profile must be cleared and we must be loading
    expect(result.current.loading).toBe(true)
    expect(result.current.profile).toBeNull()

    await act(async () => { resolveUser2(profile2) })
    expect(result.current.loading).toBe(false)
    expect(result.current.profile?.user_id).toBe('user-2')
  })

  it('clears profile and stops loading when user logs out', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser('user-1') as any, session: null, loading: false })
    vi.mocked(getCompanyProfile).mockResolvedValue(profileRow)

    const { result, rerender } = renderHook(() => useCompanyProfile(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Simulate logout
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, loading: false })
    rerender()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.profile).toBeNull()
    })
  })

  it('exposes error state and leaves loading=false when fetch fails', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser('user-1') as any, session: null, loading: false })
    vi.mocked(getCompanyProfile).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCompanyProfile(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Network error')
    expect(result.current.profile).toBeNull()
  })

  it('session restore: deep-link refresh stays on loading screen until profile is fetched', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser('user-1') as any, session: null, loading: false })

    let resolveFetch!: (v: typeof profileRow) => void
    vi.mocked(getCompanyProfile).mockReturnValue(new Promise(r => { resolveFetch = r }))

    const { result } = renderHook(() => useCompanyProfile(), { wrapper })

    // Fetch in flight — must be loading=true (AuthGuard shows spinner, NOT redirect)
    expect(result.current.loading).toBe(true)
    expect(result.current.profile).toBeNull()

    // Fetch completes
    await act(async () => { resolveFetch(profileRow) })
    expect(result.current.loading).toBe(false)
    expect(result.current.profile?.onboarding_complete).toBe(true)
  })
})
