import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateReport } from '../reports'
import { supabase } from '../supabase'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  }
}))

describe('updateReport field construction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T12:00:00.000Z'))
  })

  it('updateReport only includes explicitly provided fields', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { updated_at: '2026-07-21T12:00:00.000Z' }, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any)

    await updateReport('report-1', { work_completed: 'test', problems: 'none' })

    expect(updateMock).toHaveBeenCalledWith({
      work_completed: 'test',
      problems: 'none',
      updated_at: '2026-07-21T12:00:00.000Z'
    })
  })

  it('updateReport drops unexpected fields like id or user_id', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { updated_at: '2026-07-21T12:00:00.000Z' }, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any)

    // @ts-expect-error - simulating bad data
    await updateReport('report-1', { work_completed: 'test', id: 'hack', user_id: 'hack' })

    expect(updateMock).toHaveBeenCalledWith({
      work_completed: 'test',
      updated_at: '2026-07-21T12:00:00.000Z'
    })
  })
})
