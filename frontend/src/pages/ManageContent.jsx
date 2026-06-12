import { useState, useEffect } from 'react'
import {
  FolderPlus,
  FilePlus,
  Copy,
  ArrowRight,
  Trash2,
  RotateCcw,
  Archive,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  CheckSquare,
  Square,
  Bookmark,
  ArchiveRestore,
  Trash,
  Search,
  SlidersHorizontal
} from 'lucide-react'

const CATEGORIES = [
  { id: 'python', label: 'Python' },
  { id: 'sql', label: 'SQL' },
  { id: 'powerbi', label: 'Power BI' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'ML', label: 'Machine Learning' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'data communication', label: 'Data Communication' },
  { id: 'data visualization', label: 'Data Visualization' },
]

function getCourseCategories(course) {
  const categories = []
  const slug = course.slug.toLowerCase()
  const name = course.name.toLowerCase()

  if (
    course.track_language?.toLowerCase() === 'python' ||
    slug.includes('python') ||
    slug.includes('pandas') ||
    slug.includes('seaborn') ||
    slug.includes('matplotlib') ||
    slug.includes('scikit-learn') ||
    slug.includes('statsmodels')
  ) {
    categories.push('python')
  }
  if (course.track_language?.toLowerCase() === 'sql' || slug.includes('sql') || slug.includes('postgresql')) {
    categories.push('sql')
  }
  if (slug.includes('powerbi') || slug.includes('power-bi')) {
    categories.push('powerbi')
  }
  if (
    slug.includes('statistics') ||
    slug.includes('sampling') ||
    slug.includes('hypothesis') ||
    slug.includes('regression') ||
    name.includes('statistics') ||
    name.includes('regression') ||
    name.includes('hypothesis') ||
    name.includes('sampling')
  ) {
    categories.push('statistics')
  }
  if (
    slug.includes('supervised-learning') ||
    slug.includes('scikit-learn') ||
    slug.includes('machine-learning') ||
    slug.includes('ml') ||
    slug.includes('regression') ||
    name.includes('learning') ||
    name.includes('machine learning') ||
    name.includes('regression')
  ) {
    categories.push('ML')
  }
  if (
    slug.includes('chatgpt') ||
    slug.includes('gpt') ||
    slug.includes('llm') ||
    slug.includes('generative-ai') ||
    name.includes('chatgpt') ||
    name.includes('gpt')
  ) {
    categories.push('chatgpt')
  }
  if (
    slug.includes('communication') ||
    slug.includes('communicating') ||
    slug.includes('insight') ||
    name.includes('communication') ||
    name.includes('communicating')
  ) {
    categories.push('data communication')
  }
  if (
    slug.includes('visualization') ||
    slug.includes('seaborn') ||
    slug.includes('matplotlib') ||
    slug.includes('visualizing') ||
    name.includes('visualization') ||
    name.includes('visualizing') ||
    name.includes('seaborn') ||
    name.includes('matplotlib')
  ) {
    categories.push('data visualization')
  }
  return categories
}

export default function ManageContent() {
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

  // Selection states for bulk actions
  const [selectedCourseIds, setSelectedCourseIds] = useState([])

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
        // Fetch all tracks (including deleted/archived for management)
        fetch('/api/tracks'), // wait, GET /tracks filters out deleted/archived, but we need all. Let's fetch all or fetch from specific endpoint if available, otherwise just use standard GET and we fetch trash/archived separately.
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

  // 1. Add Track
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
    } catch (err) {
      console.error(err)
    }
  }

  // 2. Add Course
  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!newCourse.name || !newCourse.slug || !newCourse.trackId) {
      return alert('Name, slug, and track are required')
    }

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
    } catch (err) {
      console.error(err)
    }
  }

  // 3. Track Action (Delete, Archive, Restore, Unarchive)
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
      if (res.ok) {
        loadData()
      } else {
        alert('Failed to update track status')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 4. Course Action (Delete, Archive, Restore, Unarchive)
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
      if (res.ok) {
        loadData()
      } else {
        alert('Failed to update course status')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 5. Bulk Action
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
        alert(`Bulk action "${bulkAction.action}" executed successfully!`)
        setSelectedCourseIds([])
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || 'Bulk action failed')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Update status/difficulty of course
  const handleUpdateCourseProperties = async (courseId, properties) => {
    try {
      const res = await fetch('/api/manage/course/update-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          ...properties
        })
      })
      if (res.ok) {
        // Silently reload data to keep UI snappy
        loadData()
      } else {
        alert('Failed to update course properties.')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 6. Permanent Delete
  const handlePermanentDelete = async (type, id, name) => {
    const confirm = window.confirm(`Are you absolutely sure you want to PERMANENTLY delete "${name}"? This deletes all files on disk and DB records and cannot be undone!`)
    if (!confirm) return

    try {
      const res = await fetch('/api/manage/trash/permanently-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      })
      if (res.ok) {
        alert('Item permanently deleted.')
        loadData()
      } else {
        alert('Failed to delete item permanently.')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 7. Upload file material
  const handleUploadFile = async (e) => {
    e.preventDefault()
    if (!uploadData.courseId || !uploadData.file) return alert('Select course and choose file')

    setUploadProgress('Reading file content...')
    const file = uploadData.file
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target.result.split(',')[1]
      setUploadProgress('Uploading material to course folder on disk...')

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
          // Reset file input element
          document.getElementById('material-file-input').value = ''
          loadData()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to upload file')
        }
      } catch (err) {
        console.error(err)
        alert('Upload failed')
      } finally {
        setUploadProgress('')
      }
    }
    reader.readAsDataURL(file)
  }

  const toggleSelectCourse = (id) => {
    setSelectedCourseIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = (coursesList) => {
    const listIds = coursesList.map(c => c.id)
    const allSelected = listIds.every(id => selectedCourseIds.includes(id))
    if (allSelected) {
      setSelectedCourseIds(prev => prev.filter(id => !listIds.includes(id)))
    } else {
      setSelectedCourseIds(prev => [...new Set([...prev, ...listIds])])
    }
  }

  // Combine active and archived courses
  const allCourses = [
    ...courses.map(c => ({ ...c, is_archived: 0 })),
    ...archivedItems.courses.map(c => ({ ...c, is_archived: 1 }))
  ]

  // Find all active tracks (not trashed)
  const activeTracks = tracks // wait, GET /tracks doesn't return trashed anyway, so `tracks` has active tracks.

  // Dynamic tracks based on all courses
  const uniqueTracks = []
  const trackIds = new Set()
  for (const c of allCourses) {
    if (c.track_name && !trackIds.has(c.track_name)) {
      trackIds.add(c.track_name)
      uniqueTracks.push({ name: c.track_name, id: c.track_id, color: c.track_color })
    }
  }

  // Filter courses based on selections
  const filteredCourses = allCourses.filter((course) => {
    // 1. Keyword search
    const matchesSearch =
      course.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
      course.slug.toLowerCase().includes(courseSearch.toLowerCase()) ||
      course.track_name?.toLowerCase().includes(courseSearch.toLowerCase())

    // 2. Archive status
    let matchesArchive = true
    if (courseFilterArchive === 'active') {
      matchesArchive = course.is_archived !== 1
    } else if (courseFilterArchive === 'archived') {
      matchesArchive = course.is_archived === 1
    }

    // 3. Completion status
    const matchesStatus = courseFilterStatus === 'all' || course.status === courseFilterStatus

    // 4. Difficulty level
    const matchesDifficulty = courseFilterDifficulty === 'all' || (course.difficulty || 'Unknown') === courseFilterDifficulty

    // 5. Category
    let matchesCategory = true
    if (courseFilterCategory !== 'all') {
      const courseCategories = getCourseCategories(course)
      matchesCategory = courseCategories.includes(courseFilterCategory)
    }

    // 6. Track
    const matchesTrack = courseFilterTrack === 'all' || course.track_name === courseFilterTrack

    return matchesSearch && matchesArchive && matchesStatus && matchesDifficulty && matchesCategory && matchesTrack
  })

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Wrench className="text-[var(--accent-green)]" /> Content Manager
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Manage courses, tracks, copy/move nodes, upload files, and manage the content trash bin.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6">
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'courses'
              ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Courses ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('tracks')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'tracks'
              ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Tracks ({tracks.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Upload Material
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'trash'
              ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Trash Bin ({trashItems.courses.length + trashItems.tracks.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="text-sm text-[var(--text-muted)] animate-pulse">Loading manager...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* 1. COURSES TAB */}
          {activeTab === 'courses' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Side: Courses list & Bulk Actions (8 Columns) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Bulk Actions Card */}
                {selectedCourseIds.length > 0 && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4 shadow-md">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
                      Bulk Action ({selectedCourseIds.length} selected)
                    </div>
                    <form onSubmit={handleBulkAction} className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5">Action</label>
                        <select
                          value={bulkAction.action}
                          onChange={(e) => setBulkAction(prev => ({ ...prev, action: e.target.value }))}
                          className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2 text-xs text-[var(--text-primary)] focus:outline-none"
                        >
                          <option value="copy">Copy to Track</option>
                          <option value="move">Move to Track</option>
                          <option value="archive">Archive</option>
                          <option value="unarchive">Unarchive</option>
                          <option value="delete">Move to Trash</option>
                        </select>
                      </div>

                      {['copy', 'move'].includes(bulkAction.action) && (
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5">Destination Track</label>
                          <select
                            value={bulkAction.destTrackId}
                            onChange={(e) => setBulkAction(prev => ({ ...prev, destTrackId: e.target.value }))}
                            className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2 text-xs text-[var(--text-primary)] focus:outline-none"
                          >
                            {tracks.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="bg-[var(--accent-blue)] text-white font-semibold px-4 py-2 rounded-lg text-xs hover:opacity-90 flex items-center gap-1.5"
                      >
                        Apply <ArrowRight size={12} />
                      </button>
                    </form>
                  </div>
                )}

                {/* Courses list */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-zinc-900/10">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Curriculum Courses ({filteredCourses.length})</h3>
                    <button
                      onClick={() => toggleSelectAll(filteredCourses)}
                      className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] px-2.5 py-1 rounded hover:bg-[var(--bg-primary)]"
                    >
                      Toggle Select All
                    </button>
                  </div>
                  
                  <div className="divide-y divide-[var(--border)]">
                    {filteredCourses.length === 0 ? (
                      <div className="p-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                        <Layers className="w-8 h-8 opacity-40 mb-2" />
                        <span className="font-bold text-[var(--text-primary)]">No Matching Courses Found</span>
                        <span>Adjust your filters to explore other curriculum options.</span>
                      </div>
                    ) : (
                      filteredCourses.map(course => {
                        const isSelected = selectedCourseIds.includes(course.id)
                        return (
                          <div key={`${course.id}-${course.is_archived}`} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--bg-primary)]/40 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                onClick={() => toggleSelectCourse(course.id)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                              >
                                {isSelected ? <CheckSquare size={18} className="text-[var(--accent-green)]" /> : <Square size={18} />}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{course.name}</h4>
                                  {course.is_archived === 1 && (
                                    <span className="bg-zinc-800/85 border border-zinc-700 text-zinc-400 text-[9px] rounded px-1.5 py-0.5 font-bold uppercase tracking-wider shrink-0">
                                      Archived
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                                  Slug: <code className="font-mono text-zinc-450">{course.slug}</code> | Path: {course.track_name}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Difficulty Selector */}
                              <select
                                value={course.difficulty || 'Unknown'}
                                onChange={(e) => handleUpdateCourseProperties(course.id, { difficulty: e.target.value })}
                                className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                                <option value="Unknown">Unknown</option>
                              </select>

                              {/* Status Selector */}
                              <select
                                value={course.status || 'Not Started'}
                                onChange={(e) => handleUpdateCourseProperties(course.id, { status: e.target.value })}
                                className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                              >
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>

                              {/* Archive/Unarchive Course */}
                              {course.is_archived === 1 ? (
                                <button
                                  onClick={() => handleCourseAction(course.id, 'archive', false)}
                                  title="Unarchive Course"
                                  className="p-1.5 rounded bg-blue-950/40 text-[var(--accent-blue)] hover:text-blue-300 border border-blue-900/30"
                                >
                                  <ArchiveRestore size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCourseAction(course.id, 'archive', true)}
                                  title="Archive Course"
                                  className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50"
                                >
                                  <Archive size={14} />
                                </button>
                              )}
                              
                              {/* Delete Course (trash) */}
                              <button
                                onClick={() => handleCourseAction(course.id, 'delete', true)}
                                title="Move to Trash"
                                className="p-1.5 rounded bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Right Side: Filters & Add Course Form (4 Columns) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Filter Sidebar */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                      <SlidersHorizontal size={14} /> Filters
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCourseSearch('')
                        setCourseFilterTrack('all')
                        setCourseFilterCategory('all')
                        setCourseFilterStatus('all')
                        setCourseFilterDifficulty('all')
                        setCourseFilterArchive('active')
                      }}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline font-semibold"
                    >
                      Reset Filters
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Keyword Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
                      />
                    </div>
                  </div>

                  {/* Archive Status Filter */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Archive Status
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'active', label: 'Active Courses Only' },
                        { id: 'archived', label: 'Archived Courses Only' },
                        { id: 'all', label: 'All (Active & Archived)' }
                      ].map(st => {
                        const isActive = courseFilterArchive === st.id
                        const count = st.id === 'active'
                          ? allCourses.filter(c => c.is_archived !== 1).length
                          : st.id === 'archived'
                          ? allCourses.filter(c => c.is_archived === 1).length
                          : allCourses.length

                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setCourseFilterArchive(st.id)}
                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                              isActive
                                ? 'bg-[var(--accent-green)] text-black'
                                : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                            }`}
                          >
                            <span>{st.label}</span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                                isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Completion Status
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'all', label: 'All Statuses' },
                        { id: 'Completed', label: 'Completed' },
                        { id: 'In Progress', label: 'In Progress' },
                        { id: 'Not Started', label: 'Not Started' }
                      ].map(st => {
                        const isActive = courseFilterStatus === st.id
                        const count = st.id === 'all'
                          ? allCourses.length
                          : allCourses.filter(c => c.status === st.id).length

                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setCourseFilterStatus(st.id)}
                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                              isActive
                                ? 'bg-[var(--accent-green)] text-black'
                                : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                            }`}
                          >
                            <span>{st.label}</span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                                isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Difficulty Filter */}
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Difficulty Level
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'all', label: 'All Difficulties' },
                        { id: 'Easy', label: 'Easy' },
                        { id: 'Medium', label: 'Medium' },
                        { id: 'Hard', label: 'Hard' },
                        { id: 'Unknown', label: 'Unknown' }
                      ].map(df => {
                        const isActive = courseFilterDifficulty === df.id
                        const count = df.id === 'all'
                          ? allCourses.length
                          : allCourses.filter(c => (c.difficulty || 'Unknown') === df.id).length

                        return (
                          <button
                            key={df.id}
                            type="button"
                            onClick={() => setCourseFilterDifficulty(df.id)}
                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                              isActive
                                ? 'bg-[var(--accent-green)] text-black'
                                : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                            }`}
                          >
                            <span>{df.label}</span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                                isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Category Filter list */}
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Categories & Languages
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCourseFilterCategory('all')}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                          courseFilterCategory === 'all'
                            ? 'bg-[var(--accent-green)] text-black'
                            : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                        }`}
                      >
                        <span>All Categories</span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                            courseFilterCategory === 'all' ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {allCourses.length}
                        </span>
                      </button>

                      {CATEGORIES.map((cat) => {
                        const count = allCourses.filter((c) => getCourseCategories(c).includes(cat.id)).length
                        const isActive = courseFilterCategory === cat.id

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            disabled={count === 0}
                            onClick={() => setCourseFilterCategory(cat.id)}
                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                              isActive
                                ? 'bg-[var(--accent-green)] text-black'
                                : count === 0
                                ? 'opacity-40 cursor-not-allowed bg-transparent text-[var(--text-muted)]'
                                : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/80 text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                                isActive
                                  ? 'bg-black/10 text-black'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Track Filter list */}
                  {uniqueTracks.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        Learning Path (Track)
                      </label>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCourseFilterTrack('all')}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                            courseFilterTrack === 'all'
                              ? 'bg-[var(--accent-blue)] text-white'
                              : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            All Tracks
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                              courseFilterTrack === 'all' ? 'bg-black/10 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {allCourses.length}
                          </span>
                        </button>

                        {uniqueTracks.map((tr) => {
                          const count = allCourses.filter((c) => c.track_name === tr.name).length
                          const isActive = courseFilterTrack === tr.name

                          return (
                            <button
                              key={tr.name}
                              type="button"
                              onClick={() => setCourseFilterTrack(tr.name)}
                              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                                isActive
                                  ? 'bg-[var(--accent-blue)] text-white'
                                  : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate pr-2">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: tr.color || 'var(--text-muted)' }}
                                />
                                <span className="truncate">{tr.name}</span>
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono shrink-0 ${
                                  isActive ? 'bg-black/10 text-white' : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Course Form */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-6 shadow-sm">
                  <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                    <FilePlus className="text-[var(--accent-green)]" /> Add New Course
                  </h3>
                  
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Course Name</label>
                      <input
                        type="text"
                        required
                        value={newCourse.name}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Introduction to Python"
                        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Course Slug</label>
                      <input
                        type="text"
                        required
                        value={newCourse.slug}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="e.g. introduction-to-python"
                        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Learning Path (Track)</label>
                      <select
                        value={newCourse.trackId}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, trackId: e.target.value }))}
                        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="">Select track...</option>
                        {tracks.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Difficulty</label>
                      <select
                        value={newCourse.difficulty}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, difficulty: e.target.value }))}
                        className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[var(--accent-green)] hover:opacity-90 text-black font-bold py-2.5 rounded-lg text-xs transition-opacity mt-4 flex items-center justify-center gap-1.5"
                    >
                      <FilePlus size={14} /> Add Course
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* 2. TRACKS TAB */}
          {activeTab === 'tracks' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Side: Tracks list (8 Columns) */}
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
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-4.5">
                            Language: {track.language} | Slug: <code className="font-mono text-zinc-450">{track.slug}</code>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTrackAction(track.id, 'archive', true)}
                            title="Archive Track"
                            className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50"
                          >
                            <Archive size={14} />
                          </button>
                          
                          <button
                            onClick={() => handleTrackAction(track.id, 'delete', true)}
                            title="Move to Trash"
                            className="p-1.5 rounded bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Archived Tracks */}
                {archivedItems.tracks.length > 0 && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden opacity-90">
                    <div className="p-4 border-b border-[var(--border)] bg-zinc-950/20">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                        <ArchiveRestore size={14} /> Archived Tracks ({archivedItems.tracks.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-[var(--border)] bg-zinc-950/5">
                      {archivedItems.tracks.map(track => (
                        <div key={track.id} className="p-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">{track.name}</h4>
                          </div>
                          <button
                            onClick={() => handleTrackAction(track.id, 'archive', false)}
                            className="text-[10px] font-semibold text-[var(--accent-blue)] hover:underline"
                          >
                            Unarchive
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Add Track Form (4 Columns) */}
              <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <FolderPlus className="text-[var(--accent-green)]" /> Add New Track
                </h3>
                
                <form onSubmit={handleAddTrack} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Track Name</label>
                    <input
                      type="text"
                      required
                      value={newTrack.name}
                      onChange={(e) => setNewTrack(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Data Analyst in Python"
                      className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Track Slug</label>
                    <input
                      type="text"
                      required
                      value={newTrack.slug}
                      onChange={(e) => setNewTrack(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g. data-analyst-python"
                      className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Language</label>
                    <select
                      value={newTrack.language}
                      onChange={(e) => setNewTrack(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="Python">Python</option>
                      <option value="SQL">SQL</option>
                      <option value="Power BI">Power BI</option>
                      <option value="R">R</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Track Color (Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newTrack.color}
                        onChange={(e) => setNewTrack(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-8 rounded border border-[var(--border)] bg-transparent p-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newTrack.color}
                        onChange={(e) => setNewTrack(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#60a5fa"
                        className="flex-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Description</label>
                    <textarea
                      value={newTrack.description}
                      onChange={(e) => setNewTrack(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder="Enter track syllabus description..."
                      className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[var(--accent-green)] hover:opacity-90 text-black font-bold py-2.5 rounded-lg text-xs transition-opacity mt-4 flex items-center justify-center gap-1.5"
                  >
                    <FolderPlus size={14} /> Add Track
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. UPLOAD MATERIAL TAB */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 space-y-6 shadow-md">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Upload className="text-[var(--accent-green)]" /> Upload Course Resources
              </h3>
              
              <form onSubmit={handleUploadFile} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Select Course</label>
                  <select
                    value={uploadData.courseId}
                    onChange={(e) => setUploadData(prev => ({ ...prev, courseId: e.target.value }))}
                    required
                    className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">Choose a Course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.track_language})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Resource Type</label>
                  <select
                    value={uploadData.fileType}
                    onChange={(e) => setUploadData(prev => ({ ...prev, fileType: e.target.value }))}
                    className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="pdf">PDF Lecture Slides (*.pdf)</option>
                    <option value="glossary">Course Glossary PDF (*.pdf)</option>
                    <option value="transcript">Course Text Transcript (*.txt)</option>
                    <option value="dataset">Live Dataset File (*.csv, *.pkl, *.sql)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Select File</label>
                  <input
                    id="material-file-input"
                    type="file"
                    required
                    onChange={(e) => setUploadData(prev => ({ ...prev, file: e.target.files[0] }))}
                    className="w-full text-xs text-[var(--text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--bg-primary)] file:text-[var(--text-primary)] hover:file:opacity-80 file:cursor-pointer border border-[var(--border)] p-2 rounded-lg"
                  />
                </div>

                {uploadProgress && (
                  <div className="p-3 bg-zinc-800/40 rounded-lg text-xs font-medium text-[var(--accent-yellow)] animate-pulse flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {uploadProgress}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!!uploadProgress}
                  className={`w-full bg-[var(--accent-green)] text-black hover:opacity-90 font-bold py-3 rounded-lg text-xs transition-opacity mt-4 flex items-center justify-center gap-1.5 ${
                    uploadProgress ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload size={14} /> Upload Material
                </button>
              </form>
            </div>
          )}

          {/* 4. TRASH BIN TAB */}
          {activeTab === 'trash' && (
            <div className="space-y-6">
              
              {/* Trashed Tracks */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[var(--border)] bg-zinc-950/20">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 text-red-400">
                    <Trash size={16} /> Deleted Tracks in Trash ({trashItems.tracks.length})
                  </h3>
                </div>

                {trashItems.tracks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">No tracks in trash.</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {trashItems.tracks.map(track => (
                      <div key={track.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">{track.name}</h4>
                          <span className="text-[9px] text-[var(--text-muted)] font-mono">Slug: {track.slug}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTrackAction(track.id, 'delete', false)}
                            className="text-xs font-semibold text-[var(--accent-green)] hover:underline flex items-center gap-1"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete('track', track.id, track.name)}
                            className="text-xs font-semibold text-red-450 hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Permanent Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trashed Courses */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[var(--border)] bg-zinc-950/20">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 text-red-400">
                    <Trash size={16} /> Deleted Courses in Trash ({trashItems.courses.length})
                  </h3>
                </div>

                {trashItems.courses.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">No courses in trash.</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {trashItems.courses.map(course => (
                      <div key={course.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">{course.name}</h4>
                          <span className="text-[9px] text-[var(--text-muted)]">Part of Track: {course.track_name}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCourseAction(course.id, 'delete', false)}
                            className="text-xs font-semibold text-[var(--accent-green)] hover:underline flex items-center gap-1"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete('course', course.id, course.name)}
                            className="text-xs font-semibold text-red-455 hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Permanent Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  )
}
