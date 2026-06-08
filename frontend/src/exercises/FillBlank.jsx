import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, XCircle, Award, RotateCcw, HelpCircle, ArrowRight } from 'lucide-react'
import { renderWithCode } from '../utils/renderWithCode'

export default function FillBlank() {
  const { courseSlug } = useParams()
  const [exercises, setExercises] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputs, setInputs] = useState({})
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)
  const [timeElapsed, setTimeElapsed] = useState(0)

  useEffect(() => {
    fetchConcepts()
  }, [courseSlug])

  useEffect(() => {
    let timer
    if (startTime && currentIndex < exercises.length) {
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [startTime, currentIndex, exercises.length])

  const fetchConcepts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses/${courseSlug}/concepts`)
      const concepts = await res.json()
      
      const generated = concepts
        .filter(c => c.code_snippet && c.definition)
        .map(generateExercise)
        .filter(Boolean)
        .sort(() => 0.5 - Math.random())

      setExercises(generated)
      setStartTime(Date.now())
    } catch (err) {
      console.error('Error fetching concepts:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateExercise = (concept) => {
    const code = concept.code_snippet
    const task = concept.definition.split('.')[0] + '.' // Use first sentence as task

    let blankedCode = code
    let answers = []
    
    // Simplistic regex for finding function arguments (strings or numbers)
    const literalRegex = /(?:\(|,\s*)(['"][^'"]*['"]|\d+(?:\.\d+)?)(?=\s*\)|\s*,)/g
    const methodRegex = /\.([a-zA-Z_]\w*)\s*\(/g

    const literals = [...code.matchAll(literalRegex)]
    const methods = [...code.matchAll(methodRegex)]

    if (concept.difficulty === 1 && literals.length > 0) {
      // Blank a literal
      const target = literals[Math.floor(Math.random() * literals.length)][1]
      blankedCode = code.replace(target, '_____')
      answers.push(target)
    } else if (concept.difficulty >= 2 && methods.length > 0) {
      // Blank a method name
      const target = methods[Math.floor(Math.random() * methods.length)][1]
      blankedCode = code.replace('.' + target + '(', '.____(')
      answers.push(target)
      
      // If difficulty 3, also blank an argument if possible
      if (concept.difficulty === 3 && literals.length > 0) {
        const argTarget = literals[Math.floor(Math.random() * literals.length)][1]
        if (!answers.includes(argTarget)) { // avoid blanking same thing if regex matched weirdly
           blankedCode = blankedCode.replace(argTarget, '_____')
           answers.push(argTarget)
        }
      }
    } else if (literals.length > 0) {
        // Fallback to literal if method regex fails on diff 2+
        const target = literals[Math.floor(Math.random() * literals.length)][1]
        blankedCode = code.replace(target, '_____')
        answers.push(target)
    } else {
        // Cannot generate a good blank for this code snippet
        return null;
    }

    // Wrap the blanked code in markdown so renderWithCode formats it
    return {
      id: concept.id,
      course_id: concept.course_id,
      task,
      blankedCode: `\`\`\`python\n${blankedCode}\n\`\`\``,
      originalCode: `\`\`\`python\n${code}\n\`\`\``,
      explanation: concept.definition,
      answers: answers.map(a => a.replace(/['"]/g, '').trim().toLowerCase()) // normalize answers
    }
  }

  const handleInputChange = (index, value) => {
    setInputs(prev => ({ ...prev, [index]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isAnswered) return

    const exercise = exercises[currentIndex]
    let allCorrect = true

    exercise.answers.forEach((ans, idx) => {
      const userAns = (inputs[idx] || '').replace(/['"]/g, '').trim().toLowerCase()
      if (userAns !== ans) {
        allCorrect = false
      }
    })

    setIsAnswered(true)
    
    if (allCorrect) {
      setScore(prev => prev + 1)
    }

    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'fill_blank',
          course_id: exercise.course_id,
          question_id: exercise.id,
          score: allCorrect ? 100 : 0,
          time_taken_secs: Math.round(timeElapsed),
          was_correct: allCorrect,
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }
  }

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1)
    setInputs({})
    setIsAnswered(false)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <HelpCircle size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Code Snippets Found</h2>
        <p className="mt-2 text-[var(--text-muted)]">This course needs concepts with code snippets to generate Fill in the Blank exercises.</p>
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

  if (currentIndex >= exercises.length) {
    const percentage = Math.round((score / exercises.length) * 100)
    
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem 1rem' }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12">
            <Award size={64} className="mx-auto text-[var(--accent-yellow)] mb-6" />
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Session Complete!</h2>
            
            <div className="mt-8 grid grid-cols-2 gap-8">
              <div className="rounded-lg bg-[var(--bg-primary)] p-4">
                <div className="text-3xl font-bold text-[var(--accent-green)]">{score}/{exercises.length}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Score</div>
              </div>
              <div className="rounded-lg bg-[var(--bg-primary)] p-4">
                <div className="text-3xl font-bold text-[var(--accent-blue)]">{percentage}%</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Accuracy</div>
              </div>
            </div>
            
            <div className="mt-12 flex flex-col gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  setScore(0)
                  setInputs({})
                  setIsAnswered(false)
                  fetchConcepts() // Reshuffle and regenerate
                }}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-green)] px-6 py-3 font-bold text-black hover:opacity-90 transition-opacity"
              >
                <RotateCcw size={20} />
                Try New Blanks
              </button>
              <Link
                to={`/courses/${courseSlug}`}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-6 py-3 font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card)]"
              >
                Return to Course
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const exercise = exercises[currentIndex]
  const progress = ((currentIndex) / exercises.length) * 100

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={`/courses/${courseSlug}`}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={20} />
            Quit Exercise
          </Link>
          <div className="text-sm font-medium text-[var(--text-muted)]">
            Exercise {currentIndex + 1} of {exercises.length}
          </div>
        </div>

        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-card)]">
          <div
            className="h-full bg-[var(--accent-green)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
          <div className="mb-6">
             <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">Task:</h3>
             <p className="text-lg text-[var(--text-muted)]">{exercise.task}</p>
          </div>

          <div className="mb-8">
             <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">Code:</h3>
             {renderWithCode(exercise.blankedCode)}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {exercise.answers.map((ans, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                   <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">
                     Blank {idx + 1}
                   </label>
                   <input
                     autoFocus={idx === 0}
                     disabled={isAnswered}
                     value={inputs[idx] || ''}
                     onChange={(e) => handleInputChange(idx, e.target.value)}
                     className={`w-full rounded-xl bg-[var(--bg-primary)] border-2 p-4 text-lg font-mono outline-none transition-all ${
                       isAnswered
                       ? (((inputs[idx] || '').replace(/['"]/g, '').trim().toLowerCase() === ans) ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.1)]' : 'border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)]')
                       : 'border-[var(--border)] focus:border-[var(--accent-blue)]'
                     }`}
                     placeholder="..."
                   />
                </div>
              ))}
            </div>

            {!isAnswered && (
              <button
                type="submit"
                className="w-full rounded-xl bg-[var(--accent-blue)] py-4 text-lg font-bold text-white hover:opacity-90 transition-opacity"
              >
                Check Answer
              </button>
            )}
          </form>

          {isAnswered && (
            <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="rounded-xl p-6 bg-[rgba(255,255,255,0.02)] border border-[var(--border)] mb-6">
                 <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Original Code</h4>
                 {renderWithCode(exercise.originalCode)}
                 <p className="mt-4 text-[var(--text-muted)] leading-relaxed">
                   {exercise.explanation}
                 </p>
              </div>
              
              <button
                onClick={handleNext}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-green)] py-4 text-xl font-bold text-black hover:opacity-90 transition-opacity"
              >
                {currentIndex < exercises.length - 1 ? 'Next Exercise' : 'Finish Session'}
                <ArrowRight size={24} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}