import React from 'react'

interface SectionCardProps {
  children: React.ReactNode
  /** Additional styles for the card container */
  style?: React.CSSProperties
  className?: string
}

/**
 * A lightly bordered, lightly elevated surface card.
 *
 * Used for info strips, subscription sections, billing rows, form containers,
 * and other content groupings that need visual separation from the page background
 * without being heavy.
 *
 * Not used for report list cards or project list cards — those are styled inline
 * in their respective screens because they have richer interactive anatomy.
 */
export default function SectionCard({ children, style, className }: SectionCardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/**
 * A divider row between SectionCard children.
 * Use when stacking multiple rows inside a SectionCard (e.g. account info rows).
 */
export function SectionCardDivider() {
  return (
    <div
      style={{
        height: '1px',
        background: 'var(--color-border-subtle)',
        margin: '0',
      }}
    />
  )
}
