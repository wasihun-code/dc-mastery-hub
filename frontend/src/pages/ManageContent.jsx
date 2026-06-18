import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderPlus,
  FilePlus,
  ArrowRight,
  Trash2,
  RotateCcw,
  Archive,
  Upload,
  FileText,
  Layers,
  Wrench,
  CheckSquare,
  Square,
  ArchiveRestore,
  Trash,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import CourseFilter, { getCourseCategories } from '../components/CourseFilter'

function difficultyBadgeClass(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-green-950/20 border-green-800/40 text-green-400'
    case 'medium':
      return 'bg-yellow-950/20 border-yellow-800/40 text-yellow-400'
    case 'hard':
      return 'bg-red-950/20 border-red-800/40 text-red-400'
    default:
      return 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400'
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'Completed':
      return 'bg-green-950/40 border-[var(--accent-green)]/40 text-[var(--accent-green)]'
    case 'In Progress':
      return 'bg-yellow-950/40 border-[var(--accent-yellow)]/40 text-[var(--accent-yellow)]'
    default:
      return 'bg-zinc-900 border-[var(--border)] text-[var(--text-muted)]'
  }
}

export default function ManageContent() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('courses') // 'tracks', 'courses', 'upload', 'trash'
  const [tracks, setTracks] = useState([])
  const [courses, setCourses] = useState([])
  const [trashItems, setTrashItems] = useState({ tracks: [], courses: [] })
  const [archivedItems, setArchivedItems] = useState({ tracks: [], courses: [] })
  const [loading, setLoading] = useState(true)

  // Filter states
  const [courseSearch, setCourseSearch] = useState('')
  const [courseFilterTrack, setCourseFilterTrack] = useState('all')
  const [courseFilterCategory, setCourseFilterCategory] = useState('all')
  const [courseFilterStatus, setCourseFilterStatus] = useState('all')
  const [courseFilterDifficulty, setCourseFilterDifficulty] = useState('all')
  const [courseFilterArchive, setCourseFilterArchive] = useState('active') // 'active', 'archived', 'all'
  const [courseFilterReviewed, setCourseFilterReviewed] = useState('all')
  const [courseFilterHasExercises, setCourseFilterHasExercises] = useState('present')
  const [showFilters, setShowFilters] = useState(false)

  // Selection states for bulk actions
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [selectedManageCourseId, setSelectedManageCourseId] = useState(null)

  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem('manageLeftPanelWidth')) || 420
  })
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    localStorage.setItem('manageLeftPanelWidth', leftPanelWidth)
  }, [leftPanelWidth])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const sidebarWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 0
      const newWidth = Math.max(300, Math.min(e.clientX - sidebarWidth, 600))
      setLeftPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }
  }, [isResizing])

  // Modal states
  const [showAddCourseModal, setShowAddCourseModal] = useState(false)

  // Form states
  const [newTrack, setNewTrack] = useState({ name: '', slug: '', language: 'Python', color: '#60a5fa', description: '' })
  const [newCourse, setNewCourse] = useState({ name: '', slug: '', trackId: '', difficulty: 'Easy' })
  const [bulkAction, setBulkAction] = useState({ action: 'copy', destTrackId: '' })
  
  // Upload state
  const [uploadData, setUploadData] = useState({ courseId: '', fileType: 'pdf', file: null })
  const [uploadProgress, setUploadProgress] = useState('')

  // Load all initial data
  const loadData = async () => {
    setLoading(true)
    try {
      const [resTracks, resCourses, resTrash, resArchived] = await Promise.all([
        fetch('/api/tracks'), 
        fetch('/api/courses'),
        fetch('/api/manage/trash'),
        fetch('/api/manage/archived')
      ])

      if (resTracks.ok) {
        const data = await resTracks.json()
        setTracks(data)
        if (data.length > 0 && !newCourse.trackId) {
          setNewCourse(prev => ({ ...prev, trackId: data[0].id }))
          setBulkAction(prev => ({ ...prev, destTrackId: data[0].id }))
        }
      }
      if (resCourses.ok) setCourses(await resCourses.json())
      if (resTrash.ok) setTrashItems(await resTrash.json())
      if (resArchived.ok) setArchivedItems(await resArchived.json())
    } catch (err) {
      console.error('Error loading management data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handlers
  const handleAddTrack = async (e) => {
    e.preventDefault()
    if (!newTrack.name || !newTrack.slug) return alert('Name and slug are required')
    try {
      const res = await fetch('/api/manage/track/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrack)
      })
      if (res.ok) {
        alert('Track added successfully!')
        setNewTrack({ name: '', slug: '', language: 'Python', color: '#60a5fa', description: '' })
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to add track')
      }
    } catch (err) { console.error(err) }
  }

  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!newCourse.name || !newCourse.slug || !newCourse.trackId) return alert('Name, slug, and track are required')
    try {
      const res = await fetch('/api/manage/course/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      })
      if (res.ok) {
        alert('Course added successfully!')
        setNewCourse({ name: '', slug: '', trackId: tracks[0]?.id || '', difficulty: 'Easy' })
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to add course')
      }
    } catch (err) { console.error(err) }
  }

  const handleTrackAction = async (trackId, actionType, value) => {
    const body = { trackId }
    if (actionType === 'delete') body.is_deleted = value
    if (actionType === 'archive') body.is_archived = value
    try {
      const res = await fetch('/api/manage/track/update-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) loadData()
      else alert('Failed to update track status')
    } catch (err) { console.error(err) }
  }

  const handleCourseAction = async (courseId, actionType, value) => {
    const body = { courseId }
    if (actionType === 'delete') body.is_deleted = value
    if (actionType === 'archive') body.is_archived = value
    try {
      const res = await fetch('/api/manage/course/update-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) loadData()
      else alert('Failed to update course status')
    } catch (err) { console.error(err) }
  }

  const handleBulkAction = async (e) => {
    e.preventDefault()
    if (selectedCourseIds.length === 0) return alert('No courses selected')
    try {
      const res = await fetch('/api/manage/courses/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseIds: selectedCourseIds,
          action: bulkAction.action,
          destTrackId: bulkAction.destTrackId
        })
      })
      if (res.ok) {
        alert(`Bulk action executed successfully!`)
        setSelectedCourseIds([])
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || 'Bulk action failed')
      }
    } catch (err) { console.error(err) }
  }

  const handleUpdateCourseProperties = async (courseId, properties) => {
    try {
      const res = await fetch('/api/manage/course/update-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, ...properties })
      })
      if (res.ok) loadData()
      else alert('Failed to update course properties.')
    } catch (err) { console.error(err) }
  }

  const handlePermanentDelete = async (type, id, name) => {
    if (!window.confirm(`PERMANENTLY delete "${name}"?`)) return
    try {
      const res = await fetch('/api/manage/trash/permanently-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      })
      if (res.ok) { alert('Item permanently deleted.'); loadData(); }
      else alert('Failed to delete item permanently.')
    } catch (err) { console.error(err) }
  }

  const handleUploadFile = async (e) => {
    e.preventDefault()
    if (!uploadData.courseId || !uploadData.file) return alert('Select course and choose file')
    setUploadProgress('Reading file content...')
    const file = uploadData.file
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target.result.split(',')[1]
      setUploadProgress('Uploading...')
      try {
        const res = await fetch('/api/manage/upload-material', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: Number(uploadData.courseId),
            fileType: uploadData.fileType,
            fileName: file.name,
            fileContent: base64
          })
        })
        if (res.ok) {
          alert('Upload complete!')
          setUploadData(prev => ({ ...prev, file: null }))
          document.getElementById('material-file-input').value = ''
          loadData()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to upload file')
        }
      } catch (err) { console.error(err); alert('Upload failed') }
      finally { setUploadProgress('') }
    }
    reader.readAsDataURL(file)
  }

  const toggleSelectCourse = (id) => {
    setSelectedCourseIds(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id])
  }

  const toggleSelectAll = (coursesList) => {
    const listIds = coursesList.map(c => c.id)
    const allSelected = listIds.every(id => selectedCourseIds.includes(id))
    if (allSelected) setSelectedCourseIds(prev => prev.filter(id => !listIds.includes(id)))
    else setSelectedCourseIds(prev => [...new Set([...prev, ...listIds])])
  }

  const allCourses = [
    ...courses.map(c => ({ ...c, is_archived: 0 })),
    ...archivedItems.courses.map(c => ({ ...c, is_archived: 1 }))
  ]

  const filteredCourses = allCourses.filter((course) => {
    const query = courseSearch.toLowerCase()
    const matchesSearch = course.name.toLowerCase().includes(query) || course.slug.toLowerCase().includes(query) || course.track_name?.toLowerCase().includes(query) || (course.tracks && course.tracks.some(t => t.name.toLowerCase().includes(query)))
    let matchesArchive = true
    if (courseFilterArchive === 'active') matchesArchive = course.is_archived !== 1
    else if (courseFilterArchive === 'archived') matchesArchive = course.is_archived === 1
    const matchesStatus = courseFilterStatus === 'all' || course.status === courseFilterStatus
    const matchesDifficulty = courseFilterDifficulty === 'all' || (course.difficulty || 'Unknown') === courseFilterDifficulty
    let matchesCategory = true
    if (courseFilterCategory !== 'all') matchesCategory = getCourseCategories(course).includes(courseFilterCategory)
    const matchesTrack = courseFilterTrack === 'all' || (course.tracks && course.tracks.some(t => t.name === courseFilterTrack)) || course.track_name === courseFilterTrack
    const matchesReviewed = courseFilterReviewed === 'all' || course.reviewed === courseFilterReviewed
    const hasEx = course.quiz_question_count && course.quiz_question_count > 0
    const matchesHasExercises = courseFilterHasExercises === 'all' || (courseFilterHasExercises === 'present' && hasEx) || (courseFilterHasExercises === 'absent' && !hasEx)
    return matchesSearch && matchesArchive && matchesStatus && matchesDifficulty && matchesCategory && matchesTrack && matchesReviewed && matchesHasExercises
  })

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Wrench className="text-[var(--accent-green)]" /> Content Manager
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Manage courses, tracks, upload files, and manage the trash bin.
          </p>
        </div>
        
        {activeTab === 'courses' && (
          <button
            onClick={() => setShowAddCourseModal(true)}
            className="bg-[var(--accent-green)] text-black font-bold px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-90 flex items-center gap-2 shadow-lg"
          >
            <FilePlus size={16} /> Add New Course
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6">
        {['courses', 'tracks', 'upload', 'trash'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-semibold border-b-2 transition-colors uppercase tracking-wider ${
              activeTab === tab
                ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab} {tab === 'courses' ? `(${courses.length})` : tab === 'tracks' ? `(${tracks.length})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="text-sm text-[var(--text-muted)] animate-pulse font-bold tracking-widest uppercase">Loading manager...</span>
        </div>
      ) : (
        <div className="animate-in fade-in duration-200">
          
          {/* 1. COURSES TAB */}
          {activeTab === 'courses' && (
            <div 
              className="fixed top-[220px] right-0 bottom-0 overflow-hidden flex bg-[var(--border)] z-0"
              style={{ left: 'var(--sidebar-width)' }}
            >
              {/* LEFT PANEL - COURSE LIST */}
              <aside 
                className="relative flex flex-col bg-[var(--bg-primary)] overflow-hidden shrink-0 border-r border-[var(--border)]"
                style={{ width: `${leftPanelWidth}px` }}
              >
                {/* Resize Handle */}
                <div
                  onMouseDown={() => setIsResizing(true)}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-green)]/30 transition-colors z-20"
                />

                <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-primary)] z-10 shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors"
                    >
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                    <button
                      onClick={() => toggleSelectAll(filteredCourses)}
                      className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] px-2.5 py-1 rounded-lg hover:bg-[var(--bg-primary)]"
                    >
                      Toggle Select All
                    </button>
                  </div>
                  
                  {showFilters && (
                    <CourseFilter
                      courses={allCourses}
                      search={courseSearch}
                      onSearchChange={setCourseSearch}
                      selectedStatus={courseFilterStatus}
                      onStatusChange={setCourseFilterStatus}
                      selectedReviewed={courseFilterReviewed}
                      onReviewedChange={setCourseFilterReviewed}
                      selectedDifficulty={courseFilterDifficulty}
                      onDifficultyChange={setCourseFilterDifficulty}
                      selectedCategory={courseFilterCategory}
                      onCategoryChange={setCourseFilterCategory}
                      selectedTrack={courseFilterTrack}
                      onTrackChange={setCourseFilterTrack}
                      selectedArchive={courseFilterArchive}
                      onArchiveChange={setCourseFilterArchive}
                      showArchiveFilter={true}
                      selectedHasExercises={courseFilterHasExercises}
                      onHasExercisesChange={setCourseFilterHasExercises}
                      onReset={() => {
                        setCourseFilterArchive('active')
                        setCourseFilterStatus('all')
                        setCourseFilterReviewed('all')
                        setCourseFilterDifficulty('all')
                        setCourseFilterCategory('all')
                        setCourseFilterTrack('all')
                        setCourseFilterHasExercises('present')
                        setCourseSearch('')
                      }}
                      compact={true}
                    />
                  )}

                  {/* Bulk Actions Inline Row */}
                  {selectedCourseIds.length > 0 && (
                    <div className="mt-4 flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg shadow-sm animate-in slide-in-from-top-2 duration-200">
                      <span className="text-[10px] font-bold text-[var(--accent-blue)] shrink-0">({selectedCourseIds.length}) SEL</span>
                      <select
                        value={bulkAction.action}
                        onChange={(e) => setBulkAction(prev => ({ ...prev, action: e.target.value }))}
                        className="flex-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] p-1 text-[10px] text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="copy">Copy to Track</option>
                        <option value="move">Move to Track</option>
                        <option value="archive">Archive</option>
                        <option value="unarchive">Unarchive</option>
                        <option value="mark_reviewed">Mark Reviewed</option>
                        <option value="mark_unreviewed">Mark Not Reviewed</option>
                        <option value="delete">Trash</option>
                      </select>
                      {['copy', 'move'].includes(bulkAction.action) && (
                        <select
                          value={bulkAction.destTrackId}
                          onChange={(e) => setBulkAction(prev => ({ ...prev, destTrackId: e.target.value }))}
                          className="flex-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] p-1 text-[10px] text-[var(--text-primary)] focus:outline-none"
                        >
                          {tracks.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={handleBulkAction}
                        className="bg-[var(--accent-blue)] text-white px-3 py-1 rounded text-[10px] font-bold hover:opacity-90"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
                  {filteredCourses.length === 0 ? (
                    <div className="py-12 text-center text-[var(--text-muted)] text-sm flex flex-col items-center gap-3">
                      <Layers size={40} className="opacity-20" />
                      No courses match your filters
                    </div>
                  ) : (
                    filteredCourses.map(course => (
                      <article
                        key={`${course.id}-${course.is_archived}`}
                        onClick={() => setSelectedManageCourseId(course.id)}
                        onDoubleClick={() => navigate(`/courses/${course.slug}`)}
                        className={`flex items-center justify-between rounded-xl border p-4 transition-all cursor-pointer select-none gap-4 group relative overflow-hidden ${
                          selectedManageCourseId === course.id 
                            ? 'bg-[rgba(3,239,98,0.06)] border-[var(--accent-green)]/30' 
                            : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelectCourse(course.id); }}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                          >
                            {selectedCourseIds.includes(course.id) ? <CheckSquare size={18} className="text-[var(--accent-green)]" /> : <Square size={18} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h2 className={`text-[15px] font-bold leading-tight line-clamp-1 mb-2 ${selectedManageCourseId === course.id ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'}`}>
                              {course.name || course.slug || 'Untitled Course'}
                            </h2>

                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] mb-1.5">
                              <span className={`rounded-full border px-1.5 py-0.5 font-bold uppercase ${difficultyBadgeClass(course.difficulty)}`}>
                                {course.difficulty}
                              </span>
                              <span className={`rounded-full border px-1.5 py-0.5 font-semibold ${statusBadgeClass(course.status)}`}>
                                {course.status}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase ${course.reviewed === 'Yes' ? 'bg-green-950/20 text-[var(--accent-green)] border border-green-900/40' : 'bg-yellow-950/20 text-[var(--accent-yellow)] border border-yellow-900/40'}`}>
                                {course.reviewed === 'Yes' ? '✓ REVIEWED' : 'NOT REVIEWED'}
                              </span>
                              {course.has_pdf === 1 && (
                                <span className="bg-blue-950/20 text-[var(--accent-blue)] px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold border border-blue-900/30">
                                  PDF
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {(course.track_name || course.tracks?.[0]?.name) && (
                                <span className="bg-zinc-900/60 border border-zinc-800/80 px-1.5 py-0.5 rounded text-[9px] text-zinc-400 font-semibold truncate">
                                  {course.track_name || course.tracks?.[0]?.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                           <ArrowRight size={16} className={`transition-transform duration-300 ${selectedManageCourseId === course.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'} text-[var(--accent-green)]`} />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </aside>

              {/* RIGHT PANEL - MANAGE COURSE DETAIL */}
              <main className="flex-1 overflow-y-auto bg-[var(--bg-primary)] scroll-smooth">
                {!selectedManageCourseId ? (
                  <div className="flex h-full flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
                    <div className="mb-6 rounded-full bg-[var(--bg-card)] p-8 text-[var(--text-muted)] border border-[var(--border)]">
                      <Wrench size={64} />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Select a Course to Manage</h2>
                    <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
                      Click any course on the left to edit its properties.
                    </p>
                  </div>
                ) : (() => {
                  const course = allCourses.find(c => c.id === selectedManageCourseId)
                  if (!course) return null
                  return (
                    <div key={course.id} className="animate-in fade-in duration-150 p-8 space-y-8">
                       {/* Course Header */}
                       <div>
                         <div className="flex gap-2 mb-2">
                           <span className="bg-blue-950/20 text-[var(--accent-blue)] px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-900/40">
                             {course.track_name || course.tracks?.[0]?.name}
                           </span>
                           <span className="bg-purple-950/20 text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-purple-900/40">
                             {course.track_language || course.tracks?.[0]?.language}
                           </span>
                         </div>
                         <h1 className="text-3xl font-bold text-[var(--text-primary)]">{course.name}</h1>
                         <p className="mt-1 text-xs text-[var(--text-muted)] font-mono">
                           ID: {course.id} | Slug: {course.slug}
                         </p>
                       </div>

                       {/* COURSE PROPERTIES */}
                       <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-6">
                          <h3 className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider">Course Properties</h3>
                          
                          <div className="space-y-4">
                             <div>
                               <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Completion Status</label>
                               <div className="flex flex-wrap gap-2">
                                 {['Not Started', 'In Progress', 'Completed'].map(s => (
                                   <button
                                     key={s}
                                     onClick={() => handleUpdateCourseProperties(course.id, { status: s })}
                                     className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                       course.status === s 
                                         ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-black' 
                                         : 'border-[var(--border)] text-[var(--text-muted)] hover:border-zinc-500'
                                     }`}
                                   >
                                     {s}
                                   </button>
                                 ))}
                               </div>
                             </div>

                             <div>
                               <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Difficulty</label>
                               <div className="flex flex-wrap gap-2">
                                 {['Easy', 'Medium', 'Hard', 'Unknown'].map(d => (
                                   <button
                                     key={d}
                                     onClick={() => handleUpdateCourseProperties(course.id, { difficulty: d })}
                                     className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                       course.difficulty === d 
                                         ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-black' 
                                         : 'border-[var(--border)] text-[var(--text-muted)] hover:border-zinc-500'
                                     }`}
                                   >
                                     {d}
                                   </button>
                                 ))}
                               </div>
                             </div>

                             <div>
                               <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Reviewed Status</label>
                               <div className="flex gap-2">
                                 {[ { val: 'No', label: 'Not Reviewed' }, { val: 'Yes', label: 'Reviewed ✓' }].map(r => (
                                   <button
                                     key={r.val}
                                     onClick={() => handleUpdateCourseProperties(course.id, { reviewed: r.val })}
                                     className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                       course.reviewed === r.val 
                                         ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-black' 
                                         : 'border-[var(--border)] text-[var(--text-muted)] hover:border-zinc-500'
                                     }`}
                                   >
                                     {r.label}
                                   </button>
                                 ))}
                               </div>
                             </div>
                          </div>
                       </div>

                       {/* SLIDES & GLOSSARY */}
                       <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
                          <h3 className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider">Material & Resources</h3>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="flex flex-col gap-2">
                                <button className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-zinc-500 transition-all">
                                   <span className="flex items-center gap-2"><FileText size={16} className="text-[var(--accent-blue)]" /> PDF Slides</span>
                                   {course.has_pdf === 1 && <span className="bg-green-950/40 text-[var(--accent-green)] px-1.5 py-0.5 rounded-[4px] text-[8px] border border-green-900/40">AVAILABLE</span>}
                                </button>
                             </div>
                             <div className="flex flex-col gap-2">
                                <button className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-zinc-500 transition-all">
                                   <span className="flex items-center gap-2"><Layers size={16} className="text-purple-400" /> Course Glossary</span>
                                   {course.has_glossary === 1 && <span className="bg-green-950/40 text-[var(--accent-green)] px-1.5 py-0.5 rounded-[4px] text-[8px] border border-green-900/40">AVAILABLE</span>}
                                </button>
                             </div>
                          </div>
                       </div>

                       {/* DANGER ZONE */}
                       <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
                          <h3 className="font-bold text-sm text-[var(--accent-red)] uppercase tracking-wider">Danger Zone</h3>
                          <div className="flex gap-4">
                             <button
                               onClick={() => handleCourseAction(course.id, 'archive', course.is_archived ? 0 : 1)}
                               className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-2.5 rounded-lg text-xs hover:bg-zinc-700 transition-all"
                             >
                               <Archive size={14} /> {course.is_archived ? 'Restore Course' : 'Archive Course'}
                             </button>
                             <button
                               onClick={() => handleCourseAction(course.id, 'delete', 1)}
                               className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-red)] text-white font-bold py-2.5 rounded-lg text-xs hover:opacity-90 transition-all"
                             >
                               <Trash2 size={14} /> Move to Trash
                             </button>
                          </div>
                       </div>
                    </div>
                  )
                })()}
              </main>
            </div>
          )}

          {/* 2. TRACKS TAB */}
          {activeTab === 'tracks' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[var(--border)] bg-zinc-900/10">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Active Learning Paths (Tracks)</h3>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {tracks.map(track => (
                      <div key={track.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--bg-primary)]/40 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: track.color }} />
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">{track.name}</h4>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-4.5">Language: {track.language} | Slug: <code className="font-mono text-zinc-450">{track.slug}</code></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleTrackAction(track.id, 'archive', true)} title="Archive Track" className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50"><Archive size={14} /></button>
                          <button onClick={() => handleTrackAction(track.id, 'delete', true)} title="Move to Trash" className="p-1.5 rounded bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {archivedItems.tracks.length > 0 && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden opacity-90">
                    <div className="p-4 border-b border-[var(--border)] bg-zinc-950/20"><h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5"><ArchiveRestore size={14} /> Archived Tracks ({archivedItems.tracks.length})</h3></div>
                    <div className="divide-y divide-[var(--border)] bg-zinc-950/5">{archivedItems.tracks.map(track => (<div key={track.id} className="p-3.5 flex items-center justify-between gap-4"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} /><h4 className="text-xs font-bold text-[var(--text-primary)]">{track.name}</h4></div><button onClick={() => handleTrackAction(track.id, 'archive', false)} className="text-[10px] font-semibold text-[var(--accent-blue)] hover:underline">Unarchive</button></div>))}</div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2"><FolderPlus className="text-[var(--accent-green)]" /> Add New Track</h3>
                <form onSubmit={handleAddTrack} className="space-y-4">
                  <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Track Name</label><input type="text" required value={newTrack.name} onChange={(e) => setNewTrack(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Data Analyst in Python" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none" /></div>
                  <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Track Slug</label><input type="text" required value={newTrack.slug} onChange={(e) => setNewTrack(prev => ({ ...prev, slug: e.target.value }))} placeholder="e.g. data-analyst-python" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-mono" /></div>
                  <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Language</label><select value={newTrack.language} onChange={(e) => setNewTrack(prev => ({ ...prev, language: e.target.value }))} className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"><option value="Python">Python</option><option value="SQL">SQL</option><option value="Power BI">Power BI</option><option value="R">R</option></select></div>
                  <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Track Color (Hex)</label><div className="flex gap-2"><input type="color" value={newTrack.color} onChange={(e) => setNewTrack(prev => ({ ...prev, color: e.target.value }))} className="w-10 h-8 rounded border border-[var(--border)] bg-transparent p-0 cursor-pointer" /><input type="text" value={newTrack.color} onChange={(e) => setNewTrack(prev => ({ ...prev, color: e.target.value }))} placeholder="#60a5fa" className="flex-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-mono" /></div></div>
                  <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Description</label><textarea value={newTrack.description} onChange={(e) => setNewTrack(prev => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Enter track syllabus description..." className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none resize-none" /></div>
                  <button type="submit" className="w-full bg-[var(--accent-green)] hover:opacity-90 text-black font-bold py-2.5 rounded-lg text-xs transition-opacity mt-4 flex items-center justify-center gap-1.5"><FolderPlus size={14} /> Add Track</button>
                </form>
              </div>
            </div>
          )}

          {/* 3. UPLOAD MATERIAL TAB */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 space-y-6 shadow-md">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2"><Upload className="text-[var(--accent-green)]" /> Upload Course Resources</h3>
              <form onSubmit={handleUploadFile} className="space-y-5">
                <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Select Course</label><select value={uploadData.courseId} onChange={(e) => setUploadData(prev => ({ ...prev, courseId: e.target.value }))} required className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"><option value="">Choose a Course...</option>{courses.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.track_language})</option>))}</select></div>
                <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Resource Type</label><select value={uploadData.fileType} onChange={(e) => setUploadData(prev => ({ ...prev, fileType: e.target.value }))} className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"><option value="pdf">PDF Lecture Slides (*.pdf)</option><option value="glossary">Course Glossary PDF (*.pdf)</option><option value="transcript">Course Text Transcript (*.txt)</option><option value="dataset">Live Dataset File (*.csv, *.pkl, *.sql)</option></select></div>
                <div><label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Select File</label><input id="material-file-input" type="file" required onChange={(e) => setUploadData(prev => ({ ...prev, file: e.target.files[0] }))} className="w-full text-xs text-[var(--text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--bg-primary)] file:text-[var(--text-primary)] hover:file:opacity-80 file:cursor-pointer border border-[var(--border)] p-2 rounded-lg" /></div>
                {uploadProgress && (<div className="p-3 bg-zinc-800/40 rounded-lg text-xs font-medium text-[var(--accent-yellow)] animate-pulse flex items-center gap-2"><AlertTriangle size={14} />{uploadProgress}</div>)}
                <button type="submit" disabled={!!uploadProgress} className={`w-full bg-[var(--accent-green)] text-black hover:opacity-90 font-bold py-3 rounded-lg text-xs transition-opacity mt-4 flex items-center justify-center gap-1.5 ${uploadProgress ? 'opacity-50 cursor-not-allowed' : ''}`}><Upload size={14} /> Upload Material</button>
              </form>
            </div>
          )}

          {/* 4. TRASH BIN TAB */}
          {activeTab === 'trash' && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[var(--border)] bg-zinc-950/20"><h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 text-red-400"><Trash size={16} /> Deleted Tracks in Trash ({trashItems.tracks.length})</h3></div>
                {trashItems.tracks.length === 0 ? (<div className="p-6 text-center text-xs text-[var(--text-muted)]">No tracks in trash.</div>) : (<div className="divide-y divide-[var(--border)]">{trashItems.tracks.map(track => (<div key={track.id} className="p-4 flex items-center justify-between gap-4"><div><h4 className="text-xs font-bold text-[var(--text-primary)]">{track.name}</h4><span className="text-[9px] text-[var(--text-muted)] font-mono">Slug: {track.slug}</span></div><div className="flex items-center gap-3"><button onClick={() => handleTrackAction(track.id, 'delete', false)} className="text-xs font-semibold text-[var(--accent-green)] hover:underline flex items-center gap-1"><RotateCcw size={12} /> Restore</button><button onClick={() => handlePermanentDelete('track', track.id, track.name)} className="text-xs font-semibold text-red-450 hover:underline flex items-center gap-1"><Trash2 size={12} /> Permanent Delete</button></div></div>))}</div>)}
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[var(--border)] bg-zinc-950/20"><h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 text-red-400"><Trash size={16} /> Deleted Courses in Trash ({trashItems.courses.length})</h3></div>
                {trashItems.courses.length === 0 ? (<div className="p-6 text-center text-xs text-[var(--text-muted)]">No courses in trash.</div>) : (<div className="divide-y divide-[var(--border)]">{trashItems.courses.map(course => (<div key={course.id} className="p-4 flex items-center justify-between gap-4"><div><h4 className="text-xs font-bold text-[var(--text-primary)]">{course.name}</h4><span className="text-[9px] text-[var(--text-muted)]">Part of Track: {course.track_name}</span></div><div className="flex items-center gap-3"><button onClick={() => handleCourseAction(course.id, 'delete', false)} className="text-xs font-semibold text-[var(--accent-green)] hover:underline flex items-center gap-1"><RotateCcw size={12} /> Restore</button><button onClick={() => handlePermanentDelete('course', course.id, course.name)} className="text-xs font-semibold text-red-455 hover:underline flex items-center gap-1"><Trash2 size={12} /> Permanent Delete</button></div></div>))}</div>)}
              </div>
            </div>
          )}

          {/* Add Course Modal */}
          {showAddCourseModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                  <h3 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                    <FilePlus className="text-[var(--accent-green)]" /> Add New Course
                  </h3>
                  <button onClick={() => setShowAddCourseModal(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={(e) => { handleAddCourse(e); setShowAddCourseModal(false); }} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Course Name</label>
                    <input type="text" required value={newCourse.name} onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Introduction to Python" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Course Slug</label>
                    <input type="text" required value={newCourse.slug} onChange={(e) => setNewCourse(prev => ({ ...prev, slug: e.target.value }))} placeholder="e.g. introduction-to-python" className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Learning Path (Track)</label>
                    <select value={newCourse.trackId} onChange={(e) => setNewCourse(prev => ({ ...prev, trackId: e.target.value }))} className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none">
                      <option value="">Select track...</option>
                      {tracks.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Difficulty</label>
                    <select value={newCourse.difficulty} onChange={(e) => setNewCourse(prev => ({ ...prev, difficulty: e.target.value }))} className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none">
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-[var(--accent-green)] hover:opacity-90 text-black font-bold py-3 rounded-lg text-sm transition-opacity mt-4 flex items-center justify-center gap-1.5 shadow-lg">
                    <FilePlus size={16} /> Create Course
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
