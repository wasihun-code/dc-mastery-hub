import { useEffect, useRef } from 'react'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

export default function AnswerFeedbackModal({
  isOpen,
  isCorrect,
  userAnswer,
  correctAnswer,
  explanation,
  onContinue,
  variant = 'default',
  children,
}) {
  const modalRef = useRef(null)
  const continueBtnRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    continueBtnRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onContinue()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onContinue])

  if (!isOpen) return null

  const accentColor = variant === 'boss-battle' ? 'var(--accent-red)' : 'var(--accent-green)'
  const correctIconColor = variant === 'boss-battle' ? 'var(--accent-red)' : 'var(--accent-green)'
  const correctTextColor = variant === 'boss-battle' ? 'var(--accent-red)' : 'var(--accent-green)'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.6)] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onContinue()
      }}
    >
      <div
        ref={modalRef}
        className="relative w-[90vw] max-w-[560px] max-h-[80vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200"
        style={{
          transformOrigin: 'center',
          animation: 'none',
        }}
      >
        <div className="flex flex-col items-center text-center">
          {isCorrect ? (
            <CheckCircle size={40} color={correctIconColor} />
          ) : (
            <XCircle size={40} color="var(--accent-red)" />
          )}

          <h2
            className="mt-3 text-xl font-bold"
            style={{ color: isCorrect ? correctTextColor : 'var(--accent-red)' }}
          >
            {isCorrect ? 'Correct!' : 'Not Quite'}
          </h2>
        </div>

        {!isCorrect && userAnswer && correctAnswer && (
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="text-[var(--text-muted)]">
              Your answer: <span className="font-semibold text-[var(--text-primary)]">{userAnswer}</span>
            </div>
            <div style={{ color: 'var(--accent-green)' }}>
              Correct answer: <span className="font-semibold">{correctAnswer}</span>
            </div>
          </div>
        )}

        {children}

        {explanation && (
          <>
            <hr className="my-4 border-[var(--border)]" />
            <div className="w-full text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Explanation
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                {explanation}
              </p>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            ref={continueBtnRef}
            onClick={onContinue}
            className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-black transition-colors hover:brightness-110"
            style={{ backgroundColor: accentColor }}
          >
            Next Question
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
