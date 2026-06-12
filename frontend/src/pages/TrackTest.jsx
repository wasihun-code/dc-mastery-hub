import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft,
  Heart,
  Zap,
  RotateCcw,
  Skull,
  Trophy,
  Flame,
  Check,
  X,
  Loader2
} from 'lucide-react'
import CodeBlock from '../components/CodeBlock'

export default function TrackTest() {
  const { trackSlug } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1: Intro, 2: Active Exam, 3: Completed Summary
  const [track, setTrack] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Game States
  const [lives, setLives] = useState(5)
  const [timeLeft, setTimeLeft] = useState(15)
  const [score, setScore] = useState(0)
  const [attemptedCount, setAttemptedCount] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [flash, setFlash] = useState(null) // 'correct' | 'wrong' | null
  const [gameOverReason, setGameOverReason] = useState(null) // 'lives' | 'complete'

  const timerRef = useRef(null)
  const advanceTimeoutRef = useRef(null)

  useEffect(() => {
    async function fetchTrackData() {
      try {
        setLoading(true)
        const [trackRes, questionsRes] = await Promise.all([
          fetch(`/api/tracks/${trackSlug}`),
          fetch(`/api/content/track-test/${trackSlug}`)
        ])

        if (!trackRes.ok || !questionsRes.ok) {
          throw new Error('Failed to load track test data')
        }

        const trackData = await trackRes.json()
        const questionData = await questionsRes.json()

        setTrack(trackData)
        setQuestions(questionData)
      } catch (err) {
        console.error('Error fetching track test:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrackData()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    }
  }, [trackSlug])

  // Bind Keyboard Shortcuts during active battle (Step 2)
  useEffect(() => {
    if (step !== 2) return

    const handleKeyDown = (e) => {
      // Ignore key events if focused on input elements
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return
      }

      const currentQuestion = questions[currentIndex]
      if (!currentQuestion) return

      const optionKeys = ['a', 'b', 'c', 'd']

      // Keys 1-4 to choose options
      if (!isAnswered && ['1', '2', '3', '4'].includes(e.key)) {
        const optionIndex = parseInt(e.key, 10) - 1
        const keyChar = optionKeys[optionIndex]
        if (currentQuestion[`option_${keyChar}`]) {
          handleOptionClick(keyChar)
        }
      }

      // Escape key clears choices before submitting
      if (e.key === 'Escape') {
        if (!isAnswered) {
          setSelectedOption(null)
        }
      }

      // Enter key proceeds to the next question after submitting
      if (e.key === 'Enter') {
        if (isAnswered) {
          advanceNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [step, currentIndex, questions, isAnswered, lives])

  const startExam = () => {
    setStep(2)
    setLives(5)
    setScore(0)
    setAttemptedCount(0)
    setCurrentIndex(0)
    resetQuestionState()
    startTimer()
  }

  const startTimer = () => {
    setTimeLeft(15)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleTimeOut()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const resetQuestionState = () => {
    setIsAnswered(false)
    setSelectedOption(null)
    setFlash(null)
    setTimeLeft(15)
  }

  const handleTimeOut = async () => {
    setIsAnswered(true)
    setFlash('wrong')
    setSelectedOption(null)
    setAttemptedCount((prev) => prev + 1)

    const currentQuestion = questions[currentIndex]
    
    // Save failed attempt to DB under course ID
    try {
      if (track?.courses && currentQuestion) {
        const course = track.courses.find(c => c.slug === currentQuestion.course_slug)
        if (course) {
          await fetch('/api/progress/attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exercise_type: 'bossbattle',
              course_id: course.id,
              question_id: currentQuestion.id,
              score: 0.0,
              time_taken_secs: 15,
              was_correct: 0
            })
          })
        }
      }
    } catch (err) {
      console.error('Error logging timeout attempt:', err)
    }

    setLives((prev) => {
      const nextLives = prev - 1
      if (nextLives <= 0) {
        advanceTimeoutRef.current = setTimeout(() => finishExam('lives'), 1000)
      } else {
        advanceTimeoutRef.current = setTimeout(() => {
          advanceNext()
        }, 1200)
      }
      return nextLives
    })
  }

  const handleOptionClick = async (optionKey) => {
    if (isAnswered) return

    if (timerRef.current) clearInterval(timerRef.current)
    setIsAnswered(true)
    setSelectedOption(optionKey)
    setAttemptedCount((prev) => prev + 1)

    const currentQuestion = questions[currentIndex]
    const isCorrect = optionKey === currentQuestion?.correct_option
    const timeTaken = 15 - timeLeft

    // Save attempt to DB under course ID to help boost course mastery score
    try {
      if (track?.courses && currentQuestion) {
        const course = track.courses.find(c => c.slug === currentQuestion.course_slug)
        if (course) {
          await fetch('/api/progress/attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exercise_type: 'bossbattle',
              course_id: course.id,
              question_id: currentQuestion.id,
              score: isCorrect ? 1.0 : 0.0,
              time_taken_secs: timeTaken,
              was_correct: isCorrect ? 1 : 0
            })
          })
        }
      }
    } catch (err) {
      console.error('Error logging test attempt:', err)
    }

    if (isCorrect) {
      setScore((prev) => prev + 1)
      setFlash('correct')
      advanceTimeoutRef.current = setTimeout(() => {
        advanceNext()
      }, 800)
    } else {
      setFlash('wrong')
      setLives((prev) => {
        const nextLives = prev - 1
        if (nextLives <= 0) {
          advanceTimeoutRef.current = setTimeout(() => finishExam('lives'), 1000)
        } else {
          advanceTimeoutRef.current = setTimeout(() => {
            advanceNext()
          }, 1200)
        }
        return nextLives
      })
    }
  }

  const advanceNext = () => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    if (lives <= 0) return

    const nextIndex = currentIndex + 1
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex)
      resetQuestionState()
      startTimer()
    } else {
      finishExam('complete')
    }
  }

  const finishExam = async (reason) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGameOverReason(reason)
    setStep(3)

    // Save overall XP bonus
    const finalXp = score * 10
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
      console.error('Error saving track stats:', err)
    }
  }

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

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 font-mono">
        <Loader2 className="w-8 h-8 text-[var(--accent-green)] animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Drawing exam questions from Learning Path...</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Flame size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold">Capstone Exam Unavailable</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-md">
          There are no quiz questions generated for courses in this track yet. Please extract content for at least one course first!
        </p>
        <Link
          to="/capstone"
          className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--bg-card)] px-6 py-2.5 border border-[var(--border)] text-sm font-semibold hover:border-zinc-750 transition-colors"
        >
          <ChevronLeft size={16} /> Back to Capstone Battles
        </Link>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07080c] p-6 text-center overflow-y-auto">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-950/45 rounded-full blur-[140px]"></div>
        </div>

        <div className="relative z-10 max-w-xl flex flex-col items-center justify-center">
          <div className="w-[300px] mb-8 bg-zinc-900 h-2.5 rounded-full border border-red-950 overflow-hidden p-0.5">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 w-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
          </div>

          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-red-950/40 text-red-500 border border-red-900/60 shadow-[0_0_40px_rgba(255,77,77,0.2)]">
            <Flame size={64} className="text-red-500 animate-pulse" />
          </div>

          <span className="text-xs font-mono uppercase tracking-widest text-red-500 font-extrabold">Learning Path Capstone</span>
          <h1 className="mt-2 text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase">
            {track?.name} Boss Battle 🔥
          </h1>
          <p className="mt-4 text-sm text-zinc-400 max-w-md leading-relaxed">
            Welcome to the ultimate test of your data science endurance. We've compiled 20 random questions spanning all courses in this track. Survival requires flawless execution.
          </p>

          <div className="mt-10 flex flex-wrap gap-8 justify-center font-mono">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-white">5</div>
              <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold mt-1">Lives</div>
            </div>
            <div className="w-px h-10 bg-red-950"></div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-white">15s</div>
              <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold mt-1">Per Question</div>
            </div>
            <div className="w-px h-10 bg-red-950"></div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-white">10 XP</div>
              <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold mt-1">Per Answer</div>
            </div>
          </div>

          <button
            onClick={startExam}
            className="mt-14 min-w-[260px] rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 py-4.5 text-lg font-black text-white shadow-[0_0_35px_rgba(239,68,68,0.3)] transition-all hover:scale-105 active:scale-95 hover:brightness-110 uppercase cursor-pointer"
          >
            ENTER THE ARENA
          </button>

          <Link
            to="/capstone"
            className="mt-8 text-zinc-500 hover:text-red-500 flex items-center justify-center gap-1.5 font-bold uppercase text-xs tracking-wider transition-colors"
          >
            <ChevronLeft size={16} /> Back to Capstone Battles
          </Link>
        </div>
      </div>
    )
  }

  if (step === 2) {
    const currentQuestion = questions[currentIndex]

    let flashOverlay = ''
    if (flash === 'correct') {
      flashOverlay = 'after:absolute after:inset-0 after:shadow-[inset_0_0_40px_rgba(3,239,98,0.15)] after:pointer-events-none after:z-50'
    } else if (flash === 'wrong') {
      flashOverlay = 'after:absolute after:inset-0 after:shadow-[inset_0_0_40px_rgba(255,77,77,0.25)] after:pointer-events-none after:z-50'
    }

    return (
      <div className={`fixed inset-0 z-[100] flex flex-col bg-[#0b0c10] text-[var(--text-primary)] overflow-hidden ${flashOverlay}`}>
        {/* Progress Bar */}
        <div className="w-full bg-[var(--bg-primary)] px-6 py-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)] select-none shrink-0 border-b border-[var(--border)]/20 font-mono">
          <span>CAPSTONE EXAM</span>
          <span>Question {currentIndex + 1} / {questions.length} ({Math.round(((currentIndex + 1) / questions.length) * 100)}%)</span>
        </div>
        <div className="w-full h-1 bg-zinc-900 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-yellow-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Timer Bar */}
        <div className="w-full h-1 bg-zinc-950 shrink-0">
          <div
            className="h-full bg-red-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-[#0d0e14] shrink-0">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/capstone')}
              className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-sm font-semibold border-r border-zinc-900 pr-4 cursor-pointer bg-transparent border-none"
            >
              <ChevronLeft size={16} /> Quit
            </button>
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <Heart
                  key={i}
                  size={20}
                  className={`transition-all duration-300 ${
                    i < lives ? 'text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'text-zinc-700 opacity-20 scale-90'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono font-bold">{currentQuestion?.course_name}</span>
            <div className="font-extrabold text-sm text-zinc-350">Question {currentIndex + 1} of {questions.length}</div>
          </div>

          <div className="flex items-center gap-2 font-mono text-sm text-orange-500 font-black italic">
            <Zap size={16} className="fill-orange-500 animate-bounce" />
            <span>{score * 10} XP</span>
          </div>
        </header>

        {/* Main Exam Section */}
        <main className="flex-1 overflow-y-auto px-8 py-10 flex items-start justify-center">
          <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-8">
            {/* Left Col: Question Text & Code Block */}
            <div className="text-left space-y-4">
              <span className="text-xs uppercase font-mono tracking-wider bg-red-950/40 border border-red-900/40 text-red-400 px-2 py-0.5 rounded">
                CAPSTONE CHALLENGE
              </span>
              <h2 className="text-2xl font-extrabold leading-snug text-white">
                {renderContentWithCode(currentQuestion?.question_text)}
              </h2>
            </div>

            {/* Right Col: Options list */}
            <div className="grid grid-cols-1 gap-3">
              {['a', 'b', 'c', 'd'].map((key, idx) => {
                const text = currentQuestion?.[`option_${key}`]
                if (!text) return null

                const isCorrect = key === currentQuestion?.correct_option
                const isSelected = selectedOption === key

                let buttonStyle = 'border-zinc-850 bg-zinc-900/60 text-zinc-300 hover:border-red-600/50 hover:bg-zinc-900'

                if (isAnswered) {
                  if (isCorrect) {
                    buttonStyle = 'bg-[var(--accent-green)] border-[var(--accent-green)] text-black font-extrabold shadow-[0_0_15px_rgba(3,239,98,0.25)]'
                  } else if (isSelected) {
                    buttonStyle = 'bg-red-600 border-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                  } else {
                    buttonStyle = 'border-transparent opacity-20'
                  }

                  if (!isSelected && isCorrect && selectedOption !== null) {
                    buttonStyle = 'border-2 border-[var(--accent-green)] bg-zinc-900 text-[var(--accent-green)]'
                  }
                }

                return (
                  <button
                    key={key}
                    disabled={isAnswered}
                    onClick={() => handleOptionClick(key)}
                    className={`flex items-center justify-between rounded-xl border-2 p-5 min-h-[72px] w-full text-left font-bold text-base transition-all duration-150 group cursor-pointer ${buttonStyle}`}
                  >
                    <span>{text}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {!isAnswered && (
                        <kbd className="inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-bold text-zinc-500 bg-zinc-950 border border-zinc-850 rounded shadow-sm select-none transition-colors group-hover:border-red-500 group-hover:text-red-500">
                          {idx + 1}
                        </kbd>
                      )}
                      {isAnswered && isCorrect && <Check size={20} className="shrink-0" />}
                      {isAnswered && isSelected && !isCorrect && <X size={20} className="shrink-0" />}
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
            <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>Shortcuts</span>
          </div>
          <div className="space-y-2 font-medium text-zinc-400">
            <div className="flex justify-between items-center">
              <span>Select Option</span>
              <span className="flex gap-1 font-mono">
                <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded text-[10px]">1</kbd>
                <span>-</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded text-[10px]">4</kbd>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Clear Choice</span>
              <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded font-mono text-[10px]">Esc</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>Next Question</span>
              <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded font-mono text-[10px]">Enter</kbd>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    const isVictory = gameOverReason === 'complete' && lives > 0
    const finalXp = score * 10

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07080c] p-6 text-center overflow-y-auto">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] ${
            isVictory ? 'bg-yellow-500' : 'bg-red-600'
          } rounded-full blur-[140px]`}></div>
        </div>

        <div className="relative z-10 max-w-md w-full flex flex-col items-center justify-center">
          <div className={`mb-6 flex h-28 w-28 items-center justify-center rounded-full ${
            isVictory ? 'bg-yellow-500 text-black shadow-[0_0_40px_rgba(251,191,36,0.35)]' : 'bg-red-600 text-white shadow-[0_0_40px_rgba(239,68,68,0.35)]'
          }`}>
            {isVictory ? <Trophy size={64} strokeWidth={2.5} /> : <Skull size={64} strokeWidth={2.5} />}
          </div>

          <h1 className="text-4xl font-black text-white italic tracking-tight uppercase">
            {isVictory ? 'VICTORY CONQUERED! 🏆' : 'DEFEATED!'}
          </h1>
          <p className="mt-2 text-lg text-red-500 font-bold uppercase tracking-widest">
            {isVictory ? 'You are a certified Path Master!' : 'The Capstone proved too fierce...'}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 w-full font-mono">
            <div className="rounded-xl bg-zinc-900 border border-zinc-850 p-5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Correct Answers</div>
              <div className="text-2xl font-black text-white">{score} / {questions.length}</div>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-850 p-5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-1">XP Gained</div>
              <div className="text-2xl font-black text-[var(--accent-green)]">+{finalXp} XP</div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4 w-full">
            <button
              onClick={startExam}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-4 font-bold text-sm text-white hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              <RotateCcw size={18} /> Retry Exam
            </button>
            <button
              onClick={() => navigate('/capstone')}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 py-4 font-bold text-sm text-white hover:brightness-110 transition-colors shadow-md cursor-pointer"
            >
              Capstone Selection
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
