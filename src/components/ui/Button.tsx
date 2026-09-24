import React from 'react'
import Spinner from './Spinner'

type ButtonVariant = 'primary' | 'action' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Show inline loading spinner and disable the button */
  loading?: boolean
  /** Stretch to fill parent width */
  fullWidth?: boolean
  /** Icon before label text */
  iconLeft?: React.ReactNode
  /** Icon after label text */
  iconRight?: React.ReactNode
}

/**
 * SiteBrief shared Button component.
 *
 * Only the variants required by existing SiteBrief screens are implemented:
 * primary, action, secondary, ghost, danger.
 *
 * All tappable targets meet the 48px minimum height (lg variant = 52px).
 */
export default function Button({
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-md)',
    fontWeight: 'var(--weight-semibold)',
    lineHeight: 1.2,
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'background 0.12s ease, opacity 0.12s ease',
    WebkitTapHighlightColor: 'transparent',
    textDecoration: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    padding: '0 20px',
    minHeight: size === 'lg' ? '52px' : '48px',
    width: fullWidth ? '100%' : undefined,
    ...style,
  }

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'var(--color-primary)',
      color: '#ffffff',
      boxShadow: 'var(--shadow-sm)',
    },
    action: {
      background: 'var(--color-action)',
      color: '#ffffff',
      boxShadow: 'var(--shadow-sm)',
    },
    secondary: {
      background: 'var(--color-surface)',
      color: 'var(--color-primary)',
      border: '1px solid var(--color-primary)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-muted)',
      border: '1px solid var(--color-border)',
    },
    danger: {
      background: 'var(--color-surface)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-border)',
    },
  }

  return (
    <button
      disabled={isDisabled}
      style={{ ...baseStyle, ...variantStyles[variant] }}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" color={variant === 'primary' || variant === 'action' ? 'white' : 'primary'} />
      ) : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
}
