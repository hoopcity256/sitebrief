import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { compressImage } from '../imageCompression'

describe('imageCompression', () => {
  let toBlobMock: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock createImageBitmap
    global.createImageBitmap = vi.fn().mockResolvedValue({
      width: 2000,
      height: 1500,
      close: vi.fn(),
    })

    // Mock canvas context
    const drawImageMock = vi.fn()
    const getContextMock = vi.fn(() => ({
      drawImage: drawImageMock,
    }))

    // Mock canvas toBlob
    toBlobMock = vi.fn((callback, type, quality) => {
      // Return a blob of size 100kb for success case
      callback(new Blob(['a'.repeat(100_000)], { type: 'image/jpeg' }))
    })

    // Mock document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: getContextMock,
          toBlob: toBlobMock,
          width: 0,
          height: 0,
        } as any
      }
      return {} as any
    })
  })

  it('Algorithm reduces quality when initial blob exceeds targetBytes', async () => {
    // 1st quality = ~0.51 -> size 300kb (exceeds)
    // 2nd quality = ~0.3 -> size 100kb (fits)
    toBlobMock.mockImplementation((callback, type, quality) => {
      if (quality > 0.5) {
        callback(new Blob(['a'.repeat(300_000)], { type: 'image/jpeg' }))
      } else {
        callback(new Blob(['a'.repeat(100_000)], { type: 'image/jpeg' }))
      }
    })

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    const result = await compressImage(file, { targetBytes: 200_000 })
    
    expect(result.blob.size).toBeLessThanOrEqual(200_000)
    // Should break without needing dimension reductions
    // Only 1 dimension pass needed
    expect(global.createImageBitmap).toHaveBeenCalledTimes(2) // 1 initial + 1 for the first pass
  })

  it('Algorithm reduces dimensions when quality reduction alone is insufficient', async () => {
    // Always return 300kb for the first dimension pass, 100kb for the second dimension pass
    let passCount = 0
    toBlobMock.mockImplementation((callback) => {
      if (passCount < 9) { // 8 binary search + 1 final encode
        passCount++
        callback(new Blob(['a'.repeat(300_000)], { type: 'image/jpeg' }))
      } else {
        callback(new Blob(['a'.repeat(100_000)], { type: 'image/jpeg' }))
      }
    })

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    const result = await compressImage(file, { targetBytes: 200_000 })
    
    expect(result.blob.size).toBeLessThanOrEqual(200_000)
    expect(global.createImageBitmap).toHaveBeenCalledTimes(3) // 1 initial + 2 dimension passes
  })

  it('Algorithm rejects with user-safe error when final blob exceeds hardCeilingBytes', async () => {
    toBlobMock.mockImplementation((callback) => {
      callback(new Blob(['a'.repeat(500_000)], { type: 'image/jpeg' }))
    })

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    await expect(compressImage(file, { targetBytes: 200_000, hardCeilingBytes: 409_600 }))
      .rejects
      .toThrow(/This image could not be compressed below the 400 KB limit/)
  })

  it('Algorithm verifies blob.type === "image/jpeg" before returning', async () => {
    toBlobMock.mockImplementation((callback) => {
      callback(new Blob(['a'.repeat(100_000)], { type: 'image/png' }))
    })

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    await expect(compressImage(file, { targetBytes: 200_000 }))
      .rejects
      .toThrow('Compression produced a non-JPEG blob')
  })

  it('No more than MAX_DIMENSION_PASSES + 1 total dimension iterations', async () => {
    // Always exceed target bytes to force max dimension reductions
    // But under hard ceiling to avoid that error
    toBlobMock.mockImplementation((callback) => {
      callback(new Blob(['a'.repeat(300_000)], { type: 'image/jpeg' }))
    })

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    await expect(compressImage(file, { targetBytes: 200_000, hardCeilingBytes: 400_000 }))
      .resolves // will resolve because 300,000 <= 400,000 hard ceiling
      .toBeDefined()
      
    // 1 initial decode + 5 passes (MAX_DIMENSION_PASSES = 4, so passes 0,1,2,3,4) = 6
    expect(global.createImageBitmap).toHaveBeenCalledTimes(6)
  })
})
