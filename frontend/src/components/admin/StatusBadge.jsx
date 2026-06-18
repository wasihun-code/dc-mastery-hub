import React from 'react'

const VARIANT_MAP = {
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  muted: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/20',
}

function resolveVariant(status, variant) {
  if (variant && VARIANT_MAP[variant]) return variant
  if (status === 'Completed' || status === 'Yes' || status === true || status === 1 || status === 'Admin' || status === 'Mastered') return 'green'
  if (status === 'In Progress' || status === 'Intermediate' || status === 'Learning') return 'yellow'
  if (status === 'Not Started' || status === 'No' || status === false || status === 0 || status === 'Deleted') return 'muted'
  if (status === 'Archived' || status === 'Advanced' || status === 'Beginner') return 'blue'
  if (status === 'Admin') return 'purple'
  return 'blue'
}

export default function StatusBadge({ status, variant }) {
  const resolved = resolveVariant(status, variant)
  const colorClass = VARIANT_MAP[resolved] || VARIANT_MAP.muted

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${colorClass}`}>
      {status == null ? '—' : String(status)}
    </span>
  )
}
