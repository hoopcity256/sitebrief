import { AlertCircleIcon, RefreshCwIcon } from '../icons'
import Button from './Button'

interface ErrorStateProps {
  /** Human-readable error message — must not expose internal details */
  message?: string
  /** Retry callback. If omitted, no retry button is shown. */
  onRetry?: () => void
  retryLoading?: boolean
}

/**
 * Standard error state for async loading failures.
 *
 * Shows a generic, safe message by default. Never exposes technical details.
 * Retry button appears when onRetry is provided.
 */
export default function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  retryLoading = false,
}: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        gap: '10px',
      }}
    >
      <div
        style={{ color: 'var(--color-danger)', marginBottom: '4px' }}
        aria-hidden="true"
      >
        <AlertCircleIcon size={40} />
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-danger)',
          lineHeight: 'var(--leading-normal)',
          maxWidth: '280px',
        }}
      >
        {message}
      </p>

      {onRetry && (
        <div style={{ marginTop: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            loading={retryLoading}
            onClick={onRetry}
            iconLeft={!retryLoading ? <RefreshCwIcon size={16} /> : undefined}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
