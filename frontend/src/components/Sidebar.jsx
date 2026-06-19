import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Brain, LayoutDashboard, Map, Settings, FolderOpen, Zap, Trophy, User, LogOut, Shield, ChevronLeft, ChevronRight, X, Sun, Moon, GripHorizontal } from 'lucide-react'

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

const mobileTabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'My Courses', icon: BookOpen },
  { to: '/study-session', label: 'Study Session', icon: Brain },
]

function getLevelDetails(xp) {
  if (xp < 500) return { level: 'Level 1 — Beginner', percent: Math.min(100, Math.floor((xp / 500) * 100)), nextLevelXp: 500 }
  if (xp < 1500) return { level: 'Level 2 — Apprentice', percent: Math.min(100, Math.floor(((xp - 500) / 1000) * 100)), nextLevelXp: 1500 }
  if (xp < 3000) return { level: 'Level 3 — Practitioner', percent: Math.min(100, Math.floor(((xp - 1500) / 1500) * 100)), nextLevelXp: 3000 }
  if (xp < 6000) return { level: 'Level 4 — Specialist', percent: Math.min(100, Math.floor(((xp - 3000) / 3000) * 100)), nextLevelXp: 6000 }
  if (xp < 10000) return { level: 'Level 5 — Expert', percent: Math.min(100, Math.floor(((xp - 6000) / 4000) * 100)), nextLevelXp: 10000 }
  return { level: 'Level 6 — Data Guru', percent: 100, nextLevelXp: 10000 }
}

export default function Sidebar({ user, onLogout, sidebarWidth, setSidebarWidth, screenSize, sidebarCollapsed, onToggleCollapsed }) {
  const [stats, setStats] = useState({ total_xp: 0 })
  const location = useLocation()
  const [isResizing, setIsResizing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLight, setIsLight] = useState(() => localStorage.getItem('theme') === 'light')

  useEffect(() => {
    fetch('/api/progress/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStats(data) })
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

  const toggleTheme = () => {
    const next = !isLight
    setIsLight(next)
    if (next) {
      document.documentElement.classList.add('light-theme')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-theme')
      localStorage.setItem('theme', 'dark')
    }
  }

  const xp = stats.total_xp ?? 0
  const lvlDetails = getLevelDetails(xp)
  const isCollapsed = sidebarWidth < 120
  const effectiveWidth = screenSize === 'tablet' && sidebarCollapsed ? 64 : sidebarWidth

  /* ─── MOBILE BOTTOM TAB BAR (< 640px) ─── */
  const mobileBar = (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 border-t border-[var(--border)] bg-[var(--bg-sidebar)] sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = location.pathname === tab.to || (tab.to !== '/' && location.pathname.startsWith(tab.to))
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 cursor-pointer"
            >
              {isActive && <div className="w-1 h-1 rounded-full bg-[var(--accent-green)] mb-0.5" />}
              <Icon size={20} className={isActive ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'} />
              <span className={`text-[10px] leading-tight ${isActive ? 'text-[var(--accent-green)] font-semibold' : 'text-[var(--text-muted)]'}`}>{tab.label}</span>
            </NavLink>
          )
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 cursor-pointer"
        >
          <X size={16} className="text-[var(--text-muted)] rotate-45" />
          <span className="text-[10px] leading-tight text-[var(--text-muted)]">More</span>
        </button>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-[var(--bg-sidebar)] p-4 shadow-xl transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--border)]" />

            {/* Drawer header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Menu</h3>
              <button onClick={() => setDrawerOpen(false)} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="mb-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card)]/60 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {isLight ? <Moon size={18} /> : <Sun size={18} className="text-[var(--accent-yellow)]" />}
              <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
            </button>

            {/* Nav items */}
            {navItems.slice(3).map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive ? 'text-[var(--accent-green)] font-semibold bg-white/5' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]/60 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}

            {/* Admin link */}
            {user?.is_admin && (
              <>
                <div className="border-t border-[var(--border)] my-2" />
                <NavLink
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--accent-yellow)] hover:bg-[var(--bg-card)]/60 transition-colors"
                >
                  <Shield size={18} />
                  <span>Admin Panel</span>
                </NavLink>
              </>
            )}

            {/* Logout */}
            <button
              onClick={() => { setDrawerOpen(false); onLogout?.() }}
              className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  )

  /* ─── TABLET COLLAPSIBLE RAIL (640-1024px) ─── */
  const tabletRail = (
    <aside
      className="hidden sm:flex lg:hidden fixed left-0 top-0 z-50 flex-col h-screen border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-all duration-200"
      style={{ width: effectiveWidth }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggleCollapsed}
        className="flex h-14 items-center justify-center border-b border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors cursor-pointer"
      >
        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Logo */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3">
          <div className="text-sm font-bold text-[var(--accent-green)] whitespace-nowrap">DC Mastery Hub</div>
          <div className="text-[9px] text-[var(--text-muted)]">Become a Data Science Guru</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-hidden py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
          return sidebarCollapsed ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={item.label}
              className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-all ${
                isActive ? 'text-[var(--accent-green)] bg-white/5 border-l-[3px] border-[var(--accent-green)] rounded-r-lg' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]/60 hover:text-[var(--text-primary)] rounded-lg'
              }`}
            >
              <Icon size={18} />
            </NavLink>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-all ${
                isActive ? 'text-[var(--accent-green)] font-semibold border-l-[3px] border-[var(--accent-green)] rounded-r-lg bg-white/5' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]/60 hover:text-[var(--text-primary)] rounded-lg'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Admin link */}
      {user?.is_admin && (sidebarCollapsed ? (
        <NavLink to="/admin" title="Admin Panel" className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg border-l-[3px] border-transparent text-[var(--accent-yellow)] hover:bg-[var(--bg-card)]/60 mb-2">
          <Shield size={18} />
        </NavLink>
      ) : (
        <div className="border-t border-[var(--border)] px-2 py-2">
            <NavLink to="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg text-[var(--accent-yellow)] hover:bg-[var(--bg-card)]/60 border-l-[3px] border-transparent">
            <Shield size={18} className="shrink-0" />
            <span>Admin Panel</span>
          </NavLink>
        </div>
      ))}

      {/* Logout */}
      <div className="border-t border-[var(--border)] p-2">
        {sidebarCollapsed ? (
          <button onClick={onLogout} title="Log Out" className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer">
            <LogOut size={16} />
          </button>
        ) : (
          <button onClick={onLogout} className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer">
            <LogOut size={16} className="shrink-0" />
            <span>Log Out</span>
          </button>
        )}
      </div>
    </aside>
  )

  /* ─── DESKTOP SIDEBAR (> 1024px) ─── */
  const desktopSidebar = (
    <aside
      className="hidden lg:flex fixed left-0 top-0 z-50 flex-col h-screen border-r border-[var(--border)] bg-[var(--bg-sidebar)] overflow-visible transition-[width] duration-75"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-green)]/30 transition-colors z-[60]"
      />

      {/* Logo */}
      <div className={`px-4 py-5 overflow-hidden ${isCollapsed ? 'flex items-center' : 'md:px-5'}`}>
        <div className="text-base font-bold text-[var(--accent-green)] whitespace-nowrap tracking-tight">
          {isCollapsed ? 'DC' : 'DC Mastery Hub'}
        </div>
        {!isCollapsed && <div className="mt-0.5 text-[10px] text-[var(--text-muted)] whitespace-nowrap">Become a Data Science Guru</div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={isCollapsed ? item.label : ''}
              className={({ isActive }) =>
                [
                  'flex items-center transition-all duration-150',
                  isCollapsed ? 'justify-center px-2 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'text-[var(--accent-green)] font-semibold border-l-[3px] border-[var(--accent-green)] rounded-r-lg'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]/60 hover:text-[var(--text-primary)] rounded-lg',
                  !isCollapsed ? 'mr-2' : '',
                ].join(' ')
              }
              style={({ isActive }) => isActive
                ? { background: 'color-mix(in srgb, var(--accent-green) 10%, transparent)' }
                : {}
              }
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && (
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Level Progress (expanded only) */}
      {!isCollapsed && (
        <div className="border-t border-[var(--border)] px-4 py-3 overflow-hidden">
          <div className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">{lvlDetails.level}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-card)]">
            <div className="h-full bg-[var(--accent-green)] transition-all duration-500 rounded-full" style={{ width: `${lvlDetails.percent}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-[var(--text-muted)] whitespace-nowrap">{lvlDetails.percent}% XP progress</div>
        </div>
      )}

      {/* Admin link */}
      {user?.is_admin && (
        <div className="border-t border-[var(--border)] px-2 py-2 overflow-hidden">
          {!isCollapsed ? (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg border-l-[3px] transition-all duration-150',
                  isActive
                    ? 'font-semibold border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'text-[var(--accent-yellow)] border-transparent hover:bg-[var(--bg-card)]/60 hover:text-[var(--text-primary)]',
                ].join(' ')
              }
              style={({ isActive }) => isActive
                ? { background: 'color-mix(in srgb, var(--accent-green) 10%, transparent)' }
                : {}
              }
            >
              <Shield size={18} className="shrink-0" />
              <span>Admin Panel</span>
            </NavLink>
          ) : (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                [
                  'flex h-10 w-10 mx-auto items-center justify-center rounded-lg border-l-[3px] transition-all duration-150',
                  isActive
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'text-[var(--accent-yellow)] border-transparent hover:bg-[var(--bg-card)]/60',
                ].join(' ')
              }
              style={({ isActive }) => isActive
                ? { background: 'color-mix(in srgb, var(--accent-green) 10%, transparent)' }
                : {}
              }
              title="Admin Panel"
            >
              <Shield size={18} />
            </NavLink>
          )}
        </div>
      )}

      {/* User & Logout */}
      <div className="border-t border-[var(--border)] p-2 overflow-hidden">
        {!isCollapsed ? (
          <div className="bg-[var(--bg-card)] rounded-lg p-2 flex flex-col gap-2">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-[var(--border)] text-[var(--accent-green)] shrink-0">
                <User size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
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
              <LogOut size={15} className="shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <>
      {desktopSidebar}
      {tabletRail}
      {mobileBar}
    </>
  )
}
