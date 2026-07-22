import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadPhoto } from '../photoUpload'
import { supabase } from '../supabase'
import { compressImage } from '../imageCompression'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    }
  }
}))

vi.mock('../imageCompression', () => ({
  compressImage: vi.fn(),
}))

describe('photoUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(compressImage).mockResolvedValue({
      blob: new Blob(),
      width: 100,
      height: 100
    })
    
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('mock-uuid-123' as `${string}-${string}-${string}-${string}-${string}`)
  })

  it('Metadata INSERT occurs before Storage upload call', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const uploadMock = vi.fn().mockResolvedValue({ error: null })
    
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: uploadMock } as any)

    const file = new File([''], 'test.jpg')
    await uploadPhoto(file, 'user-1', 'report-1', 0)

    // Verify insert happened
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mock-uuid-123',
      user_id: 'user-1',
      report_id: 'report-1',
      storage_path: 'users/user-1/reports/report-1/mock-uuid-123.jpg',
      display_order: 0,
    }))
    
    // Verify upload happened
    expect(uploadMock).toHaveBeenCalled()
    
    // Check order (insert before upload)
    const insertOrder = insertMock.mock.invocationCallOrder[0]
    const uploadOrder = uploadMock.mock.invocationCallOrder[0]
    expect(insertOrder).toBeLessThan(uploadOrder)
  })

  it('When Storage upload fails, metadata cleanup (DELETE) is attempted', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const uploadMock = vi.fn().mockResolvedValue({ error: new Error('Upload error') })
    
    const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'report_photos') {
        return { insert: insertMock, delete: deleteMock } as any
      }
      return {} as any
    })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: uploadMock } as any)

    const file = new File([''], 'test.jpg')
    await expect(uploadPhoto(file, 'user-1', 'report-1', 0)).rejects.toThrow('Upload error')
    
    expect(deleteMock).toHaveBeenCalled()
  })

  it('When both upload and cleanup fail, the thrown error is a distinct consistency error', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const uploadMock = vi.fn().mockResolvedValue({ error: new Error('Upload error') })
    
    const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete error') })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'report_photos') {
        return { insert: insertMock, delete: deleteMock } as any
      }
      return {} as any
    })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: uploadMock } as any)

    const file = new File([''], 'test.jpg')
    await expect(uploadPhoto(file, 'user-1', 'report-1', 0))
      .rejects
      .toThrow('Photo upload failed and metadata cleanup also failed.')
  })
})
