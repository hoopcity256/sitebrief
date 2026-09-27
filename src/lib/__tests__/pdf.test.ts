/**
 * Tests for pure helper functions in src/lib/pdf.tsx.
 *
 * We test the exported helpers that contain logic:
 *   - reportPdfFilename  (professional filename generation + sanitization)
 *
 * The React component and generateReportPdfBlob are browser-only
 * (require @react-pdf/renderer WebAssembly) and are verified
 * via real-device testing on iPhone, not unit tests.
 */
import { describe, it, expect } from 'vitest'
import { reportPdfFilename } from '../pdf'

describe('reportPdfFilename', () => {
  const base = {
    companyName:  'Apex Construction',
    projectName:  'Downtown Office Build',
    reportNumber: 4,
    createdAt:    '2026-09-26T14:00:00Z',
  }

  it('produces a .pdf extension', () => {
    expect(reportPdfFilename(base)).toMatch(/\.pdf$/)
  })

  it('pads report number to 3 digits', () => {
    expect(reportPdfFilename(base)).toContain('Report-004')
  })

  it('includes the ISO date', () => {
    expect(reportPdfFilename(base)).toContain('2026-09-26')
  })

  it('includes sanitized company name', () => {
    const filename = reportPdfFilename(base)
    expect(filename).toContain('Apex_Construction')
  })

  it('includes sanitized project name (up to 20 chars)', () => {
    const filename = reportPdfFilename(base)
    // "Downtown_Office_Build" = 21 chars → truncated to "Downtown_Office_Buil"
    expect(filename).toContain('Downtown_Office_Bui')
  })

  it('replaces special characters with underscores', () => {
    const filename = reportPdfFilename({
      ...base,
      companyName: 'Smith & Sons, LLC',
      projectName: 'Site #12 (Phase 2)',
    })
    expect(filename).not.toMatch(/[&,#()[\]{}]/)
  })

  it('does not produce double underscores in output', () => {
    const filename = reportPdfFilename({
      ...base,
      companyName: 'A  B',   // double space
      projectName: 'C--D',   // double dash
    })
    expect(filename).not.toContain('__')
  })

  it('caps company name at 20 chars before extension', () => {
    const filename = reportPdfFilename({
      ...base,
      companyName: 'A'.repeat(40),
    })
    const parts = filename.split('_')
    // First segment is company (sanitized, max 20 chars)
    expect(parts[0].length).toBeLessThanOrEqual(20)
  })

  it('caps project name at 20 chars before extension', () => {
    const filename = reportPdfFilename({
      ...base,
      projectName: 'B'.repeat(40),
    })
    const parts = filename.split('_')
    expect(parts[1].length).toBeLessThanOrEqual(20)
  })

  it('pads single-digit report number to 3 digits', () => {
    expect(reportPdfFilename({ ...base, reportNumber: 1 })).toContain('Report-001')
  })

  it('handles double-digit report numbers', () => {
    expect(reportPdfFilename({ ...base, reportNumber: 42 })).toContain('Report-042')
  })

  it('handles triple-digit report numbers without truncation', () => {
    expect(reportPdfFilename({ ...base, reportNumber: 123 })).toContain('Report-123')
  })
})
