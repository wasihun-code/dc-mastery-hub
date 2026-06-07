import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, XCircle, Timer, Award, ArrowRight, HelpCircle } from 'lucide-react'

export default function Quiz() {
  const { courseSlug } = useParams()
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    fetchQuestions()
    return () => clearInterval(timerRef.current)
  }, [courseSlug])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses/${courseSlug}/quiz-questions?count=10`)
      const data = await res.json()
      setQuestions(data)
      setStartTime(Date.now())
      startTimer()
    } catch (err) {
      console.error('Error fetching quiz questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)
  }

  const handleAnswer = async (optionKey) => {
    if (isAnswered) return
    
    const question = questions[currentIndex]
    const wasCorrect = optionKey === question.correct_option
    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    
    setSelectedOption(optionKey)
    setIsAnswered(true)
    
    if (wasCorrect) {
      setScore(prev => prev + 1)
    }

    // Record attempt
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'quiz',
          course_id: question.course_id,
          question_id: question.id,
          score: wasCorrect ? 100 : 0,
          time_taken_secs: timeTaken,
          was_correct: wasCorrect,
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setIsAnswered(false)
      setStartTime(Date.now())
    } else {
      clearInterval(timerRef.current)
      setCurrentIndex(questions.length) // End state
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <HelpCircle size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Questions Found</h2>
        <p className="mt-2 text-[var(--text-muted)]">We couldn't find any quiz questions for this course yet.</p>
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

  // Summary screen
  if (currentIndex >= questions.length) {
    const percentage = Math.round((score / questions.length) * 100)
    
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12">
          <Award size={64} className="mx-auto text-[var(--accent-yellow)] mb-6" />
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Quiz Complete!</h2>
          
          <div className="mt-8 grid grid-cols-3 gap-8">
            <div className="rounded-lg bg-[var(--bg-primary)] p-4">
              <div className="text-3xl font-bold text-[var(--accent-green)]">{score}/{questions.length}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Score</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-primary)] p-4">
              <div className="text-3xl font-bold text-[var(--accent-blue)]">{percentage}%</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Accuracy</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-primary)] p-4">
              <div className="text-3xl font-bold text-[var(--text-primary)]">{formatTime(timeElapsed)}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Total Time</div>
            </div>
          </div>
          
          <div className="mt-12 flex flex-col gap-3">
            <button
              onClick={() => {
                setCurrentIndex(0)
                setScore(0)
                setSelectedOption(null)
                setIsAnswered(false)
                setTimeElapsed(0)
                setStartTime(Date.now())
                startTimer()
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-green)] px-6 py-3 font-bold text-black hover:opacity-90"
            >
              Retake Quiz
            </button>
            <Link
              to={`/courses/${courseSlug}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-6 py-3 font-bold text-[var(--text-primary)]"
            >
              Return to Course
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]
  const options = [
    { key: 'a', text: question.option_a },
    { key: 'b', text: question.option_b },
    { key: 'c', text: question.option_c },
    { key: 'd', text: question.option_d },
  ].filter(o => o.text)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to={`/courses/${courseSlug}`}
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={20} />
          Quit Quiz
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <Timer size={16} />
            {formatTime(timeElapsed)}
          </div>
          <div className="text-sm font-medium text-[var(--text-muted)]">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>
      </div>

      <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-card)]">
        <div
          className="h-full bg-[var(--accent-green)] transition-all duration-300"
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        ></div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
        <h3 className="text-2xl font-bold leading-tight text-[var(--text-primary)]">
          {question.question_text}
        </h3>

        <div className="mt-8 space-y-3">
          {options.map((option) => {
            const isCorrect = option.key === question.correct_option
            const isSelected = selectedOption === option.key
            
            let variantClass = "border-[var(--border)] hover:border-[var(--accent-green)] hover:bg-[var(--bg-primary)]"
            if (isAnswered) {
              if (isCorrect) variantClass = "border-[var(--accent-green)] bg-[rgba(3,239,98,0.1)]"
              else if (isSelected) variantClass = "border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)]"
              else variantClass = "border-[var(--border)] opacity-50"
            }

            return (
              <button
                key={option.key}
                disabled={isAnswered}
                onClick={() => handleAnswer(option.key)}
                className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${variantClass}`}
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-sm font-bold uppercase">
                    {option.key}
                  </span>
                  <span className="text-lg font-medium">{option.text}</span>
                </div>
                {isAnswered && isCorrect && <CheckCircle2 className="text-[var(--accent-green)]" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="text-[var(--accent-red)]" />}
              </button>
            )
          })}
        </div>

        {isAnswered && (
          <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`rounded-xl p-6 ${selectedOption === question.correct_option ? 'bg-[rgba(3,239,98,0.05)] border border-[var(--accent-green)]' : 'bg-[rgba(239,68,68,0.05)] border border-[var(--accent-red)]'}`}>
              <div className="flex items-center gap-2 font-bold mb-2">
                {selectedOption === question.correct_option ? (
                  <><CheckCircle2 size={20} className="text-[var(--accent-green)]" /> Correct!</>
                ) : (
                  <><XCircle size={20} className="text-[var(--accent-red)]" /> Not quite.</>
                )}
              </div>
              <p className="text-[var(--text-muted)] leading-relaxed">
                {question.explanation}
              </p>
            </div>
            
            <button
              onClick={handleNext}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-green)] py-4 text-xl font-bold text-black hover:opacity-90 transition-opacity"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              <ArrowRight size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
