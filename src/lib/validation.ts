/**
 * Shared validation utilities for SiteBrief.
 *
 * Use these wherever email, phone, or password validation is needed.
 * One source of truth — no duplicated regex throughout the app.
 */

/**
 * Validates an email address with pragmatic (not RFC 5322) rules.
 *
 * Valid:   john@example.com, john.smith@company.co, a+b@example.io
 * Invalid: john, john@, @company.com, john@company, john@.com, john@company., @
 *
 * Rules:
 *   - Non-empty local part (no @)
 *   - @ symbol
 *   - Non-empty domain (no dots)
 *   - At least one dot in domain
 *   - Non-empty TLD (no trailing dot)
 *   - No whitespace anywhere
 *   - Total length sanity check (max 254 per RFC 5321)
 *
 * Does NOT require ".com" — any valid TLD works.
 */
export function isValidEmail(value: string): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (trimmed.length > 254) return false
  // Pattern: local@domain.tld
  // - local:  one or more non-whitespace, non-@ chars
  // - @
  // - domain: one or more non-whitespace, non-@ chars, containing at least one dot
  // - tld:    one or more non-whitespace, non-@ chars after the last dot (no trailing dot)
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(trimmed) &&
    // Reject things like john@.com (dot immediately after @)
    !/^[^\s@]+@\./.test(trimmed) &&
    // Reject trailing dot in domain: john@company.
    !/\.$/.test(trimmed)
}

/**
 * Format a raw phone string as US (###) ###-#### format.
 * Strips non-digit characters, truncates to 10 digits.
 * Returns empty string for empty input.
 *
 * Storage note: this stores the *formatted* display string.
 * For E.164 normalization, callers should store only the 10 digits
 * and call this function at display time.
 */
export function formatUSPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/**
 * Extract the raw 10 digits from a formatted US phone string.
 * Use this to normalise before storage.
 */
export function normalizeUSPhone(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 10)
}
