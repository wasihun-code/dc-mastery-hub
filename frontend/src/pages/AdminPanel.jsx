import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, BookOpen, Users, ShieldAlert, Settings, Wrench,
  RotateCcw, Trash2, Plus, ChevronDown, ChevronUp, GripVertical, Shield,
  UserX, Sun, Moon, LogOut, ExternalLink, Search, AlertTriangle, ArrowRight,
  X, Edit2, ChevronRight, BarChart2, FileText, RefreshCw, CheckCircle,
  XCircle, Download, Upload, Terminal, Database, HardDrive, Activity,
  UserPlus, Eye, EyeOff, Archive, ArchiveRestore, Move, Layers
} from 'lucide-react'
import ConfirmModal from '../components/admin/ConfirmModal'
import StatusBadge from '../components/admin/StatusBadge'

/* ─────────────────────────────────────────────
   SIDEBAR NAV SECTIONS
───────────────────────────────────────────── */
const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'OVERVIEW' },
  { key: 'tracks', label: 'Tracks', icon: Map, group: 'CONTENT' },
  { key: 'courses', label: 'Courses', icon: BookOpen, group: 'CONTENT' },
  { key: 'exercises', label: 'Exercises', icon: Wrench, group: 'CONTENT' },
  { key: 'users', label: 'User Management', icon: Users, group: 'USERS' },
  { key: 'reset', label: 'Reset Tools', icon: ShieldAlert, group: 'DATABASE' },
  { key: 'system', label: 'System Stats', icon: Settings, group: 'SYSTEM' },
]

/* ─────────────────────────────────────────────
   SMALL REUSABLE COMPONENTS
───────────────────────────────────────────── */
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [message, onClose])
  if (!message) return null
  const colours = { info: 'bg-blue-500/10 text-blue-400 border-blue-500/20', success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', error: 'bg-red-500/10 text-red-400 border-red-500/20' }
  return (
    <div className={`fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-xl text-sm font-medium ${colours[type] || colours.info}`}>
      {message}
      <button onClick={onClose} className="ml-2 cursor-pointer opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

function Spinner({ size = 16 }) {
  return <div style={{ width: size, height: size }} className="border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin shrink-0" />
}

function SectionCard({ children, className = '' }) {
  return <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 ${className}`}>{children}</div>
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function DifficultyBadge({ difficulty }) {
  const dots = { Easy: 'var(--accent-green)', Medium: 'var(--accent-yellow)', Hard: 'var(--accent-red)', Unknown: 'var(--text-muted)' }
  const texts = { Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400', Unknown: 'text-zinc-400' }
  const key = difficulty || 'Unknown'
  return (
    <span className={`flex items-center gap-1 text-[11px] font-semibold ${texts[key] || texts.Unknown}`}>
      <span style={{ color: dots[key] || dots.Unknown, fontSize: 8 }}>●</span>
      {key}
    </span>
  )
}

function MasteryBar({ value }) {
  const pct = Math.round(value || 0)
  const color = pct >= 90 ? 'var(--accent-green)' : pct >= 70 ? 'var(--accent-blue)' : pct >= 40 ? 'var(--accent-yellow)' : pct > 0 ? 'var(--accent-red)' : 'var(--text-muted)'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  )
}

function IconBtn({ icon: Icon, label, onClick, danger, disabled, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/15'
          : 'border-[var(--border)] text-[var(--text-muted)] bg-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
      } ${small ? 'px-1.5 py-0.5' : ''}`}
    >
      {Icon && <Icon size={12} />}
      {label && <span>{label}</span>}
    </button>
  )
}

/* ─────────────────────────────────────────────
   2B — DASHBOARD SECTION
───────────────────────────────────────────── */
function DashboardSection({ stats, onMessage }) {
  const [loading, setLoading] = useState(false)
  const [sysStats, setSysStats] = useState(null)

  useEffect(() => {
    fetch('/api/admin/system/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSysStats(d))
      .catch(() => {})
  }, [])

  if (!stats) return <div className="animate-pulse h-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />

  const cards = [
    { label: 'Total Users',     value: stats.users,                           icon: Users,    accent: 'var(--accent-blue)' },
    { label: 'Total Courses',   value: stats.courses,                          icon: BookOpen, accent: 'var(--accent-green)' },
    { label: 'Total Tracks',    value: stats.tracks,                           icon: Map,      accent: 'var(--accent-yellow)' },
    { label: 'Total Attempts',  value: stats.exercise_attempts?.toLocaleString(), icon: Activity, accent: 'var(--accent-blue)' },
    { label: 'Total Concepts',  value: stats.concepts?.toLocaleString(),       icon: Layers,   accent: 'var(--text-muted)' },
    { label: 'Total Flashcards',value: stats.flashcards?.toLocaleString(),     icon: FileText, accent: 'var(--accent-green)' },
    { label: 'DB Size',         value: sysStats ? `${sysStats.db_size_mb} MB` : '…', icon: Database, accent: 'var(--text-muted)' },
    { label: 'Content Size',    value: sysStats ? `${sysStats.content_size_mb} MB` : '…', icon: HardDrive, accent: 'var(--text-muted)' },
    { label: 'Uptime',          value: sysStats ? `${Math.floor(sysStats.uptime_seconds / 60)}m` : '…', icon: RefreshCw, accent: 'var(--accent-green)' },
  ]

  async function handleReimport() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/system/reimport-all', { method: 'POST' })
      const d = await res.json()
      onMessage(d.success ? 'All exercises re-imported' : `Error: ${d.error}`, d.success ? 'success' : 'error')
    } catch (e) { onMessage('Re-import failed', 'error') } finally { setLoading(false) }
  }

  return (
    <div>
      <SectionHeader title="Dashboard Overview" subtitle="Live system statistics" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              style={{'--card-accent': card.accent}}
              onMouseEnter={e => e.currentTarget.style.borderColor = `color-mix(in srgb, ${card.accent} 30%, var(--border))`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div
                className="flex items-center justify-center rounded-lg mb-3"
                style={{
                  width: 32, height: 32,
                  background: `color-mix(in srgb, ${card.accent} 14%, transparent)`,
                }}
              >
                <Icon size={16} style={{ color: card.accent }} />
              </div>
              <div className="text-[26px] font-bold text-[var(--text-primary)] leading-none mt-3">{card.value ?? '—'}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.05em] font-semibold">{card.label}</span>
              </div>
            </div>
          )
        })}
      </div>
      <SectionCard className="!p-4">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Activity size={15} className="text-[var(--accent-green)]" /> Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleReimport} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-green)] text-black text-[13px] font-semibold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer">
            {loading ? <Spinner size={13} /> : <Upload size={13} />}
            Re-import All Exercises
          </button>
          <button onClick={() => window.open('/api/admin/system/logs', '_blank')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] text-[13px] font-medium hover:border-[var(--accent-blue)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
            <Terminal size={13} /> View System Logs
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

/* ─────────────────────────────────────────────
   2C — TRACKS SECTION
───────────────────────────────────────────── */
function TracksSection({ tracks, allCourses, onRefresh, onMessage }) {
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTrack, setNewTrack] = useState({ name: '', slug: '', language: 'Python', color: '#03ef62', description: '' })
  const [editData, setEditData] = useState({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [addCourseId, setAddCourseId] = useState('')
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  const selectedTrack = tracks?.find(t => t.id === selected)

  async function handleAddTrack() {
    if (!newTrack.name || !newTrack.slug) return
    setSaving(true)
    try {
      const res = await fetch('/api/manage/track/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTrack) })
      const d = await res.json()
      if (res.ok) { onMessage('Track created', 'success'); setShowAdd(false); setNewTrack({ name: '', slug: '', language: 'Python', color: '#03ef62', description: '' }); onRefresh() }
      else onMessage(`Error: ${d.error}`, 'error')
    } catch (e) { onMessage('Failed to create track', 'error') } finally { setSaving(false) }
  }

  async function handleSaveTrack() {
    if (!selectedTrack) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/tracks/${selectedTrack.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) })
      if (res.ok) { onMessage('Track updated', 'success'); setEditing(false); onRefresh() }
      else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    } catch (e) { onMessage('Failed to update track', 'error') } finally { setSaving(false) }
  }

  async function handleArchive() {
    const res = await fetch(`/api/admin/tracks/${selectedTrack.id}/archive`, { method: 'POST' })
    if (res.ok) { onMessage('Track archived', 'success'); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/tracks/${selectedTrack.id}`, { method: 'DELETE' })
    if (res.ok) { onMessage('Track deleted', 'success'); setSelected(null); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleRestore() {
    const res = await fetch(`/api/admin/tracks/${selectedTrack.id}/restore`, { method: 'POST' })
    if (res.ok) { onMessage('Track restored', 'success'); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
  }

  async function handleRemoveCourse(courseId) {
    const res = await fetch(`/api/admin/courses/${courseId}/remove-from-track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track_id: selectedTrack.id }) })
    if (res.ok) { onMessage('Course removed from track', 'success'); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
  }

  async function handleAddCourseToTrack() {
    if (!addCourseId) return
    const res = await fetch(`/api/admin/courses/${addCourseId}/add-to-track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track_id: selectedTrack.id }) })
    if (res.ok) { onMessage('Course added to track', 'success'); setAddCourseId(''); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
  }

  async function handleDropReorder(toIdx) {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return }
    const courseIds = [...(selectedTrack?.courses || [])].map(c => c.id)
    const [moved] = courseIds.splice(dragIdx, 1)
    courseIds.splice(toIdx, 0, moved)
    setDragIdx(null); setDragOverIdx(null)
    const res = await fetch('/api/admin/tracks/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackId: selectedTrack.id, courseIds }) })
    if (res.ok) { onMessage('Order saved', 'success'); onRefresh() }
    else onMessage('Failed to reorder', 'error')
  }

  const coursesNotInTrack = (allCourses || []).filter(c => !(selectedTrack?.courses || []).some(tc => tc.id === c.id))

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 600 }}>
      {/* LEFT — track list */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold hover:brightness-110 transition-all cursor-pointer">
          <Plus size={15} /> Add New Track
        </button>

        {showAdd && (
          <SectionCard>
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3 uppercase tracking-wider">New Track</h4>
            <div className="space-y-2">
              {[['Name', 'name', 'text'], ['Slug (unique)', 'slug', 'text'], ['Language', 'language', 'text']].map(([ph, key, type]) => (
                <input key={key} type={type} value={newTrack[key]} onChange={e => setNewTrack({ ...newTrack, [key]: e.target.value })}
                  placeholder={ph} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
              ))}
              <div className="flex items-center gap-2">
                <input type="color" value={newTrack.color} onChange={e => setNewTrack({ ...newTrack, color: e.target.value })} className="h-9 w-9 rounded cursor-pointer shrink-0" />
                <input value={newTrack.description} onChange={e => setNewTrack({ ...newTrack, description: e.target.value })} placeholder="Description (optional)"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddTrack} disabled={saving || !newTrack.name || !newTrack.slug}
                  className="flex-1 py-2 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold disabled:opacity-50 cursor-pointer">
                  {saving ? 'Creating…' : 'Create Track'}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm cursor-pointer">✕</button>
              </div>
            </div>
          </SectionCard>
        )}

        <div className="space-y-2 overflow-y-auto flex-1">
          {(!tracks || tracks.length === 0) && <div className="text-center py-8 text-[var(--text-muted)] text-sm">No tracks found</div>}
          {tracks?.map(track => (
            <button key={track.id} onClick={() => { setSelected(track.id); setEditing(false); setEditData({}) }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${selected === track.id ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.06)]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-primary)]'} ${track.is_archived ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: track.color || 'var(--accent-green)' }} />
                <span className={`text-sm font-semibold text-[var(--text-primary)] truncate ${track.is_archived ? 'line-through' : ''}`}>{track.name}</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[10px] text-[var(--text-muted)] font-mono">{track.language}</span>
                <span className="text-[10px] text-[var(--text-muted)]">·</span>
                <span className="text-[10px] text-[var(--text-muted)]">{track.course_count} courses</span>
                {track.is_archived && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">ARCHIVED</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT — track detail */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTrack ? (
          <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border)] rounded-xl">
            Select a track to manage
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedTrack.color }} />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedTrack.name}</h3>
                <span className="text-xs text-[var(--text-muted)] font-mono">/{selectedTrack.slug}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-[var(--text-muted)]">{selectedTrack.language}</span>
              </div>
              {selectedTrack.is_archived && (
                <button onClick={handleRestore} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer font-semibold flex items-center gap-1">
                  <ArchiveRestore size={12} /> Restore
                </button>
              )}
            </div>

            {/* PROPERTIES card */}
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Properties</h4>
                {!editing ? (
                  <button onClick={() => { setEditing(true); setEditData({ name: selectedTrack.name, description: selectedTrack.description || '', color: selectedTrack.color || '#03ef62', language: selectedTrack.language || 'Python' }) }}
                    className="text-xs text-[var(--accent-green)] hover:underline cursor-pointer flex items-center gap-1">
                    <Edit2 size={11} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveTrack} disabled={saving} className="text-xs px-3 py-1 rounded-lg bg-[var(--accent-green)] text-black font-bold cursor-pointer disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditing(false)} className="text-xs px-3 py-1 rounded-lg border border-[var(--border)] cursor-pointer">Cancel</button>
                  </div>
                )}
              </div>
              {!editing ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-[var(--text-muted)] text-xs">Name</span><p className="text-[var(--text-primary)] font-medium">{selectedTrack.name}</p></div>
                  <div><span className="text-[var(--text-muted)] text-xs">Slug</span><p className="text-[var(--text-primary)] font-mono text-xs">{selectedTrack.slug}</p></div>
                  <div><span className="text-[var(--text-muted)] text-xs">Language</span><p className="text-[var(--text-primary)]">{selectedTrack.language}</p></div>
                  <div><span className="text-[var(--text-muted)] text-xs">Color</span>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: selectedTrack.color }} /><span className="text-xs font-mono text-[var(--text-muted)]">{selectedTrack.color}</span></div>
                  </div>
                  {selectedTrack.description && <div className="col-span-2"><span className="text-[var(--text-muted)] text-xs">Description</span><p className="text-[var(--text-primary)]">{selectedTrack.description}</p></div>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <input value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="Name"
                    className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
                  <input value={editData.language || ''} onChange={e => setEditData({ ...editData, language: e.target.value })} placeholder="Language"
                    className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
                  <div className="flex items-center gap-2 col-span-2">
                    <input type="color" value={editData.color || '#03ef62'} onChange={e => setEditData({ ...editData, color: e.target.value })} className="h-9 w-9 rounded cursor-pointer shrink-0" />
                    <input value={editData.description || ''} onChange={e => setEditData({ ...editData, description: e.target.value })} placeholder="Description"
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
                  </div>
                </div>
              )}
            </SectionCard>

            {/* COURSES IN TRACK */}
            <SectionCard>
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Courses in Track ({selectedTrack.courses?.length || 0})
              </h4>
              {(!selectedTrack.courses || selectedTrack.courses.length === 0) ? (
                <div className="text-xs text-[var(--text-muted)] py-3">No courses linked to this track</div>
              ) : (
                <div className="space-y-1 mb-4">
                  {selectedTrack.courses.map((course, idx) => (
                    <div key={course.id}
                      draggable onDragStart={() => setDragIdx(idx)} onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }} onDrop={() => handleDropReorder(idx)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${dragOverIdx === idx ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.04)]' : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-primary)]'}`}>
                      <GripVertical size={14} className="text-[var(--text-muted)] cursor-grab shrink-0" />
                      <span className="text-[10px] text-[var(--text-muted)] font-mono w-5">#{course.order_in_track}</span>
                      <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{course.name}</span>
                      <DifficultyBadge difficulty={course.difficulty} />
                      <button onClick={() => handleRemoveCourse(course.id)} className="text-red-400/60 hover:text-red-400 cursor-pointer shrink-0 p-0.5 rounded">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2 font-semibold">Add Existing Course to Track</p>
                <div className="flex gap-2">
                  <select value={addCourseId} onChange={e => setAddCourseId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm">
                    <option value="">Select course…</option>
                    {coursesNotInTrack.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={handleAddCourseToTrack} disabled={!addCourseId}
                    className="px-4 py-2 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold disabled:opacity-40 cursor-pointer hover:brightness-110">Add</button>
                </div>
              </div>
            </SectionCard>

            {/* DANGER ZONE */}
            <div className="rounded-xl p-4 border-2 border-[var(--accent-red)]" style={{ backgroundColor: 'rgba(239,68,68,0.03)' }}>
              <h4 className="text-sm font-bold text-[var(--accent-red)] mb-3 flex items-center gap-1.5"><AlertTriangle size={14} /> Danger Zone</h4>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => setConfirmAction('archive')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-semibold hover:bg-[var(--accent-red)]/10 cursor-pointer transition-all">
                  <Archive size={13} /> {selectedTrack.is_archived ? 'Re-archive' : 'Archive Track'}
                </button>
                <button onClick={() => setConfirmAction('delete')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent-red)] text-white text-xs font-bold hover:opacity-90 cursor-pointer transition-all">
                  <Trash2 size={13} /> Delete Track Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal isOpen={confirmAction === 'archive'} title="Archive Track"
        message={`Archive "${selectedTrack?.name}"? It will be hidden from students. You can restore it later.`}
        confirmLabel="Archive" confirmDanger onConfirm={handleArchive} onCancel={() => setConfirmAction(null)} />
      <ConfirmModal isOpen={confirmAction === 'delete'} title="Delete Track Permanently"
        message={`This will permanently delete "${selectedTrack?.name}". Courses in this track will NOT be deleted, only removed from the track. This cannot be undone.`}
        confirmLabel="Delete Forever" confirmDanger onConfirm={handleDelete} onCancel={() => setConfirmAction(null)} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   2D — COURSES SECTION
───────────────────────────────────────────── */
function CoursesSection({ courses, tracks, onRefresh, onMessage }) {
  const [search, setSearch] = useState('')
  const [filterTrack, setFilterTrack] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterExercises, setFilterExercises] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [drawerCourse, setDrawerCourse] = useState(null)
  const [drawerTab, setDrawerTab] = useState('properties')
  const [exerciseSummary, setExerciseSummary] = useState(null)
  const [loadingEx, setLoadingEx] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)

  const filtered = (courses || []).filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.slug.toLowerCase().includes(search.toLowerCase())) return false
    if (filterTrack && !c.tracks?.some(t => String(t.id) === filterTrack)) return false
    if (filterStatus === 'deleted' && !c.is_deleted) return false
    if (filterStatus === 'archived' && !c.is_archived) return false
    if (filterStatus === 'active' && (c.is_deleted || c.is_archived)) return false
    if (filterExercises === 'yes' && !c.has_exercises) return false
    if (filterExercises === 'no' && c.has_exercises) return false
    return true
  })

  function openDrawer(course) {
    setDrawerCourse(course)
    setDrawerTab('properties')
    setEditData({ name: course.name, slug: course.slug, difficulty: course.difficulty, status: course.status, reviewed: course.reviewed })
    setExerciseSummary(null)
  }

  useEffect(() => {
    if (!drawerCourse) return
    if (drawerTab === 'exercises' && !exerciseSummary) {
      setLoadingEx(true)
      fetch(`/api/admin/courses/${drawerCourse.id}/exercises/summary`)
        .then(r => r.ok ? r.json() : null).then(d => setExerciseSummary(d)).catch(() => {}).finally(() => setLoadingEx(false))
    }
  }, [drawerTab, drawerCourse])

  async function saveCourse() {
    if (!drawerCourse) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/courses/${drawerCourse.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) })
      if (res.ok) { onMessage('Course saved', 'success'); onRefresh() }
      else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    } catch (e) { onMessage('Save failed', 'error') } finally { setSaving(false) }
  }

  async function handleClearExercises() {
    const res = await fetch(`/api/admin/courses/${drawerCourse.id}/clear-exercises`, { method: 'POST' })
    if (res.ok) { onMessage('Exercises cleared', 'success'); setExerciseSummary(null); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleDeleteCourse() {
    const res = await fetch(`/api/admin/courses/${drawerCourse.id}`, { method: 'DELETE' })
    if (res.ok) { onMessage('Course deleted', 'success'); setDrawerCourse(null); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleReimport() {
    setLoadingEx(true)
    const res = await fetch(`/api/admin/courses/${drawerCourse.id}/exercises/reimport`, { method: 'POST' })
    const d = await res.json()
    if (res.ok) { onMessage('Exercises re-imported', 'success'); setExerciseSummary(null) }
    else onMessage(`Error: ${d.error}`, 'error')
    setLoadingEx(false)
    fetch(`/api/admin/courses/${drawerCourse.id}/exercises/summary`).then(r => r.ok ? r.json() : null).then(d => setExerciseSummary(d)).catch(() => {})
  }

  async function handleResetCourse() {
    const res = await fetch(`/api/admin/reset/course/${drawerCourse.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
    if (res.ok) { onMessage('Course progress reset', 'success') }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleRemoveFromTrack(trackId) {
    const res = await fetch(`/api/admin/courses/${drawerCourse.id}/remove-from-track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track_id: trackId }) })
    if (res.ok) { onMessage('Removed from track', 'success'); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
  }

  function toggleSelect(id) {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="relative">
      <SectionHeader title="All Courses" subtitle={`${filtered.length} of ${(courses || []).length} courses shown`} />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm" />
        </div>
        <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm">
          <option value="">All Tracks</option>
          {tracks?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="deleted">Deleted</option>
        </select>
        <select value={filterExercises} onChange={e => setFilterExercises(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm">
          <option value="">Any Exercises</option>
          <option value="yes">Has Exercises</option>
          <option value="no">No Exercises</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-green)]/30">
          <span className="text-sm text-[var(--text-muted)]">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button className="text-xs px-3 py-1.5 rounded border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 cursor-pointer">Clear Exercises</button>
          <button className="text-xs px-3 py-1.5 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 cursor-pointer">Reset Progress</button>
          <button className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-500 cursor-pointer">Delete Selected</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-primary)]" style={{ borderBottom: '1.5px solid var(--border)' }}>
              <th className="px-3 py-3 w-8"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())} className="cursor-pointer" style={{ accentColor: 'var(--accent-green)' }} /></th>
              {['Course Name', 'Track(s)', 'Difficulty', 'Students', 'Avg Mastery', 'Exercises', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.05em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--text-muted)]">No courses match your filters</td></tr>
            )}
            {filtered.map((course, idx) => (
              <tr
                key={course.id}
                onClick={() => openDrawer(course)}
                className="cursor-pointer transition-colors duration-100"
                style={{
                  borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg-card) 50%, var(--bg-primary))' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--bg-card) 80%, var(--bg-primary))'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'color-mix(in srgb, var(--bg-card) 50%, var(--bg-primary))' : 'transparent'}
              >
                <td className="px-3 py-[14px]" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(course.id)} onChange={() => toggleSelect(course.id)} className="cursor-pointer" style={{ accentColor: 'var(--accent-green)' }} />
                </td>
                <td className="px-3 py-[14px]">
                  <div className="font-semibold text-[14px] text-[var(--text-primary)] truncate max-w-[200px]">{course.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">{course.slug}</div>
                </td>
                <td className="px-3 py-[14px]">
                  <div className="flex flex-wrap gap-1">
                    {course.tracks?.slice(0, 2).map(t => (
                      <span key={t.id} className="text-[10px] text-[var(--text-muted)] font-medium" style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>{t.name}</span>
                    ))}
                    {course.tracks?.length > 2 && <span className="text-[10px] text-[var(--text-muted)]">+{course.tracks.length - 2}</span>}
                  </div>
                </td>
                <td className="px-3 py-[14px]"><DifficultyBadge difficulty={course.difficulty} /></td>
                <td className="px-3 py-[14px]">
                  <span className={`text-sm font-${course.student_count > 0 ? 'bold text-[var(--text-primary)]' : 'normal text-[var(--text-muted)]'}`}>{course.student_count}</span>
                </td>
                <td className="px-3 py-[14px] w-32"><MasteryBar value={course.mastery_avg} /></td>
                <td className="px-3 py-[14px]">
                  {course.has_exercises ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', color: 'var(--accent-green)' }}>
                      <CheckCircle size={11} /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'color-mix(in srgb, var(--accent-red) 12%, transparent)', color: 'var(--accent-red)' }}>
                      <XCircle size={11} /> None
                    </span>
                  )}
                </td>
                <td className="px-3 py-[14px]" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openDrawer(course)}
                      title="Edit course"
                      className="flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition-all cursor-pointer hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
                      style={{ width: 32, height: 32 }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { setDrawerCourse(course); setConfirmAction('delete') }}
                      title="Delete course"
                      className="flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition-all cursor-pointer hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
                      style={{ width: 32, height: 32 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* COURSE DRAWER */}
      {drawerCourse && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerCourse(null)} />
          <div className="relative w-full max-w-xl bg-[var(--bg-card)] border-l border-[var(--border)] h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{drawerCourse.name}</h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">{drawerCourse.slug}</p>
              </div>
              <button onClick={() => setDrawerCourse(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded"><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] shrink-0">
              {[['properties', 'Properties'], ['exercises', 'Exercises'], ['statistics', 'Statistics'], ['danger', '⚠ Danger']].map(([key, label]) => (
                <button key={key} onClick={() => setDrawerTab(key)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${drawerTab === key ? 'border-[var(--accent-green)] text-[var(--accent-green)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'} ${key === 'danger' ? 'text-[var(--accent-red)]' : ''}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 p-5 overflow-y-auto">

              {/* Tab: PROPERTIES */}
              {drawerTab === 'properties' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[['Name', 'name'], ['Difficulty', 'difficulty'], ['Status', 'status'], ['Reviewed', 'reviewed']].map(([label, key]) => (
                      <div key={key}>
                        <label className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block mb-1">{label}</label>
                        <input value={editData[key] || ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block mb-1">Slug (read-only)</label>
                      <input value={drawerCourse.slug} readOnly className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] text-sm font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block mb-2">Track Membership</label>
                    <div className="space-y-1.5">
                      {(drawerCourse.tracks || []).map(t => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                          <span className="text-sm text-[var(--text-primary)]">{t.name}</span>
                          <button onClick={() => handleRemoveFromTrack(t.id)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Remove</button>
                        </div>
                      ))}
                      {(drawerCourse.tracks || []).length === 0 && <p className="text-xs text-[var(--text-muted)]">Not in any track</p>}
                    </div>
                  </div>

                  <button onClick={saveCourse} disabled={saving}
                    className="w-full py-2.5 rounded-lg bg-[var(--accent-green)] text-black font-bold text-sm hover:brightness-110 disabled:opacity-50 cursor-pointer">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}

              {/* Tab: EXERCISES */}
              {drawerTab === 'exercises' && (
                <div className="space-y-4">
                  {loadingEx ? (
                    <div className="flex justify-center py-8"><Spinner size={24} /></div>
                  ) : exerciseSummary ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {[['Concepts', exerciseSummary.concepts], ['Flashcards', exerciseSummary.flashcards], ['Quiz Questions', exerciseSummary.quiz_questions], ['Total Attempts', exerciseSummary.total_attempts]].map(([label, val]) => (
                          <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-center">
                            <div className="text-xl font-bold text-[var(--text-primary)]">{val}</div>
                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Exercise Files</p>
                        <div className="space-y-1.5">
                          {[['FTB File', exerciseSummary.has_ftb_file], ['Matching File', exerciseSummary.has_matching_file], ['Boss Battle File', exerciseSummary.has_bossbattle_file], ['Challenge File', exerciseSummary.has_challenge_file]].map(([label, has]) => (
                            <div key={label} className="flex items-center gap-2 text-sm">
                              {has ? <CheckCircle size={14} className="text-[var(--accent-green)]" /> : <XCircle size={14} className="text-[var(--accent-red)]" />}
                              <span className="text-[var(--text-muted)]">{label}</span>
                              <span className={`text-xs font-semibold ml-auto ${has ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>{has ? 'Present' : 'Missing'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={handleReimport} disabled={loadingEx}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold cursor-pointer hover:brightness-110 disabled:opacity-50">
                          {loadingEx ? <Spinner size={13} /> : <Upload size={13} />} Re-import Exercises
                        </button>
                        <button onClick={() => setConfirmAction('clear')}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-semibold cursor-pointer hover:bg-red-500/10">
                          <Trash2 size={13} /> Clear ALL Exercises
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-[var(--text-muted)]">Failed to load exercise data</div>
                  )}
                </div>
              )}

              {/* Tab: STATISTICS */}
              {drawerTab === 'statistics' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-center">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{drawerCourse.student_count}</div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Students Enrolled</div>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-center">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{Math.round(drawerCourse.mastery_avg || 0)}%</div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Avg Mastery</div>
                    </div>
                  </div>
                  <MasteryBar value={drawerCourse.mastery_avg} />
                  <div className="text-xs text-[var(--text-muted)] space-y-1 pt-2">
                    <div className="flex justify-between"><span>Has PDF</span><span className={drawerCourse.has_pdf ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}>{drawerCourse.has_pdf ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span>Has Glossary</span><span className={drawerCourse.has_glossary ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}>{drawerCourse.has_glossary ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span>Exercises Ready</span><span className={drawerCourse.has_exercises ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>{drawerCourse.has_exercises ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}

              {/* Tab: DANGER */}
              {drawerTab === 'danger' && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
                    <h4 className="text-sm font-bold text-amber-400 mb-1">Reset Student Progress</h4>
                    <p className="text-xs text-[var(--text-muted)] mb-3">Clears all attempts, mastery scores, and flashcard progress for this course. Content (exercises) is preserved.</p>
                    <button onClick={() => setConfirmAction('reset')}
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 cursor-pointer">Reset All Progress</button>
                  </div>
                  <div className="rounded-xl p-4 border border-[var(--accent-red)] bg-red-500/5">
                    <h4 className="text-sm font-bold text-[var(--accent-red)] mb-1">Delete Course Permanently</h4>
                    <p className="text-xs text-[var(--text-muted)] mb-3">This will cascade-delete all exercises, flashcards, attempts, mastery scores, and remove the course from all tracks. This <strong>cannot be undone</strong>.</p>
                    <button onClick={() => setConfirmAction('delete')}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 cursor-pointer">Delete Course Forever</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmAction === 'clear'} title="Clear All Exercises"
        message={`Remove ALL exercise content (concepts, flashcards, quiz questions) for "${drawerCourse?.name}"? This will also reset user progress for this course.`}
        confirmLabel="Clear All" confirmDanger onConfirm={handleClearExercises} onCancel={() => setConfirmAction(null)} />
      <ConfirmModal isOpen={confirmAction === 'delete'} title="Delete Course Permanently"
        message={`Permanently delete "${drawerCourse?.name}"? This will cascade-delete all exercises, attempts, mastery scores, and track associations.`}
        confirmLabel="Delete Forever" confirmDanger onConfirm={handleDeleteCourse} onCancel={() => setConfirmAction(null)} />
      <ConfirmModal isOpen={confirmAction === 'reset'} title="Reset Course Progress"
        message={`Reset ALL student progress for "${drawerCourse?.name}"? Attempts, mastery scores, and flashcard progress will be erased. Exercises are preserved.`}
        confirmLabel="Reset Progress" confirmDanger onConfirm={handleResetCourse} onCancel={() => setConfirmAction(null)} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   2E — EXERCISES SECTION
───────────────────────────────────────────── */
function ExercisesSection({ courses, onMessage }) {
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [summary, setSummary] = useState(null)
  const [fileStatus, setFileStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = (courses || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (!selectedCourse) { setSummary(null); setFileStatus(null); return }
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/courses/${selectedCourse.id}/exercises/summary`).then(r => r.ok ? r.json() : null),
      fetch(`/api/admin/courses/${selectedCourse.id}/file-status`).then(r => r.ok ? r.json() : null),
    ]).then(([s, f]) => { setSummary(s); setFileStatus(f) }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedCourse])

  async function handleReimport() {
    setLoading(true)
    const res = await fetch(`/api/admin/courses/${selectedCourse.id}/exercises/reimport`, { method: 'POST' })
    const d = await res.json()
    onMessage(d.success ? 'Exercises re-imported' : `Error: ${d.error}`, d.success ? 'success' : 'error')
    setLoading(false)
    fetch(`/api/admin/courses/${selectedCourse.id}/exercises/summary`).then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
  }

  async function handleClear() {
    const res = await fetch(`/api/admin/courses/${selectedCourse.id}/clear-exercises`, { method: 'POST' })
    if (res.ok) { onMessage('Exercises cleared', 'success'); setSummary(null); setLoading(true); fetch(`/api/admin/courses/${selectedCourse.id}/exercises/summary`).then(r => r.ok ? r.json() : null).then(d => { setSummary(d); setLoading(false) }).catch(() => setLoading(false)) }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmClear(false)
  }

  async function handleDeleteType(type) {
    const res = await fetch(`/api/admin/courses/${selectedCourse.id}/exercises/type/${type}`, { method: 'DELETE' })
    if (res.ok) { onMessage(`${type} exercises deleted`, 'success') }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
  }

  const FILE_LIST = ['mcq.json', 'flashcards.json', 'ftb.json', 'matching.json', 'bossbattle.json', 'challenge.json']

  return (
    <div>
      <SectionHeader title="Exercise Management" subtitle="Manage exercise content per course" />

      {/* Course selector */}
      <div className="relative mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={selectedCourse ? selectedCourse.name : search} onChange={e => { setSearch(e.target.value); setSelectedCourse(null); setDropdownOpen(true) }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search and select a course…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm" />
          {selectedCourse && <button onClick={() => { setSelectedCourse(null); setSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] cursor-pointer"><X size={14} /></button>}
        </div>
        {dropdownOpen && !selectedCourse && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
            {filtered.map(c => (
              <button key={c.id} onClick={() => { setSelectedCourse(c); setDropdownOpen(false); setSearch('') }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer border-b border-[var(--border)] last:border-0">
                <span>{c.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{c.has_exercises ? '✓ exercises' : '✗ no exercises'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedCourse ? (
        <div className="flex items-center justify-center h-48 border border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)] text-sm">
          Select a course above to manage its exercises
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT: stats + actions */}
          <div className="space-y-4">
            <SectionCard>
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Exercise Stats</h4>
              {summary ? (
                <div className="space-y-3">
                  {[['Concepts', summary.concepts], ['Flashcards', summary.flashcards], ['Quiz Questions', summary.quiz_questions], ['Total Attempts', summary.total_attempts], ['Unique Students', summary.unique_students]].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">{label}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{val}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-[var(--text-muted)]">No exercise data</div>}
            </SectionCard>

            <SectionCard>
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Exercise Type Actions</h4>
              <div className="space-y-2">
                {['quiz', 'flashcard', 'ftb', 'matching', 'bossbattle', 'challenge'].map(type => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)] capitalize">{type}</span>
                    <button onClick={() => handleDeleteType(type)}
                      className="text-xs px-2 py-1 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 cursor-pointer">Clear</button>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="flex gap-2">
              <button onClick={handleReimport} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold cursor-pointer hover:brightness-110 disabled:opacity-50">
                <Upload size={14} /> Re-import
              </button>
              <button onClick={() => setConfirmClear(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500/30 text-red-400 text-sm font-semibold cursor-pointer hover:bg-red-500/10">
                <Trash2 size={14} /> Clear All
              </button>
            </div>
          </div>

          {/* RIGHT: file status */}
          <SectionCard>
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Exercise File Status</h4>
            <div className="space-y-2.5">
              {FILE_LIST.map(fname => {
                const present = fileStatus?.files?.[fname]
                return (
                  <div key={fname} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                    {present
                      ? <CheckCircle size={15} className="text-[var(--accent-green)] shrink-0" />
                      : <XCircle size={15} className="text-[var(--accent-red)] shrink-0" />}
                    <span className="text-sm font-mono text-[var(--text-primary)] flex-1">{fname}</span>
                    <span className={`text-xs font-semibold ${present ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>{present ? '✓ Present' : '✗ Missing'}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}

      <ConfirmModal isOpen={confirmClear} title="Clear All Exercises"
        message={`Remove ALL exercise content for "${selectedCourse?.name}"? Attempts and mastery scores will also be cleared.`}
        confirmLabel="Clear All" confirmDanger onConfirm={handleClear} onCancel={() => setConfirmClear(false)} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   2F — USERS SECTION
───────────────────────────────────────────── */
function UsersSection({ users, currentUser, onRefresh, onMessage }) {
  const [confirmAction, setConfirmAction] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', is_admin: false })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleToggleAdmin(user) {
    const res = await fetch(`/api/admin/users/${user.id}/toggle-admin`, { method: 'POST' })
    if (res.ok) { onMessage(`Admin status toggled for ${user.username}`, 'success'); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleDelete(user) {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) { onMessage(`User ${user.username} deleted`, 'success'); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleResetProgress(user) {
    const res = await fetch(`/api/admin/users/${user.id}/reset-progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
    if (res.ok) { onMessage(`Progress reset for ${user.username}`, 'success') }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setConfirmAction(null)
  }

  async function handleSaveEdit() {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) })
    if (res.ok) { onMessage('User updated', 'success'); setEditingId(null); setEditData({}); onRefresh() }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setSaving(false)
  }

  async function handleAddUser() {
    if (!newUser.username || !newUser.password) return
    setSaving(true)
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) })
    const d = await res.json()
    if (res.ok) { onMessage(`User "${newUser.username}" created`, 'success'); setShowAdd(false); setNewUser({ username: '', password: '', is_admin: false }); onRefresh() }
    else onMessage(`Error: ${d.error}`, 'error')
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">User Management</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{(users || []).length} users registered</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold hover:brightness-110 cursor-pointer">
          <UserPlus size={15} /> Add New User
        </button>
      </div>

      {showAdd && (
        <SectionCard className="mb-4">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">Create New User</h4>
          <div className="grid grid-cols-2 gap-3">
            <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="Username / Email"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password"
                className="w-full px-3 py-2 pr-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] cursor-pointer">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer col-span-2">
              <input type="checkbox" checked={newUser.is_admin} onChange={e => setNewUser({ ...newUser, is_admin: e.target.checked })} className="cursor-pointer" />
              Grant Admin Access
            </label>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAddUser} disabled={saving || !newUser.username || !newUser.password}
              className="px-4 py-2 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold disabled:opacity-50 cursor-pointer">{saving ? 'Creating…' : 'Create User'}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm cursor-pointer">Cancel</button>
          </div>
        </SectionCard>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
              {['Username', 'Admin', 'Created', 'XP', 'Level', 'Streak', 'Started', 'Completed', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!users || users.length === 0) && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--text-muted)]">No users found</td></tr>
            )}
            {users?.map(u => (
              <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-3 py-3">
                  {editingId === u.id ? (
                    <input value={editData.username || ''} onChange={e => setEditData({ ...editData, username: e.target.value })}
                      className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs w-36" />
                  ) : (
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{u.username}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">ID #{u.id}</div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  {editingId === u.id && u.id !== currentUser?.id ? (
                    <input type="checkbox" checked={!!editData.is_admin} onChange={e => setEditData({ ...editData, is_admin: e.target.checked ? 1 : 0 })} className="cursor-pointer" />
                  ) : (
                    <StatusBadge status={u.is_admin ? 'Admin' : 'Student'} variant={u.is_admin ? 'green' : 'muted'} />
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-[var(--text-muted)]">{u.created_at?.slice(0, 10)}</td>
                <td className="px-3 py-3 text-xs font-mono text-[var(--text-primary)]">{(u.total_xp || 0).toLocaleString()}</td>
                <td className="px-3 py-3 text-xs text-[var(--text-muted)]">{u.level || '—'}</td>
                <td className="px-3 py-3 text-xs text-[var(--text-primary)]">{u.current_streak || 0}🔥</td>
                <td className="px-3 py-3 text-xs text-[var(--text-muted)]">{u.courses_started || 0}</td>
                <td className="px-3 py-3 text-xs text-[var(--text-muted)]">{u.courses_completed || 0}</td>
                <td className="px-3 py-3">
                  {editingId === u.id ? (
                    <div className="flex gap-1">
                      <button onClick={handleSaveEdit} disabled={saving} className="text-xs px-2 py-1 rounded bg-[var(--accent-green)] text-black font-bold cursor-pointer">{saving ? '…' : 'Save'}</button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 rounded border border-[var(--border)] cursor-pointer">✕</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <IconBtn icon={Edit2} label="Edit" onClick={() => { setEditingId(u.id); setEditData({ username: u.username, is_admin: u.is_admin }) }} small />
                      <IconBtn icon={Shield} label="Toggle Admin" onClick={() => setConfirmAction({ type: 'toggle-admin', user: u })} small />
                      <IconBtn icon={RotateCcw} label="Reset" onClick={() => setConfirmAction({ type: 'reset', user: u })} small />
                      <IconBtn icon={UserX} label="Delete" danger onClick={() => setConfirmAction({ type: 'delete', user: u })} small disabled={u.id === currentUser?.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal isOpen={confirmAction?.type === 'toggle-admin'} title="Toggle Admin Status"
        message={`Toggle admin status for "${confirmAction?.user?.username}"? They will ${confirmAction?.user?.is_admin ? 'lose' : 'gain'} admin access.`}
        confirmLabel="Toggle" onConfirm={() => handleToggleAdmin(confirmAction.user)} onCancel={() => setConfirmAction(null)} />
      <ConfirmModal isOpen={confirmAction?.type === 'reset'} title="Reset User Progress"
        message={`This will erase all XP, attempts, and mastery scores for "${confirmAction?.user?.username}". This cannot be undone.`}
        confirmLabel="Reset Progress" confirmDanger onConfirm={() => handleResetProgress(confirmAction.user)} onCancel={() => setConfirmAction(null)} />
      <ConfirmModal isOpen={confirmAction?.type === 'delete'} title="Delete User"
        message={`Permanently delete "${confirmAction?.user?.username}"? All their progress, sessions, and data will be erased.`}
        confirmLabel="Delete User" confirmDanger onConfirm={() => handleDelete(confirmAction.user)} onCancel={() => setConfirmAction(null)} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   2G — RESET TOOLS SECTION
───────────────────────────────────────────── */
function ResetSection({ courses, tracks, onMessage }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [courseDropOpen, setCourseDropOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [courseStats, setCourseStats] = useState(null)
  const [trackStats, setTrackStats] = useState(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [resetting, setResetting] = useState(null)
  const [showCourseConfirm, setShowCourseConfirm] = useState(false)
  const [showTrackConfirm, setShowTrackConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (!selectedCourse) { setCourseStats(null); return }
    fetch(`/api/admin/courses/${selectedCourse.id}/reset-stats`).then(r => r.ok ? r.json() : null).then(setCourseStats).catch(() => {})
  }, [selectedCourse])

  useEffect(() => {
    if (!selectedTrack) { setTrackStats(null); return }
    fetch(`/api/admin/tracks/${selectedTrack.id}/reset-stats`).then(r => r.ok ? r.json() : null).then(setTrackStats).catch(() => {})
  }, [selectedTrack])

  const filteredCourses = (courses || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  )

  async function handleResetCourse() {
    setResetting('course')
    const res = await fetch(`/api/admin/reset/course/${selectedCourse.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
    if (res.ok) onMessage(`Progress reset for "${selectedCourse.name}"`, 'success')
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setResetting(null); setShowCourseConfirm(false)
    fetch(`/api/admin/courses/${selectedCourse.id}/reset-stats`).then(r => r.ok ? r.json() : null).then(setCourseStats).catch(() => {})
  }

  async function handleResetTrack() {
    setResetting('track')
    const res = await fetch(`/api/admin/reset/track/${selectedTrack.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
    if (res.ok) { onMessage(`Progress reset for track "${selectedTrack.name}"`, 'success'); setSelectedTrack(null) }
    else { const d = await res.json(); onMessage(`Error: ${d.error}`, 'error') }
    setResetting(null); setShowTrackConfirm(false)
  }

  async function handleNuclearReset() {
    setResetting('all')
    const res = await fetch('/api/admin/reset/all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, admin_password: adminPassword }) })
    const d = await res.json()
    if (res.ok) { setShowSuccess(true); setTimeout(() => navigate('/admin'), 3000) }
    else { onMessage(`Error: ${d.error}`, 'error'); setResetting(null) }
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-emerald-400">Full System Reset Complete</h3>
          <p className="text-sm text-[var(--text-muted)]">All user progress has been wiped. Redirecting…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Reset Tools</h2>

      {/* TIER 1: Reset Course — neutral card, outlined red button */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Reset Course Progress</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Select a course and reset all student progress, attempts, and mastery scores.</p>
        <div className="relative mb-4">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={selectedCourse ? selectedCourse.name : search}
              onChange={e => { setSearch(e.target.value); setSelectedCourse(null); setCourseDropOpen(true) }}
              onFocus={() => setCourseDropOpen(true)}
              placeholder="Search for a course…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            {selectedCourse && <button onClick={() => { setSelectedCourse(null); setSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--text-muted)]"><X size={13} /></button>}
          </div>
          {courseDropOpen && !selectedCourse && filteredCourses.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
              {filteredCourses.map(c => (
                <button key={c.id} onClick={() => { setSelectedCourse(c); setCourseDropOpen(false); setSearch('') }}
                  className="w-full flex justify-between px-3 py-2 text-sm text-left hover:bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer">
                  <span>{c.name}</span><span className="text-xs text-[var(--text-muted)]">{c.difficulty}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedCourse && courseStats && (
          <div className="mb-4 p-3 rounded-lg flex gap-6 text-xs" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <span className="text-[var(--text-muted)]">Students: <strong className="text-[var(--text-primary)]">{courseStats.student_count}</strong></span>
            <span className="text-[var(--text-muted)]">Attempts: <strong className="text-[var(--text-primary)]">{courseStats.attempt_count}</strong></span>
          </div>
        )}
        <button
          onClick={() => setShowCourseConfirm(true)}
          disabled={!selectedCourse || resetting === 'course'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'transparent',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)',
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-red) 10%, transparent)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {resetting === 'course' ? <Spinner size={14} /> : null} Reset This Course
        </button>
      </div>

      {/* TIER 2: Reset Track — neutral card, outlined red button */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Reset Track Progress</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Select a track and reset progress for all its courses.</p>
        <select
          value={selectedTrack?.id || ''}
          onChange={e => setSelectedTrack(tracks?.find(t => t.id === Number(e.target.value)) || null)}
          className="w-full px-3 py-2 rounded-lg text-sm mb-4"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <option value="">Select a track…</option>
          {tracks?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {selectedTrack && (
          <div className="mb-4 space-y-1.5">
            {selectedTrack.courses?.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <ArrowRight size={10} /><span className="text-[var(--text-primary)]">{c.name}</span>
              </div>
            ))}
            {trackStats && (
              <div className="flex gap-4 mt-2 pt-2 border-t border-[var(--border)] text-xs">
                <span className="text-[var(--text-muted)]">Courses: <strong className="text-[var(--text-primary)]">{trackStats.course_count}</strong></span>
                <span className="text-[var(--text-muted)]">Total Attempts: <strong className="text-[var(--text-primary)]">{trackStats.total_attempts}</strong></span>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setShowTrackConfirm(true)}
          disabled={!selectedTrack || resetting === 'track'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'transparent',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)',
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-red) 10%, transparent)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {resetting === 'track' ? <Spinner size={14} /> : null} Reset Entire Track
        </button>
      </div>

      {/* ── 32px gap before Tier 3 ── */}
      <div style={{ height: 8 }} />

      {/* TIER 3: Full System Reset — max danger visual */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'color-mix(in srgb, var(--accent-red) 6%, var(--bg-card))',
          border: '2px solid var(--accent-red)',
          boxShadow: '0 0 20px color-mix(in srgb, var(--accent-red) 15%, transparent)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
          <h3 className="text-[16px] font-bold" style={{ color: 'var(--accent-red)' }}>Full System Reset</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Erases ALL progress for ALL users. Content (courses, exercises) is preserved. This{' '}
          <strong className="text-[var(--text-primary)]">cannot be undone</strong>.
        </p>
        <input
          type="password"
          value={adminPassword}
          onChange={e => setAdminPassword(e.target.value)}
          placeholder="Type your admin password to confirm"
          className="w-full px-3 py-2 rounded-lg text-sm mb-4"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
        <button
          onClick={handleNuclearReset}
          disabled={!adminPassword || resetting === 'all'}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          style={{ backgroundColor: 'var(--accent-red)' }}
        >
          {resetting === 'all' ? <><Spinner size={14} /> Resetting…</> : 'Reset Everything'}
        </button>
      </div>

      <ConfirmModal isOpen={showCourseConfirm} title="Reset Course Progress"
        message={`Reset all progress for "${selectedCourse?.name}"? This deletes attempts, mastery scores, and resets users to "Not Started".`}
        confirmLabel="Reset Course" confirmDanger onConfirm={handleResetCourse} onCancel={() => setShowCourseConfirm(false)} />
      <ConfirmModal isOpen={showTrackConfirm} title="Reset Track Progress"
        message={`Reset progress for ALL courses in "${selectedTrack?.name}"? All attempts and mastery scores in this track will be erased.`}
        confirmLabel="Reset Track" confirmDanger onConfirm={handleResetTrack} onCancel={() => setShowTrackConfirm(false)} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   2H — SYSTEM STATS SECTION
───────────────────────────────────────────── */
function SystemSection({ onMessage }) {
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [logDisplay, setLogDisplay] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const intervalRef = useRef(null)

  function fetchStats() {
    fetch('/api/admin/system/stats').then(r => r.ok ? r.json() : null).then(d => d && setStats(d)).catch(() => {})
  }

  function fetchLogs() {
    fetch('/api/admin/system/logs').then(r => r.ok ? r.json() : null).then(d => { if (d) { setLogs(d.logs || []); setLogDisplay(d.logs || []) } }).catch(() => {})
  }

  useEffect(() => {
    fetchStats()
    fetchLogs()
    intervalRef.current = setInterval(fetchStats, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  async function handleReimportAll() {
    setImporting(true); setImportResult(null)
    const res = await fetch('/api/admin/system/reimport-all', { method: 'POST' })
    const d = await res.json()
    setImportResult(d)
    onMessage(d.success ? 'All exercises re-imported' : `Error: ${d.error}`, d.success ? 'success' : 'error')
    setImporting(false)
  }

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="System" subtitle="Live server statistics, logs, and import tools" />

      <div className="grid grid-cols-2 gap-4">
        {/* Live Stats */}
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Live Stats</h4>
            <button onClick={fetchStats} className="text-xs text-[var(--accent-green)] hover:underline cursor-pointer flex items-center gap-1"><RefreshCw size={11} /> Refresh</button>
          </div>
          {stats ? (
            <div className="space-y-2.5">
              {[
                ['DB Size', `${stats.db_size_mb} MB`],
                ['Content Size', `${stats.content_size_mb} MB`],
                ['Uptime', formatUptime(stats.uptime_seconds)],
                ['Total Users', stats.total_users],
                ['Total Courses', stats.total_courses],
                ['Total Tracks', stats.total_tracks],
                ['Total Concepts', stats.total_concepts],
                ['Total Flashcards', stats.total_flashcards],
                ['Total Attempts', stats.total_attempts],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{val}</span>
                </div>
              ))}
            </div>
          ) : <div className="flex justify-center py-8"><Spinner size={20} /></div>}
          <p className="text-[10px] text-[var(--text-muted)] mt-3 flex items-center gap-1"><RefreshCw size={9} /> Auto-refreshes every 30s</p>
        </SectionCard>

        {/* System Logs */}
        <SectionCard className="flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">System Logs</h4>
            <div className="flex gap-2">
              <button onClick={fetchLogs} className="text-xs text-[var(--accent-green)] hover:underline cursor-pointer flex items-center gap-1"><RefreshCw size={11} /> Refresh</button>
              <button onClick={() => setLogDisplay([])} className="text-xs text-[var(--text-muted)] hover:underline cursor-pointer">Clear Display</button>
            </div>
          </div>
          <pre className="flex-1 overflow-y-auto text-[10px] font-mono bg-[var(--bg-primary)] rounded-lg p-3 text-[var(--text-muted)] leading-relaxed max-h-64 whitespace-pre-wrap">
            {logDisplay.length > 0 ? logDisplay.join('\n') : 'No logs available. App log file not configured.'}
          </pre>
        </SectionCard>
      </div>

      {/* Import/Export panel */}
      <SectionCard>
        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Import / Export</h4>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleReimportAll} disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer">
            {importing ? <Spinner size={14} /> : <Upload size={14} />}
            {importing ? 'Re-importing…' : 'Re-import ALL Course Exercises'}
          </button>
        </div>
        {importResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${importResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {importResult.success
              ? `Import complete — ${JSON.stringify(importResult.result || importResult)}`
              : `Error: ${importResult.error}`}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ROOT AdminPanel COMPONENT
───────────────────────────────────────────── */
export default function AdminPanel({ user, onLogout }) {
  const navigate = useNavigate()
  const [isLight, setIsLight] = useState(() => localStorage.getItem('theme') === 'light')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [tracks, setTracks] = useState(null)
  const [courses, setCourses] = useState(null)
  const [users, setUsers] = useState(null)
  const [loadingSection, setLoadingSection] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'info' })

  const showToast = useCallback((message, type = 'info') => setToast({ message, type }), [])

  const toggleTheme = () => {
    const next = !isLight
    setIsLight(next)
    if (next) { document.documentElement.classList.add('light-theme'); localStorage.setItem('theme', 'light') }
    else { document.documentElement.classList.remove('light-theme'); localStorage.setItem('theme', 'dark') }
  }

  const fetchSection = useCallback(async (section) => {
    try {
      switch (section) {
        case 'dashboard': {
          const res = await fetch('/api/admin/stats')
          if (res.ok) setStats(await res.json())
          break
        }
        case 'tracks': {
          const [tr, cr] = await Promise.all([fetch('/api/admin/tracks'), fetch('/api/admin/courses')])
          if (tr.ok) setTracks((await tr.json()).tracks)
          if (cr.ok) setCourses((await cr.json()).courses)
          break
        }
        case 'courses': {
          const [cr, tr] = await Promise.all([fetch('/api/admin/courses'), fetch('/api/admin/tracks')])
          if (cr.ok) setCourses((await cr.json()).courses)
          if (tr.ok) setTracks((await tr.json()).tracks)
          break
        }
        case 'exercises': {
          const res = await fetch('/api/admin/courses')
          if (res.ok) setCourses((await res.json()).courses)
          break
        }
        case 'users': {
          const res = await fetch('/api/admin/users')
          if (res.ok) setUsers((await res.json()).users)
          break
        }
        case 'reset': {
          const [cr, tr] = await Promise.all([fetch('/api/admin/courses'), fetch('/api/admin/tracks')])
          if (cr.ok) setCourses((await cr.json()).courses)
          if (tr.ok) setTracks((await tr.json()).tracks)
          break
        }
      }
    } catch (err) { console.error(`Failed to fetch ${section}:`, err) }
  }, [])

  useEffect(() => {
    setLoadingSection(true)
    fetchSection(activeSection).finally(() => setLoadingSection(false))
  }, [activeSection, fetchSection])

  // Group sections for sidebar
  const groups = {}
  for (const s of SECTIONS) {
    if (!groups[s.group]) groups[s.group] = []
    groups[s.group].push(s)
  }

  function renderContent() {
    if (loadingSection) {
      return <div className="flex items-center justify-center py-24"><Spinner size={28} /></div>
    }
    switch (activeSection) {
      case 'dashboard': return <DashboardSection stats={stats} onMessage={showToast} />
      case 'tracks': return <TracksSection tracks={tracks} allCourses={courses} onRefresh={() => fetchSection('tracks')} onMessage={showToast} />
      case 'courses': return <CoursesSection courses={courses} tracks={tracks} onRefresh={() => fetchSection('courses')} onMessage={showToast} />
      case 'exercises': return <ExercisesSection courses={courses} onMessage={showToast} />
      case 'users': return <UsersSection users={users} currentUser={user} onRefresh={() => fetchSection('users')} onMessage={showToast} />
      case 'reset': return <ResetSection courses={courses} tracks={tracks} onMessage={showToast} />
      case 'system': return <SystemSection onMessage={showToast} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      {/* TOP BAR */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border shrink-0" style={{ background: 'color-mix(in srgb, var(--accent-green) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-green) 25%, var(--border))', color: 'var(--accent-green)' }}>
            <Shield size={15} />
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)] hidden sm:inline">Admin Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center border border-[var(--border)] rounded-lg transition-all cursor-pointer hover:bg-[var(--bg-primary)]"
            style={{ width: 36, height: 36 }}
            title="Toggle theme"
          >
            {isLight ? <Moon size={15} className="text-[var(--text-primary)]" /> : <Sun size={15} className="text-[var(--accent-yellow)]" />}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={{ height: 36, padding: '0 14px', color: 'var(--accent-green)', border: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-green) 10%, transparent)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ExternalLink size={14} /> Back to App
          </button>
          {user && <span className="hidden md:inline text-[13px] text-[var(--text-muted)] px-1">{user.username}</span>}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
              style={{ height: 36, padding: '0 14px', color: 'var(--accent-red)', border: '1px solid color-mix(in srgb, var(--accent-red) 30%, var(--border))' }}
              onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-red) 10%, transparent)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>
      </header>

      {/* MOBILE SECTION TABS */}
      <div className="md:hidden flex overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-sidebar)] shrink-0 gap-1 px-2 py-2">
        {SECTIONS.map(s => {
          const Icon = s.icon
          const active = activeSection === s.key
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border-none ${
                active
                  ? 'bg-[rgba(3,239,98,0.12)] text-[var(--accent-green)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR (desktop) */}
        <aside className="hidden md:block w-52 shrink-0 border-r border-[var(--border)] bg-[var(--bg-sidebar)] overflow-y-auto">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 pt-4 pb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{group}</div>
              {items.map(s => {
                const Icon = s.icon
                const active = activeSection === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => setActiveSection(s.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer transition-all duration-150 border-l-[3px] rounded-none ${
                      active
                        ? 'border-[var(--accent-green)] text-[var(--accent-green)] font-semibold'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                    style={active ? { background: 'color-mix(in srgb, var(--accent-green) 10%, transparent)' } : {}}
                  >
                    <Icon size={18} className="shrink-0" />
                    {s.label}
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
