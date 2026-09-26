/**
 * Tests for SignUpPage password confirmation behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignUpPage from '../SignUpPage'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../lib/auth', () => ({
  signUp: vi.fn(),
}))

vi.mock('../../lib/authErrors', () => ({
  sanitizeAuthError: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as Record<string, unknown>
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { signUp } from '../../lib/auth'

// ── Helpers ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup()
  mockNavigate.mockReset()
  vi.clearAllMocks()
})

function renderSignUp() {
  return render(
    <MemoryRouter>
      <SignUpPage />
    </MemoryRouter>
  )
}

function fillEmail(value: string) {
  // Use id selector to avoid ambiguity
  const input = document.getElementById('signup-email') as HTMLInputElement
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

function fillPassword(value: string) {
  const input = document.getElementById('signup-password') as HTMLInputElement
  fireEvent.change(input, { target: { value } })
}

function fillConfirmPassword(value: string) {
  const input = document.getElementById('signup-confirm-password') as HTMLInputElement
  fireEvent.change(input, { target: { value } })
}

function getSubmitButton() {
  return document.getElementById('signup-submit') as HTMLButtonElement
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SignUpPage — password confirmation', () => {
  beforeEach(() => {
    vi.mocked(signUp).mockReset()
  })

  it('renders both Password and Confirm Password fields', () => {
    renderSignUp()
    expect(document.getElementById('signup-password')).toBeTruthy()
    expect(document.getElementById('signup-confirm-password')).toBeTruthy()
  })

  it('shows inline mismatch error when passwords differ', () => {
    renderSignUp()
    fillPassword('mypassword1')
    fillConfirmPassword('different')
    expect(screen.getByText(/passwords do not match/i)).toBeTruthy()
  })

  it('clears mismatch error when passwords are made to match', () => {
    renderSignUp()
    fillPassword('mypassword1')
    fillConfirmPassword('different')
    expect(screen.getByText(/passwords do not match/i)).toBeTruthy()
    fillConfirmPassword('mypassword1')
    expect(screen.queryByText(/passwords do not match/i)).toBeNull()
  })

  it('Create Account button is disabled when passwords do not match', () => {
    renderSignUp()
    fillEmail('john@example.com')
    fillPassword('mypassword1')
    fillConfirmPassword('different')
    expect(getSubmitButton().disabled).toBe(true)
  })

  it('Create Account button is disabled when password is too short', () => {
    renderSignUp()
    fillEmail('john@example.com')
    fillPassword('short')
    fillConfirmPassword('short')
    expect(getSubmitButton().disabled).toBe(true)
  })

  it('Create Account button is enabled when email, password, and confirm match', () => {
    renderSignUp()
    fillEmail('john@example.com')
    fillPassword('validpassword1')
    fillConfirmPassword('validpassword1')
    expect(getSubmitButton().disabled).toBe(false)
  })

  it('navigates to /onboarding when signup returns a session (email confirmation disabled)', async () => {
    vi.mocked(signUp).mockResolvedValue({
      data: { user: { id: 'u1' } as any, session: { access_token: 'tok' } as any },
      error: null,
    })

    renderSignUp()
    fillEmail('john@example.com')
    fillPassword('validpassword1')
    fillConfirmPassword('validpassword1')

    fireEvent.click(getSubmitButton())

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true })
    })
  })

  it('shows check-email state when signup returns no session (confirmation required)', async () => {
    vi.mocked(signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    renderSignUp()
    fillEmail('john@example.com')
    fillPassword('validpassword1')
    fillConfirmPassword('validpassword1')

    fireEvent.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText(/check your email!/i)).toBeTruthy()
    })
  })

  it('Create Account button is disabled when Confirm Password is empty', () => {
    renderSignUp()
    fillEmail('john@example.com')
    fillPassword('validpassword1')
    // confirmPassword left empty — button must stay disabled
    expect(getSubmitButton().disabled).toBe(true)
    expect(signUp).not.toHaveBeenCalled()
  })
})
