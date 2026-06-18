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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h3>
        {message && <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">{message}</p>}
        {children}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60 ${
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
