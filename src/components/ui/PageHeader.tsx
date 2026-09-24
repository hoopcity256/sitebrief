import React from 'react'
import { ChevronLeftIcon } from '../icons'

interface PageHeaderProps {
  /** Left: back chevron button. Provide onClick to enable. */
  onBack?: () => void
  /** Back button accessible label */
  backLabel?: string
  /** Center: primary title */
  title: string
  /** Center: optional subtitle below the title */
  subtitle?: string
  /** Right: arbitrary slot (save status, badge, action button) */
  right?: React.ReactNode
  /** Additional styles for the header container */
  style?: React.CSSProperties
}

/**
 * Sticky page header used by screens that need back navigation or a right action slot.
 *
 * - Sticky at top with safe-area-inset-top padding.
 * - Surface background + bottom border (no shadow).
 * - Left: optional back chevron button (40×40 tap target).
 * - Center: title + optional subtitle.
 * - Right: arbitrary slot.
 */
export default function PageHeader({
  onBack,
  backLabel = 'Back',
  title,
  subtitle,
  right,
  style,
}: PageHeaderProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: '12px',
        paddingLeft: '16px',
        paddingRight: '16px',
        ...style,
      }}
    >
      {/* Back button */}
      {onBack ? (
        <button
          onClick={onBack}
          aria-label={backLabel}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            flexShrink: 0,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--color-text)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ChevronLeftIcon size={18} />
        </button>
      ) : (
        // Empty spacer when no back button, so title still centers correctly
        <span style={{ width: '40px', flexShrink: 0 }} />
      )}

      {/* Title + subtitle */}
      <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-primary)',
            lineHeight: 'var(--leading-tight)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.2,
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Right slot — 40px width reserved to keep title visually centered */}
      <div style={{ width: right ? undefined : '40px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {right}
      </div>
    </header>
  )
}
