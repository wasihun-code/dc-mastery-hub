import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, BookOpen, Users, ShieldAlert, Settings, Wrench,
  RotateCcw, Trash2, Plus, ChevronDown, ChevronUp, GripVertical, Shield, UserX,
  Sun, Moon, LogOut, ExternalLink, Search, AlertTriangle, ArrowRight
} from 'lucide-react'
import ConfirmModal from '../components/admin/ConfirmModal'
import AdminTable from '../components/admin/AdminTable'
import StatusBadge from '../components/admin/StatusBadge'
import DangerZone from '../components/admin/DangerZone'

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'tracks', label: 'Tracks', icon: Map },
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'exercises', label: 'Exercises', icon: Wrench },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'reset', label: 'Reset Tools', icon: ShieldAlert },
  { key: 'system', label: 'System', icon: Settings },
]

function DashboardSection({ data }) {
  if (!data) {
    return <div className="animate-pulse h-32 bg-[var(--bg-primary)] rounded-xl" />
  }

  const cards = [
    { label: 'Users', value: data.users, color: 'from-blue-500 to-blue-600' },
    { label: 'Tracks', value: data.tracks, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Courses', value: data.courses, color: 'from-purple-500 to-purple-600' },
    { label: 'Concepts', value: data.concepts, color: 'from-amber-500 to-amber-600' },
    { label: 'Flashcards', value: data.flashcards, color: 'from-rose-500 to-rose-600' },
    { label: 'Quiz Qs', value: data.quiz_questions, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Attempts', value: data.exercise_attempts, color: 'from-orange-500 to-orange-600' },
    { label: 'Sessions', value: data.sessions, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Admins', value: data.admins, color: 'from-red-500 to-red-600' },
    { label: 'Total XP', value: data.total_xp?.toLocaleString(), color: 'from-green-500 to-green-600' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className={`h-2 w-full rounded-full bg-gradient-to-r ${card.color} mb-3`} />
            <div className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider font-semibold">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TracksSection({ tracks, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTrack, setNewTrack] = useState({ name: '', slug: '', language: 'Python', color: '#03ef62', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [dragCourseId, setDragCourseId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 3000)
      return () => clearTimeout(t)
    }
  }, [message])

  async function addTrack() {
    if (!newTrack.name || !newTrack.slug) return
    const res = await fetch('/api/manage/track/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTrack)
    })
    const data = await res.json()
    if (res.ok) {
      setShowAdd(false)
      setNewTrack({ name: '', slug: '', language: 'Python', color: '#03ef62', description: '' })
      setMessage(`Track "${newTrack.name}" created`)
      onRefresh()
    } else {
      setMessage(`Error: ${data.error}`)
    }
  }

  async function updateTrack(trackId) {
    const res = await fetch(`/api/admin/tracks/${trackId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    })
    if (res.ok) {
      setEditingId(null)
      setEditData({})
      setMessage('Track updated')
      onRefresh()
    } else {
      const data = await res.json()
      setMessage(`Error: ${data.error}`)
    }
  }

  async function handleDragStart(e, courseId) {
    setDragCourseId(courseId)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(e, trackId, targetCourseId) {
    e.preventDefault()
    if (dragCourseId == null) return
    const track = tracks.find(t => t.id === trackId)
    if (!track) return
    const ids = track.courses.map(c => c.id)
    const fromIdx = ids.indexOf(dragCourseId)
    const toIdx = ids.indexOf(targetCourseId)
    if (fromIdx === -1 || toIdx === -1) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, dragCourseId)
    const res = await fetch('/api/admin/tracks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, courseIds: ids })
    })
    if (res.ok) {
      setMessage('Courses reordered')
      onRefresh()
    }
    setDragCourseId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Tracks</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-green)] text-black text-sm font-semibold hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus size={16} /> Add Track
        </button>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm">
          {message}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">New Track</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={newTrack.name} onChange={e => setNewTrack({ ...newTrack, name: e.target.value })}
              placeholder="Track Name"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
            />
            <input
              value={newTrack.slug} onChange={e => setNewTrack({ ...newTrack, slug: e.target.value })}
              placeholder="slug-name"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
            />
            <input
              value={newTrack.language} onChange={e => setNewTrack({ ...newTrack, language: e.target.value })}
              placeholder="Language"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                type="color" value={newTrack.color}
                onChange={e => setNewTrack({ ...newTrack, color: e.target.value })}
                className="h-9 w-9 rounded cursor-pointer"
              />
              <input
                value={newTrack.description} onChange={e => setNewTrack({ ...newTrack, description: e.target.value })}
                placeholder="Description (optional)"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
          <button
            onClick={addTrack}
            className="mt-3 px-4 py-2 rounded-lg bg-[var(--accent-green)] text-black font-semibold text-sm hover:brightness-110 transition-all cursor-pointer"
          >
            Create Track
          </button>
        </div>
      )}

      <div className="space-y-3">
        {(!tracks || tracks.length === 0) && (
          <div className="text-center py-8 text-[var(--text-muted)]">No tracks found</div>
        )}
        {tracks?.map((track) => (
          <div key={track.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === track.id ? null : track.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color }} />
                <span className="font-semibold text-[var(--text-primary)]">{track.name}</span>
                <span className="text-xs text-[var(--text-muted)]">({track.slug})</span>
                <span className="text-xs text-[var(--text-muted)]">{track.language}</span>
                <StatusBadge status={`${track.course_count} courses`} variant="purple" />
              </div>
              {expandedId === track.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedId === track.id && (
              <div className="border-t border-[var(--border)] p-4">
                {editingId === track.id ? (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <input value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Name" className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
                    <input value={editData.slug || ''} onChange={e => setEditData({ ...editData, slug: e.target.value })}
                      placeholder="Slug" className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
                    <input value={editData.language || ''} onChange={e => setEditData({ ...editData, language: e.target.value })}
                      placeholder="Language" className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
                    <input type="color" value={editData.color || track.color}
                      onChange={e => setEditData({ ...editData, color: e.target.value })}
                      className="h-9 w-9 rounded cursor-pointer" />
                    <div className="col-span-2 flex gap-2">
                      <button onClick={() => updateTrack(track.id)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--accent-green)] text-black text-sm font-semibold cursor-pointer">Save</button>
                      <button onClick={() => { setEditingId(null); setEditData({}) }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm cursor-pointer">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(track.id); setEditData({ name: track.name, slug: track.slug, language: track.language, color: track.color }) }}
                    className="mb-4 text-xs text-[var(--accent-green)] hover:underline cursor-pointer">✎ Edit Track</button>
                )}

                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Courses ({track.courses?.length || 0})
                </h4>
                {(!track.courses || track.courses.length === 0) ? (
                  <div className="text-xs text-[var(--text-muted)] py-2">No courses linked</div>
                ) : (
                  <div className="space-y-1">
                    {track.courses.map((course) => (
                      <div
                        key={course.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, course.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, track.id, course.id)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border)] transition-colors"
                      >
                        <GripVertical size={14} className="text-[var(--text-muted)] cursor-grab shrink-0" />
                        <span className="text-xs text-[var(--text-muted)] font-mono">#{course.order_in_track}</span>
                        <span className="text-sm text-[var(--text-primary)]">{course.name}</span>
                        <StatusBadge status={course.difficulty} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CoursesSection({ courses, onRefresh }) {
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 3000)
      return () => clearTimeout(t)
    }
  }, [message])

  async function updateCourse(courseId) {
    const res = await fetch(`/api/admin/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    })
    if (res.ok) {
      setEditingId(null)
      setEditData({})
      setMessage('Course updated')
      onRefresh()
    } else {
      const data = await res.json()
      setMessage(`Error: ${data.error}`)
    }
  }

  const courseColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'difficulty', label: 'Difficulty', render: (r) => <StatusBadge status={r.difficulty} /> },
    { key: 'tracks', label: 'Tracks', render: (r) => r.tracks?.map(t => t.name).join(', ') || '—' },
    { key: 'actions', label: '', render: (r) => (
      <button onClick={() => { setEditingId(r.id); setEditData({ name: r.name, slug: r.slug, difficulty: r.difficulty }) }}
        className="text-xs text-[var(--accent-green)] hover:underline cursor-pointer">Edit</button>
    )},
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Courses</h2>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm">
          {message}
        </div>
      )}

      {editingId && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Edit Course #{editingId}</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })}
              placeholder="Name" className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
            <input value={editData.slug || ''} onChange={e => setEditData({ ...editData, slug: e.target.value })}
              placeholder="Slug" className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
            <input value={editData.difficulty || ''} onChange={e => setEditData({ ...editData, difficulty: e.target.value })}
              placeholder="Difficulty" className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => updateCourse(editingId)}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent-green)] text-black text-sm font-semibold cursor-pointer">Save</button>
            <button onClick={() => { setEditingId(null); setEditData({}) }}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      <AdminTable
        columns={courseColumns}
        rows={courses || []}
        emptyMessage="No courses found"
      />
    </div>
  )
}

function ExercisesSection({ onMessage }) {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  async function handleReimport() {
    setImporting(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/exercises/reimport', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      onMessage?.(data.success ? 'Exercises reimported successfully' : `Import failed: ${data.error}`)
    } catch (err) {
      setResult({ success: false, error: err.message })
      onMessage?.('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Exercise Management</h2>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Re-scan course content directories and re-import all exercises (MCQ, flashcards, fill-blanks, matching pairs) from JSON files.
        </p>
        <button
          onClick={handleReimport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-green)] text-black font-semibold text-sm hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
        >
          <RotateCcw size={16} className={importing ? 'animate-spin' : ''} />
          {importing ? 'Importing...' : 'Re-import Exercises'}
        </button>
        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {result.success
              ? `Scan: ${result.scan?.status} | Import: ${result.import?.status} (${result.import?.courses_imported} courses)`
              : `Error: ${result.error}`}
          </div>
        )}
      </div>
    </div>
  )
}

function UsersSection({ users, onRefresh }) {
  const [confirmAction, setConfirmAction] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 3000)
      return () => clearTimeout(t)
    }
  }, [message])

  async function handleToggleAdmin(userId) {
    const res = await fetch(`/api/admin/users/${userId}/toggle-admin`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setMessage('Admin status toggled')
      onRefresh()
    } else {
      setMessage(`Error: ${data.error}`)
    }
    setConfirmAction(null)
  }

  async function handleDeleteUser(userId) {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setMessage('User deleted')
      onRefresh()
    } else {
      setMessage(`Error: ${data.error}`)
    }
    setConfirmAction(null)
  }

  const userColumns = [
    { key: 'id', label: 'ID' },
    { key: 'username', label: 'Username' },
    { key: 'is_admin', label: 'Admin', render: (r) => <StatusBadge status={r.is_admin} variant={r.is_admin ? 'green' : 'red'} /> },
    { key: 'total_xp', label: 'XP' },
    { key: 'level', label: 'Level' },
    { key: 'current_streak', label: 'Streak' },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => setConfirmAction({ action: 'toggle-admin', userId: r.id, username: r.username })}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer">
          <Shield size={12} /> Toggle Admin
        </button>
        <button onClick={() => setConfirmAction({ action: 'delete', userId: r.id, username: r.username })}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer">
          <UserX size={12} /> Delete
        </button>
      </div>
    )},
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">User Management</h2>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm">
          {message}
        </div>
      )}

      <AdminTable
        columns={userColumns}
        rows={users || []}
        emptyMessage="No users found"
      />

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.action === 'toggle-admin' ? 'Toggle Admin Status' : 'Delete User'}
        message={
          confirmAction?.action === 'toggle-admin'
            ? `Are you sure you want to toggle admin status for "${confirmAction?.username}"?`
            : `Are you sure you want to permanently delete user "${confirmAction?.username}"? This cannot be undone.`
        }
        confirmLabel={confirmAction?.action === 'toggle-admin' ? 'Toggle' : 'Delete'}
        confirmDanger={confirmAction?.action === 'delete'}
        onConfirm={() => {
          if (confirmAction?.action === 'toggle-admin') handleToggleAdmin(confirmAction.userId)
          else if (confirmAction?.action === 'delete') handleDeleteUser(confirmAction.userId)
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}

function ResetSection({ onMessage }) {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [tracks, setTracks] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [courseStats, setCourseStats] = useState(null)
  const [trackStats, setTrackStats] = useState(null)
  const [showCourseConfirm, setShowCourseConfirm] = useState(false)
  const [showTrackConfirm, setShowTrackConfirm] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [resetting, setResetting] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/courses').then(r => r.ok && r.json()).then(d => setCourses(d.courses || [])).catch(() => {})
    fetch('/api/admin/tracks').then(r => r.ok && r.json()).then(d => setTracks(d.tracks || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedCourse) { setCourseStats(null); return }
    fetch(`/api/admin/courses/${selectedCourse.id}/reset-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setCourseStats(d))
      .catch(() => setCourseStats(null))
  }, [selectedCourse])

  useEffect(() => {
    if (!selectedTrack) { setTrackStats(null); return }
    const track = tracks.find(t => t.id === selectedTrack.id)
    let total = 0
    if (track?.courses) {
      for (const c of track.courses) {
        total += c.student_count || 0
      }
    }
    fetch(`/api/admin/tracks/${selectedTrack.id}/reset-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTrackStats(d || { course_count: track?.courses?.length || 0, total_attempts: total }))
      .catch(() => setTrackStats({ course_count: track?.courses?.length || 0, total_attempts: total }))
  }, [selectedTrack, tracks])

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  async function handleResetCourse() {
    if (!selectedCourse) return
    setResetting('course')
    try {
      const res = await fetch(`/api/admin/reset/course/${selectedCourse.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      })
      const data = await res.json()
      if (res.ok) {
        onMessage?.(`Progress reset for "${selectedCourse.name}"`)
        fetch(`/api/admin/courses/${selectedCourse.id}/reset-stats`)
          .then(r => r.ok ? r.json() : null)
          .then(d => setCourseStats(d))
      } else {
        onMessage?.(`Reset failed: ${data.error}`)
      }
    } catch (err) {
      onMessage?.('Reset failed: ' + err.message)
    } finally {
      setResetting(null)
      setShowCourseConfirm(false)
    }
  }

  async function handleResetTrack() {
    if (!selectedTrack) return
    setResetting('track')
    try {
      const res = await fetch(`/api/admin/reset/track/${selectedTrack.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      })
      const data = await res.json()
      if (res.ok) {
        onMessage?.(`Progress reset for track "${selectedTrack.name}"`)
        setSelectedTrack(null)
        setTrackStats(null)
      } else {
        onMessage?.(`Reset failed: ${data.error}`)
      }
    } catch (err) {
      onMessage?.('Reset failed: ' + err.message)
    } finally {
      setResetting(null)
      setShowTrackConfirm(false)
    }
  }

  async function handleNuclearReset() {
    setResetting('all')
    try {
      const res = await fetch('/api/admin/reset/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, admin_password: adminPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setShowSuccess(true)
        setTimeout(() => navigate('/admin'), 3000)
      } else {
        onMessage?.(`Reset failed: ${data.error}`)
        setResetting(null)
      }
    } catch (err) {
      onMessage?.('Reset failed: ' + err.message)
      setResetting(null)
    }
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-emerald-400">Full System Reset Complete</h3>
          <p className="text-sm text-[var(--text-muted)]">All user progress has been wiped. Redirecting to admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Reset Tools</h2>

      <div className="space-y-6">
        {/* ─── CARD 1: Reset Course Progress ─── */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Reset Course Progress</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Select a course and reset all student progress, attempts, and mastery scores for that course.</p>

          {/* Searchable course selector */}
          <div className="relative mb-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setCourseDropdownOpen(true) }}
                onFocus={() => setCourseDropdownOpen(true)}
                placeholder="Search courses..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            {courseDropdownOpen && filteredCourses.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
                {filteredCourses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCourse(c); setCourseDropdownOpen(false); setSearch('') }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-[var(--bg-primary)] transition-colors cursor-pointer ${
                      selectedCourse?.id === c.id ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{c.difficulty}</span>
                  </button>
                ))}
              </div>
            )}
            {courseDropdownOpen && filteredCourses.length === 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)] shadow-xl">
                No courses match your search
              </div>
            )}
          </div>

          {/* Selected course stats */}
          {selectedCourse && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedCourse.name}</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">#{selectedCourse.id}</span>
              </div>
              {courseStats ? (
                <div className="flex gap-4 text-xs">
                  <span className="text-[var(--text-muted)]">
                    Students: <span className="text-[var(--text-primary)] font-semibold">{courseStats.student_count}</span>
                  </span>
                  <span className="text-[var(--text-muted)]">
                    Attempts: <span className="text-[var(--text-primary)] font-semibold">{courseStats.attempt_count}</span>
                  </span>
                </div>
              ) : (
                <div className="h-4 w-32 bg-[var(--bg-sidebar)] rounded animate-pulse" />
              )}
            </div>
          )}

          <button
            onClick={() => setShowCourseConfirm(true)}
            disabled={!selectedCourse}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Reset This Course
          </button>
        </div>

        {/* ─── CARD 2: Reset Track Progress ─── */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Reset Track Progress</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Select a track and reset progress for all courses within it.</p>

          <select
            value={selectedTrack?.id || ''}
            onChange={e => {
              const track = tracks.find(t => t.id === Number(e.target.value))
              setSelectedTrack(track || null)
            }}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm mb-4"
          >
            <option value="">Select a track...</option>
            {tracks.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
            ))}
          </select>

          {selectedTrack && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedTrack.name}</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">#{selectedTrack.id}</span>
              </div>
              {selectedTrack.courses?.length > 0 ? (
                <div className="mb-2 space-y-1">
                  {selectedTrack.courses.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <ArrowRight size={10} className="shrink-0" />
                      <span className="text-[var(--text-primary)]">{c.name}</span>
                      <span className="text-[var(--text-muted)]">({c.difficulty})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] mb-2">No courses in this track</p>
              )}
              {trackStats ? (
                <div className="flex gap-4 text-xs">
                  <span className="text-[var(--text-muted)]">
                    Courses: <span className="text-[var(--text-primary)] font-semibold">{trackStats.course_count}</span>
                  </span>
                  <span className="text-[var(--text-muted)]">
                    Total Attempts: <span className="text-[var(--text-primary)] font-semibold">{trackStats.total_attempts}</span>
                  </span>
                </div>
              ) : (
                <div className="h-4 w-32 bg-[var(--bg-sidebar)] rounded animate-pulse" />
              )}
            </div>
          )}

          <button
            onClick={() => setShowTrackConfirm(true)}
            disabled={!selectedTrack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Reset Entire Track
          </button>
        </div>

        {/* ─── CARD 3: Nuclear Reset ─── */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'rgba(var(--accent-red), 0.05)',
            border: '2px solid var(--accent-red)'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-[var(--accent-red)]" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--accent-red)' }}>⚠ Full System Reset</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Erases ALL progress for ALL users. Content (courses, exercises) is preserved. This cannot be undone.
          </p>

          <div className="space-y-3 mb-4">
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="Type your admin password to confirm"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
            />
          </div>

          <button
            onClick={handleNuclearReset}
            disabled={!adminPassword || resetting === 'all'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            style={{ backgroundColor: adminPassword && resetting !== 'all' ? 'var(--accent-red)' : 'var(--accent-red)' }}
          >
            {resetting === 'all' ? (
              <>
                <RotateCcw size={14} className="animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Everything'
            )}
          </button>
        </div>
      </div>

      {/* Confirmation modals */}
      <ConfirmModal
        isOpen={showCourseConfirm}
        title="Reset Course Progress"
        message={`Are you sure you want to reset all progress for "${selectedCourse?.name}"? This will delete all attempts, mastery scores, and set enrolled users back to "Not Started".`}
        confirmLabel="Reset Course"
        confirmDanger
        onConfirm={handleResetCourse}
        onCancel={() => setShowCourseConfirm(false)}
      />

      <ConfirmModal
        isOpen={showTrackConfirm}
        title="Reset Track Progress"
        message={`Are you sure you want to reset progress for ALL courses in "${selectedTrack?.name}"? This will delete all attempts and mastery scores across the entire track.`}
        confirmLabel="Reset Track"
        confirmDanger
        onConfirm={handleResetTrack}
        onCancel={() => setShowTrackConfirm(false)}
      />
    </div>
  )
}

function SystemSection({ config }) {
  if (!config) return null
  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">System Configuration</h2>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(config).map(([key, value]) => (
              <tr key={key} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3 font-semibold text-[var(--text-muted)] uppercase tracking-wider text-xs">{key}</td>
                <td className="px-4 py-3 text-[var(--text-primary)] font-mono text-xs break-all">{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminPanel({ user, onLogout }) {
  const navigate = useNavigate()
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })
  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [tracks, setTracks] = useState(null)
  const [courses, setCourses] = useState(null)
  const [users, setUsers] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [globalMessage, setGlobalMessage] = useState('')

  const toggleTheme = () => {
    const next = !isLight
    setIsLight(next)
    if (next) {
      document.documentElement.classList.add('light-theme')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-theme')
      localStorage.setItem('theme', 'dark')
    }
  }

  useEffect(() => {
    if (globalMessage) {
      const t = setTimeout(() => setGlobalMessage(''), 4000)
      return () => clearTimeout(t)
    }
  }, [globalMessage])

  const fetchSection = useCallback(async (section) => {
    try {
      switch (section) {
        case 'dashboard': {
          const res = await fetch('/api/admin/stats')
          if (res.ok) setStats(await res.json())
          break
        }
        case 'tracks': {
          const res = await fetch('/api/admin/tracks')
          if (res.ok) setTracks((await res.json()).tracks)
          break
        }
        case 'courses': {
          const res = await fetch('/api/admin/courses')
          if (res.ok) setCourses((await res.json()).courses)
          break
        }
        case 'users': {
          const res = await fetch('/api/admin/users')
          if (res.ok) setUsers((await res.json()).users)
          break
        }
        case 'system': {
          const res = await fetch('/api/admin/system/config')
          if (res.ok) setConfig((await res.json()).config)
          break
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${section}:`, err)
      setError(`Failed to load ${section} data`)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchSection(activeSection).finally(() => setLoading(false))
  }, [activeSection, fetchSection])

  useEffect(() => {
    fetchSection('dashboard')
    fetchSection('tracks')
    fetchSection('courses')
    fetchSection('users')
    fetchSection('system')
  }, [fetchSection])

  function renderSection() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-400 font-semibold">{error}</p>
          <button onClick={() => fetchSection(activeSection)} className="mt-3 text-sm text-[var(--accent-green)] hover:underline cursor-pointer">
            Retry
          </button>
        </div>
      )
    }

    switch (activeSection) {
      case 'dashboard': return <DashboardSection data={stats} />
      case 'tracks': return <TracksSection tracks={tracks} onRefresh={() => fetchSection('tracks')} />
      case 'courses': return <CoursesSection courses={courses} onRefresh={() => fetchSection('courses')} />
      case 'exercises': return <ExercisesSection onMessage={setGlobalMessage} />
      case 'users': return <UsersSection users={users} onRefresh={() => fetchSection('users')} />
      case 'reset': return <ResetSection onMessage={setGlobalMessage} />
      case 'system': return <SystemSection config={config} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Standalone Top Bar */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20">
            <span className="text-xs font-black italic tracking-tighter">DC</span>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)] hidden sm:inline">Admin Panel</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:border-zinc-700 bg-[var(--bg-card)] hover:bg-[var(--bg-primary)] transition-all cursor-pointer"
            title={isLight ? 'Dark Mode' : 'Light Mode'}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} className="text-[var(--accent-yellow)]" />}
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 border border-[var(--border)] transition-all cursor-pointer"
          >
            <ExternalLink size={14} />
            Back to App
          </button>

          {user && (
            <span className="hidden md:inline text-xs text-[var(--text-muted)] px-2">{user.username}</span>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 border border-[var(--border)] transition-all cursor-pointer"
            >
              <LogOut size={14} />
              Logout
            </button>
          )}
        </div>
      </header>

      {/* Body: Sidebar + Content */}
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
        <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-sidebar)] overflow-y-auto">
          <div className="px-4 py-4">
            <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Sections</h2>
            <nav className="space-y-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.key
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[rgba(255,255,255,0.04)] text-[var(--accent-green)] font-bold border-l-2 border-[var(--accent-green)]'
                        : 'text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                    }`}
                  >
                    <Icon size={16} />
                    {section.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          {globalMessage && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">
              {globalMessage}
            </div>
          )}
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
