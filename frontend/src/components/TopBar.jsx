import React, { useState, useEffect } from 'react'
import { Flame, Star, Sun, Moon } from 'lucide-react'

export default function TopBar({ title, screenSize }) {
  const [stats, setStats] = useState({ total_xp: 0, current_streak: 0 })
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme')
      setIsLight(true)
    } else {
      document.documentElement.classList.remove('light-theme')
      setIsLight(false)
    }
    fetch('/api/progress/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStats(data) })
      .catch(err => console.error('Error fetching stats in TopBar:', err))
  }, [title])

  const toggleTheme = () => {
    const nextIsLight = !isLight
    setIsLight(nextIsLight)
    if (nextIsLight) {
      document.documentElement.classList.add('light-theme')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-theme')
      localStorage.setItem('theme', 'dark')
    }
  }

  const leftOffset = screenSize === 'mobile' ? '0' : 'var(--sidebar-width)'

  return (
    <header
      className="fixed right-0 top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300"
      style={{ left: leftOffset }}
    >
      <h1
        className="text-[var(--text-primary)] truncate pr-2 min-w-0 hidden sm:block"
        style={{ fontSize: 20, fontWeight: 700, paddingLeft: 16 }}
      >
        {title}
      </h1>
      {/* Spacer on mobile so title area is empty but layout stays */}
      <div className="sm:hidden" />

      <div className="flex items-center gap-2 shrink-0 px-3 md:px-6">
        {/* Theme toggle (hidden on mobile — it's in the More drawer) */}
        <button
          onClick={toggleTheme}
          className="hidden sm:flex items-center justify-center border border-[var(--border)] rounded-lg transition-all cursor-pointer hover:bg-[var(--bg-primary)]"
          style={{ width: 36, height: 36, background: 'transparent' }}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLight
            ? <Moon size={15} className="text-[var(--text-primary)]" />
            : <Sun size={15} className="text-[var(--accent-yellow)]" />}
        </button>

        {/* Streak pill */}
        <div
          className="flex items-center gap-1.5 rounded-full select-none"
          style={{
            background: 'color-mix(in srgb, var(--accent-yellow) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-yellow) 25%, transparent)',
            padding: '6px 10px'
          }}
        >
          <Flame size={13} className="shrink-0 fill-[var(--accent-yellow)] text-[var(--accent-yellow)]" />
          <span className="text-xs font-semibold text-[var(--accent-yellow)] whitespace-nowrap">
            {stats.current_streak ?? 0}<span className="hidden sm:inline"> day streak</span>
          </span>
        </div>

        {/* XP pill */}
        <div
          className="flex items-center gap-1.5 rounded-full select-none"
          style={{
            background: 'color-mix(in srgb, var(--accent-green) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-green) 25%, transparent)',
            padding: '6px 10px'
          }}
        >
          <Star size={13} className="shrink-0 fill-[var(--accent-green)] text-[var(--accent-green)]" />
          <span className="text-xs font-semibold text-[var(--accent-green)] whitespace-nowrap">
            {stats.total_xp ?? 0}<span className="hidden sm:inline"> XP</span>
          </span>
        </div>
      </div>
    </header>
  )
}
