import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, XCircle, Code2, ArrowRight, Lightbulb, RefreshCcw } from 'lucide-react'

export default function FillBlank() {
  const { courseSlug } = useParams()
  const [exercises, setExercises] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [isAnswered, setIsAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(Date.now())

  useEffect(() => {
    fetchConcepts()
  }, [courseSlug])

  const fetchConcepts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses/${courseSlug}/concepts`)
      const concepts = await res.json()
      
      // Filter concepts with code snippets and process them
      const processed = concepts
        .filter(c => c.code_snippet && c.code_snippet.trim().length > 0)
        .map(c => {
          const keyword = identifyKeyword(c)
          if (!keyword) return null
          
          // Create the display parts by splitting at the keyword (case-insensitive)
          const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi')
          const parts = c.code_snippet.split(regex)
          
          return {
            ...c,
            keyword,
            parts
          }
        })
        .filter(Boolean)
      
      setExercises(processed)
      setStartTime(Date.now())
    } catch (err) {
      console.error('Error fetching concepts:', err)
    } finally {
      setLoading(false)
    }
  }

  const identifyKeyword = (concept) => {
    const name = concept.name
    const snippet = concept.code_snippet
    const lowerSnippet = snippet.toLowerCase()
    const lowerName = name.toLowerCase()
    
    // 1. Try exact name match
    if (lowerSnippet.includes(lowerName)) {
      const idx = lowerSnippet.indexOf(lowerName)
      return snippet.substring(idx, idx + name.length)
    }
    
    // 2. Try part after dot (e.g., pd.read_csv -> read_csv)
    if (name.includes('.')) {
      const afterDot = name.split('.').pop()
      if (afterDot.length > 2 && lowerSnippet.includes(afterDot.toLowerCase())) {
        const idx = lowerSnippet.indexOf(afterDot.toLowerCase())
        return snippet.substring(idx, idx + afterDot.length)
      }
    }
    
    // 3. Try name without underscores or common suffixes
    const cleanName = name.replace(/_|-/g, '').toLowerCase()
    // This is getting complex, let's keep it simple for now and just check parts
    const parts = name.split(/[._\s]/).filter(p => p.length > 2)
    for (const part of parts) {
      if (lowerSnippet.includes(part.toLowerCase())) {
        const idx = lowerSnippet.indexOf(part.toLowerCase())
        return snippet.substring(idx, idx + part.length)
      }
    }

    return null
  }

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isAnswered) return

    const exercise = exercises[currentIndex]
    const correct = userInput.trim().toLowerCase() === exercise.keyword.toLowerCase()
    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    
    setIsCorrect(correct)
    setIsAnswered(true)
    if (correct) setScore(prev => prev + 1)

    // Record attempt
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'fillblank',
          course_id: exercise.course_id,
          question_id: exercise.id,
          score: correct ? 100 : 0,
          time_taken_secs: timeTaken,
          was_correct: correct,
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }
  }

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setUserInput('')
      setIsAnswered(false)
      setStartTime(Date.now())
    } else {
      setCurrentIndex(exercises.length)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <Code2 size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Coding Exercises</h2>
        <p className="mt-2 text-[var(--text-muted)]">This course doesn't have any code snippets for "Fill in the Blank" yet.</p>
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
  if (currentIndex >= exercises.length) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12">
          <div className="mx-auto h-20 w-20 rounded-full bg-[rgba(3,239,98,0.1)] flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-[var(--accent-green)]" />
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Challenge Complete!</h2>
          <p className="mt-4 text-xl text-[var(--text-muted)]">
            You got <span className="font-bold text-[var(--text-primary)]">{score}</span> out of <span className="font-bold text-[var(--text-primary)]">{exercises.length}</span> correct.
          </p>
          
          <div className="mt-12 flex flex-col gap-3">
            <button
              onClick={() => {
                setCurrentIndex(0)
                setScore(0)
                setUserInput('')
                setIsAnswered(false)
                setStartTime(Date.now())
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-green)] px-6 py-3 font-bold text-black hover:opacity-90"
            >
              <RefreshCcw size={20} />
              Try Again
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

  const current = exercises[currentIndex]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to={`/courses/${courseSlug}`}
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft size={20} />
          Back to Course
        </Link>
        <div className="text-sm font-medium text-[var(--text-muted)]">
          Exercise {currentIndex + 1} of {exercises.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2 text-[var(--accent-green)] font-bold uppercase tracking-wider text-xs mb-4">
              <Lightbulb size={16} />
              Concept
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{current.name}</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              {current.definition}
            </p>
          </div>
          
          <div className="rounded-xl border border-[var(--border)] bg-[rgba(var(--accent-blue-rgb),0.05)] p-6">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-tight">Instructions</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Fill in the missing part of the code snippet that corresponds to the concept being tested. 
              The check is case-insensitive.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-[var(--border)] bg-[#0d1117] p-8 font-mono text-lg shadow-inner min-h-[200px] flex flex-col justify-center">
              <div className="whitespace-pre-wrap leading-relaxed text-[#c9d1d9]">
                {current.parts.map((part, i) => {
                  if (part.toLowerCase() === current.keyword.toLowerCase()) {
                    return (
                      <input
                        key={i}
                        autoFocus
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        disabled={isAnswered}
                        autoComplete="off"
                        spellCheck="false"
                        className={`mx-1 inline-block border-b-2 bg-transparent px-2 py-0 outline-none transition-all ${
                          isAnswered 
                            ? isCorrect 
                              ? 'border-[var(--accent-green)] text-[var(--accent-green)]' 
                              : 'border-[var(--accent-red)] text-[var(--accent-red)]'
                            : 'border-[var(--text-muted)] text-white focus:border-[var(--accent-green)]'
                        }`}
                        style={{ width: `${Math.max(current.keyword.length, userInput.length, 1)}ch` }}
                      />
                    )
                  }
                  return <span key={i}>{part}</span>
                })}
              </div>
            </div>

            <div className="flex gap-4">
              {!isAnswered ? (
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="flex-1 rounded-xl bg-[var(--accent-green)] py-4 text-xl font-bold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Check Answer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-primary)] py-4 text-xl font-bold hover:opacity-90 transition-opacity"
                >
                  {currentIndex < exercises.length - 1 ? 'Next Exercise' : 'Show Summary'}
                  <ArrowRight size={24} />
                </button>
              )}
            </div>
          </form>

          {isAnswered && !isCorrect && (
            <div className="mt-6 rounded-xl border border-[var(--accent-red)] bg-[rgba(239,68,68,0.05)] p-4 animate-in fade-in slide-in-from-top-2">
               <p className="text-[var(--accent-red)] font-medium">
                 Incorrect. The correct keyword was: <code className="bg-[rgba(239,68,68,0.1)] px-2 py-1 rounded font-bold">{current.keyword}</code>
               </p>
            </div>
          )}
          
          {isAnswered && isCorrect && (
            <div className="mt-6 rounded-xl border border-[var(--accent-green)] bg-[rgba(3,239,98,0.05)] p-4 animate-in fade-in slide-in-from-top-2">
               <p className="text-[var(--accent-green)] font-medium">
                 Well done! You correctly identified the implementation.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
