import { useState, useEffect, useRef } from 'react'
import { Edit2, Trash2, Keyboard, ChevronDown, Info } from 'lucide-react'

function ShortcutPopover({ items, dotColor, show, onToggle }) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(true)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!show && open) setOpen(false)
  }, [show])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const handleTrigger = () => {
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect()
      setOpenUp(rect ? rect.top > 300 : true)
    }
    setOpen((prev) => !prev)
    if (!open) onToggle?.()
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTrigger}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[var(--text-muted)] border border-[var(--border)] bg-transparent hover:border-[var(--accent-green)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      >
        {dotColor && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <Keyboard size={14} />
        <span className="text-xs font-medium">Shortcuts</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 left-1/2 -translate-x-1/2 min-w-[200px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-lg animate-in fade-in zoom-in-95 duration-150 ${
            openUp ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
          }`}
          style={{ transformOrigin: openUp ? 'bottom center' : 'top center' }}
        >
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4 text-xs">
                <span className="text-[var(--text-muted)] font-medium whitespace-nowrap">
                  {item.label}
                </span>
                <span className="flex items-center gap-0.5">
                  {(Array.isArray(item.keys) ? item.keys : [item.keys]).map((k, j) => (
                    <span key={j}>
                      {j > 0 && <span className="text-[var(--text-muted)] mx-0.5">-</span>}
                      <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded font-mono text-[10px] text-[var(--text-muted)]">
                        {k}
                      </kbd>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExerciseBottomControls({
  onEdit,
  onDelete,
  shortcutItems = [],
  dotColor,
  showShortcuts,
  onToggleShortcuts,
  rightContent,
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-0 sm:gap-4 sm:pt-4"
      style={{ borderTop: '1px solid var(--border)', marginTop: '32px', paddingBottom: '24px', marginBottom: '16px' }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border border-[rgba(96,165,250,0.3)] text-[var(--accent-blue)] bg-[rgba(96,165,250,0.1)] hover:bg-[rgba(96,165,250,0.2)] transition-all cursor-pointer"
        >
          <Edit2 size={12} /> Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border border-[rgba(239,68,68,0.3)] text-[var(--accent-red)] bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] transition-all cursor-pointer"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>

      <div className="sm:flex-1 flex justify-center">
        <ShortcutPopover
          items={shortcutItems}
          dotColor={dotColor}
          show={showShortcuts}
          onToggle={onToggleShortcuts}
        />
      </div>

      {rightContent && (
        <div className="flex items-center gap-2.5 text-sm">
          {rightContent}
        </div>
      )}
    </div>
  )
}
