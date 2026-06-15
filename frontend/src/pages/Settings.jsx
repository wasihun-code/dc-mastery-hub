import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, X, CheckCircle2, RefreshCw, Volume2, VolumeX, Smartphone, Keyboard } from 'lucide-react'
import { 
  isAudioEnabled, 
  setAudioEnabled, 
  getAudioVolume,
  setAudioVolume,
  isHapticsEnabled, 
  setHapticsEnabled,
  triggerCorrectFeedback,
  playCorrect,
  playWrong,
  playSuccess,
  playTimerWarning,
  playTimerExpired,
  vibrateCorrect,
  vibrateWrong,
  vibrateSuccess,
  vibrateTimerWarning,
  vibrateTimerExpired
} from '../services/feedbackService'

export default function Settings() {
  // Reset Progress state
  const [tracks, setTracks] = useState([])
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [resetType, setResetType] = useState('') // 'course', 'track', 'category', 'all'
  const [selectedTarget, setSelectedTarget] = useState('') // trackId, courseId, or categoryName
  const [selectedCategory, setSelectedCategory] = useState('') // flashcard, quiz, fillblank, etc.
  const [confirmStep, setConfirmStep] = useState(0) // 0: closed, 1: yes/no, 2: type to confirm
  const [verificationInput, setVerificationInput] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetSuccessMsg, setResetSuccessMsg] = useState('')

  // Feedback preferences state
  const [audioActive, setAudioActive] = useState(isAudioEnabled())
  const [hapticsActive, setHapticsActive] = useState(isHapticsEnabled())
  const [shortcutsActive, setShortcutsActive] = useState(() => {
    return localStorage.getItem('showKeyboardShortcuts') !== 'false';
  });
  const [volumeLevel, setVolumeLevel] = useState(getAudioVolume())
  const [lastPlayTime, setLastPlayTime] = useState(0)

  const handleToggleAudio = () => {
    const nextVal = !audioActive
    setAudioEnabled(nextVal)
    setAudioActive(nextVal)
    if (nextVal) {
      setTimeout(() => triggerCorrectFeedback(), 50)
    }
  }

  const handleToggleHaptics = () => {
    const nextVal = !hapticsActive
    setHapticsEnabled(nextVal)
    setHapticsActive(nextVal)
    if (nextVal) {
      setTimeout(() => triggerCorrectFeedback(), 50)
    }
  }

  const handleToggleShortcuts = () => {
    const nextVal = !shortcutsActive;
    localStorage.setItem('showKeyboardShortcuts', String(nextVal));
    setShortcutsActive(nextVal);
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolumeLevel(val)
    setAudioVolume(val)
    
    // Play a preview chime in real-time, throttled to 250ms
    const now = Date.now()
    if (now - lastPlayTime > 250) {
      playCorrect()
      setLastPlayTime(now)
    }
  }

  const handleVolumeMouseUp = () => {
    playCorrect()
  }

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
    if (type === 'course_exercise_category') return 'reset exercise progress permanently'
    return 'reset all progress permanently'
  }

  const getTargetName = () => {
    if (resetType === 'course') {
      const course = courses.find(c => String(c.id) === String(selectedTarget))
      return course ? course.name : 'Selected Course'
    }
    if (resetType === 'course_exercise_category') {
      const course = courses.find(c => String(c.id) === String(selectedTarget))
      const catLabel = {
        flashcard: 'Flashcards',
        quiz: 'Multiple Choice Quiz / Speedrun',
        fillblank: 'Fill in the Blank',
        dataset: 'Dataset Challenge',
        matching: 'Matching Games',
        bossbattle: 'Boss Battle'
      }[selectedCategory] || 'Selected Category'
      return course ? `[${catLabel}] in ${course.name}` : 'Selected Course Category'
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
    if (resetType === 'course_exercise_category' && !selectedCategory) {
      alert('Please select an exercise type to reset.')
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
          category: selectedCategory,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to reset progress.')
      }

      setResetSuccessMsg(`Successfully reset ${resetType} progress!`)
      setConfirmStep(0)
      setResetType('')
      setSelectedTarget('')
      setSelectedCategory('')
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

      {/* Sound & Haptic Feedback Section */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] via-zinc-950 to-zinc-900/50 p-6 sm:p-8 shadow-xl text-left">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-[rgba(3,239,98,0.1)] border border-[rgba(3,239,98,0.2)] text-[var(--accent-green)] shrink-0">
            <Volume2 size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
              Workspace Preferences & Feedback
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Configure audio chimes, physical haptic vibrations, and global keyboard shortcut helpers for your study session.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audio toggle card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border transition-all ${
                audioActive 
                  ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[rgba(3,239,98,0.05)]' 
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}>
                {audioActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Audio Sound Effects</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium font-semibold">Plays tones for correct/wrong answers</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                audioActive ? 'bg-[var(--accent-green)]' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-255 ease-in-out ${
                  audioActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptics toggle card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border transition-all ${
                hapticsActive 
                  ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[rgba(96,165,250,0.05)]' 
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}>
                <Smartphone size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Haptic Vibration</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium font-semibold">Vibrates on supported mobile devices</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHaptics}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                hapticsActive ? 'bg-[var(--accent-blue)]' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-255 ease-in-out ${
                  hapticsActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Keyboard shortcuts toggle card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border transition-all ${
                shortcutsActive 
                  ? 'border-[var(--accent-yellow)] text-[var(--accent-yellow)] bg-[rgba(251,191,36,0.05)]' 
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}>
                <Keyboard size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Keyboard Shortcuts</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium font-semibold">Shows keyboard helper in exercises</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleShortcuts}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                shortcutsActive ? 'bg-[var(--accent-yellow)]' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-255 ease-in-out ${
                  shortcutsActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Volume Control Slider */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border transition-all ${
                audioActive 
                  ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[rgba(3,239,98,0.05)]' 
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}>
                <Volume2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Audio Feedback Volume</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-semibold">Adjust chime and tone volume level</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mr-1">Strength:</span>
              <span className="text-sm font-mono font-bold text-[var(--accent-green)] bg-[rgba(3,239,98,0.1)] border border-[rgba(3,239,98,0.2)] px-2.5 py-1 rounded">
                {Math.round(volumeLevel * 100)}%
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumeLevel}
                onChange={handleVolumeChange}
                onMouseUp={handleVolumeMouseUp}
                onTouchEnd={handleVolumeMouseUp}
                disabled={!audioActive}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent-green)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              />
            </div>
            
            {/* Real-time Strength Indicator Visualizer */}
            <div className="flex items-end justify-between h-5 gap-[3px] px-2 py-1 bg-zinc-950/60 rounded-lg border border-[var(--border)]">
              {Array.from({ length: 32 }).map((_, i) => {
                const barThreshold = i / 32;
                const isActive = audioActive && volumeLevel > barThreshold;
                let colorClass = 'bg-zinc-800/40';
                if (isActive) {
                  if (barThreshold < 0.6) {
                    colorClass = 'bg-[var(--accent-green)] shadow-[0_0_8px_rgba(3,239,98,0.3)]';
                  } else if (barThreshold < 0.85) {
                    colorClass = 'bg-[var(--accent-yellow)] shadow-[0_0_8px_rgba(251,191,36,0.3)]';
                  } else {
                    colorClass = 'bg-[var(--accent-red)] shadow-[0_0_8px_rgba(239,68,68,0.3)]';
                  }
                }
                const heightPercent = 20 + (i * 2.5);
                return (
                  <div 
                    key={i} 
                    className={`w-full rounded-full transition-all duration-150 ${colorClass}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback Preview Panel */}
        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Interactive Feedback Tester
          </h3>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Test synthesized audio tones and haptic vibration patterns directly. Enable toggles above to unmute or enable device vibration.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Audio Tones Test */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-green)]">
                Audio Tones (Native Synthesizer)
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={playCorrect}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-green)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Chime (Correct Answer)</span>
                  <span className="text-[10px] bg-[rgba(3,239,98,0.1)] text-[var(--accent-green)] px-2 py-0.5 rounded font-mono font-bold">Play</span>
                </button>
                <button
                  type="button"
                  onClick={playWrong}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-red)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Tone (Wrong Answer)</span>
                  <span className="text-[10px] bg-[rgba(255,77,77,0.1)] text-[var(--accent-red)] px-2 py-0.5 rounded font-mono font-bold">Play</span>
                </button>
                <button
                  type="button"
                  onClick={playSuccess}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-yellow)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Arpeggio (Session Complete)</span>
                  <span className="text-[10px] bg-[rgba(251,191,36,0.1)] text-[var(--accent-yellow)] px-2 py-0.5 rounded font-mono font-bold">Play</span>
                </button>
                <button
                  type="button"
                  onClick={playTimerWarning}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-blue)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Pulse (Timer Warning)</span>
                  <span className="text-[10px] bg-[rgba(96,165,250,0.1)] text-[var(--accent-blue)] px-2 py-0.5 rounded font-mono font-bold">Play</span>
                </button>
                <button
                  type="button"
                  onClick={playTimerExpired}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-red)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Sweep (Timer Expired)</span>
                  <span className="text-[10px] bg-[rgba(255,77,77,0.1)] text-[var(--accent-red)] px-2 py-0.5 rounded font-mono font-bold">Play</span>
                </button>
              </div>
            </div>

            {/* Haptic Vibrations Test */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-blue)]">
                Haptic Vibration Patterns
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={vibrateCorrect}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-blue)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Light Pulse (Correct)</span>
                  <span className="text-[10px] bg-[rgba(96,165,250,0.1)] text-[var(--accent-blue)] px-2 py-0.5 rounded font-mono font-bold">[60ms]</span>
                </button>
                <button
                  type="button"
                  onClick={vibrateWrong}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-red)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Medium Pulse (Wrong)</span>
                  <span className="text-[10px] bg-[rgba(255,77,77,0.1)] text-[var(--accent-red)] px-2 py-0.5 rounded font-mono font-bold">[150ms]</span>
                </button>
                <button
                  type="button"
                  onClick={vibrateSuccess}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-yellow)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Triple Burst (Success)</span>
                  <span className="text-[10px] bg-[rgba(251,191,36,0.1)] text-[var(--accent-yellow)] px-2 py-0.5 rounded font-mono font-bold">80-50-80ms</span>
                </button>
                <button
                  type="button"
                  onClick={vibrateTimerWarning}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-blue)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Quick Warning Pulse</span>
                  <span className="text-[10px] bg-[rgba(96,165,250,0.1)] text-[var(--accent-blue)] px-2 py-0.5 rounded font-mono font-bold">[50ms]</span>
                </button>
                <button
                  type="button"
                  onClick={vibrateTimerExpired}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs font-bold text-white hover:border-[var(--accent-red)] hover:bg-[var(--card-hover)] transition-all cursor-pointer text-left"
                >
                  <span>Long Burst (Expired)</span>
                  <span className="text-[10px] bg-[rgba(255,77,77,0.1)] text-[var(--accent-red)] px-2 py-0.5 rounded font-mono font-bold">[250ms]</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

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
          <div className={`grid grid-cols-1 ${resetType === 'course_exercise_category' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                1. Reset Scope
              </label>
              <select
                value={resetType}
                onChange={(e) => {
                  setResetType(e.target.value)
                  setSelectedTarget('')
                  setSelectedCategory('')
                }}
                className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] transition-all cursor-pointer"
              >
                <option value="">Select Scope...</option>
                <option value="course">Specific Course (All Exercises)</option>
                <option value="course_exercise_category">Specific Exercise Type in Course</option>
                <option value="track">Specific Track</option>
                <option value="category">Specific Category</option>
                <option value="all">Everything (Full Database Reset)</option>
              </select>
            </div>

            {/* Target selectors depending on scope */}
            {resetType && resetType !== 'all' && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  2. Select Target Course / Track
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

                {resetType === 'course_exercise_category' && (
                  <select
                    value={selectedTarget}
                    onChange={(e) => {
                      setSelectedTarget(e.target.value)
                      setSelectedCategory('')
                    }}
                    className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] transition-all cursor-pointer"
                  >
                    <option value="">Choose a Course...</option>
                    {courses
                      .filter(c => (c.overall_mastery || 0) > 0 || c.status !== 'Not Started')
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

            {/* Exercise category selector for course_exercise_category */}
            {resetType === 'course_exercise_category' && selectedTarget && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  3. Select Exercise Type
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)] transition-all cursor-pointer"
                >
                  <option value="">Choose Exercise Type...</option>
                  <option value="flashcard">Flashcards</option>
                  <option value="quiz">Multiple Choice Quiz / Speedrun</option>
                  <option value="fillblank">Fill in the Blank</option>
                  <option value="dataset">Dataset Challenge</option>
                  <option value="matching">Matching Games</option>
                  <option value="bossbattle">Boss Battle</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Button */}
          {resetType && (
            resetType === 'all' || 
            (resetType === 'course_exercise_category' && selectedTarget && selectedCategory) ||
            (resetType !== 'course_exercise_category' && selectedTarget)
          ) && (
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
