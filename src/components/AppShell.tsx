import React, { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FolderIcon, DocumentIcon, EllipsisHIcon } from './icons'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AppShellProps {
  /**
   * @deprecated The activeTab prop is no longer used.
   * Active nav state is derived from useLocation() automatically.
   * Retained as an optional ignored field so existing page callsites
   * continue to compile without modification until they are migrated
   * in Checkpoints 3–7.
   */
  activeTab?: string
  children: React.ReactNode
}

// ── Active-tab derivation ──────────────────────────────────────────────────────

function deriveActiveTab(pathname: string): 'projects' | 'more' | 'none' {
  if (pathname.startsWith('/projects') || pathname.startsWith('/preview')) return 'projects'
  if (pathname === '/more') return 'more'
  return 'none'
}

// ── AppShell ───────────────────────────────────────────────────────────────────

/**
 * Responsive authenticated shell.
 *
 * Mobile  (<1024px): fixed bottom tab bar, safe-area aware.
 * Desktop (≥1024px): sticky flat-white left sidebar (220px) + centered content.
 *
 * Active nav state is derived from useLocation() — no activeTab prop needed.
 * Reports is permanently a Coming-Soon placeholder (owner decision 1).
 */
export const AppShell = ({ children }: AppShellProps) => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const activeTab = deriveActiveTab(location.pathname)

  const [showComingSoon, setShowComingSoon] = useState(false)
  const [toastKey, setToastKey] = useState(0)

  const handleReportsTap = useCallback(() => {
    // Always fire, even if toast is already visible — reset the auto-dismiss timer
    setToastKey(k => k + 1)
    setShowComingSoon(true)
    const id = setTimeout(() => setShowComingSoon(false), 2000)
    return () => clearTimeout(id)
  }, [])

  const goTo = useCallback((path: string) => {
    if (location.pathname !== path) navigate(path)
  }, [navigate, location.pathname])

  const projectsActive = activeTab === 'projects'
  const moreActive     = activeTab === 'more'

  return (
    <div className="app-shell">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="app-shell__tab-bar" aria-label="Main navigation">

        {/* Desktop-only wordmark */}
        <div className="tab-bar__logo" aria-hidden="true">
          SiteBrief
        </div>

        {/* Projects */}
        <button
          className={`tab-item${projectsActive ? ' tab-item--active' : ''}`}
          onClick={() => goTo('/projects')}
          aria-label="Projects"
          aria-current={projectsActive ? 'page' : undefined}
          type="button"
        >
          <span className="tab-item__icon">
            <FolderIcon size={22} />
          </span>
          <span className="tab-item__label">Projects</span>
        </button>

        {/* Reports — Coming Soon placeholder */}
        <button
          className="tab-item tab-item--coming-soon"
          onClick={handleReportsTap}
          aria-label="Reports — coming soon"
          aria-disabled="true"
          type="button"
        >
          <span className="tab-item__icon">
            <DocumentIcon size={22} />
          </span>
          <span className="tab-item__label">Reports</span>
        </button>

        {/* More */}
        <button
          className={`tab-item${moreActive ? ' tab-item--active' : ''}`}
          onClick={() => goTo('/more')}
          aria-label="More"
          aria-current={moreActive ? 'page' : undefined}
          type="button"
        >
          <span className="tab-item__icon">
            <EllipsisHIcon size={22} />
          </span>
          <span className="tab-item__label">More</span>
        </button>

      </nav>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="app-shell__content">
        {children}
      </main>

      {/* ── Coming-Soon toast ─────────────────────────────────────────── */}
      {showComingSoon && (
        <div
          key={toastKey}
          className="coming-soon-toast"
          role="status"
          aria-live="polite"
        >
          Reports — coming soon
        </div>
      )}

    </div>
  )
}
