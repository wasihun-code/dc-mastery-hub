import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, XCircle, Timer, Award, RotateCcw, HelpCircle } from 'lucide-react'
import { renderWithCode } from '../utils/renderWithCode'

export default function MatchingGame() {
  const { courseSlug } = useParams()
  const [concepts, setConcepts] = useState([])
  const [terms, setTerms] = useState([])
  const [definitions, setDefinitions] = useState([])
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [selectedDef, setSelectedDef] = useState(null)
  const [matches, setMatches] = useState([])
  const [wrongMatch, setWrongMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [courseId, setCourseId] = useState(null)

  useEffect(() => {
    fetchConcepts()
  }, [courseSlug])

  useEffect(() => {
    let timer
    if (startTime && !gameComplete) {
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [startTime, gameComplete])

  const fetchConcepts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses/${courseSlug}/concepts`)
      const data = await res.json()
      
      if (data && data.length > 0) {
        setCourseId(data[0].course_id)
        // Pick 6 random concepts
        const shuffled = [...data].sort(() => 0.5 - Math.random())
        const selected = shuffled.slice(0, 6)
        
        setConcepts(selected)
        setTerms(selected.map(c => ({ id: c.id, text: c.name })).sort(() => 0.5 - Math.random()))
        setDefinitions(selected.map(c => ({ id: c.id, text: c.definition })).sort(() => 0.5 - Math.random()))
        setStartTime(Date.now())
      }
    } catch (err) {
      console.error('Error fetching concepts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTermClick = (term) => {
    if (gameComplete || matches.includes(term.id)) return
    setSelectedTerm(term)
    if (selectedDef) {
      checkMatch(term.id, selectedDef.id)
    }
  }

  const handleDefClick = (def) => {
    if (gameComplete || matches.includes(def.id)) return
    setSelectedDef(def)
    if (selectedTerm) {
      checkMatch(selectedTerm.id, def.id)
    }
  }

  const checkMatch = async (termId, defId) => {
    if (termId === defId) {
      const newMatches = [...matches, termId]
      setMatches(newMatches)
      setSelectedTerm(null)
      setSelectedDef(null)
      
      if (newMatches.length === concepts.length) {
        setGameComplete(true)
        await recordAttempt(true)
      }
    } else {
      setWrongMatch({ termId, defId })
      setTimeout(() => {
        setWrongMatch(null)
        setSelectedTerm(null)
        setSelectedDef(null)
      }, 1000)
    }
  }

  const recordAttempt = async (isWin) => {
    try {
      const accuracy = Math.round((concepts.length / (concepts.length + (wrongMatch ? 1 : 0))) * 100) // Simple accuracy
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'matching',
          course_id: courseId,
          score: isWin ? 100 : 0,
          time_taken_secs: timeElapsed,
          was_correct: isWin ? 1 : 0,
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (concepts.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <HelpCircle size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Not Enough Concepts</h2>
        <p className="mt-2 text-[var(--text-muted)]">This course needs at least 6 concepts for the matching game.</p>
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

  if (gameComplete) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem 1rem' }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12">
            <Award size={64} className="mx-auto text-[var(--accent-yellow)] mb-6" />
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Course Mastered!</h2>
            <p className="mt-2 text-[var(--text-muted)]">You matched all concepts correctly.</p>
            
            <div className="mt-8 grid grid-cols-2 gap-8">
              <div className="rounded-lg bg-[var(--bg-primary)] p-4">
                <div className="text-3xl font-bold text-[var(--accent-green)]">{concepts.length}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Matches Found</div>
              </div>
              <div className="rounded-lg bg-[var(--bg-primary)] p-4">
                <div className="text-3xl font-bold text-[var(--text-primary)]">{formatTime(timeElapsed)}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Total Time</div>
              </div>
            </div>
            
            <div className="mt-12 flex flex-col gap-3">
              <button
                onClick={() => {
                  setMatches([])
                  setGameComplete(false)
                  setTimeElapsed(0)
                  fetchConcepts()
                }}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-green)] px-6 py-3 font-bold text-black hover:opacity-90"
              >
                <RotateCcw size={20} />
                Play Again
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
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={`/courses/${courseSlug}`}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft size={20} />
            Quit Game
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              <Timer size={16} />
              {formatTime(timeElapsed)}
            </div>
            <div className="text-sm font-medium text-[var(--text-muted)]">
              {matches.length} / {concepts.length} Matches
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Terms Column */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Terms</h3>
            {terms.map((term) => {
              const isMatched = matches.includes(term.id)
              const isSelected = selectedTerm?.id === term.id
              const isWrong = wrongMatch?.termId === term.id

              return (
                <button
                  key={`term-${term.id}`}
                  disabled={isMatched || !!wrongMatch}
                  onClick={() => handleTermClick(term)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isMatched 
                      ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.1)] opacity-50' 
                      : isWrong
                      ? 'border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)] animate-shake'
                      : isSelected
                      ? 'border-[var(--accent-blue)] bg-[rgba(59,130,246,0.1)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <span className="font-bold">{renderWithCode(term.text)}</span>
                </button>
              )
            })}
          </div>

          {/* Definitions Column */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Definitions</h3>
            {definitions.map((def) => {
              const isMatched = matches.includes(def.id)
              const isSelected = selectedDef?.id === def.id
              const isWrong = wrongMatch?.defId === def.id

              return (
                <button
                  key={`def-${def.id}`}
                  disabled={isMatched || !!wrongMatch}
                  onClick={() => handleDefClick(def)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isMatched 
                      ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.1)] opacity-50' 
                      : isWrong
                      ? 'border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)] animate-shake'
                      : isSelected
                      ? 'border-[var(--accent-blue)] bg-[rgba(59,130,246,0.1)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <div className="text-sm leading-relaxed">{renderWithCode(def.text)}</div>
                </button>
              )
            })}
          </div>
        </div>
        
        {matches.length > 0 && matches.length < concepts.length && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2 text-[var(--accent-green)] font-medium animate-pulse">
              <CheckCircle2 size={20} />
              {matches.length} matches found! Keep going!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
