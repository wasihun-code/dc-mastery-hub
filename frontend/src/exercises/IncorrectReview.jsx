import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Brain, 
  HelpCircle, 
  PenLine, 
  Shuffle, 
  Swords, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react'
import { 
  triggerCorrectFeedback, 
  triggerWrongFeedback 
} from '../services/feedbackService'
import CodeBlock from '../components/CodeBlock'

export default function IncorrectReview() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [courseSlugState, setCourseSlugState] = useState(courseSlug)
  const [courseId, setCourseId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false) // for flashcards
  const [selectedOption, setSelectedOption] = useState(null) // for MCQ/Matching
  const [fillBlankInput, setFillBlankInput] = useState('') // for FTB
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [wrongReviewOptions, setWrongReviewOptions] = useState([]) // shuffled options for Matching
  const [isLocked, setIsLocked] = useState(false)
  const [lockedPct, setLockedPct] = useState(0)

  // Keyboard Shortcuts state
  const [showShortcuts, setShowShortcuts] = useState(() => {
    return localStorage.getItem('showKeyboardShortcuts') !== 'false'
  })

  useEffect(() => {
    const handleStorageChange = () => {
      setShowShortcuts(localStorage.getItem('showKeyboardShortcuts') !== 'false')
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [courseSlug])

  const handleKeyDown = (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      if (e.key === 'Enter' && currentItem?.exercise_type === 'fillblank') {
        e.preventDefault()
        handleCheckFTB()
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (isChecked) {
        handleNext()
      } else {
        if (!currentItem) return
        if (currentItem.exercise_type === 'quiz' || currentItem.exercise_type === 'bossbattle') {
          if (selectedOption) handleSubmitAnswer(selectedOption === currentItem.details.correct_option)
        } else if (currentItem.exercise_type === 'matching') {
          if (selectedOption) handleSubmitAnswer(selectedOption === currentItem.details.match)
        } else if (currentItem.exercise_type === 'fillblank') {
          handleCheckFTB()
        }
      }
    } else if (e.code === 'Space' && currentItem?.exercise_type === 'flashcard') {
      e.preventDefault()
      setIsFlipped(prev => !prev)
    } else if (currentItem?.exercise_type === 'flashcard' && isFlipped && !isChecked) {
      if (e.key === '1') {
        e.preventDefault()
        handleSubmitAnswer(false)
      } else if (e.key === '2') {
        e.preventDefault()
        handleSubmitAnswer(true)
      }
    } else if (!isChecked && currentItem && (currentItem.exercise_type === 'quiz' || currentItem.exercise_type === 'bossbattle')) {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        const keys = ['a', 'b', 'c', 'd']
        const opt = keys[parseInt(e.key, 10) - 1]
        const opts = Object.keys(currentItem.details.options || {})
        if (opts.includes(opt)) {
          setSelectedOption(opt)
        }
      }
    } else if (!isChecked && currentItem?.exercise_type === 'matching') {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        const idx = parseInt(e.key, 10) - 1
        if (idx >= 0 && idx < wrongReviewOptions.length) {
          setSelectedOption(wrongReviewOptions[idx])
        }
      }
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isChecked, isFlipped, selectedOption, fillBlankInput, currentIndex, wrongReviewOptions, questions])

  const fetchQuestions = async () => {
    setLoading(true)
    setIsLocked(false)
    setLockedPct(0)
    try {
      const [questionsRes, statsRes] = await Promise.all([
        fetch(`/api/progress/incorrect-questions/${courseSlug}`),
        fetch(`/api/progress/exercise-stats/${courseSlug}`)
      ])
      
      if (questionsRes.ok && statsRes.ok) {
        const questionsData = await questionsRes.json()
        const statsData = await statsRes.json()
        
        // Calculate completion percentage across all categories
        const categoryKeys = ['mcq', 'flashcard', 'ftb', 'matching', 'boss_battle', 'dataset']
        let totalAvailable = 0
        let totalAttempted = 0
        categoryKeys.forEach(k => {
          if (statsData?.[k]) {
            totalAvailable += statsData[k].available || 0
            totalAttempted += (statsData[k].available || 0) - (statsData[k].unattempted || 0)
          }
        })
        const completionPercentage = totalAvailable > 0 ? (totalAttempted / totalAvailable) * 100 : 0
        
        if (completionPercentage < 75) {
          setIsLocked(true)
          setLockedPct(completionPercentage)
        } else {
          setQuestions(questionsData.questions)
          setCourseId(questionsData.course_id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch incorrect questions or stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentItem = questions[currentIndex]

  // Setup Matching options when current item is matching
  useEffect(() => {
    if (currentItem && currentItem.exercise_type === 'matching') {
      const details = currentItem.details
      const opts = [details.match, ...(details.wrong_matches || [])]
      // Shuffle options
      opts.sort(() => Math.random() - 0.5)
      setWrongReviewOptions(opts)
    }
    setIsFlipped(false)
    setSelectedOption(null)
    setFillBlankInput('')
    setIsChecked(false)
    setIsCorrect(false)
  }, [currentIndex, questions])

  const handleSubmitAnswer = async (userAnswerCorrect, ratingScore = 1.0) => {
    if (isChecked) return

    setIsChecked(true)
    setIsCorrect(userAnswerCorrect)

    if (userAnswerCorrect) {
      triggerCorrectFeedback()
      setCorrectCount(prev => prev + 1)
      setXpEarned(prev => prev + 10)
    } else {
      triggerWrongFeedback()
    }

    // Post attempt to update in database as corrected (or incorrect again)
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: currentItem.exercise_type,
          course_id: courseId,
          question_id: currentItem.question_id,
          concept_id: currentItem.concept_id,
          score: userAnswerCorrect ? ratingScore : 0.0,
          was_correct: userAnswerCorrect ? 1 : 0
        })
      })
    } catch (err) {
      console.error('Failed to submit attempt:', err)
    }
  }

  // Handle FTB submission check
  const handleCheckFTB = () => {
    if (isChecked) return
    const details = currentItem.details
    const primaryAns = String(details.blanks[0].answer).trim().toLowerCase()
    const userAns = fillBlankInput.trim().toLowerCase()
    const alts = (details.blanks[0].answer_alternatives || []).map(a => String(a).trim().toLowerCase())
    
    const correct = userAns === primaryAns || alts.includes(userAns)
    handleSubmitAnswer(correct)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setSessionCompleted(true)
      // Check if course is now fully completed to show redirection trigger
      triggerGlobalCompletionCheck()
    }
  }

  const triggerGlobalCompletionCheck = async () => {
    try {
      const res = await fetch(`/api/progress/exercise-stats/${courseSlug}`)
      if (res.ok) {
        const stats = await res.json()
        const keys = ['mcq', 'flashcard', 'ftb', 'matching', 'boss_battle', 'dataset']
        const allDone = keys.every(k => !stats[k] || stats[k].unattempted === 0)
        
        if (allDone) {
          // Play congrats audio, show modal/banner, and redirect
          setTimeout(() => {
            alert("Congratulations! You have completed all questions in this course! Redirecting you to the Time-Attack Code Training...")
            navigate(`/speedrun?course=${courseSlug}`)
          }, 2000)
        }
      }
    } catch (e) {
      console.error('Error checking course completeness:', e)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--accent-green)]"></div>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 space-y-6 shadow-xl mt-10">
        <div className="w-16 h-16 bg-red-950/40 border border-[var(--accent-red)]/40 text-[var(--accent-red)] rounded-full flex items-center justify-center mx-auto animate-pulse">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Exercise Locked</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            The Incorrect Review exercise is only available after completing 75% of all course questions.
          </p>
          <div className="text-sm font-semibold text-[var(--accent-red)] mt-2">
            Current Progress: {Math.round(lockedPct)}% / 75%
          </div>
        </div>
        <Link 
          to={`/courses/${courseSlug}?refresh=1`} 
          className="inline-block w-full bg-[var(--accent-green)] text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Back to Course Detail
        </Link>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 space-y-6 shadow-xl mt-10">
        <div className="w-16 h-16 bg-green-950/40 border border-[var(--accent-green)]/40 text-[var(--accent-green)] rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Review Queue Clear!</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Fantastic job! You have no unresolved incorrect answers in this course.
          </p>
        </div>
        <Link 
          to={`/courses/${courseSlug}?refresh=1`} 
          className="inline-block w-full bg-[var(--accent-green)] text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Back to Course Detail
        </Link>
      </div>
    )
  }

  if (sessionCompleted) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 space-y-6 shadow-xl mt-10 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-amber-950/40 border border-amber-600/40 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <Award size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Review Session Finished</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            You completed reviewing the current incorrect queue!
          </p>
        </div>
        <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] flex justify-around font-mono text-xs text-[var(--text-primary)]">
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)]">Reviewed</div>
            <div className="font-bold mt-0.5">{questions.length} Items</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)]">Corrected</div>
            <div className="font-bold text-[var(--accent-green)] mt-0.5">{correctCount} Items</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)]">XP Earned</div>
            <div className="font-bold text-[var(--accent-blue)] mt-0.5">+{xpEarned} XP</div>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)}
          className="w-full bg-[var(--accent-green)] text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Return to Course Detail
        </button>
      </div>
    )
  }

  const getExerciseIcon = (type) => {
    switch (type) {
      case 'quiz': return <HelpCircle size={16} />
      case 'flashcard': return <Brain size={16} />
      case 'fillblank': return <PenLine size={16} />
      case 'matching': return <Shuffle size={16} />
      case 'bossbattle': return <Swords size={16} />
      default: return null
    }
  }

  const getExerciseTitle = (type) => {
    switch (type) {
      case 'quiz': return 'Multiple Choice Quiz'
      case 'flashcard': return 'Flashcard'
      case 'fillblank': return 'Fill in the Blank'
      case 'matching': return 'Matching Concept'
      case 'bossbattle': return 'Boss Battle'
      default: return 'Practice'
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 text-left">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mt-4">
        <button 
          onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Course
        </button>
        <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
          ⚠️ REVIEW QUEUE
        </span>
      </div>

      {/* Progress status */}
      <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
        <span className="font-semibold uppercase tracking-wider">
          ITEM {currentIndex + 1} OF {questions.length}
        </span>
        <span className="font-bold text-[var(--accent-green)]">+{xpEarned} XP</span>
      </div>

      {/* Card wrapper */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[var(--bg-primary)] text-[var(--accent-blue)]">
            {getExerciseIcon(currentItem.exercise_type)}
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {getExerciseTitle(currentItem.exercise_type)}
          </span>
        </div>

        {/* 1. MCQ & Boss Battle questions */}
        {(currentItem.exercise_type === 'quiz' || currentItem.exercise_type === 'bossbattle') && (
          <div className="space-y-6">
            <div className="text-sm font-semibold text-white leading-relaxed whitespace-pre-wrap">
              {currentItem.details.question_text || currentItem.details.question}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {Object.entries(currentItem.details.options || {}).map(([key, val]) => {
                const isSelected = selectedOption === key
                const isCorrectOption = key === currentItem.details.correct_option
                
                let buttonStyle = 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-zinc-700'
                if (isChecked) {
                  if (isCorrectOption) {
                    buttonStyle = 'border-[var(--accent-green)] bg-green-950/20 text-white shadow-[0_0_12px_rgba(3,239,98,0.05)]'
                  } else if (isSelected) {
                    buttonStyle = 'border-[var(--accent-red)] bg-red-950/20 text-white shadow-[0_0_12px_rgba(239,68,68,0.05)]'
                  } else {
                    buttonStyle = 'border-[var(--border)] bg-[var(--bg-primary)] opacity-40'
                  }
                } else if (isSelected) {
                  buttonStyle = 'border-[var(--accent-blue)] bg-blue-950/20 text-white'
                }

                return (
                  <button
                    key={key}
                    onClick={() => { if (!isChecked) setSelectedOption(key) }}
                    disabled={isChecked}
                    className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer ${buttonStyle}`}
                  >
                    <span>{val}</span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0 ml-2">
                      Option {key.toUpperCase()}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Check/Submit feedback */}
            {!isChecked ? (
              <button
                onClick={() => handleSubmitAnswer(selectedOption === currentItem.details.correct_option)}
                disabled={!selectedOption}
                className="w-full bg-[var(--accent-green)] text-black font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Check Answer
              </button>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className={`p-4 rounded-xl border ${
                  isCorrect 
                    ? 'border-[var(--accent-green)] bg-green-950/10 text-white' 
                    : 'border-[var(--accent-red)] bg-red-950/10 text-white'
                }`}>
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                    {isCorrect ? 'Correct! Answer Cleared' : 'Incorrect! Key concept check'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {currentItem.details.per_option_feedback?.[selectedOption] || currentItem.details.explanation || 'Review option mappings carefully.'}
                  </p>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full bg-[var(--accent-blue)] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Next Item <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Flashcards */}
        {currentItem.exercise_type === 'flashcard' && (
          <div className="space-y-6">
            <div
              onClick={() => setIsFlipped(prev => !prev)}
              className={`min-h-[220px] flex items-center justify-center p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] cursor-pointer text-center relative select-none hover:border-zinc-700 transition-all duration-300 ${
                isFlipped ? 'shadow-[inset_0_0_12px_rgba(255,255,255,0.02)]' : ''
              }`}
            >
              {!isFlipped ? (
                <div>
                  <h3 className="text-base font-bold text-white leading-relaxed">{currentItem.details.front}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mt-4 animate-pulse">
                    Click card to reveal answer
                  </p>
                </div>
              ) : (
                <div className="w-full text-left">
                  {currentItem.details.back?.includes('```') ? (
                    <CodeBlock code={currentItem.details.back} />
                  ) : (
                    <p className="text-sm text-center font-medium leading-relaxed text-white">
                      {currentItem.details.back}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Check/Submit feedback */}
            {!isChecked ? (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full bg-[var(--accent-green)] text-black font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
              >
                Reveal Answer
              </button>
            ) : null}

            {isFlipped && !isChecked && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                <button
                  onClick={() => handleSubmitAnswer(false)}
                  className="bg-red-950/40 border border-red-800/60 hover:bg-red-900/40 text-red-400 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Still Confused
                </button>
                <button
                  onClick={() => handleSubmitAnswer(true)}
                  className="bg-green-950/40 border border-[var(--accent-green)]/40 hover:bg-green-900/40 text-[var(--accent-green)] font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  I Got It
                </button>
              </div>
            )}

            {isChecked && (
              <button
                onClick={handleNext}
                className="w-full bg-[var(--accent-blue)] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Next Item <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* 3. Fill in the Blank */}
        {currentItem.exercise_type === 'fillblank' && (
          <div className="space-y-6">
            <div className="text-xs font-semibold text-zinc-300 leading-relaxed">
              {currentItem.details.task_description}
            </div>

            {currentItem.details.code_template && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <CodeBlock 
                  code={String(currentItem.details.code_template).replace('_____', '______')} 
                  language="python" 
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Your Answer (fills in the blank):
              </label>
              <input
                type="text"
                value={fillBlankInput}
                onChange={(e) => setFillBlankInput(e.target.value)}
                disabled={isChecked}
                placeholder="Enter exact syntax here..."
                className="w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] font-mono disabled:opacity-50"
              />
            </div>

            {/* Check/Submit feedback */}
            {!isChecked ? (
              <button
                onClick={handleCheckFTB}
                disabled={!fillBlankInput.trim()}
                className="w-full bg-[var(--accent-green)] text-black font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Check Code
              </button>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className={`p-4 rounded-xl border ${
                  isCorrect 
                    ? 'border-[var(--accent-green)] bg-green-950/10 text-white' 
                    : 'border-[var(--accent-red)] bg-red-950/10 text-white'
                }`}>
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                    {isCorrect ? 'Correct! Code Matches' : 'Incorrect! Syntax difference'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                    Correct Answer: {currentItem.details.blanks[0].answer}
                  </p>
                  {currentItem.details.explanation && (
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {currentItem.details.explanation}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleNext}
                  className="w-full bg-[var(--accent-blue)] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Next Item <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. Matching Game rounds */}
        {currentItem.exercise_type === 'matching' && (
          <div className="space-y-6">
            <div className="text-xs text-zinc-400 font-semibold mb-1">
              Select the matching definition for the term:
            </div>
            
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-yellow)] bg-yellow-950/30 border border-yellow-900/40 px-2 py-0.5 rounded">
                Theme: {currentItem.details.theme || 'Vocabulary'}
              </span>
              <h3 className="text-base font-bold text-white mt-3 font-mono">{currentItem.details.term}</h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {wrongReviewOptions.map((opt, i) => {
                const isSelected = selectedOption === opt
                const isCorrectOpt = opt === currentItem.details.match

                let buttonStyle = 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-zinc-700'
                if (isChecked) {
                  if (isCorrectOpt) {
                    buttonStyle = 'border-[var(--accent-green)] bg-green-950/20 text-white'
                  } else if (isSelected) {
                    buttonStyle = 'border-[var(--accent-red)] bg-red-950/20 text-white'
                  } else {
                    buttonStyle = 'border-[var(--border)] bg-[var(--bg-primary)] opacity-40'
                  }
                } else if (isSelected) {
                  buttonStyle = 'border-[var(--accent-blue)] bg-blue-950/20 text-white'
                }

                return (
                  <button
                    key={i}
                    onClick={() => { if (!isChecked) setSelectedOption(opt) }}
                    disabled={isChecked}
                    className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${buttonStyle}`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            {/* Check/Submit feedback */}
            {!isChecked ? (
              <button
                onClick={() => handleSubmitAnswer(selectedOption === currentItem.details.match)}
                disabled={!selectedOption}
                className="w-full bg-[var(--accent-green)] text-black font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Match Definition
              </button>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className={`p-4 rounded-xl border ${
                  isCorrect 
                    ? 'border-[var(--accent-green)] bg-green-950/10 text-white' 
                    : 'border-[var(--accent-red)] bg-red-950/10 text-white'
                }`}>
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                    {isCorrect ? 'Correct! Match Succeeded' : 'Incorrect! Match failed'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isCorrect ? (currentItem.details.feedback_correct || 'Correct definition mapping.') : (currentItem.details.feedback_wrong || 'Definitions did not map correctly.')}
                  </p>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full bg-[var(--accent-blue)] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Next Item <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Helper */}
      {showShortcuts && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/50 p-4 text-xs select-none">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] border-b border-[var(--border)]/30 pb-1.5 mb-0.5 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Keyboard Shortcuts Guide</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 text-[var(--text-muted)] font-medium">
            <div className="flex justify-between items-center pr-3">
              <span>Next Question (when checked)</span>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded font-mono text-[10px]">Enter</kbd>
            </div>
            {currentItem.exercise_type === 'flashcard' ? (
              <div className="flex justify-between items-center">
                <span>Flip / Unflip Card</span>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded font-mono text-[10px]">Space</kbd>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span>Submit / Check Answer</span>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded font-mono text-[10px]">Enter</kbd>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
