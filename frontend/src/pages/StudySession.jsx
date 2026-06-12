import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  HelpCircle,
  Award,
  Zap,
  RotateCcw,
  Sparkles,
  CreditCard,
  Play
} from 'lucide-react'
import CodeBlock from '../components/CodeBlock'

export default function StudySession() {
  const [activeTab, setActiveTab] = useState('spaced') // 'spaced' or 'hub'
  const [courses, setCourses] = useState([])
  const [dueCards, setDueCards] = useState([])
  const [selectedCourseSlug, setSelectedCourseSlug] = useState('')
  const [selectedCourseStats, setSelectedCourseStats] = useState(null)
  
  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingDue, setLoadingDue] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)

  // Spaced Repetition Player state
  const [sessionActive, setSessionActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [sessionCards, setSessionCards] = useState([])

  // Load courses and due flashcards
  useEffect(() => {
    async function loadInitialData() {
      try {
        const resCourses = await fetch('/api/courses')
        if (resCourses.ok) {
          const data = await resCourses.json()
          setCourses(data)
          if (data.length > 0) {
            setSelectedCourseSlug(data[0].slug)
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err)
      } finally {
        setLoadingCourses(false)
      }

      try {
        const resDue = await fetch('/api/progress/due-flashcards')
        if (resDue.ok) {
          const data = await resDue.json()
          setDueCards(data)
        }
      } catch (err) {
        console.error('Error fetching due flashcards:', err)
      } finally {
        setLoadingDue(false)
      }
    }
    loadInitialData()
  }, [])

  // Load stats when course selection changes in the Hub tab
  useEffect(() => {
    if (!selectedCourseSlug) return

    async function loadCourseStats() {
      setLoadingStats(true)
      try {
        const res = await fetch(`/api/progress/exercise-stats/${selectedCourseSlug}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedCourseStats(data)
        }
      } catch (err) {
        console.error('Error fetching course stats:', err)
      } finally {
        setLoadingStats(false)
      }
    }
    loadCourseStats()
  }, [selectedCourseSlug])

  // Spaced Repetition Player handlers
  const startSpacedSession = () => {
    if (dueCards.length === 0) return
    // Shuffle and slice up to 15 cards
    const shuffled = [...dueCards].sort(() => Math.random() - 0.5).slice(0, 15)
    setSessionCards(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
    setXpEarned(0)
    setSessionActive(true)
    setSessionCompleted(false)
  }

  const handleRate = async (rating) => {
    const card = sessionCards[currentIndex]
    const wasCorrect = rating !== 'again'
    const score = rating === 'easy' ? 1.0 : rating === 'good' ? 0.8 : rating === 'hard' ? 0.5 : 0.0

    // Submit card attempt to backend
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'flashcard',
          course_id: card.course_id,
          question_id: card.id,
          concept_id: card.concept_id,
          score: score,
          was_correct: wasCorrect ? 1 : 0
        })
      })
    } catch (err) {
      console.error('Error submitting attempt:', err)
    }

    // Earn XP for correct cards
    if (wasCorrect) {
      setXpEarned(prev => prev + 5)
    }

    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
    } else {
      // End of session
      setSessionActive(false)
      setSessionCompleted(true)
      
      // Update local stats after session
      const resDue = await fetch('/api/progress/due-flashcards')
      if (resDue.ok) {
        const data = await resDue.json()
        setDueCards(data)
      }

      // Add to user stats
      try {
        const statsRes = await fetch('/api/progress/stats')
        if (statsRes.ok) {
          const stats = await statsRes.json()
          await fetch('/api/progress/stats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              total_xp: (stats.total_xp || 0) + xpEarned + 10 // bonus 10 XP
            })
          })
        }
      } catch (err) {
        console.error('Error updating stats:', err)
      }
    }
  }

  const selectedCourse = courses.find(c => c.slug === selectedCourseSlug)

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Clock className="text-[var(--accent-green)]" /> Study Session
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Maximize retention with smart spaced-repetition drills or focus on specific course challenges.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[var(--border)] gap-6">
        <button
          onClick={() => {
            setActiveTab('spaced')
            setSessionActive(false)
            setSessionCompleted(false)
          }}
          className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'spaced'
              ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Spaced Repetition ({dueCards.length} due)
        </button>
        <button
          onClick={() => {
            setActiveTab('hub')
            setSessionActive(false)
            setSessionCompleted(false)
          }}
          className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'hub'
              ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Course Study Hub
        </button>
      </div>

      {/* Spaced Repetition Tab */}
      {activeTab === 'spaced' && (
        <div className="space-y-6">
          {sessionActive ? (
            /* Interactive Flashcard Player */
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 max-w-2xl mx-auto space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
                <span>CARD {currentIndex + 1} OF {sessionCards.length}</span>
                <span className="font-mono text-[var(--accent-green)]">+{xpEarned} XP EARNED</span>
              </div>

              {/* Flashcard container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[260px] flex items-center justify-center p-8 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] cursor-pointer text-center relative overflow-y-auto select-none hover:border-zinc-700 transition-all duration-300 ${
                  isFlipped ? 'shadow-[inset_0_0_12px_rgba(255,255,255,0.02)]' : ''
                }`}
              >
                {!isFlipped ? (
                  /* Front side */
                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-blue)] bg-blue-950/40 border border-blue-900/40 px-2 py-0.5 rounded">
                      {sessionCards[currentIndex]?.course_name}
                    </span>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mt-2">
                      {sessionCards[currentIndex]?.front}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 animate-pulse">
                      (Click card to reveal answer)
                    </p>
                  </div>
                ) : (
                  /* Back side */
                  <div className="space-y-4 w-full">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-green)] bg-green-950/40 border border-green-900/40 px-2 py-0.5 rounded">
                      Answer
                    </span>
                    <div className="text-left mt-2">
                      {sessionCards[currentIndex]?.back?.includes('```') ? (
                        <CodeBlock code={sessionCards[currentIndex].back} />
                      ) : (
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed text-center font-medium">
                          {sessionCards[currentIndex]?.back}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex flex-col gap-4">
                {!isFlipped ? (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full bg-[var(--accent-green)] hover:opacity-90 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRate('again')}
                      className="bg-red-950/40 border border-red-800/60 hover:bg-red-900/40 text-red-400 font-semibold py-2.5 rounded-lg text-xs transition-colors"
                    >
                      Again
                    </button>
                    <button
                      onClick={() => handleRate('hard')}
                      className="bg-orange-950/40 border border-orange-800/60 hover:bg-orange-900/40 text-orange-400 font-semibold py-2.5 rounded-lg text-xs transition-colors"
                    >
                      Hard
                    </button>
                    <button
                      onClick={() => handleRate('good')}
                      className="bg-blue-950/40 border border-blue-800/60 hover:bg-blue-900/40 text-[var(--accent-blue)] font-semibold py-2.5 rounded-lg text-xs transition-colors"
                    >
                      Good
                    </button>
                    <button
                      onClick={() => handleRate('easy')}
                      className="bg-green-950/40 border border-[var(--accent-green)]/40 hover:bg-green-900/40 text-[var(--accent-green)] font-semibold py-2.5 rounded-lg text-xs transition-colors"
                    >
                      Easy
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSessionActive(false)
                    setSessionCompleted(false)
                  }}
                  className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-2 transition-colors"
                >
                  Quit Review Session
                </button>
              </div>
            </div>
          ) : sessionCompleted ? (
            /* Session Completion State */
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-10 text-center max-w-md mx-auto space-y-6 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-green-950/40 border border-[var(--accent-green)]/40 text-[var(--accent-green)] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-950/20">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Session Completed!</h3>
                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                  Excellent work. Spaced repetition coordinates updated. You've earned bonus experience points!
                </p>
              </div>

              <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] flex justify-around text-center">
                <div>
                  <div className="text-[10px] uppercase text-[var(--text-muted)]">Reviewed</div>
                  <div className="text-lg font-bold text-[var(--text-primary)] mt-1">{sessionCards.length} Cards</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-[var(--text-muted)]">XP Earned</div>
                  <div className="text-lg font-bold text-[var(--accent-green)] mt-1">+{xpEarned + 10} XP</div>
                </div>
              </div>

              <button
                onClick={() => setSessionCompleted(false)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] hover:border-zinc-700 text-[var(--text-primary)] font-semibold py-3 rounded-xl transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            /* Welcome / Intro State */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main CTA Panel */}
              <div className="md:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between min-h-[280px] shadow-lg">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-green)] bg-green-950/40 border border-[var(--accent-green)]/40 px-2.5 py-1 rounded">
                    Spaced Repetition
                  </span>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                    Review Due Flashcards
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-md">
                    Use index card study sequences scheduled automatically based on card recall rankings. Eradicates cramming cycles.
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-6">
                  {loadingDue ? (
                    <span className="text-xs text-[var(--text-muted)]">Loading due reviews...</span>
                  ) : dueCards.length > 0 ? (
                    <button
                      onClick={startSpacedSession}
                      className="bg-[var(--accent-green)] text-black font-bold px-6 py-3.5 rounded-xl text-sm hover:opacity-95 transition-all flex items-center gap-2 shadow-lg shadow-green-950/20 cursor-pointer"
                    >
                      <Play size={16} fill="black" /> Start Session ({dueCards.length} cards due)
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--accent-green)] text-sm font-semibold">
                      <CheckCircle2 size={18} />
                      All caught up! No flashcards due today.
                    </div>
                  )}
                </div>
              </div>

              {/* Side Info Panel */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">Why Spaced Repetition?</h3>
                
                <div className="space-y-3 text-xs leading-relaxed text-[var(--text-muted)]">
                  <div className="flex gap-2">
                    <span className="text-[var(--accent-green)]">✔</span>
                    <span><strong>Forget less:</strong> Matches cards to the forgetting curve.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[var(--accent-green)]">✔</span>
                    <span><strong>Efficiency:</strong> Spends time only on hard concepts.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[var(--accent-green)]">✔</span>
                    <span><strong>Active Recall:</strong> Typing or reading from memory cements connections.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Course Study Hub Tab */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg text-[var(--text-primary)]">Course Focused Practice</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Select any course to view real metrics and jump directly into practice drills.</p>
            </div>
            
            <select
              value={selectedCourseSlug}
              onChange={(e) => setSelectedCourseSlug(e.target.value)}
              className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] min-w-[260px] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
            >
              {courses.map(c => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({c.track_language})
                </option>
              ))}
            </select>
          </div>

          {loadingStats ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-[var(--accent-green)] animate-spin" />
            </div>
          ) : selectedCourseStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Flashcards */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Flashcards</span>
                    <span className="text-xs text-[var(--accent-green)] font-mono font-semibold">
                      {selectedCourseStats.flashcard.available} concepts
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mt-3">Spaced Repetition Cards</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Test your core terms and definitions dynamically. Due today: {selectedCourseStats.flashcard.unattempted}
                  </p>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-[var(--border)]/40 mt-4">
                  <span className="text-xs text-[var(--text-muted)]">Attempts: {selectedCourseStats.flashcard.attempted}</span>
                  <Link
                    to={`/exercise/flashcards/${selectedCourseSlug}`}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--accent-green)] hover:underline"
                  >
                    Start Flashcards <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* MCQ Quiz */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Quiz</span>
                    <span className="text-xs text-[var(--accent-blue)] font-mono font-semibold">
                      {selectedCourseStats.mcq.available} questions
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mt-3">Multiple Choice Quiz</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Fast conceptual quizzes based on DataCamp application-style scenarios.
                  </p>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-[var(--border)]/40 mt-4">
                  <span className="text-xs text-[var(--text-muted)]">Attempts: {selectedCourseStats.mcq.attempted}</span>
                  <Link
                    to={`/exercise/quiz/${selectedCourseSlug}`}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--accent-green)] hover:underline"
                  >
                    Start Quiz <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Fill in the Blank */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">FTB</span>
                    <span className="text-xs text-orange-400 font-mono font-semibold">
                      {selectedCourseStats.ftb.available} concepts
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mt-3">Fill in the Blank</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Write blocks of syntax directly to complete code segments and consolidate syntax.
                  </p>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-[var(--border)]/40 mt-4">
                  <span className="text-xs text-[var(--text-muted)]">Attempts: {selectedCourseStats.ftb.attempted}</span>
                  <Link
                    to={`/exercise/fillblank/${selectedCourseSlug}`}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--accent-green)] hover:underline"
                  >
                    Start Coding <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Dataset challenge */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Dataset</span>
                    <span className="text-xs text-purple-400 font-mono font-semibold">
                      {selectedCourseStats.dataset.available} challenges
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mt-3">Dataset Challenge</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Implement comprehensive queries and transformations against live database files.
                  </p>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-[var(--border)]/40 mt-4">
                  <span className="text-xs text-[var(--text-muted)]">Attempts: {selectedCourseStats.dataset.attempted}</span>
                  <Link
                    to={`/exercise/dataset/${selectedCourseSlug}`}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--accent-green)] hover:underline"
                  >
                    Start Challenge <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Matching game */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Matching</span>
                    <span className="text-xs text-yellow-400 font-mono font-semibold">
                      {selectedCourseStats.matching.available} pairs
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mt-3">Matching Game</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Match concepts to descriptions in a fast, speed-focused test.
                  </p>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-[var(--border)]/40 mt-4">
                  <span className="text-xs text-[var(--text-muted)]">Attempts: {selectedCourseStats.matching.attempted}</span>
                  <Link
                    to={`/exercise/matching/${selectedCourseSlug}`}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--accent-green)] hover:underline"
                  >
                    Start Game <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Boss battle */}
              <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between min-h-[220px] ${
                (selectedCourse?.overall_mastery || 0) < 60 ? 'opacity-75' : ''
              }`}>
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Boss Battle</span>
                    <span className="text-xs text-red-400 font-mono font-semibold">
                      {selectedCourseStats.boss_battle.available} questions
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mt-3 flex items-center gap-1.5">
                    Boss Battle {(selectedCourse?.overall_mastery || 0) < 60 && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">LOCKED</span>}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Test your comprehensive course understanding. Needs at least 60% overall mastery to unlock. Current: {selectedCourse?.overall_mastery || 0}%
                  </p>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-[var(--border)]/40 mt-4">
                  <span className="text-xs text-[var(--text-muted)]">Attempts: {selectedCourseStats.boss_battle.attempted}</span>
                  {(selectedCourse?.overall_mastery || 0) >= 60 ? (
                    <Link
                      to={`/exercise/boss/${selectedCourseSlug}`}
                      className="flex items-center gap-1 text-xs font-bold text-[var(--accent-green)] hover:underline"
                    >
                      Start Battle <ChevronRight size={14} />
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-650 font-bold cursor-not-allowed">Locked</span>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center text-sm text-[var(--text-muted)]">No stats available for this course.</div>
          )}
        </div>
      )}
    </div>
  )
}
