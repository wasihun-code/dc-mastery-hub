import React from 'react'

export default function StatusBadge({ status, variant }) {
  let colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  if (variant === 'green' || status === 'Completed' || status === 'Yes' || status === true || status === 1) {
    colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  } else if (variant === 'red' || status === 'No' || status === false || status === 0) {
    colorClass = 'bg-red-500/10 text-red-400 border-red-500/20'
  } else if (variant === 'yellow' || status === 'In Progress') {
    colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  } else if (variant === 'purple') {
    colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {status == null ? '—' : String(status)}
    </span>
  )
}
