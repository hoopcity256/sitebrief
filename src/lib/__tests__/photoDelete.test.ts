import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deletePhoto } from '../photoDelete'
import { supabase } from '../supabase'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    }
  }
}))

describe('photoDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Storage .remove() is called before metadata .delete()', async () => {
    const removeMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.storage.from).mockReturnValue({ remove: removeMock } as any)
    
    const singleMock = vi.fn().mockResolvedValue({ error: null, data: {} })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any)

    await deletePhoto('photo-1', 'path/to/photo.jpg')

    expect(removeMock).toHaveBeenCalledWith(['path/to/photo.jpg'])
    expect(deleteMock).toHaveBeenCalled()
    
    const removeOrder = removeMock.mock.invocationCallOrder[0]
    const deleteOrder = deleteMock.mock.invocationCallOrder[0]
    expect(removeOrder).toBeLessThan(deleteOrder)
  })

  it('When metadata .delete().select().single() returns an error (zero rows), the error is a recoverable partial-operation error', async () => {
    const removeMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.storage.from).mockReturnValue({ remove: removeMock } as any)
    
    // Simulate zero rows returned by single() which throws an error from Supabase
    const singleMock = vi.fn().mockResolvedValue({ error: new Error('No rows'), data: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any)

    await expect(deletePhoto('photo-1', 'path/to/photo.jpg'))
      .rejects
      .toThrow('Storage file deleted but metadata row deletion failed')
  })
})
