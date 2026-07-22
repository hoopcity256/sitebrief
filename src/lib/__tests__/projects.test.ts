import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProject, archiveProject, listProjects, getProject } from '../projects'
import { supabase } from '../supabase'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  }
}))

describe('projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createProject calls supabase.from("projects").insert(...) with correct payload', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'proj-1' }, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

    await createProject('user-1', { name: 'Test Proj', customer_name: 'John' })

    expect(supabase.from).toHaveBeenCalledWith('projects')
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Test Proj',
      customer_name: 'John',
      address: '',
      customer_email: null,
      customer_phone: null,
    })
  })

  it('archiveProject calls update({ is_archived: true }) with .select().single()', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'proj-1' }, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any)

    await archiveProject('proj-1')

    expect(updateMock).toHaveBeenCalledWith({ is_archived: true })
    expect(eqMock).toHaveBeenCalledWith('id', 'proj-1')
    expect(selectMock).toHaveBeenCalled()
    expect(singleMock).toHaveBeenCalled()
  })

  it('archiveProject throws when .single() returns no data (zero-row detection)', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any)

    await expect(archiveProject('proj-1'))
      .rejects
      .toThrow('Project not found or not authorized')
  })

  it('listProjects filters is_archived = false', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const eq2Mock = vi.fn().mockReturnValue({ order: orderMock })
    const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock })
    const selectMock = vi.fn().mockReturnValue({ eq: eq1Mock })
    
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

    await listProjects('user-1')

    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eq1Mock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(eq2Mock).toHaveBeenCalledWith('is_archived', false)
  })

  it('getProject returns a single project by ID', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'proj-1' }, error: null })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

    const result = await getProject('proj-1')

    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('id', 'proj-1')
    expect(result).toEqual({ id: 'proj-1' })
  })
})
