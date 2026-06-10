import { useState, useEffect } from 'react'
import { ShieldAlert, Info, CheckCircle2 } from 'lucide-react'

export default function Settings() {
  const [devMode, setDevMode] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const active = localStorage.getItem('devMode') === 'true'
    setDevMode(active)
  }, [])

  const handleToggle = (checked) => {
    setDevMode(checked)
    localStorage.setItem('devMode', checked ? 'true' : 'false')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-12 pb-12 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Manage workspace configurations, preferences, and developer options.</p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          ⚙️ General Preferences
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Adjust local interface and testing properties.</p>

        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="flex-1 pr-4">
              <div className="font-semibold text-sm text-[var(--text-primary)]">QA Developer Mode</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                Displays real-time attempt tracking, accuracy metrics, remaining counts, and progress source values on study sessions.
              </div>
            </div>
            
            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
                id="dev-mode-toggle"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ShieldAlert size={20} className="text-[var(--accent-yellow)]" /> System Info
        </h2>
        
        <div className="mt-6 space-y-4 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-primary)] p-5 rounded-xl border border-[var(--border)]">
          <div className="flex justify-between">
            <span>Environment:</span>
            <span className="text-[var(--text-primary)]">Development</span>
          </div>
          <div className="flex justify-between">
            <span>Node Version:</span>
            <span className="text-[var(--text-primary)]">v20.x (embedded)</span>
          </div>
          <div className="flex justify-between">
            <span>Database Status:</span>
            <span className="text-[var(--accent-green)] font-bold">ONLINE (better-sqlite3)</span>
          </div>
          <div className="flex justify-between">
            <span>Storage Dir:</span>
            <span className="text-[var(--text-primary)]">./data/mastery.db</span>
          </div>
        </div>
      </section>

      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--accent-green)] text-black font-bold px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} />
          <span className="text-sm">Settings Saved Successfully</span>
        </div>
      )}
    </div>
  )
}
