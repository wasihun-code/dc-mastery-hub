import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Brain, LayoutDashboard, Map, Settings, FolderOpen, Zap, Trophy, User, LogOut, Shield } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'My Courses', icon: BookOpen },
  { to: '/study-session', label: 'Study Session', icon: Brain },
  { to: '/speedrun', label: 'Speedruns', icon: Zap },
  { to: '/capstone', label: 'Capstone Battle', icon: Trophy },
  { to: '/mastery-map', label: 'Mastery Map', icon: Map },
  { to: '/manage', label: 'Content Manager', icon: FolderOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function getLevelDetails(xp) {
  if (xp < 500) {
    return {
      level: 'Level 1 — Beginner',
      percent: Math.min(100, Math.floor((xp / 500) * 100)),
      nextLevelXp: 500,
    }
  } else if (xp < 1500) {
    return {
      level: 'Level 2 — Apprentice',
      percent: Math.min(100, Math.floor(((xp - 500) / 1000) * 100)),
      nextLevelXp: 1500,
    }
  } else if (xp < 3000) {
    return {
      level: 'Level 3 — Practitioner',
      percent: Math.min(100, Math.floor(((xp - 1500) / 1500) * 100)),
      nextLevelXp: 3000,
    }
  } else if (xp < 6000) {
    return {
      level: 'Level 4 — Specialist',
      percent: Math.min(100, Math.floor(((xp - 3000) / 3000) * 100)),
      nextLevelXp: 6000,
    }
  } else if (xp < 10000) {
    return {
      level: 'Level 5 — Expert',
      percent: Math.min(100, Math.floor(((xp - 6000) / 4000) * 100)),
      nextLevelXp: 10000,
    }
  } else {
    return {
      level: 'Level 6 — Data Guru',
      percent: 100,
      nextLevelXp: 10000,
    }
  }
}

export default function Sidebar({ user, onLogout, sidebarWidth, setSidebarWidth }) {
  const [stats, setStats] = useState({ total_xp: 0 })
  const location = useLocation()
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    fetch('/api/progress/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data)
      })
      .catch((err) => console.error('Error fetching stats in Sidebar:', err))
  }, [location.pathname])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newWidth = Math.max(64, Math.min(e.clientX, 480))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = 'default'
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'auto'
    }
  }, [isResizing, setSidebarWidth])

  const xp = stats.total_xp ?? 0
  const lvlDetails = getLevelDetails(xp)

  const isCollapsed = sidebarWidth < 120

  return (
    <aside 
      className="fixed left-0 top-0 flex h-screen z-50 flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] group overflow-visible transition-[width] duration-75"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-green)]/30 transition-colors z-[60]"
      />

      <div className={`px-4 py-6 overflow-hidden ${isCollapsed ? 'items-center' : 'md:px-6'}`}>
        <div className="text-lg font-bold text-[var(--accent-green)] whitespace-nowrap">
          {isCollapsed ? 'DC' : 'DC Mastery Hub'}
        </div>
        {!isCollapsed && <div className="mt-1 text-xs text-[var(--text-muted)] whitespace-nowrap">Become a Data Science Guru</div>}
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'mb-1 flex items-center border-l-2 px-3 py-3 text-sm transition-colors rounded-lg',
                  isCollapsed ? 'justify-center gap-0' : 'gap-3',
                  isActive
                    ? 'border-[var(--accent-green)] bg-[rgba(255,255,255,0.04)] text-[var(--accent-green)] font-bold'
                    : 'border-transparent text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-primary)]',
                ].join(' ')
              }
              end={item.to === '/'}
              title={isCollapsed ? item.label : ''}
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && (
                <span className="transition-opacity duration-200 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Level Info (Expanded view only) */}
      {!isCollapsed && (
        <div className="border-t border-[var(--border)] px-4 md:px-6 py-4 overflow-hidden">
          <div className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">{lvlDetails.level}</div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-card)]">
            <div className="h-full bg-[var(--accent-green)] transition-all duration-500" style={{ width: `${lvlDetails.percent}%` }} />
          </div>
          <div className="mt-1.5 text-xs text-[var(--text-muted)] whitespace-nowrap">{lvlDetails.percent}% XP progress</div>
        </div>
      )}

      {/* Admin link */}
      {user?.is_admin && (
        <div className="border-t border-[var(--border)] px-3 py-2 overflow-hidden">
          {!isCollapsed ? (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold rounded-lg border transition-all',
                  isActive
                    ? 'text-[var(--accent-green)] bg-[rgba(255,255,255,0.04)] border-[var(--accent-green)]/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)] border-transparent',
                ].join(' ')
              }
            >
              <Shield size={16} className="shrink-0" />
              <span>Admin Panel</span>
            </NavLink>
          ) : (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                [
                  'flex h-10 w-10 items-center justify-center rounded-xl border transition-all',
                  isActive
                    ? 'text-[var(--accent-green)] bg-[rgba(255,255,255,0.04)] border-[var(--accent-green)]/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)] border-transparent',
                ].join(' ')
              }
              title="Admin Panel"
            >
              <Shield size={18} />
            </NavLink>
          )}
        </div>
      )}

      {/* User & Logout section */}
      <div className="border-t border-[var(--border)] p-3 overflow-hidden">
        {/* Expanded view */}
        {!isCollapsed && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--border)] text-[var(--accent-green)] shrink-0">
                <User size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xxs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                  {user?.is_admin ? 'Admin' : 'Student'}
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)] truncate" title={user?.username || 'User'}>
                  {user?.username || 'User'}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
            >
              <LogOut size={16} className="shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Collapsed view */}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2">
            {user?.is_admin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  [
                    'flex h-10 w-10 items-center justify-center rounded-xl border transition-all',
                    isActive
                      ? 'text-[var(--accent-green)] bg-[rgba(255,255,255,0.04)] border-[var(--accent-green)]/30'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)] border-transparent',
                  ].join(' ')
                }
                title="Admin Panel"
              >
                <Shield size={18} />
              </NavLink>
            )}
            <button
              onClick={onLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
