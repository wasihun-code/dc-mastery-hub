import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, X, CheckCircle2, RefreshCw } from 'lucide-react'

export default function Settings() {
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
    // Load tracks
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
    <div className="space-y-8 pb-12 max-w-3xl mx-auto text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Configure workspace settings, database parameters, and reset course progress.</p>
      </div>

      {/* Reset Progress Danger Card */}
      <section className="relative overflow-hidden rounded-2xl border border-red-950/40 bg-gradient-to-br from-red-950/10 via-zinc-950 to-zinc-900/50 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 left-0 h-full w-[4px] bg-[var(--accent-red)]"></div>
        
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-red-950/45 border border-red-900/40 text-[var(--accent-red)] shrink-0">
            <Trash2 size={24} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
              Danger Zone: Reset Progress
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Erasing student records resets flashcard intervals, quiz scores, dataset attempts, and calculated mastery figures to 0. 
              This database correction is permanent.
            </p>
          </div>
        </div>

        {/* Form elements */}
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                1. Reset Scope
              </label>
              <select
                value={resetType}
                onChange={(e) => {
                  setResetType(e.target.value)
                  setSelectedTarget('')
                }}
                className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] transition-all cursor-pointer"
              >
                <option value="">Select Scope...</option>
                <option value="course">Specific Course</option>
                <option value="track">Specific Track</option>
                <option value="category">Specific Category</option>
                <option value="all">Everything (Full Database Reset)</option>
              </select>
            </div>

            {/* Target selectors depending on scope */}
            {resetType && resetType !== 'all' && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  2. Select Target
                </label>
                {resetType === 'course' && (
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] transition-all cursor-pointer"
                  >
                    <option value="">Choose a Course...</option>
                    {courses
                      .filter(c => (c.overall_mastery || 0) > 0 && (c.quiz_question_count || 0) > 0)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.track_language})
                        </option>
                      ))}
                  </select>
                )}

                {resetType === 'track' && (
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] transition-all cursor-pointer"
                  >
                    <option value="">Choose a Track...</option>
                    {tracks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}

                {resetType === 'category' && (
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] transition-all cursor-pointer"
                  >
                    <option value="">Choose a Category...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          {resetType && (resetType === 'all' || selectedTarget) && (
            <div className="pt-4 border-t border-[var(--border)]/40 flex items-center justify-end">
              <button
                type="button"
                onClick={handleOpenResetDialog}
                className="bg-[var(--accent-red)] text-white hover:brightness-110 font-bold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                Initialize Progress Reset
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Dialog Modal */}
      {confirmStep > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[var(--accent-red)]">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-lg text-white uppercase tracking-tight">Confirm Reset Request</h3>
              </div>
              <button 
                onClick={() => setConfirmStep(0)}
                className="text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {confirmStep === 1 ? (
                <>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Are you absolutely sure you want to reset all tracking history for{' '}
                    <strong className="text-[var(--accent-red)] font-bold">{getTargetName()}</strong>?
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    This resets your mastery scores, daily streak stats, clears spaced-repetition schedules, 
                    and wipes all attempt records. You cannot undo this request.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStep(0)}
                      className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-white hover:bg-zinc-900 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmStep1}
                      className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold rounded-xl bg-[var(--accent-red)] text-white hover:brightness-110 transition-all cursor-pointer"
                    >
                      Yes, Proceed
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-300">
                    Type the following validation check phrase to confirm:
                  </p>
                  <div className="bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border)] select-none text-center">
                    <code className="text-xs font-mono font-bold text-[var(--accent-yellow)]">
                      {getVerificationText(resetType)}
                    </code>
                  </div>
                  <input
                    type="text"
                    value={verificationInput}
                    onChange={(e) => setVerificationInput(e.target.value)}
                    placeholder="Enter the phrase exactly..."
                    className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] font-mono"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStep(0)}
                      className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-white hover:bg-zinc-900 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={verificationInput !== getVerificationText(resetType) || resetting}
                      onClick={handleExecuteReset}
                      className={`px-5 py-2.5 text-xs uppercase tracking-wider font-bold rounded-xl text-white transition-all ${
                        verificationInput === getVerificationText(resetType) && !resetting
                          ? 'bg-[var(--accent-red)] hover:brightness-110 cursor-pointer shadow-md'
                          : 'bg-zinc-850 text-zinc-650 border border-zinc-800/40 cursor-not-allowed'
                      }`}
                    >
                      {resetting ? 'Resetting...' : 'Erase Progress'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {resetSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--accent-green)] text-black font-bold px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} />
          <span className="text-sm">{resetSuccessMsg}</span>
        </div>
      )}
    </div>
  )
}
