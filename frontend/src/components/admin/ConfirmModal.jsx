import React, { useEffect, useRef, useState } from 'react'

export default function ConfirmModal({
  isOpen, title, message, confirmLabel, confirmDanger,
  onConfirm, onCancel, children
}) {
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!isOpen) { setPending(false); return }
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  async function handleConfirm() {
    setPending(true)
    try { await onConfirm() } finally { setPending(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl sm:animate-in sm:fade-in sm:zoom-in-95 animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 sm:mb-2">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onCancel} className="sm:hidden text-[var(--text-muted)] p-1 cursor-pointer bg-transparent border-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="sm:hidden w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-3" />
        {message && <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">{message}</p>}
        {children}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-lg text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60 ${
              confirmDanger ? 'bg-red-600 hover:bg-red-500' : 'bg-[var(--accent-green)] text-black hover:brightness-110'
            }`}
          >
            {pending && (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
