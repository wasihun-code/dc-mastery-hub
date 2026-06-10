import React, { useState, useEffect } from 'react'
import { Flame, Star } from 'lucide-react'

export default function TopBar({ title }) {
  const [stats, setStats] = useState({ total_xp: 0, current_streak: 0 })

  useEffect(() => {
    fetch('/api/progress/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setStats(data)
      })
      .catch(err => console.error("Error fetching stats in TopBar:", err))
  }, [title])

  return (
    <header className="fixed left-[240px] right-0 top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-8">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--accent-yellow)] select-none">
          <Flame size={16} className="fill-[var(--accent-yellow)] animate-pulse" />
          <span>{stats.current_streak ?? 0} day streak</span>
        </div>
        <div className="flex items-center gap-2 rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--accent-green)] select-none">
          <Star size={16} className="fill-[var(--accent-green)]" />
          <span>{stats.total_xp ?? 0} XP</span>
        </div>
      </div>
    </header>
  )
}
