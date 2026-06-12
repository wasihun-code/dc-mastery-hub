import React, { useState, useEffect } from 'react'
import { Flame, Star, Sun, Moon } from 'lucide-react'

export default function TopBar({ title }) {
  const [stats, setStats] = useState({ total_xp: 0, current_streak: 0 })
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    // Sync initial theme from localStorage
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
      .then(data => {
        if (data) setStats(data)
      })
      .catch(err => console.error("Error fetching stats in TopBar:", err))
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

  return (
    <header className="fixed left-16 md:left-[240px] right-0 top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-3 md:px-8 transition-all duration-300">
      <h1 className="text-sm md:text-lg font-bold text-[var(--text-primary)] truncate pr-1.5 min-w-0">{title}</h1>

      <div className="flex items-center gap-1.5 md:gap-3">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center p-1.5 md:p-2 rounded border border-[var(--border)] text-[var(--text-primary)] hover:border-zinc-700 bg-[var(--bg-card)] hover:bg-[var(--bg-primary)] transition-all cursor-pointer mr-0.5 md:mr-2 shrink-0"
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLight ? <Moon size={14} className="text-[var(--text-primary)]" /> : <Sun size={14} className="text-[var(--accent-yellow)]" />}
        </button>

        <div className="flex items-center gap-1 md:gap-2 rounded border border-[var(--border)] px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm text-[var(--accent-yellow)] select-none shrink-0">
          <Flame size={14} className="fill-[var(--accent-yellow)] animate-pulse" />
          <span className="font-semibold">
            {stats.current_streak ?? 0}
            <span className="hidden sm:inline"> day streak</span>
          </span>
        </div>
        <div className="flex items-center gap-1 md:gap-2 rounded border border-[var(--border)] px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm text-[var(--accent-green)] select-none shrink-0">
          <Star size={14} className="fill-[var(--accent-green)]" />
          <span className="font-semibold">
            {stats.total_xp ?? 0}
            <span className="hidden sm:inline"> XP</span>
          </span>
        </div>
      </div>
    </header>
  )
}
