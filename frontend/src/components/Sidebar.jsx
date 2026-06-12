import { NavLink } from 'react-router-dom'
import { BookOpen, Brain, LayoutDashboard, Map, Settings, FolderOpen } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'My Courses', icon: BookOpen },
  { to: '/study-session', label: 'Study Session', icon: Brain },
  { to: '/mastery-map', label: 'Mastery Map', icon: Map },
  { to: '/manage', label: 'Content Manager', icon: FolderOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-[240px] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)]">
      <div className="px-6 py-6">
        <div className="text-lg font-bold text-[var(--accent-green)]">DC Mastery Hub</div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">Become a Data Science Guru</div>
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
                  'mb-1 flex items-center gap-3 border-l-2 px-3 py-3 text-sm transition-colors',
                  isActive
                    ? 'border-[var(--accent-green)] bg-[rgba(255,255,255,0.04)] text-[var(--accent-green)]'
                    : 'border-transparent text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-primary)]',
                ].join(' ')
              }
              end={item.to === '/'}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-6 py-5">
        <div className="text-sm font-semibold text-[var(--text-primary)]">Level 1 — Beginner</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-card)]">
          <div className="h-full w-0 bg-[var(--accent-green)]" />
        </div>
        <div className="mt-2 text-xs text-[var(--text-muted)]">0% XP progress</div>
      </div>
    </aside>
  )
}
