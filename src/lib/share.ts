/**
 * Share / download service.
 *
 * Strategy:
 * 1. Try Web Share API (navigator.share with files) — works on iOS Safari,
 *    Chrome for Android, and modern mobile browsers.
 * 2. Fall back to a standard anchor-download — works everywhere.
 *
 * The caller passes the Blob and filename; this module handles the rest.
 * No business logic lives here.
 */

/**
 * Returns true if the current browser supports file sharing via the
 * Web Share API. Deliberately conservative — only when `canShare` exists
 * and accepts a files payload.
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  if (!navigator.canShare) return false
  try {
    // canShare with a dummy file — spec-compliant check
    return navigator.canShare({ files: [new File([''], 'test.pdf', { type: 'application/pdf' })] })
  } catch {
    return false
  }
}

/**
 * Share the PDF using the Web Share API (files).
 * Throws if sharing fails or is cancelled by the user.
 */
export async function shareBlob(blob: Blob, filename: string, title: string): Promise<void> {
  const file = new File([blob], filename, { type: 'application/pdf' })
  await navigator.share({
    title,
    files: [file],
  })
}

/**
 * Trigger a browser download of the PDF blob.
 * Works as a universal fallback.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Clean up after a short delay to allow the download to start
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 150)
}
