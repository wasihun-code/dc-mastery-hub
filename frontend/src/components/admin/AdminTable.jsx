import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export default function AdminTable({ columns, rows, onRowClick, selectable, emptyMessage }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
            {columns.map(col => (
              <th
                key={col.key}
                onClick={col.sortable !== false && !col.render ? () => handleSort(col.key) : undefined}
                className={`px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap ${col.sortable !== false && !col.render ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--text-muted)] text-sm">
                {emptyMessage || 'No data found'}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-[var(--border)] transition-colors last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-primary)]' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-[var(--text-primary)]">
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
