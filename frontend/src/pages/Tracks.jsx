import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, Check, Play, BookOpen as BookIcon, CheckCircle2, Circle } from 'lucide-react'

const CATEGORIES = [
  { id: 'all', label: 'All Topics' },
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

  if (course.track_language?.toLowerCase() === 'python' || slug.includes('python') || slug.includes('pandas') || slug.includes('seaborn') || slug.includes('matplotlib') || slug.includes('scikit-learn') || slug.includes('statsmodels')) {
    categories.push('python')
  }
  if (course.track_language?.toLowerCase() === 'sql' || slug.includes('sql') || slug.includes('postgresql')) {
    categories.push('sql')
  }
  if (slug.includes('powerbi') || slug.includes('power-bi')) {
    categories.push('powerbi')
  }
  if (slug.includes('statistics') || slug.includes('sampling') || slug.includes('hypothesis') || slug.includes('regression') || name.includes('statistics') || name.includes('regression') || name.includes('hypothesis') || name.includes('sampling')) {
    categories.push('statistics')
  }
  if (slug.includes('supervised-learning') || slug.includes('scikit-learn') || slug.includes('machine-learning') || slug.includes('ml') || slug.includes('regression') || name.includes('learning') || name.includes('machine learning') || name.includes('regression')) {
    categories.push('ML')
  }
  if (slug.includes('chatgpt') || slug.includes('gpt') || slug.includes('llm') || slug.includes('generative-ai') || name.includes('chatgpt') || name.includes('gpt')) {
    categories.push('chatgpt')
  }
  if (slug.includes('communication') || slug.includes('communicating') || slug.includes('insight') || name.includes('communication') || name.includes('communicating')) {
    categories.push('data communication')
  }
  if (slug.includes('visualization') || slug.includes('seaborn') || slug.includes('matplotlib') || slug.includes('visualizing') || name.includes('visualization') || name.includes('visualizing') || name.includes('seaborn') || name.includes('matplotlib')) {
    categories.push('data visualization')
  }
  return categories
}

function masteryColor(value) {
  if (value >= 70) return 'var(--accent-green)'
  if (value >= 40) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function difficultyBadgeClass(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'border-[var(--accent-green)] text-[var(--accent-green)]'
    case 'medium': return 'border-[var(--accent-yellow)] text-[var(--accent-yellow)]'
    case 'hard': return 'border-[var(--accent-red)] text-[var(--accent-red)]'
    default: return 'border-[var(--text-muted)] text-[var(--text-muted)]'
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'Completed': return 'border-[var(--accent-green)] text-[var(--accent-green)]'
    case 'In Progress': return 'border-[var(--accent-yellow)] text-[var(--accent-yellow)] font-semibold'
    default: return 'border-[var(--border)] text-[var(--text-muted)]'
  }
}

function SkeletonCard() {
  return (
    <div className="h-[240px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="h-1 bg-[var(--border)] w-full" />
      <div className="animate-pulse p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 rounded bg-[var(--border)]" />
          <div className="h-4 w-12 rounded bg-[var(--border)]" />
        </div>
        <div className="h-6 w-3/4 rounded bg-[var(--border)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--border)]" />
        <div className="space-y-2 pt-2">
          <div className="h-2 rounded bg-[var(--border)]" />
          <div className="h-8 rounded bg-[var(--border)] w-full" />
        </div>
      </div>
    </div>
  )
}

function CourseCard({ course }) {
  const navigate = useNavigate()
  const mastery = Number(course.overall_mastery ?? 0)

  let buttonText = 'Start Course'
  if (course.status === 'Completed') {
    buttonText = 'Review Course'
  } else if (course.status === 'In Progress') {
    buttonText = 'Continue'
  }

  return (
    <article className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)] transition-all flex flex-col justify-between h-full">
      <div className="h-1" style={{ backgroundColor: course.track_color || 'var(--accent-blue)' }} />
      
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Badges / Topic Row */}
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${difficultyBadgeClass(course.difficulty)}`}>
              {course.difficulty}
            </span>
            
            <div className="flex gap-1.5 items-center">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(course.status)}`}>
                {course.status}
              </span>
              {course.reviewed === 'Yes' && (
                <span className="flex items-center justify-center rounded-full bg-[rgba(3,239,98,0.1)] text-[var(--accent-green)] p-0.5" title="Reviewed">
                  <CheckCircle2 size={12} />
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="mt-3 text-lg font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
            {course.name}
          </h2>

          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Part of <span className="text-[var(--text-primary)]">{course.track_name}</span>
          </div>
        </div>

        {/* Mastery progress */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Course Mastery</span>
            <span className="font-bold" style={{ color: masteryColor(mastery) }}>{mastery.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(Math.max(mastery, 0), 100)}%`,
                backgroundColor: masteryColor(mastery),
              }}
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => navigate(`/courses/${course.slug}`)}
          className={`mt-5 w-full flex items-center justify-center gap-2 rounded py-2 text-sm font-bold transition-all ${
            course.status === 'Completed'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-muted)]'
              : 'bg-[var(--accent-green)] text-[var(--bg-primary)] hover:brightness-110'
          }`}
        >
          {course.status === 'In Progress' ? <Play size={14} className="fill-current" /> : <BookIcon size={14} />}
          <span>{buttonText}</span>
        </button>
      </div>
    </article>
  )
}

export default function Tracks() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

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

  // Filter logic
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(search.toLowerCase()) ||
                          course.slug.toLowerCase().includes(search.toLowerCase()) ||
                          course.track_name?.toLowerCase().includes(search.toLowerCase())
    
    if (selectedCategory === 'all') {
      return matchesSearch
    }

    const courseCategories = getCourseCategories(course)
    return matchesSearch && courseCategories.includes(selectedCategory)
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">My Courses</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Track your progress and practice interactive data science exercises</p>
        </div>
      </header>

      {/* Search and Filters Bar */}
      <div className="space-y-4 rounded border border-[var(--border)] bg-[var(--bg-card)] p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search courses by name or track..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-primary)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)] focus:outline-none transition-colors"
          />
        </div>

        {/* Filter tags */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[var(--accent-green)] text-[var(--bg-primary)] shadow-sm'
                  : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded border border-[var(--accent-red)] bg-[rgba(255,77,77,0.12)] p-4 text-[var(--accent-red)]">
          {error}
        </div>
      ) : null}

      {!loading && !error && filteredCourses.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)]">
          No courses found matching the search criteria or selected topic.
        </div>
      ) : null}

      {!loading && !error && filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
