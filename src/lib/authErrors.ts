/**
 * Sanitizes authentication errors into safe, user-facing error messages.
 * Prevents raw Supabase or database error messages from leaking to the user.
 *
 * @param error - The caught error object, string, or unknown value.
 * @returns A safe error message string suitable for display to users.
 */
export function sanitizeAuthError(error: unknown): string {
  if (error === null || error === undefined) {
    return '';
  }

  let message = '';

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    message = (error as { message: string }).message;
  }

  if (!message) {
    return 'Something went wrong. Please try again.';
  }

  // Connection or network-related errors
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('TypeError') ||
    message.includes('fetch')
  ) {
    return "We couldn't connect. Check your internet connection and try again.";
  }

  // Exact match for invalid login credentials
  if (message.trim() === 'Invalid login credentials') {
    return 'Invalid login credentials';
  }

  // Existing user check
  if (message.includes('User already registered')) {
    return 'An account with this email already exists.';
  }

  // Catch-all for any other error (e.g. Supabase DB internals)
  return 'Something went wrong. Please try again.';
}
