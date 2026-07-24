import React, { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ── SVG Icons ─────────────────────────────────────────────────────────────

const IconProjects = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
)

const IconReports = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="12" y2="17" />
  </svg>
)

const IconMore = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
    <circle cx="5"  cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

// ── Types ──────────────────────────────────────────────────────────────────

type ActiveTab = 'projects' | 'reports' | 'more'

interface AppShellProps {
  activeTab: ActiveTab
  children: React.ReactNode
}

// ── AppShell ───────────────────────────────────────────────────────────────

/**
 * Responsive authenticated shell.
 *
 * Mobile  (320–1023px): full-height column, fixed bottom tab bar.
 * Desktop (1024px+):    sticky left sidebar (220px) + centered content (max 860px).
 *
 * Not shown during Onboarding or the focused Report Editor.
 */
export const AppShell = ({ activeTab, children }: AppShellProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showComingSoon, setShowComingSoon] = useState(false)

  const handleReportsTap = useCallback(() => {
    // Reports is a Week 2 placeholder — never navigate to an empty screen
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 2000)
  }, [])

  const isActive = (tab: ActiveTab) => activeTab === tab

  // Avoid redundant navigation to the current route
  const goTo = useCallback((path: string) => {
    if (location.pathname !== path) navigate(path)
  }, [navigate, location.pathname])

  return (
    <div className="app-shell">
      {/* ── Navigation (bottom bar on mobile, sidebar on desktop) ── */}
      <nav className="app-shell__tab-bar" aria-label="Main navigation">

        {/* Desktop-only wordmark */}
        <div className="tab-bar__logo" aria-hidden="true">
          SiteBrief
        </div>

        {/* Projects */}
        <button
          className={`tab-item${isActive('projects') ? ' tab-item--active' : ''}`}
          onClick={() => goTo('/projects')}
          aria-label="Projects"
          aria-current={isActive('projects') ? 'page' : undefined}
        >
          <span className="tab-item__icon"><IconProjects /></span>
          <span className="tab-item__label">Projects</span>
        </button>

        {/* Reports — Coming Soon */}
        <button
          className="tab-item tab-item--disabled"
          onClick={handleReportsTap}
          aria-label="Reports — coming soon"
          aria-disabled="true"
          type="button"
        >
          <span className="tab-item__icon"><IconReports /></span>
          <span className="tab-item__label">Reports</span>
        </button>

        {/* More */}
        <button
          className={`tab-item${isActive('more') ? ' tab-item--active' : ''}`}
          onClick={() => goTo('/more')}
          aria-label="More"
          aria-current={isActive('more') ? 'page' : undefined}
        >
          <span className="tab-item__icon"><IconMore /></span>
          <span className="tab-item__label">More</span>
        </button>
      </nav>

      {/* ── Main content ── */}
      <main className="app-shell__content">
        {children}
      </main>

      {/* ── Coming Soon toast ── */}
      {showComingSoon && (
        <div className="coming-soon-toast" role="status" aria-live="polite">
          Reports — coming soon
        </div>
      )}
    </div>
  )
}
