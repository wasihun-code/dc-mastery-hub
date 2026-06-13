import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  RotateCcw,
  Play,
  Loader2,
  Check,
  X,
  Trophy,
  Flame,
  Search
} from 'lucide-react'
import CodeBlock from '../components/CodeBlock'

export default function WranglingSpeedrun() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  // Speedrun states
  const [speedrunActive, setSpeedrunActive] = useState(false)
  const [speedrunStep, setSpeedrunStep] = useState(1) // 1: Intro, 2: Active Exam, 3: Completed Summary
  const [speedrunTime, setSpeedrunTime] = useState(60)
  const [speedrunScore, setSpeedrunScore] = useState(0)
  const [speedrunQuestions, setSpeedrunQuestions] = useState([])
  const [speedrunIndex, setSpeedrunIndex] = useState(0)
  const [speedrunIsAnswered, setSpeedrunIsAnswered] = useState(false)
  const [speedrunSelectedOption, setSpeedrunSelectedOption] = useState(null)
  const [speedrunFlash, setSpeedrunFlash] = useState(null) // 'correct' | 'wrong'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('All')
  const [selectedCourseSlug, setSelectedCourseSlug] = useState('')

  const renderContentWithCode = (text) => {
    if (!text) return null
    const parts = text.split(/(```[\s\S]*?```)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n')
        const firstLine = lines[0]
        const lang = firstLine.replace('```', '').trim() || 'python'
        const code = lines.slice(1, lines.length - 1).join('\n')
        return (
          <div key={idx} className="my-4 text-left rounded-xl border border-[var(--border)] overflow-hidden">
            <CodeBlock code={code} language={lang} />
          </div>
        )
      }
      return (
        <span key={idx} className="whitespace-pre-wrap leading-relaxed">
          {part.split(/(`[^`]+`)/g).map((subpart, subidx) => {
            if (subpart.startsWith('`')) {
              return <code key={subidx} className="inline-code bg-black/40 border border-zinc-800 text-[var(--accent-green)] px-1 py-0.5 rounded font-mono text-sm">{subpart.slice(1, -1)}</code>
            }
            return subpart
          })}
        </span>
      )
    })
  }

  const speedrunTimerRef = useRef(null)
  const speedrunTimeoutRef = useRef(null)

  const speedrunActiveRef = useRef(speedrunActive)
  const speedrunIsAnsweredRef = useRef(speedrunIsAnswered)
  const speedrunQuestionsRef = useRef(speedrunQuestions)
  const speedrunIndexRef = useRef(speedrunIndex)
  const speedrunStepRef = useRef(speedrunStep)
  const handleSpeedrunOptionClickRef = useRef(null)
  const speedrunAttemptedIdsRef = useRef([])

  useEffect(() => {
    speedrunActiveRef.current = speedrunActive
    speedrunIsAnsweredRef.current = speedrunIsAnswered
    speedrunQuestionsRef.current = speedrunQuestions
    speedrunIndexRef.current = speedrunIndex
    speedrunStepRef.current = speedrunStep
  }, [speedrunActive, speedrunIsAnswered, speedrunQuestions, speedrunIndex, speedrunStep])

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return
      }

      // Speedrun Active (only in active gameplay Step 2)
      if (speedrunActiveRef.current && speedrunStepRef.current === 2 && !speedrunIsAnsweredRef.current) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault()
          const keys = ['a', 'b', 'c', 'd']
          const selectedKey = keys[parseInt(e.key, 10) - 1]
          const currentQ = speedrunQuestionsRef.current[speedrunIndexRef.current]
          if (currentQ && currentQ[`option_${selectedKey}`] && handleSpeedrunOptionClickRef.current) {
            handleSpeedrunOptionClickRef.current(selectedKey)
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      if (speedrunTimerRef.current) clearInterval(speedrunTimerRef.current)
      if (speedrunTimeoutRef.current) clearTimeout(speedrunTimeoutRef.current)
    }
  }, [])

  // Load courses
  useEffect(() => {
    async function loadInitialData() {
      try {
        const resCourses = await fetch('/api/courses')
        if (resCourses.ok) {
          const data = await resCourses.json()
          setCourses(data)
          const eligible = data.filter(c => c.status === 'Completed' && c.reviewed === 'Yes' && (c.quiz_question_count || 0) > 0)
          if (eligible.length > 0) {
            setSelectedCourseSlug(eligible[0].slug)
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err)
      } finally {
        setLoadingCourses(false)
      }
    }
    loadInitialData()
  }, [])

  // Speedrun handlers
  const initSpeedrun = async (courseSlug) => {
    const slug = courseSlug || selectedCourseSlug
    if (!slug) return
    try {
      const [res, attemptsRes] = await Promise.all([
        fetch(`/api/content/exercises/${slug}/mcq`),
        fetch(`/api/progress/attempted-questions/${slug}/quiz`)
      ])
      if (!res.ok || !attemptsRes.ok) throw new Error("Failed to load questions")
      const data = await res.json()
      const attemptedIds = await attemptsRes.json()
      if (data.length === 0) {
        alert("No quiz questions available for speedrun in this course. Please extract content first.")
        return
      }

      const attemptedStrIds = attemptedIds.map(id => String(id))
      speedrunAttemptedIdsRef.current = attemptedStrIds

      const unattempted = data.filter(q => !attemptedStrIds.includes(String(q.id)))
      const attempted = data.filter(q => attemptedStrIds.includes(String(q.id)))

      unattempted.sort(() => Math.random() - 0.5)
      attempted.sort(() => Math.random() - 0.5)

      const combined = [...unattempted, ...attempted]
      setSpeedrunQuestions(combined)
      setSpeedrunIndex(0)
      setSpeedrunScore(0)
      setSpeedrunTime(60)
      setSpeedrunIsAnswered(false)
      setSpeedrunSelectedOption(null)
      setSpeedrunFlash(null)
      setSpeedrunActive(true)
      setSpeedrunStep(1) // Show Intro Screen
    } catch (err) {
      console.error("Error initializing speedrun:", err)
    }
  }

  const startSpeedrunGameplay = () => {
    // Reshuffle questions on play/retry but prioritize unattempted
    setSpeedrunQuestions(prev => {
      const attemptedStrIds = speedrunAttemptedIdsRef.current || []
      const unattempted = prev.filter(q => !attemptedStrIds.includes(String(q.id)))
      const attempted = prev.filter(q => attemptedStrIds.includes(String(q.id)))
      unattempted.sort(() => Math.random() - 0.5)
      attempted.sort(() => Math.random() - 0.5)
      return [...unattempted, ...attempted]
    })
    setSpeedrunIndex(0)
    setSpeedrunScore(0)
    setSpeedrunTime(60)
    setSpeedrunIsAnswered(false)
    setSpeedrunSelectedOption(null)
    setSpeedrunFlash(null)
    setSpeedrunStep(2) // Transition to Active Gameplay

    if (speedrunTimerRef.current) clearInterval(speedrunTimerRef.current)
    speedrunTimerRef.current = setInterval(() => {
      setSpeedrunTime(prev => {
        if (prev <= 1) {
          clearInterval(speedrunTimerRef.current)
          finishSpeedrun()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const abortSpeedrun = () => {
    if (speedrunTimerRef.current) clearInterval(speedrunTimerRef.current)
    if (speedrunTimeoutRef.current) clearTimeout(speedrunTimeoutRef.current)
    setSpeedrunActive(false)
  }

  const handleSpeedrunOptionClick = async (optionKey) => {
    if (speedrunIsAnswered) return
    setSpeedrunIsAnswered(true)
    setSpeedrunSelectedOption(optionKey)

    const currentQ = speedrunQuestions[speedrunIndex]
    const isCorrect = optionKey === currentQ?.correct_option

    if (isCorrect) {
      setSpeedrunScore(prev => prev + 1)
      setSpeedrunFlash('correct')
      setSpeedrunTime(prev => prev + 5) // add 5 seconds
    } else {
      setSpeedrunFlash('wrong')
      setSpeedrunTime(prev => Math.max(0, prev - 10)) // subtract 10 seconds
    }

    // Save attempt to database (same logic as bossbattle/quiz to count towards course mastery!)
    try {
      const activeCourse = courses.find(c => c.slug === selectedCourseSlug)
      if (activeCourse && currentQ) {
        await fetch('/api/progress/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_type: 'quiz', // counts as quiz attempt
            course_id: activeCourse.id,
            question_id: currentQ.id,
            concept_id: currentQ.concept_id,
            score: isCorrect ? 1.0 : 0.0,
            was_correct: isCorrect ? 1 : 0
          })
        })
      }
    } catch (err) {
      console.error('Error saving speedrun question attempt:', err)
    }

    speedrunTimeoutRef.current = setTimeout(() => {
      advanceSpeedrun()
    }, 600)
  }

  const advanceSpeedrun = () => {
    if (speedrunTime <= 0) {
      finishSpeedrun()
      return
    }

    const nextIdx = speedrunIndex + 1
    if (nextIdx < speedrunQuestions.length) {
      setSpeedrunIndex(nextIdx)
      setSpeedrunIsAnswered(false)
      setSpeedrunSelectedOption(null)
      setSpeedrunFlash(null)
    } else {
      const reshuffled = [...speedrunQuestions].sort(() => Math.random() - 0.5)
      setSpeedrunQuestions(reshuffled)
      setSpeedrunIndex(0)
      setSpeedrunIsAnswered(false)
      setSpeedrunSelectedOption(null)
      setSpeedrunFlash(null)
    }
  }

  const finishSpeedrun = async () => {
    if (speedrunTimerRef.current) clearInterval(speedrunTimerRef.current)
    if (speedrunTimeoutRef.current) clearTimeout(speedrunTimeoutRef.current)
    setSpeedrunStep(3) // Transition to Completed Summary

    // Save final accumulated XP to user statistics
    const finalXp = speedrunScore * 10
    try {
      const statsRes = await fetch('/api/progress/stats')
      if (statsRes.ok) {
        const stats = await statsRes.json()
        await fetch('/api/progress/stats', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_xp: (stats.total_xp || 0) + finalXp
          })
        })
      }
    } catch (err) {
      console.error('Error saving speedrun XP:', err)
    }
  }

  useEffect(() => {
    handleSpeedrunOptionClickRef.current = handleSpeedrunOptionClick
  }, [handleSpeedrunOptionClick])

  const eligibleCourses = courses.filter(c => c.status === 'Completed' && c.reviewed === 'Yes' && (c.quiz_question_count || 0) > 0)
  const trackFilters = ['All', ...new Set(eligibleCourses.map(c => c.track_language || c.track_name).filter(Boolean))]

  const getCourseCountForTrack = (trackName) => {
    if (trackName === 'All') return eligibleCourses.length
    return eligibleCourses.filter(c => c.track_language === trackName || c.track_name === trackName).length
  }

  const filteredEligibleCourses = eligibleCourses.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTrack = selectedTrackFilter === 'All' || c.track_language === selectedTrackFilter || c.track_name === selectedTrackFilter
    return matchesSearch && matchesTrack
  })

  const selectedCourse = courses.find(c => c.slug === selectedCourseSlug)

  if (loadingCourses) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 font-mono">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading completed courses for speedrun...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Clock className="text-orange-500" /> Wrangling Speedrun
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Time-attack training mode. Answer as many questions as you can before the clock runs out!
        </p>
      </div>

      {speedrunActive ? (
        <>
          {/* Step 1: Speedrun Intro Screen (Fullscreen Volcanic Style) */}
          {speedrunStep === 1 && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07080c] p-6 text-center overflow-y-auto font-sans">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-950/45 rounded-full blur-[140px]"></div>
              </div>

              <div className="relative z-10 max-w-xl flex flex-col items-center justify-center">
                <div className="w-[300px] mb-8 bg-zinc-900 h-2.5 rounded-full border border-orange-950 overflow-hidden p-0.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-600 via-yellow-500 to-amber-500 w-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                </div>

                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-orange-950/40 text-orange-500 border border-orange-900/60 shadow-[0_0_40px_rgba(249,115,22,0.2)]">
                  <Flame size={64} className="text-orange-500 animate-pulse fill-orange-500/20" />
                </div>

                <span className="text-xs font-mono uppercase tracking-widest text-orange-500 font-extrabold">Wrangling Speedrun</span>
                <h1 className="mt-2 text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase">
                  {selectedCourse?.name || 'Dataset'} Arena ⚡
                </h1>
                <p className="mt-4 text-sm text-zinc-400 max-w-md leading-relaxed">
                  Time-attack training mode. Test your data science speed and syntax mastery. Answer questions as fast as you can. Correct answers buy you time; incorrect answers burn it.
                </p>

                <div className="mt-10 flex flex-wrap gap-8 justify-center font-mono">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-black text-white">60s</div>
                    <div className="text-[10px] uppercase tracking-wider text-orange-400 font-bold mt-1">Start Time</div>
                  </div>
                  <div className="w-px h-10 bg-orange-950"></div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-black text-white">+5s</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--accent-green)] font-bold mt-1">Correct Answer</div>
                  </div>
                  <div className="w-px h-10 bg-orange-950"></div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-black text-red-500">-10s</div>
                    <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold mt-1">Wrong Answer</div>
                  </div>
                  <div className="w-px h-10 bg-orange-950"></div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-black text-white">10 XP</div>
                    <div className="text-[10px] uppercase tracking-wider text-orange-400 font-bold mt-1">Per Solved</div>
                  </div>
                </div>

                <button
                  onClick={startSpeedrunGameplay}
                  className="mt-14 min-w-[260px] rounded-2xl bg-gradient-to-r from-orange-600 to-yellow-500 py-4.5 text-lg font-black text-black shadow-[0_0_35px_rgba(249,115,22,0.3)] transition-all hover:scale-105 active:scale-95 hover:brightness-110 uppercase cursor-pointer"
                >
                  ENTER THE ARENA
                </button>

                <button
                  onClick={abortSpeedrun}
                  className="mt-8 text-zinc-500 hover:text-orange-500 flex items-center justify-center gap-1.5 font-bold uppercase text-xs tracking-wider transition-colors bg-transparent border-none cursor-pointer"
                >
                  <ChevronLeft size={16} /> Exit Speedrun
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Active Speedrun Arena (Fullscreen Volcanic Style) */}
          {speedrunStep === 2 && (
            <div className={`fixed inset-0 z-[100] flex flex-col bg-[#0b0c10] text-[var(--text-primary)] overflow-hidden font-sans ${
              speedrunFlash === 'correct' ? 'after:absolute after:inset-0 after:shadow-[inset_0_0_40px_rgba(3,239,98,0.15)] after:pointer-events-none after:z-50' :
              speedrunFlash === 'wrong' ? 'after:absolute after:inset-0 after:shadow-[inset_0_0_40px_rgba(255,77,77,0.25)] after:pointer-events-none after:z-50' : ''
            }`}>
              {/* Progress bar */}
              <div className="w-full bg-[var(--bg-primary)] px-6 py-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)] select-none shrink-0 border-b border-[var(--border)]/20 font-mono">
                <span>SPEEDRUN ARENA</span>
                <span>Question {speedrunIndex + 1} ({speedrunQuestions.length} Pool)</span>
              </div>
              <div className="w-full h-1 bg-zinc-900 shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 transition-all duration-300"
                  style={{ width: `${((speedrunIndex + 1) / speedrunQuestions.length) * 100}%` }}
                />
              </div>

              {/* Timer Bar */}
              <div className="w-full h-1.5 bg-zinc-950 shrink-0">
                <div
                  className="h-full bg-orange-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                  style={{ width: `${(speedrunTime / 60) * 100}%` }}
                />
              </div>

              {/* Header */}
              <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-[#0d0e14] shrink-0">
                <div className="flex items-center gap-6">
                  <button
                    onClick={abortSpeedrun}
                    className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-sm font-semibold cursor-pointer bg-transparent border-none"
                  >
                    <ChevronLeft size={16} /> Abort Speedrun
                  </button>
                </div>

                <div className="text-center">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono font-bold">
                    {speedrunQuestions[speedrunIndex]?.course_name || selectedCourse?.name}
                  </span>
                  <div className="font-extrabold text-sm text-orange-400 animate-pulse font-mono">
                    ⏱ {speedrunTime}s Remaining
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-sm text-orange-500 font-black italic">
                  <Zap size={16} className="fill-orange-500 animate-bounce" />
                  <span>{speedrunScore * 10} XP</span>
                </div>
              </header>

              {/* Main Arena Content */}
              <main className="flex-1 overflow-y-auto px-8 py-10 flex items-start justify-center">
                <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-8">
                  {/* Left Column: Question */}
                  <div className="text-left space-y-4">
                    <span className="text-xs uppercase font-mono tracking-wider bg-orange-950/40 border border-orange-900/40 text-orange-400 px-2 py-0.5 rounded">
                      SPEEDRUN CHALLENGE
                    </span>
                    <h2 className="text-2xl font-extrabold leading-snug text-white">
                      {renderContentWithCode(speedrunQuestions[speedrunIndex]?.question_text)}
                    </h2>
                  </div>

                  {/* Right Column: Options */}
                  <div className="grid grid-cols-1 gap-3">
                    {['a', 'b', 'c', 'd'].map((key, idx) => {
                      const text = speedrunQuestions[speedrunIndex]?.[`option_${key}`]
                      if (!text) return null

                      const isCorrect = key === speedrunQuestions[speedrunIndex]?.correct_option
                      const isSelected = speedrunSelectedOption === key

                      let buttonStyle = 'border-zinc-850 bg-zinc-900/60 text-zinc-300 hover:border-orange-500/50 hover:bg-zinc-900'

                      if (speedrunIsAnswered) {
                        if (isCorrect) {
                          buttonStyle = 'bg-[var(--accent-green)] border-[var(--accent-green)] text-black font-extrabold shadow-[0_0_15px_rgba(3,239,98,0.25)]'
                        } else if (isSelected) {
                          buttonStyle = 'bg-red-600 border-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                        } else {
                          buttonStyle = 'border-transparent opacity-20'
                        }

                        if (!isSelected && isCorrect && speedrunSelectedOption !== null) {
                          buttonStyle = 'border-2 border-[var(--accent-green)] bg-zinc-900 text-[var(--accent-green)]'
                        }
                      }

                      return (
                        <button
                          key={key}
                          disabled={speedrunIsAnswered}
                          onClick={() => handleSpeedrunOptionClick(key)}
                          className={`flex items-center justify-between rounded-xl border-2 p-5 min-h-[72px] w-full text-left font-bold text-base transition-all duration-150 group cursor-pointer ${buttonStyle}`}
                        >
                          <span>{text}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2 font-mono">
                            {!speedrunIsAnswered && (
                              <kbd className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-zinc-500 bg-zinc-950 border border-zinc-850 rounded shadow-sm select-none transition-colors group-hover:border-orange-500 group-hover:text-red-500">
                                {idx + 1}
                              </kbd>
                            )}
                            {speedrunIsAnswered && isCorrect && <Check size={20} className="shrink-0" />}
                            {speedrunIsAnswered && isSelected && !isCorrect && <X size={20} className="shrink-0" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </main>

              {/* Shortcuts Widget */}
              <div className="fixed bottom-6 left-6 z-40 hidden md:flex flex-col gap-2 rounded-xl border border-zinc-850 bg-zinc-900/80 backdrop-blur-md p-4 text-xs shadow-lg w-[220px] text-left select-none">
                <div className="flex items-center gap-2 font-bold text-white border-b border-zinc-800 pb-2 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  <span>Shortcuts</span>
                </div>
                <div className="space-y-2 font-medium text-zinc-400 font-mono">
                  <div className="flex justify-between items-center">
                    <span>Select Option</span>
                    <span className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded text-[10px]">1</kbd>
                      <span>-</span>
                      <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded text-[10px]">4</kbd>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Speedrun Completed Screen (Fullscreen Trophy) */}
          {speedrunStep === 3 && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07080c] p-6 text-center overflow-y-auto font-sans">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-[140px]"></div>
              </div>

              <div className="relative z-10 max-w-md w-full flex flex-col items-center justify-center">
                <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_0_40px_rgba(249,115,22,0.35)] animate-bounce">
                  <Trophy size={64} strokeWidth={2.5} />
                </div>

                <h1 className="text-4xl font-black text-white italic tracking-tight uppercase">
                  SPEEDRUN COMPLETE! ⏱
                </h1>
                <p className="mt-2 text-lg text-orange-500 font-bold uppercase tracking-widest animate-pulse">
                  TIME EXPIRED!
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4 w-full font-mono">
                  <div className="rounded-xl bg-zinc-900 border border-zinc-850 p-5 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Solved</div>
                    <div className="text-2xl font-black text-white">{speedrunScore} questions</div>
                  </div>
                  <div className="rounded-xl bg-zinc-900 border border-zinc-850 p-5 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-1">XP Gained</div>
                    <div className="text-2xl font-black text-[var(--accent-green)]">+{speedrunScore * 10} XP</div>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-4 w-full">
                  <button
                    onClick={() => setSpeedrunActive(false)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-4 font-bold text-sm text-white hover:bg-zinc-850 transition-colors cursor-pointer"
                  >
                    Back to Selection
                  </button>
                  <button
                    onClick={startSpeedrunGameplay}
                    className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-yellow-500 py-4 font-bold text-sm text-black hover:brightness-110 transition-colors shadow-md cursor-pointer uppercase font-black"
                  >
                    Retry Run
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Intro / Dashboard Screen with Course Search & Filters */
        <div className="space-y-6 text-left">
          {/* Header card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between shadow-lg">
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400 bg-orange-950/40 border border-orange-900/40 px-2.5 py-1 rounded">
                Wrangling Speedruns
              </span>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                Time-Attack Code Training
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl">
                Select a completed course and click start. Solve multiple-choice questions as fast as you can. Correct answers add 5 seconds and reward 10 XP; wrong answers cost you 10 seconds.
              </p>
            </div>
          </div>

          {/* Filters bar */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search completed courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
              />
            </div>
            
            {/* Track pills */}
            <div className="flex gap-2 flex-wrap items-center">
              {trackFilters.map(filter => {
                const count = getCourseCountForTrack(filter)
                return (
                  <button
                    key={filter}
                    onClick={() => setSelectedTrackFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                      selectedTrackFilter === filter
                        ? 'bg-orange-500 border-orange-600 text-black shadow-md shadow-orange-950/20'
                        : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span>{filter}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                      selectedTrackFilter === filter ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
              
              {/* Reset button if filter is active */}
              {(searchQuery || selectedTrackFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedTrackFilter('All')
                  }}
                  className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none pl-2"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Courses Grid */}
          {filteredEligibleCourses.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center text-sm text-[var(--text-muted)]">
              No completed courses with quiz questions match your search or filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEligibleCourses.map(c => {
                const isSelected = selectedCourseSlug === c.slug
                const mastery = Math.round(c.overall_mastery || 0)
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCourseSlug(c.slug)}
                    className={`rounded-2xl border p-5 cursor-pointer flex flex-col justify-between min-h-[170px] transition-all duration-200 group/card ${
                      isSelected
                        ? 'bg-orange-950/20 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)] translate-y-[-2px]'
                        : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-zinc-700 hover:translate-y-[-2px]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-xs text-[var(--text-muted)] font-medium">
                        <span className="uppercase text-[10px] tracking-wider text-[var(--accent-blue)] bg-blue-950/30 px-2 py-0.5 rounded">
                          {c.track_language || c.track_name}
                        </span>
                        <span className="font-mono text-orange-400 font-bold">
                          ⚡ {c.quiz_question_count} Qs
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] mt-3 leading-snug group-hover/card:text-orange-400 transition-colors">
                        {c.name}
                      </h4>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]/40 mt-4">
                      <span className="text-xs text-[var(--text-muted)] font-mono">Mastery: {mastery}%</span>
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            initSpeedrun(c.slug)
                          }}
                          className="bg-orange-500 text-black font-extrabold px-4 py-2 rounded-xl text-xs hover:bg-orange-400 transition-colors shadow-md shadow-orange-950/20 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          Play <Play size={10} fill="black" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
