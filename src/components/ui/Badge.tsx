import React from 'react'

type BadgeVariant = 'draft' | 'final' | 'trial' | 'success' | 'warning' | 'danger' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  draft: {
    background: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
    border: '1px solid var(--color-warning)',
  },
  final: {
    background: 'var(--color-success-soft)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success)',
  },
  trial: {
    background: 'var(--color-primary-muted)',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
  },
  success: {
    background: 'var(--color-success-soft)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success)',
  },
  warning: {
    background: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
    border: '1px solid var(--color-warning)',
  },
  danger: {
    background: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
  },
  neutral: {
    background: 'var(--color-border-subtle)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
  },
}

/**
 * Small pill badge used for report status (Draft / Final), subscription state,
 * and similar categorical labels.
 */
export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 1.4,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        ...VARIANT_STYLES[variant],
      }}
    >
      {children}
    </span>
  )
}
