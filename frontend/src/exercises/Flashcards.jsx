import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, RotateCcw, CheckCircle2, XCircle, ArrowRight, Brain } from 'lucide-react'

export default function Flashcards() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const [startTime, setStartTime] = useState(Date.now())

  useEffect(() => {
    fetchCards()
  }, [courseSlug])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses/${courseSlug}/flashcards/due`)
      const data = await res.json()
      setCards(data)
    } catch (err) {
      console.error('Error fetching flashcards:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleRate = async (wasCorrect) => {
    const card = cards[currentIndex]
    const timeTaken = Math.round((Date.now() - startTime) / 1000)

    // Record attempt
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'flashcard',
          course_id: card.course_id,
          question_id: card.id,
          score: wasCorrect ? 100 : 0,
          time_taken_secs: timeTaken,
          was_correct: wasCorrect,
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }

    setResults([...results, { ...card, wasCorrect }])
    
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
      setStartTime(Date.now())
    } else {
      setCurrentIndex(cards.length) // End state
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-full bg-[var(--bg-card)] p-6">
          <Brain size={48} className="text-[var(--accent-green)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">All Caught Up!</h2>
        <p className="mt-2 text-[var(--text-muted)]">No flashcards due for review in this course.</p>
        <Link
          to={`/courses/${courseSlug}`}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--bg-card)] px-6 py-2 border border-[var(--border)] hover:bg-[var(--bg-primary)] transition-colors"
        >
          <ChevronLeft size={20} />
          Back to Course
        </Link>
      </div>
    )
  }

  // Summary screen
  if (currentIndex >= cards.length) {
    const correctCount = results.filter(r => r.wasCorrect).length
    const percentage = Math.round((correctCount / cards.length) * 100)

    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Session Complete!</h2>
          <div className="mt-8 flex justify-center gap-12">
            <div>
              <div className="text-4xl font-bold text-[var(--accent-green)]">{correctCount}</div>
              <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider mt-1">Correct</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[var(--accent-red)]">{cards.length - correctCount}</div>
              <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider mt-1">Incorrect</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[var(--accent-blue)]">{percentage}%</div>
              <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider mt-1">Accuracy</div>
            </div>
          </div>
          
          <div className="mt-12 flex flex-col gap-3">
            <button
              onClick={() => {
                setCurrentIndex(0)
                setResults([])
                setIsFlipped(false)
                setStartTime(Date.now())
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-green)] px-6 py-3 font-bold text-black hover:opacity-90 transition-opacity"
            >
              <RotateCcw size={20} />
              Review Again
            </button>
            <Link
              to={`/courses/${courseSlug}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-6 py-3 font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              Return to Course
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex) / cards.length) * 100

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <Link
          to={`/courses/${courseSlug}`}
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft size={20} />
          Back to Course
        </Link>
        <div className="text-sm font-medium text-[var(--text-muted)]">
          Card {currentIndex + 1} of {cards.length}
        </div>
      </div>

      <div className="mb-12 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-card)]">
        <div
          className="h-full bg-[var(--accent-green)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div 
        className="perspective-1000 relative h-96 w-full cursor-pointer"
        onClick={handleFlip}
      >
        <div 
          className={`duration-500 preserve-3d relative h-full w-full transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="backface-hidden absolute flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] p-12 text-center shadow-xl">
            <div className="text-sm font-bold uppercase tracking-widest text-[var(--accent-green)] mb-6">Question</div>
            <h3 className="text-3xl font-medium leading-tight text-[var(--text-primary)]">
              {currentCard.front}
            </h3>
            <div className="mt-12 text-[var(--text-muted)] flex items-center gap-2">
              <Brain size={16} />
              Click to flip
            </div>
          </div>

          {/* Back */}
          <div className="backface-hidden rotate-y-180 absolute flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-[var(--accent-green)] bg-[var(--bg-card)] p-12 text-center shadow-xl">
            <div className="text-sm font-bold uppercase tracking-widest text-[var(--accent-green)] mb-6">Answer</div>
            <p className="text-2xl leading-relaxed text-[var(--text-primary)]">
              {currentCard.back}
            </p>
          </div>
        </div>
      </div>

      <div className={`mt-12 flex justify-center gap-6 transition-all duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); handleRate(false); }}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[var(--accent-red)] bg-[var(--bg-card)] py-4 text-xl font-bold text-[var(--accent-red)] hover:bg-[var(--accent-red)] hover:text-white transition-all shadow-lg"
        >
          <XCircle size={28} />
          Incorrect
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleRate(true); }}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[var(--accent-green)] bg-[var(--bg-card)] py-4 text-xl font-bold text-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-black transition-all shadow-lg"
        >
          <CheckCircle2 size={28} />
          Correct
        </button>
      </div>
      
      {!isFlipped && (
        <div className="mt-12 text-center">
            <button 
                onClick={handleFlip}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-8 py-3 font-bold hover:bg-[var(--bg-primary)] transition-colors"
            >
                Flip Card <ArrowRight size={20} />
            </button>
        </div>
      )}
    </div>
  )
}
