export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

/**
 * Iterative JPEG compression.
 *
 * Algorithm:
 * 1. Decode with createImageBitmap (honors EXIF orientation where supported).
 * 2. Scale long edge to maxLongEdge (initially 1200 px).
 * 3. Binary-search JPEG quality (8 iterations) targeting targetBytes.
 * 4. If still above targetBytes AND more dimension passes remain,
 *    reduce dimensions by 20% and repeat.
 * 5. Up to MAX_DIMENSION_PASSES = 4 additional dimension reductions.
 * 6. Accept if final blob.size <= hardCeilingBytes (409,600).
 * 7. Reject with a user-safe error if still above hardCeilingBytes.
 * 8. Always verify blob.type === 'image/jpeg' before returning.
 *
 * The returned width and height always describe the canvas that produced
 * the returned blob.
 */
const MAX_DIMENSION_PASSES = 4

export async function compressImage(
  file: File,
  options: {
    maxLongEdge?: number      // default 1200
    targetBytes?: number      // default 200_000
    hardCeilingBytes?: number // default 409_600
  } = {}
): Promise<CompressedImage> {
  const maxLongEdge = options.maxLongEdge ?? 1200
  const targetBytes = options.targetBytes ?? 200_000
  const hardCeilingBytes = options.hardCeilingBytes ?? 409_600

  // createImageBitmap honors EXIF orientation in supported browsers
  const bitmap = await createImageBitmap(file)
  let currentW = bitmap.width
  let currentH = bitmap.height
  bitmap.close()

  // Initial dimension cap
  const initialScale = Math.min(1, maxLongEdge / Math.max(currentW, currentH))
  currentW = Math.round(currentW * initialScale)
  currentH = Math.round(currentH * initialScale)

  let blob: Blob | null = null
  let blobW = currentW
  let blobH = currentH

  for (let dimPass = 0; dimPass <= MAX_DIMENSION_PASSES; dimPass++) {
    // Re-decode at target dimensions
    const resized = await createImageBitmap(file, {
      resizeWidth: currentW,
      resizeHeight: currentH,
      resizeQuality: 'high',
    })

    const canvas = document.createElement('canvas')
    canvas.width = currentW
    canvas.height = currentH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    ctx.drawImage(resized, 0, 0, currentW, currentH)
    resized.close()

    // Binary-search quality
    let lo = 0.1, hi = 0.92
    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2
      const candidate = await canvasToJpegBlob(canvas, q)
      if (candidate.size <= targetBytes) {
        lo = q
        blob = candidate
      } else {
        hi = q
      }
    }

    // Final encode at best-found quality
    if (!blob || blob.size > targetBytes) {
      blob = await canvasToJpegBlob(canvas, lo)
    }

    // Record the dimensions that produced this blob
    blobW = currentW
    blobH = currentH

    if (blob.size <= targetBytes) break

    // Only reduce dimensions if another pass remains
    if (dimPass < MAX_DIMENSION_PASSES) {
      currentW = Math.round(currentW * 0.8)
      currentH = Math.round(currentH * 0.8)
    }
  }

  if (!blob || blob.size > hardCeilingBytes) {
    throw new Error(
      'This image could not be compressed below the 400 KB limit. ' +
      'Please try a smaller or lower-resolution photo.'
    )
  }

  if (blob.type !== 'image/jpeg') {
    throw new Error('Compression produced a non-JPEG blob')
  }

  return { blob, width: blobW, height: blobH }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
      'image/jpeg',
      quality
    )
  })
}
