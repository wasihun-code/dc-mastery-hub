import React from 'react'

export default function DangerZone({ title, description, buttonLabel, onAction, disabled }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-red-400">{title || 'Danger Zone'}</h4>
          {description && <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>}
        </div>
        <button
          onClick={onAction}
          disabled={disabled}
          className="shrink-0 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {buttonLabel || 'Execute'}
        </button>
      </div>
    </div>
  )
}
