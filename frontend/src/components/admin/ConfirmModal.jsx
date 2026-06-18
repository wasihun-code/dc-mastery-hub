import React, { useEffect, useRef } from 'react'

export default function ConfirmModal({ isOpen, title, message, confirmLabel, confirmDanger, onConfirm, onCancel, children }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">{message}</p>
        {children}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors cursor-pointer ${
              confirmDanger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-[var(--accent-green)] hover:brightness-110'
            }`}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
