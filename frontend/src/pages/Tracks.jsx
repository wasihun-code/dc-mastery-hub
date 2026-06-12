import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  BookOpen,
  Check,
  Play,
  CheckCircle2,
  Circle,
  Award,
  BookOpen as BookIcon,
  Filter,
  Layers,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  FileText
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

function masteryColor(value) {
  if (value >= 90) return 'var(--accent-green)'
  if (value >= 70) return 'var(--accent-blue)'
  if (value >= 40) return 'var(--accent-yellow)'
  if (value > 0) return 'var(--accent-red)'
  return 'var(--text-muted)'
}

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

function SkeletonCard() {
  return (
    <div className="h-28 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 animate-pulse flex items-center justify-between gap-4">
      <div className="flex-1 space-y-3">
        <div className="h-3.5 w-28 rounded bg-[var(--border)]" />
        <div className="h-5 w-2/3 rounded bg-[var(--border)]" />
      </div>
      <div className="w-12 h-12 rounded-full bg-[var(--border)] shrink-0" />
      <div className="w-24 h-9 rounded bg-[var(--border)] shrink-0" />
    </div>
  )
}

function CourseCard({ course }) {
  const navigate = useNavigate()
  const mastery = Number(course.overall_mastery ?? 0)

  let buttonText = 'Start'
  if (course.status === 'Completed') {
    buttonText = 'Review'
  } else if (course.status === 'In Progress') {
    buttonText = 'Resume'
  }

  // Circular progress math
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (mastery / 100) * circumference

  return (
    <article
      onClick={() => navigate(`/courses/${course.slug}`)}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/15 transition-all cursor-pointer select-none gap-6 group relative overflow-hidden"
      style={{ borderLeftWidth: '5px', borderLeftColor: course.track_color || 'var(--border)' }}
    >
      {/* Course Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className={`rounded-full border px-2 py-0.5 font-bold uppercase ${difficultyBadgeClass(course.difficulty)}`}>
            {course.difficulty}
          </span>
          <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusBadgeClass(course.status)}`}>
            {course.status}
          </span>
          {course.reviewed === 'Yes' && (
            <span className="text-[var(--accent-green)] font-extrabold uppercase tracking-wider flex items-center gap-0.5 bg-green-950/20 px-2 py-0.5 rounded-full border border-green-900/40">
              ✓ Reviewed
            </span>
          )}
          {course.has_pdf === 1 && (
            <span className="text-[var(--accent-blue)] font-bold flex items-center gap-1 bg-blue-950/20 px-2 py-0.5 rounded-full border border-blue-900/40">
              <FileText size={10} /> PDF Slides
            </span>
          )}
        </div>

        <h2 className="mt-3 text-base font-bold text-[var(--text-primary)] leading-snug group-hover:text-[var(--accent-green)] transition-colors line-clamp-1">
          {course.name}
        </h2>
        
        <p className="mt-1 text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course.track_color }} />
          Part of {course.track_name}
        </p>
      </div>

      {/* Mastery Circular Score */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex items-center justify-center">
          <svg className="w-12 h-12 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="24"
              cy="24"
              r={radius}
              stroke="var(--bg-primary)"
              strokeWidth="3.5"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="24"
              cy="24"
              r={radius}
              stroke={masteryColor(mastery)}
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute text-[10px] font-extrabold text-[var(--text-primary)] font-mono">
            {mastery.toFixed(0)}%
          </span>
        </div>
        
        <div className="hidden md:block text-left">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Concept Depth</div>
          <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
            {mastery >= 90 ? 'Mastered' : mastery >= 70 ? 'Proficient' : mastery >= 40 ? 'Learning' : mastery > 0 ? 'Beginner' : 'Not Started'}
          </div>
        </div>
      </div>

      {/* Action CTA Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/courses/${course.slug}`)
        }}
        className={`shrink-0 rounded-lg px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
          course.status === 'Completed'
            ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
            : 'bg-[var(--accent-green)] text-black hover:opacity-90'
        }`}
      >
        {course.status === 'In Progress' ? (
          <Play size={12} className="fill-current" />
        ) : (
          <BookIcon size={12} />
        )}
        <span>{buttonText}</span>
      </button>
    </article>
  )
}

export default function Tracks() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('python')
  const [selectedTrack, setSelectedTrack] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    let isMounted = true

    fetch('/api/courses')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load courses (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        if (isMounted) {
          setCourses(data)
          setError('')
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Collect unique tracks from loaded courses
  const uniqueTracks = []
  const trackIds = new Set()
  for (const c of courses) {
    if (c.track_name && !trackIds.has(c.track_name)) {
      trackIds.add(c.track_name)
      uniqueTracks.push({ name: c.track_name, id: c.track_id, color: c.track_color })
    }
  }

  // Calculate course counts dynamically for categories
  const getCategoryCount = (catId) => {
    return courses.filter((c) => getCourseCategories(c).includes(catId)).length
  }

  // Calculate course counts dynamically for tracks
  const getTrackCount = (trackName) => {
    return courses.filter((c) => c.track_name === trackName).length
  }

  // Filter courses based on selections
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.slug.toLowerCase().includes(search.toLowerCase()) ||
      course.track_name?.toLowerCase().includes(search.toLowerCase())

    const courseCategories = getCourseCategories(course)
    const matchesCategory = courseCategories.includes(selectedCategory)
    const matchesTrack = selectedTrack === 'all' || course.track_name === selectedTrack
    const matchesStatus = selectedStatus === 'all' || course.status === selectedStatus

    return matchesSearch && matchesCategory && matchesTrack && matchesStatus
  })

  // Aggregate stats for metrics bar
  const totalCourses = courses.length
  const completedCourses = courses.filter(c => c.status === 'Completed').length
  const inProgressCourses = courses.filter(c => c.status === 'In Progress').length

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">My Courses</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Explore learning paths, track concept mastery, and launch coding exercises.
          </p>
        </div>

        {/* Dynamic Catalog Summary Badges */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Total:</span>
            <span className="font-bold text-[var(--text-primary)]">{totalCourses}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-yellow)]" />
            <span className="text-[var(--text-muted)]">Active:</span>
            <span className="font-bold text-[var(--text-primary)]">{inProgressCourses}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
            <span className="text-[var(--text-muted)]">Mastered:</span>
            <span className="font-bold text-[var(--text-primary)]">{completedCourses}</span>
          </div>
        </div>
      </div>

      {/* Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Course Listing (9 Columns) */}
        <main className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Courses ({filteredCourses.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-xl border border-[var(--accent-red)] bg-red-950/20 p-4 text-red-400 text-xs">
              {error}
            </div>
          ) : null}

          {!loading && !error && filteredCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
              <Layers className="w-8 h-8 opacity-40 mb-2" />
              <span className="font-bold text-[var(--text-primary)]">No Matching Courses Found</span>
              <span>Adjust your filters or query to explore other curriculum options.</span>
            </div>
          ) : null}

          {!loading && !error && filteredCourses.length > 0 ? (
            <div className="flex flex-col gap-6">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : null}
        </main>

        {/* Right Side: Filter Control Sidebar (3 Columns) */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <SlidersHorizontal size={14} /> Filters
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('python')
                  setSelectedTrack('all')
                  setSelectedStatus('all')
                  setSearch('')
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
                />
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
                  const isActive = selectedStatus === st.id
                  const count = st.id === 'all'
                    ? courses.length
                    : courses.filter(c => c.status === st.id).length

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStatus(st.id)}
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

            {/* Category Filter list */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Categories & Languages
              </label>
              <div className="flex flex-col gap-1.5">
                {CATEGORIES.map((cat) => {
                  const count = getCategoryCount(cat.id)
                  const isActive = selectedCategory === cat.id

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={count === 0}
                      onClick={() => setSelectedCategory(cat.id)}
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
                    onClick={() => setSelectedTrack('all')}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                      selectedTrack === 'all'
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
                        selectedTrack === 'all' ? 'bg-black/10 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {courses.length}
                    </span>
                  </button>

                  {uniqueTracks.map((tr) => {
                    const count = getTrackCount(tr.name)
                    const isActive = selectedTrack === tr.name

                    return (
                      <button
                        key={tr.name}
                        type="button"
                        onClick={() => setSelectedTrack(tr.name)}
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
        </aside>
      </div>
    </div>
  )
}
