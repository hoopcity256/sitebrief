/**
 * Tests for shared validation utilities (email, phone).
 */
import { describe, it, expect } from 'vitest'
import { isValidEmail, formatUSPhone, normalizeUSPhone } from '../validation'

// ── isValidEmail ────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  const valid = [
    'john@example.com',
    'john.smith@company.co',
    'a+b@example.io',
    'user@sub.domain.org',
    'user123@test.co.uk',
    'first.last+tag@domain.net',
  ]

  const invalid = [
    '',
    'john',
    'john@',
    '@company.com',
    'john@company',       // no TLD
    'john@.com',          // dot immediately after @
    'john@company.',      // trailing dot
    '@',
    'no spaces@example.com',
    'no@spaces .com',
    'a'.repeat(255) + '@example.com', // too long
  ]

  it.each(valid)('accepts valid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each(invalid)('rejects invalid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('trims surrounding whitespace before validating', () => {
    // The value itself has no internal spaces — leading/trailing should be stripped
    expect(isValidEmail('  john@example.com  ')).toBe(true)
  })
})

// ── formatUSPhone ────────────────────────────────────────────────────────────

describe('formatUSPhone', () => {
  it('returns empty for empty input', () => {
    expect(formatUSPhone('')).toBe('')
  })

  it('formats 10 digits as (###) ###-####', () => {
    expect(formatUSPhone('9125551234')).toBe('(912) 555-1234')
  })

  it('strips non-digits before formatting', () => {
    expect(formatUSPhone('(912) 555-1234')).toBe('(912) 555-1234')
  })

  it('truncates beyond 10 digits', () => {
    expect(formatUSPhone('91255512341234')).toBe('(912) 555-1234')
  })

  it('formats partial 3 digits as (###', () => {
    expect(formatUSPhone('912')).toBe('(912')
  })

  it('formats partial 4-6 digits as (###) ###', () => {
    expect(formatUSPhone('91255')).toBe('(912) 55')
  })

  it('formats partial 7-9 digits correctly', () => {
    expect(formatUSPhone('9125551')).toBe('(912) 555-1')
  })
})

// ── normalizeUSPhone ────────────────────────────────────────────────────────

describe('normalizeUSPhone', () => {
  it('strips formatting to raw digits', () => {
    expect(normalizeUSPhone('(912) 555-1234')).toBe('9125551234')
  })

  it('truncates beyond 10 digits', () => {
    expect(normalizeUSPhone('91255512349999')).toBe('9125551234')
  })
})
