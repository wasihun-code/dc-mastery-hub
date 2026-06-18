import React from 'react'
import { AlertTriangle } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { useState } from 'react'

export default function DangerZone({ actions = [] }) {
  const [confirmIdx, setConfirmIdx] = useState(null)
  const active = confirmIdx !== null ? actions[confirmIdx] : null

  return (
    <div className="rounded-xl p-4 border-2 border-[var(--accent-red)]" style={{ backgroundColor: 'rgba(239,68,68,0.04)' }}>
      <h4 className="text-sm font-bold text-[var(--accent-red)] mb-3 flex items-center gap-1.5">
        <AlertTriangle size={14} /> Danger Zone
      </h4>
      <div className="space-y-3">
        {actions.map((action, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-2 border-b border-[var(--accent-red)]/15 last:border-0">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{action.label}</p>
              {action.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{action.description}</p>}
            </div>
            <button
              onClick={() => action.requiresConfirm ? setConfirmIdx(idx) : action.onAction()}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-semibold hover:bg-[var(--accent-red)]/10 cursor-pointer transition-all"
            >
              {action.label}
            </button>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!active}
        title={active?.label}
        message={active?.confirmMessage || `Are you sure you want to "${active?.label}"? This cannot be undone.`}
        confirmLabel={active?.label}
        confirmDanger
        onConfirm={() => { active?.onAction(); setConfirmIdx(null) }}
        onCancel={() => setConfirmIdx(null)}
      />
    </div>
  )
}
