/**
 * SiteBrief icon library.
 *
 * Rules:
 * - All paths use currentColor so icons inherit text color by default.
 * - Decorative icons (used alongside a label) receive aria-hidden="true".
 * - Interactive icon-only controls must supply an aria-label on the parent button.
 * - No emoji as functional UI icons.
 * - No external icon package.
 */

import React from 'react'

interface IconProps {
  /** px size of the square SVG — defaults to 20 */
  size?: number
  /** className forwarded to <svg> */
  className?: string
  /** Override color — defaults to currentColor */
  color?: string
  /** aria-label for standalone (non-decorative) usage. Leave unset for decorative. */
  label?: string
}

const base = (
  size: number,
  label: string | undefined,
  className: string | undefined,
  children: React.ReactNode,
  viewBox = '0 0 24 24',
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? 'img' : undefined}
    className={className}
  >
    {children}
  </svg>
)

// ── Navigation ────────────────────────────────────────────────────────────────

export const FolderIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </>)

export const DocumentIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </>)

export const MoreDotsIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </>)

export const EllipsisHIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  </>)

// ── Actions ───────────────────────────────────────────────────────────────────

export const PlusIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>)

export const ChevronLeftIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <polyline points="15 18 9 12 15 6" />
  </>)

export const ChevronRightIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <polyline points="9 18 15 12 9 6" />
  </>)

export const XIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>)

export const CheckIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <polyline points="20 6 9 17 4 12" />
  </>)

export const ShareIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </>)

export const DownloadIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>)

export const EditIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>)

export const TrashIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </>)

// ── Camera / Photo ────────────────────────────────────────────────────────────

export const CameraIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </>)

// ── Account / Profile ─────────────────────────────────────────────────────────

export const PersonIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>)

export const MailIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </>)

export const BuildingIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <rect x="2" y="7" width="20" height="14" rx="1" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    <rect x="6" y="11" width="3" height="3" />
    <rect x="15" y="11" width="3" height="3" />
    <rect x="6" y="16" width="3" height="3" />
    <rect x="15" y="16" width="3" height="3" />
  </>)

export const MapPinIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </>)

// ── Billing / Subscription ────────────────────────────────────────────────────

export const ClockIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>)

export const AlertTriangleIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const EyeIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>)

export const EyeOffIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </>)

// ── Status / feedback ─────────────────────────────────────────────────────────

export const CheckCircleIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </>)

export const AlertCircleIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </>)

export const RefreshCwIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </>)

// ── Help / Info ───────────────────────────────────────────────────────────────

export const HelpCircleIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>)

export const FileTextIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </>)

export const ShieldIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </>)

export const LogOutIcon = ({ size = 20, label, className }: IconProps) =>
  base(size, label, className, <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </>)
