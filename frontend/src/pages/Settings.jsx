import { useState, useEffect } from 'react'
import { ShieldAlert, Info, CheckCircle2, AlertTriangle, Trash2, X } from 'lucide-react'

export default function Settings() {
  const [devMode, setDevMode] = useState(false)
  const [saved, setSaved] = useState(false)

  // Reset Progress state
  const [tracks, setTracks] = useState([])
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [resetType, setResetType] = useState('') // 'course', 'track', 'category', 'all'
  const [selectedTarget, setSelectedTarget] = useState('') // trackId, courseId, or categoryName
  const [confirmStep, setConfirmStep] = useState(0) // 0: closed, 1: yes/no, 2: type to confirm
  const [verificationInput, setVerificationInput] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetSuccessMsg, setResetSuccessMsg] = useState('')

  useEffect(() => {
    const active = localStorage.getItem('devMode') === 'true'
    setDevMode(active)

    // Load tracks and categories
    fetch('/api/tracks')
      .then(res => res.json())
      .then(data => {
        setTracks(data)
        const langs = [...new Set(data.map(t => t.language))].filter(Boolean)
        setCategories(langs)
      })
      .catch(err => console.error('Error fetching tracks:', err))

    // Load courses
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(data)
      })
      .catch(err => console.error('Error fetching courses:', err))
  }, [])

  const handleToggle = (checked) => {
    setDevMode(checked)
    localStorage.setItem('devMode', checked ? 'true' : 'false')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const getVerificationText = (type) => {
    if (type === 'course') return 'reset course progress permanently'
    if (type === 'track') return 'reset track progress permanently'
    if (type === 'category') return 'reset category progress permanently'
    return 'reset all progress permanently'
  }

  const getTargetName = () => {
    if (resetType === 'course') {
      const course = courses.find(c => String(c.id) === String(selectedTarget))
      return course ? course.name : 'Selected Course'
    }
    if (resetType === 'track') {
      const track = tracks.find(t => String(t.id) === String(selectedTarget))
      return track ? track.name : 'Selected Track'
    }
    if (resetType === 'category') {
      return selectedTarget || 'Selected Category'
    }
    return 'All Data'
  }

  const handleOpenResetDialog = () => {
    if (resetType !== 'all' && !selectedTarget) {
      alert('Please select a target to reset.')
      return
    }
    setVerificationInput('')
    setConfirmStep(1)
  }

  const handleConfirmStep1 = () => {
    setConfirmStep(2)
  }

  const handleExecuteReset = async () => {
    const expectedText = getVerificationText(resetType)
    if (verificationInput !== expectedText) {
      alert(`Please type "${expectedText}" exactly.`)
      return
    }

    setResetting(true)
    try {
      const res = await fetch('/api/progress/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: resetType,
          targetId: selectedTarget,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to reset progress.')
      }

      setResetSuccessMsg(`Successfully reset ${resetType} progress!`)
      setConfirmStep(0)
      setResetType('')
      setSelectedTarget('')
      setVerificationInput('')
      
      // Auto dismiss success and reload to reflect changes
      setTimeout(() => {
        setResetSuccessMsg('')
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setResetting(false)
    }
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

      {/* Reset Progress Section */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 text-[var(--accent-red)]">
          <Trash2 size={20} /> Danger Zone: Reset Progress
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Permanently erase tracking data, exercise attempts, and mastery metrics.</p>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Reset Scope
              </label>
              <select
                value={resetType}
                onChange={(e) => {
                  setResetType(e.target.value)
                  setSelectedTarget('')
                }}
                className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
              >
                <option value="">Select Scope...</option>
                <option value="course">Specific Course</option>
                <option value="track">Specific Track</option>
                <option value="category">Specific Category</option>
                <option value="all">Everything (Reset All)</option>
              </select>
            </div>

            {resetType === 'course' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Select Course
                </label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
                >
                  <option value="">Choose a Course...</option>
                  {courses
                    .filter(c => c.status !== 'Not Started' || (c.overall_mastery && c.overall_mastery > 0))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.track_language})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {resetType === 'track' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Select Track
                </label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
                >
                  <option value="">Choose a Track...</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {resetType === 'category' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Select Category
                </label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
                >
                  <option value="">Choose a Category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {resetType && (resetType === 'all' || selectedTarget) && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenResetDialog}
                className="flex items-center gap-2 bg-[var(--accent-red)] text-white hover:opacity-90 font-bold px-5 py-3 rounded-lg text-sm transition-all shadow-md"
              >
                <Trash2 size={16} /> Reset Selected Progress
              </button>
            </div>
          )}
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

      {/* Confirmation Modal */}
      {confirmStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[var(--accent-red)]">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Confirm Reset</h3>
              </div>
              <button 
                onClick={() => setConfirmStep(0)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {confirmStep === 1 ? (
                <>
                  <p className="text-sm text-[var(--text-primary)]">
                    Are you sure you want to reset all progress for{' '}
                    <strong className="text-[var(--accent-red)]">{getTargetName()}</strong>?
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    This will delete all completed sessions, logs, and reset mastery to 0. This action is irreversible.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStep(0)}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                    >
                      No, Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmStep1}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent-red)] text-white hover:opacity-90 transition-opacity"
                    >
                      Yes, Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--text-primary)]">
                    To prevent accidental resets, please type the verification text below:
                  </p>
                  <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)] select-none text-center">
                    <code className="text-xs font-mono font-bold text-[var(--accent-yellow)]">
                      {getVerificationText(resetType)}
                    </code>
                  </div>
                  <input
                    type="text"
                    value={verificationInput}
                    onChange={(e) => setVerificationInput(e.target.value)}
                    placeholder="Type confirmation here..."
                    className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] font-mono"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStep(0)}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={verificationInput !== getVerificationText(resetType) || resetting}
                      onClick={handleExecuteReset}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity ${
                        verificationInput === getVerificationText(resetType) && !resetting
                          ? 'bg-[var(--accent-red)] hover:opacity-90 cursor-pointer'
                          : 'bg-zinc-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {resetting ? 'Resetting...' : 'Confirm Permanent Reset'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(saved || resetSuccessMsg) && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--accent-green)] text-black font-bold px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} />
          <span className="text-sm">{resetSuccessMsg || 'Settings Saved Successfully'}</span>
        </div>
      )}
    </div>
  )
}

