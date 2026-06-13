import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Trash2,
  FileText,
  HelpCircle,
  AlertTriangle,
  FolderOpen
} from 'lucide-react'
import PdfViewer from '../components/PdfViewer'

function masteryColor(value) {
  if (value >= 70) return 'var(--accent-green)'
  if (value >= 40) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

export default function ManageCourseDetail() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()
  
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingField, setSavingField] = useState(null)
  
  // PDF Viewer states
  const [showPdf, setShowPdf] = useState(false)
  const [pdfType, setPdfType] = useState('slides')

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses/${courseSlug}`)
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Course not found' : 'Failed to fetch course details')
      }
      const data = await res.json()
      setCourse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourseData()
  }, [courseSlug])

  const handleUpdateProperty = async (property, value) => {
    if (!course) return
    setSavingField(property)
    try {
      const res = await fetch(`/api/courses/${courseSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [property]: value })
      })

      if (res.ok) {
        setCourse(prev => prev ? { ...prev, [property]: value } : null)
      } else {
        alert(`Failed to update ${property}`)
      }
    } catch (err) {
      console.error(err)
      alert(`Error updating ${property}`)
    } finally {
      setSavingField(null)
    }
  }


  const handleCourseAction = async (actionType, value) => {
    if (!course) return
    const body = { courseId: course.id }
    if (actionType === 'delete') body.is_deleted = value
    if (actionType === 'archive') body.is_archived = value

    try {
      const res = await fetch('/api/manage/course/update-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        if (actionType === 'delete' && value) {
          alert('Course moved to Trash.')
          navigate('/manage')
        } else if (actionType === 'archive') {
          alert(value ? 'Course archived.' : 'Course unarchived.')
          navigate('/manage')
        } else {
          fetchCourseData()
        }
      } else {
        alert('Failed to update course action.')
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent-green)]" />
        <p className="text-sm text-[var(--text-muted)] font-mono">Loading course details...</p>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-[var(--accent-red)] bg-[rgba(255,77,77,0.05)] p-12 text-center max-w-xl mx-auto my-12">
        <AlertTriangle size={48} className="mb-4 text-[var(--accent-red)]" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{error || 'Course not found'}</h2>
        <Link to="/manage" className="mt-6 rounded bg-[var(--accent-red)] px-6 py-2 font-semibold text-white hover:brightness-110">
          Back to Content Manager
        </Link>
      </div>
    )
  }

  const trackColor = course.track_color || 'var(--border)'

  return (
    <div className="space-y-6 pb-12 text-left max-w-6xl mx-auto">
      {showPdf && (
        <PdfViewer
          courseSlug={courseSlug}
          type={pdfType}
          courseName={course.name}
          onClose={() => setShowPdf(false)}
        />
      )}

      {/* Header / Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/manage"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Content Manager
        </Link>
        {savingField && (
          <span className="text-xs text-[var(--accent-yellow)] font-mono animate-pulse">
            Saving updates...
          </span>
        )}
      </div>

      {/* Course Banner */}
      <div
        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-xl relative overflow-hidden"
        style={{ borderLeft: `6px solid ${trackColor}` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--bg-primary)] opacity-20 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
            <span
              className="px-2.5 py-1 rounded-full border bg-zinc-950/40"
              style={{ borderColor: trackColor, color: trackColor }}
            >
              {course.track_name}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] bg-zinc-950/40">
              Language: {course.track_language || 'Python'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
            {course.name}
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-2xl leading-relaxed">
            Course ID: {course.id} • Slug: {course.slug}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Properties Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-blue)] border-b border-[var(--border)] pb-3">
              Course Properties
            </h2>

            {/* 1. Completion Status */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Completion Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Not Started', label: 'Not Started', colorClass: 'hover:border-zinc-500' },
                  { id: 'In Progress', label: 'In Progress', colorClass: 'hover:border-[var(--accent-yellow)] text-[var(--accent-yellow)] border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/5' },
                  { id: 'Completed', label: 'Completed', colorClass: 'hover:border-[var(--accent-green)] text-[var(--accent-green)] border-[var(--accent-green)] bg-[var(--accent-green)]/5' }
                ].map(st => {
                  const isActive = course.status === st.id
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={savingField === 'status'}
                      onClick={() => handleUpdateProperty('status', st.id)}
                      className={`py-3 px-2 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                        isActive
                          ? st.id === 'Completed'
                            ? 'bg-[var(--accent-green)] text-black border-[var(--accent-green)] font-extrabold shadow-lg shadow-[var(--accent-green)]/10 scale-[1.02]'
                            : st.id === 'In Progress'
                            ? 'bg-[var(--accent-yellow)] text-black border-[var(--accent-yellow)] font-extrabold shadow-lg shadow-[var(--accent-yellow)]/10 scale-[1.02]'
                            : 'bg-zinc-700 text-white border-zinc-600 font-extrabold scale-[1.02]'
                          : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-zinc-700'
                      }`}
                    >
                      {st.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Difficulty */}
            <div className="space-y-3 pt-4 border-t border-[var(--border)]/60">
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Course Difficulty
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Easy', label: 'Easy', activeStyle: 'bg-[var(--accent-green)] text-black border-[var(--accent-green)] shadow-lg shadow-[var(--accent-green)]/10' },
                  { id: 'Medium', label: 'Medium', activeStyle: 'bg-[var(--accent-yellow)] text-black border-[var(--accent-yellow)] shadow-lg shadow-[var(--accent-yellow)]/10' },
                  { id: 'Hard', label: 'Hard', activeStyle: 'bg-[var(--accent-red)] text-white border-[var(--accent-red)] shadow-lg shadow-[var(--accent-red)]/10' },
                  { id: 'Unknown', label: 'Unknown', activeStyle: 'bg-zinc-700 text-white border-zinc-600' }
                ].map(diff => {
                  const isActive = (course.difficulty || 'Unknown') === diff.id
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      disabled={savingField === 'difficulty'}
                      onClick={() => handleUpdateProperty('difficulty', diff.id)}
                      className={`py-3 px-1 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                        isActive
                          ? `${diff.activeStyle} font-extrabold scale-[1.02]`
                          : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-zinc-700'
                      }`}
                    >
                      {diff.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Reviewed Status */}
            <div className="space-y-3 pt-4 border-t border-[var(--border)]/60">
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Reviewed status
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'No', label: 'Not Reviewed', activeStyle: 'bg-zinc-700 text-white border-zinc-600' },
                  { id: 'Yes', label: 'Reviewed ✓', activeStyle: 'bg-[var(--accent-green)] text-black border-[var(--accent-green)] font-extrabold shadow-lg shadow-[var(--accent-green)]/10' }
                ].map(rev => {
                  const isActive = (course.reviewed || 'No') === rev.id
                  return (
                    <button
                      key={rev.id}
                      type="button"
                      disabled={savingField === 'reviewed'}
                      onClick={() => handleUpdateProperty('reviewed', rev.id)}
                      className={`py-3 px-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                        isActive
                          ? `${rev.activeStyle} scale-[1.02]`
                          : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-zinc-700'
                      }`}
                    >
                      {rev.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: PDF Controls & Danger Zone */}
        <div className="lg:col-span-5 space-y-6">
          {/* PDF & Content Controls */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-3">
              Slides & Glossary
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (course.has_pdf) {
                    setPdfType('slides')
                    setShowPdf(true)
                  } else {
                    alert('No PDF slides available for this course.')
                  }
                }}
                disabled={!course.has_pdf}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs font-semibold text-left transition-all ${
                  course.has_pdf
                    ? 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--accent-blue)] hover:border-[var(--accent-blue)] cursor-pointer'
                    : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText size={16} /> View PDF Slides
                </span>
                <span className="text-[10px] uppercase font-bold">
                  {course.has_pdf ? 'Available' : 'Unavailable'}
                </span>
              </button>

              <button
                onClick={() => {
                  if (course.has_glossary) {
                    setPdfType('glossary')
                    setShowPdf(true)
                  } else {
                    alert('No glossary PDF available for this course.')
                  }
                }}
                disabled={!course.has_glossary}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs font-semibold text-left transition-all ${
                  course.has_glossary
                    ? 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--accent-blue)] hover:border-[var(--accent-blue)] cursor-pointer'
                    : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText size={16} /> View Course Glossary
                </span>
                <span className="text-[10px] uppercase font-bold">
                  {course.has_glossary ? 'Available' : 'Unavailable'}
                </span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-900/40 bg-[var(--bg-card)] p-5 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-950/10 rounded-full blur-xl pointer-events-none" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-red)] border-b border-red-900/20 pb-3">
              Danger Zone
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleCourseAction('archive', course.is_archived === 1 ? false : true)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  course.is_archived === 1
                    ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5 hover:bg-[var(--accent-blue)] hover:text-black hover:border-[var(--accent-blue)]'
                    : 'border-zinc-700 text-zinc-300 bg-zinc-950/20 hover:border-zinc-400 hover:text-white'
                }`}
              >
                {course.is_archived === 1 ? (
                  <>
                    <ArchiveRestore size={14} /> Restore from Archive
                  </>
                ) : (
                  <>
                    <Archive size={14} /> Archive Course
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const confirm = window.confirm(`Move "${course.name}" to trash? You can restore it later from Trash in Content Manager.`)
                  if (confirm) handleCourseAction('delete', true)
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/40 text-[var(--accent-red)] font-bold hover:bg-[var(--accent-red)] hover:text-white hover:border-[var(--accent-red)] transition-all cursor-pointer"
              >
                <Trash2 size={14} /> Move to Trash
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
