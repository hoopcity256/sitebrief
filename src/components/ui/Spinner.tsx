
interface SpinnerProps {
  /** Visual size of the spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  color?: 'primary' | 'white'
  /** Additional className */
  className?: string
}

const SIZE_PX: Record<NonNullable<SpinnerProps['size']>, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

/**
 * Accessible loading spinner.
 * Always provides a visually-hidden "Loading…" label for assistive tech.
 */
export default function Spinner({ size = 'md', color = 'primary', className }: SpinnerProps) {
  const px = SIZE_PX[size]
  const stroke = color === 'white' ? '#ffffff' : 'var(--color-primary)'
  const strokeMuted = color === 'white' ? 'rgba(255,255,255,0.25)' : 'rgba(26,82,118,0.18)'

  return (
    <span
      role="status"
      aria-label="Loading"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ animation: 'sb-spin 0.75s linear infinite' }}
      >
        {/* background track */}
        <circle cx="12" cy="12" r="10" stroke={strokeMuted} strokeWidth="2.5" />
        {/* animated arc */}
        <path
          d="M12 2 a10 10 0 0 1 10 10"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
