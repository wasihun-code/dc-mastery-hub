import { NavLink } from 'react-router-dom'
import { BookOpen, Brain, LayoutDashboard, Map, Settings, FolderOpen, Zap, Trophy } from 'lucide-react'

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

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-16 md:w-[240px] hover:w-[240px] transition-all duration-300 z-50 flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] group overflow-hidden">
      <div className="px-4 md:px-6 py-6 overflow-hidden">
        <div className="text-lg font-bold text-[var(--accent-green)] whitespace-nowrap">
          <span className="md:hidden group-hover:hidden">DC</span>
          <span className="hidden md:inline group-hover:inline">DC Mastery Hub</span>
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)] whitespace-nowrap hidden md:block group-hover:block">Become a Data Science Guru</div>
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
                  'mb-1 flex items-center gap-3 border-l-2 px-3 py-3 text-sm transition-colors rounded-lg',
                  isActive
                    ? 'border-[var(--accent-green)] bg-[rgba(255,255,255,0.04)] text-[var(--accent-green)] font-bold'
                    : 'border-transparent text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-primary)]',
                ].join(' ')
              }
              end={item.to === '/'}
            >
              <Icon size={18} className="shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-4 md:px-6 py-5 overflow-hidden hidden md:block group-hover:block">
        <div className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">Level 1 — Beginner</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-card)]">
          <div className="h-full w-0 bg-[var(--accent-green)]" />
        </div>
        <div className="mt-2 text-xs text-[var(--text-muted)] whitespace-nowrap">0% XP progress</div>
      </div>
    </aside>
  )
}
