import React from 'react'
import Button from './Button'

interface EmptyStateProps {
  /** SVG icon element to display above the heading */
  icon?: React.ReactNode
  heading: string
  subtext?: string
  /** If provided, renders a primary action button */
  action?: {
    label: string
    onClick: () => void
    loading?: boolean
  }
}

/**
 * Standard empty-state treatment.
 *
 * Pattern: [icon] [heading] [subtext] [optional action button]
 * Centered vertically and horizontally within its container.
 *
 * Used by:
 * - Projects list (no projects yet)
 * - Project detail (no reports yet)
 * - Photo section (no photos)
 */
export default function EmptyState({ icon, heading, subtext, action }: EmptyStateProps) {
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
      {icon && (
        <div
          style={{
            color: 'var(--color-border)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-md)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--color-text)',
          lineHeight: 'var(--leading-snug)',
        }}
      >
        {heading}
      </p>

      {subtext && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-normal)',
            maxWidth: '280px',
          }}
        >
          {subtext}
        </p>
      )}

      {action && (
        <div style={{ marginTop: '8px' }}>
          <Button
            variant="primary"
            size="md"
            loading={action.loading}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
