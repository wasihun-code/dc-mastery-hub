import { Flame, Star } from 'lucide-react'

export default function TopBar({ title }) {
  return (
    <header className="fixed left-[240px] right-0 top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-8">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--accent-yellow)]">
          <Flame size={16} />
          <span>0 day streak</span>
        </div>
        <div className="flex items-center gap-2 rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--accent-green)]">
          <Star size={16} />
          <span>0 XP</span>
        </div>
        <button className="rounded bg-[var(--accent-green)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)]">
          Start Session
        </button>
      </div>
    </header>
  )
}
