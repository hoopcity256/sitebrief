/**
 * Tests for sandbox PDF diagnostic helpers.
 *
 * Tests the pure utility functions extracted from ReportPreviewPage:
 *   - sanitizeErrorMessage (URL/token/path redaction)
 *   - buildDiagnosticText (paste-friendly output format)
 *   - parseFailedStage (stage number extraction from error messages)
 *
 * These are tested here as pure functions rather than through full
 * component rendering to keep tests fast and deterministic.
 */
import { describe, it, expect } from 'vitest'

// ── Copy the pure helpers here for unit testing ───────────────────────────
// (They live in ReportPreviewPage as module-level functions.)
// We duplicate the logic here to test it in isolation, consistent with
// the project practice of testing pure utilities separately.

function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/https?:\/\/[^\s"')]+/gi, '[URL removed]')
    .replace(/[A-Za-z0-9+/=]{60,}/g, '[token removed]')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\s"')]+/gi, '[path removed]')
    .slice(0, 300)
}

const PDF_STAGES = {
  1:  'load report',
  2:  'load company profile',
  3:  'load project',
  4:  'load photo records',
  5:  'create signed photo URLs',
  6:  'count available signed URLs',
  7:  'fetch + decode photo',
  8:  'construct PDF data',
  9:  'render PDF blob',
  10: 'validate PDF blob',
  11: 'share or download',
} as const

type StageNumber = keyof typeof PDF_STAGES

function parseFailedStage(msg: string, defaultStage: StageNumber): StageNumber {
  const match = /\[pdf:(\d+)\]/.exec(msg)
  if (match) {
    const n = parseInt(match[1], 10) as StageNumber
    if (n in PDF_STAGES) return n
  }
  return defaultStage
}

interface PdfDiagnostic {
  stage: StageNumber
  stageLabel: string
  errorName: string
  errorMessage: string
  photoCount: number
  signedUrlCount: number
  resolvedCount: number
  photoIndex: number | null
  lastMime: string | null
  blobProduced: boolean
  blobSizeKb: number | null
  blobType: string | null
  textOnly: boolean
}

function buildDiagnosticText(d: PdfDiagnostic): string {
  const lines = [
    'SiteBrief PDF Diagnostic',
    '========================',
    `Stage: ${d.stage}  ${d.stageLabel}`,
    `Error: ${d.errorName}`,
    `Message: ${d.errorMessage}`,
    '',
    `Photo count: ${d.photoCount}`,
    `Signed URL count: ${d.signedUrlCount}`,
    `Resolved (data URL) count: ${d.resolvedCount}`,
    d.photoIndex !== null ? `Error at photo index: ${d.photoIndex}` : null,
    d.lastMime ? `Last photo MIME: ${d.lastMime}` : null,
    '',
    `Blob produced: ${d.blobProduced ? 'yes' : 'no'}`,
    d.blobProduced ? `Blob size: ${d.blobSizeKb} KB` : null,
    d.blobProduced ? `Blob type: ${d.blobType}` : null,
    '',
    `Text-only run: ${d.textOnly ? 'yes' : 'no'}`,
    `User agent: ${navigator.userAgent}`,
  ]
  return lines.filter(l => l !== null).join('\n')
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('sanitizeErrorMessage', () => {
  it('removes https URLs', () => {
    const result = sanitizeErrorMessage(
      'fetch failed: https://abc.supabase.co/storage/v1/object/sign/photos/u1/p.jpg?token=xyz'
    )
    expect(result).not.toContain('supabase.co')
    expect(result).toContain('[URL removed]')
  })

  it('removes http URLs', () => {
    const result = sanitizeErrorMessage('failed to fetch http://localhost:3000/api/token')
    expect(result).not.toContain('localhost')
    expect(result).toContain('[URL removed]')
  })

  it('removes long base64/JWT-like tokens', () => {
    const longToken = 'A'.repeat(80)
    const result = sanitizeErrorMessage(`auth token: ${longToken} expired`)
    expect(result).not.toContain(longToken)
    expect(result).toContain('[token removed]')
  })

  it('does NOT remove short safe strings', () => {
    const result = sanitizeErrorMessage('FileReader failed at photo 2')
    expect(result).toBe('FileReader failed at photo 2')
  })

  it('removes UUID-prefixed storage paths', () => {
    const path = '3f6e1234-abcd-4abc-8def-1234567890ab/report-photos/photo.jpg'
    const result = sanitizeErrorMessage(`storage error: ${path}`)
    expect(result).not.toContain('report-photos')
    expect(result).toContain('[path removed]')
  })

  it('truncates messages over 300 characters', () => {
    // Use a realistic long message that contains no URLs, tokens, or UUIDs
    // so the truncation is the only transformation applied.
    const long = 'FileReader error at photo index 2: '.repeat(10) // ~360 chars
    const result = sanitizeErrorMessage(long)
    expect(result.length).toBeLessThanOrEqual(300)
    expect(result.length).toBeGreaterThan(0)
  })

  it('preserves normal error messages unchanged', () => {
    const msg = 'TypeError: Cannot read properties of null'
    expect(sanitizeErrorMessage(msg)).toBe(msg)
  })
})

describe('parseFailedStage', () => {
  it('extracts stage number from [pdf:N] prefix', () => {
    expect(parseFailedStage('[pdf:9] render failed', 1)).toBe(9)
  })

  it('extracts stage 7 correctly', () => {
    expect(parseFailedStage('[pdf:7] photo 2 fetch failed: HTTP 403', 1)).toBe(7)
  })

  it('falls back to default when no [pdf:N] prefix', () => {
    expect(parseFailedStage('some unknown error', 9)).toBe(9)
  })

  it('falls back to default when stage number is out of range', () => {
    expect(parseFailedStage('[pdf:99] bad stage', 9)).toBe(9)
  })

  it('handles [pdf:1] correctly', () => {
    expect(parseFailedStage('[pdf:1] no report loaded', 9)).toBe(1)
  })

  it('handles [pdf:11] correctly', () => {
    expect(parseFailedStage('[pdf:11] share failed', 9)).toBe(11)
  })
})

describe('buildDiagnosticText', () => {
  const baseDiag: PdfDiagnostic = {
    stage: 9,
    stageLabel: 'render PDF blob',
    errorName: 'TypeError',
    errorMessage: 'Cannot read properties of undefined',
    photoCount: 3,
    signedUrlCount: 3,
    resolvedCount: 2,
    photoIndex: null,
    lastMime: 'image/jpeg',
    blobProduced: false,
    blobSizeKb: null,
    blobType: null,
    textOnly: false,
  }

  it('includes stage number and label', () => {
    const text = buildDiagnosticText(baseDiag)
    expect(text).toContain('Stage: 9  render PDF blob')
  })

  it('includes error name and message', () => {
    const text = buildDiagnosticText(baseDiag)
    expect(text).toContain('Error: TypeError')
    expect(text).toContain('Message: Cannot read properties of undefined')
  })

  it('includes photo counts', () => {
    const text = buildDiagnosticText(baseDiag)
    expect(text).toContain('Photo count: 3')
    expect(text).toContain('Signed URL count: 3')
    expect(text).toContain('Resolved (data URL) count: 2')
  })

  it('includes MIME type', () => {
    const text = buildDiagnosticText(baseDiag)
    expect(text).toContain('Last photo MIME: image/jpeg')
  })

  it('includes blob produced: no when blob was not produced', () => {
    const text = buildDiagnosticText(baseDiag)
    expect(text).toContain('Blob produced: no')
    expect(text).not.toContain('Blob size:')
  })

  it('includes blob size and type when blob was produced', () => {
    const diag = { ...baseDiag, blobProduced: true, blobSizeKb: 142, blobType: 'application/pdf' }
    const text = buildDiagnosticText(diag)
    expect(text).toContain('Blob produced: yes')
    expect(text).toContain('Blob size: 142 KB')
    expect(text).toContain('Blob type: application/pdf')
  })

  it('includes photo index when error occurred at a specific photo', () => {
    const diag = { ...baseDiag, stage: 7 as StageNumber, stageLabel: 'fetch + decode photo', photoIndex: 2 }
    const text = buildDiagnosticText(diag)
    expect(text).toContain('Error at photo index: 2')
  })

  it('omits photo index line when photoIndex is null', () => {
    const text = buildDiagnosticText(baseDiag)
    expect(text).not.toContain('Error at photo index')
  })

  it('marks text-only runs', () => {
    const diag = { ...baseDiag, textOnly: true }
    const text = buildDiagnosticText(diag)
    expect(text).toContain('Text-only run: yes')
  })

  it('starts with the SiteBrief header', () => {
    const text = buildDiagnosticText(baseDiag)
    expect(text.startsWith('SiteBrief PDF Diagnostic')).toBe(true)
  })
})
