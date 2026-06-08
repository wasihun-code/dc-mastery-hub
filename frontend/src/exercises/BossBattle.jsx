import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Heart, Zap, Timer, Award, CheckCircle2, XCircle, Skull, Flame } from 'lucide-react'
import { renderWithCode } from '../utils/renderWithCode'

export default function BossBattle() {
  const { courseSlug } = useParams()
  const [items, setItems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lives, setLives] = useState(5)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isAnswered, setIsAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [fillValue, setFillValue] = useState('')
  const [timePerQuestion, setTimePerQuestion] = useState(15)
  const [timeLeft, setLeftTime] = useState(15)
  const [course, setCourse] = useState(null)
  
  const timerRef = useRef(null)
  const feedbackTimerRef = useRef(null)

  useEffect(() => {
    fetchBattleData()
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(feedbackTimerRef.current)
    }
  }, [courseSlug])

  useEffect(() => {
    if (timeLeft === 0 && !isAnswered && !isGameOver) {
      handleWrong()
    }
  }, [timeLeft, isAnswered, isGameOver])

  const fetchBattleData = async () => {
    try {
      setLoading(true)
      
      const courseRes = await fetch(`/api/courses/${courseSlug}`)
      const courseData = await courseRes.json()
      setCourse(courseData)

      // Fetch both quiz questions and concepts
      const [quizRes, conceptRes] = await Promise.all([
        fetch(`/api/courses/${courseSlug}/quiz-questions?count=15`),
        fetch(`/api/courses/${courseSlug}/concepts`)
      ])
      
      const quizData = await quizRes.json()
      const conceptData = await conceptRes.json()

      // Map concepts to a similar structure as quiz questions or a new "fill" type
      const fillItems = conceptData
        .filter(c => c.name && c.definition)
        .slice(0, 10)
        .map(c => ({
          type: 'fill',
          id: c.id,
          question: c.definition,
          answer: c.name,
          hint: c.category
        }))

      const quizItems = quizData.map(q => ({
        type: 'quiz',
        ...q,
        question: q.question_text
      }))

      // Shuffle and combine
      const combined = [...quizItems, ...fillItems].sort(() => 0.5 - Math.random())
      setItems(combined)
      startTimer()
    } catch (err) {
      console.error('Error fetching battle data:', err)
    } finally {
      setLoading(false)
    }
  }

  const startTimer = () => {
    clearInterval(timerRef.current)
    setLeftTime(15)
    timerRef.current = setInterval(() => {
      setLeftTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleQuizAnswer = (optionKey) => {
    if (isAnswered || isGameOver) return
    
    setIsAnswered(true)
    setSelectedOption(optionKey)
    clearInterval(timerRef.current)
    
    const item = items[currentIndex]
    if (optionKey === item.correct_option) {
      handleCorrect()
    } else {
      handleWrong()
    }
  }

  const handleFillSubmit = (e) => {
    if (e) e.preventDefault()
    if (isAnswered || isGameOver || !fillValue.trim()) return

    setIsAnswered(true)
    clearInterval(timerRef.current)

    const item = items[currentIndex]
    // Simple string match
    if (fillValue.toLowerCase().trim() === item.answer.toLowerCase().trim()) {
      handleCorrect()
    } else {
      handleWrong()
    }
  }

  const handleCorrect = () => {
    const points = timeLeft * 10 + 100
    setScore(prev => prev + points)
    setStreak(prev => {
      const newStreak = prev + 1
      if (newStreak > maxStreak) setMaxStreak(newStreak)
      return newStreak
    })
    
    feedbackTimerRef.current = setTimeout(nextQuestion, 1500)
  }

  const handleWrong = () => {
    setLives(prev => {
      const newLives = prev - 1
      if (newLives <= 0) {
        endGame()
        return 0
      }
      return newLives
    })
    setStreak(0)
    setIsAnswered(true)
    clearInterval(timerRef.current)
    
    feedbackTimerRef.current = setTimeout(nextQuestion, 1500)
  }

  const nextQuestion = () => {
    if (lives <= 0) return
    
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsAnswered(false)
      setSelectedOption(null)
      setFillValue('')
      startTimer()
    } else {
      endGame()
    }
  }

  const endGame = async () => {
    setIsGameOver(true)
    clearInterval(timerRef.current)
    
    // Record attempt
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'boss_battle',
          course_id: course.id,
          score: score, // Boss battle score is absolute points
          time_taken_secs: 0, // Not used as much for survival
          was_correct: score > 500 ? 1 : 0, // Threshold for success
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-red)] border-t-transparent"></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <Skull size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Challenges Found</h2>
        <p className="mt-2 text-[var(--text-muted)]">This course needs quiz questions or concepts for a Boss Battle.</p>
        <Link
          to={`/courses/${courseSlug}`}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--bg-card)] px-6 py-2 border border-[var(--border)]"
        >
          <ChevronLeft size={20} />
          Back to Course
        </Link>
      </div>
    )
  }

  if (isGameOver) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem 1rem' }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-[var(--accent-red)]"></div>
            
            {lives <= 0 ? (
              <Skull size={64} className="mx-auto text-[var(--accent-red)] mb-6" />
            ) : (
              <Award size={64} className="mx-auto text-[var(--accent-yellow)] mb-6" />
            )}
            
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              {lives <= 0 ? 'Defeated!' : 'Boss Vanquished!'}
            </h2>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-[var(--bg-primary)] p-6">
                <div className="text-4xl font-black text-[var(--accent-yellow)]">{score}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Final Score</div>
              </div>
              <div className="rounded-lg bg-[var(--bg-primary)] p-6">
                <div className="text-4xl font-black text-[var(--accent-blue)]">{maxStreak}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Best Streak</div>
              </div>
            </div>
            
            <div className="mt-12 flex flex-col gap-3">
              <button
                onClick={() => {
                  setLives(5)
                  setScore(0)
                  setStreak(0)
                  setMaxStreak(0)
                  setCurrentIndex(0)
                  setIsGameOver(false)
                  setIsAnswered(false)
                  fetchBattleData()
                }}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-red)] px-6 py-4 font-bold text-white hover:opacity-90 transition-opacity shadow-lg"
              >
                <Zap size={20} />
                Try Again
              </button>
              <Link
                to={`/courses/${courseSlug}`}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-6 py-3 font-bold text-[var(--text-primary)]"
              >
                Back to Course
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const item = items[currentIndex]

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="mx-auto max-w-3xl">
        {/* Header / Stats */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Heart 
                key={i} 
                size={24} 
                className={i < lives ? "text-[var(--accent-red)] fill-[var(--accent-red)]" : "text-[var(--border)]"} 
              />
            ))}
          </div>
          
          <div className="flex items-center gap-6">
            {streak >= 3 && (
              <div className="flex items-center gap-1 text-[var(--accent-yellow)] font-bold animate-bounce">
                <Flame size={20} />
                {streak} Streak
              </div>
            )}
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="mb-8 h-3 w-full overflow-hidden rounded-full bg-[var(--bg-card)] border border-[var(--border)]">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              timeLeft < 5 ? 'bg-[var(--accent-red)]' : 'bg-[var(--accent-blue)]'
            }`}
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          ></div>
        </div>

        {/* Challenge Card */}
        <div className={`rounded-2xl border-2 bg-[var(--bg-card)] p-8 shadow-xl transition-all duration-300 ${
          isAnswered ? 'scale-[0.98]' : 'scale-100'
        } ${
          isAnswered && (selectedOption === item.correct_option || fillValue.toLowerCase().trim() === item.answer?.toLowerCase().trim()) 
          ? 'border-[var(--accent-green)]' 
          : isAnswered ? 'border-[var(--accent-red)]' : 'border-[var(--border)]'
        }`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-[var(--bg-primary)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {item.type === 'quiz' ? 'Multiple Choice' : 'Fill in the Blank'}
            </span>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)]">
              <Timer size={16} />
              {timeLeft}s
            </div>
          </div>

          <h3 className="text-2xl font-bold leading-tight text-[var(--text-primary)] mb-8">
            {renderWithCode(item.question)}
          </h3>

          {item.type === 'quiz' ? (
            <div className="grid grid-cols-1 gap-3">
              {['a', 'b', 'c', 'd'].map((key) => {
                const text = item[`option_${key}`]
                if (!text) return null
                
                const isCorrect = key === item.correct_option
                const isSelected = selectedOption === key
                
                let btnClass = "border-[var(--border)] hover:bg-[var(--bg-primary)]"
                if (isAnswered) {
                  if (isCorrect) btnClass = "border-[var(--accent-green)] bg-[rgba(3,239,98,0.1)]"
                  else if (isSelected) btnClass = "border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)]"
                  else btnClass = "border-[var(--border)] opacity-30"
                }

                return (
                  <button
                    key={key}
                    disabled={isAnswered}
                    onClick={() => handleQuizAnswer(key)}
                    className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${btnClass}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-sm font-bold uppercase">
                      {key}
                    </span>
                    <span className="text-lg font-medium">{renderWithCode(text)}</span>
                    {isAnswered && isCorrect && <CheckCircle2 className="ml-auto text-[var(--accent-green)]" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="ml-auto text-[var(--accent-red)]" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <form onSubmit={handleFillSubmit} className="space-y-4">
              <input
                autoFocus
                disabled={isAnswered}
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                placeholder="Type your answer..."
                className={`w-full rounded-xl bg-[var(--bg-primary)] border-2 p-5 text-xl font-bold outline-none transition-all ${
                  isAnswered 
                  ? (fillValue.toLowerCase().trim() === item.answer.toLowerCase().trim() ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.1)]' : 'border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)]')
                  : 'border-[var(--border)] focus:border-[var(--accent-blue)]'
                }`}
              />
              {isAnswered && fillValue.toLowerCase().trim() !== item.answer.toLowerCase().trim() && (
                <div className="text-center font-bold text-[var(--accent-green)] animate-in fade-in">
                  Correct answer: {item.answer}
                </div>
              )}
              {!isAnswered && (
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[var(--accent-blue)] py-4 text-lg font-black text-white hover:opacity-90"
                >
                  SUBMIT
                </button>
              )}
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            to={`/courses/${courseSlug}`}
            className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
          >
            SURRENDER
          </Link>
        </div>
      </div>
    </div>
  )
}
