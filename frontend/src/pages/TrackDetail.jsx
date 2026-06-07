import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Circle, 
  StickyNote,
  AlertCircle
} from 'lucide-react'

function masteryColor(value) {
  if (value >= 70) return 'var(--accent-green)'
  if (value >= 40) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function languageBadgeClass(language) {
  return language === 'SQL'
    ? 'bg-[rgba(52,211,153,0.16)] text-[#34d399]'
    : 'bg-[rgba(167,139,250,0.16)] text-[#a78bfa]'
}

function difficultyBadgeClass(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'border-[var(--accent-green)] text-[var(--accent-green)]'
    case 'medium':
      return 'border-[var(--accent-yellow)] text-[var(--accent-yellow)]'
    case 'hard':
      return 'border-[var(--accent-red)] text-[var(--accent-red)]'
    default:
      return 'border-[var(--text-muted)] text-[var(--text-muted)]'
  }
}

function SkeletonHeader() {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-[var(--border)]" />
          <div className="h-8 w-64 rounded bg-[var(--border)]" />
          <div className="h-4 w-full max-w-md rounded bg-[var(--border)]" />
          <div className="h-6 w-20 rounded-full bg-[var(--border)]" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 w-24 animate-pulse rounded border border-[var(--border)] bg-[var(--bg-primary)]" />
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonCourseRow() {
  return (
    <div className="animate-pulse rounded border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-[var(--border)]" />
          <div className="space-y-2">
            <div className="h-5 w-48 rounded bg-[var(--border)]" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-[var(--border)]" />
              <div className="h-5 w-20 rounded-full bg-[var(--border)]" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="space-y-2">
            <div className="h-4 w-12 rounded bg-[var(--border)]" />
            <div className="h-2 w-24 rounded bg-[var(--border)]" />
          </div>
          <div className="h-10 w-28 rounded bg-[var(--border)]" />
        </div>
      </div>
    </div>
  )
}

function CourseCard({ course }) {
  const navigate = useNavigate()
  const mastery = Number(course.overall_mastery ?? 0)
  
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Completed':
        return { 
          icon: <CheckCircle2 size={14} />, 
          badge: 'bg-[rgba(3,239,98,0.1)] text-[var(--accent-green)] border-[var(--accent-green)]',
          order: 'bg-[var(--accent-green)] text-[var(--bg-primary)]'
        }
      case 'In Progress':
        return { 
          icon: <Clock size={14} />, 
          badge: 'bg-[rgba(251,191,36,0.1)] text-[var(--accent-yellow)] border-[var(--accent-yellow)]',
          order: 'bg-[var(--accent-yellow)] text-[var(--bg-primary)]'
        }
      default:
        return { 
          icon: <Circle size={14} />, 
          badge: 'bg-[rgba(148,163,184,0.1)] text-[var(--text-muted)] border-[var(--border)]',
          order: 'bg-[var(--border)] text-[var(--text-muted)]'
        }
    }
  }

  const statusConfig = getStatusConfig(course.status)
  const hasNotes = course.notes && course.notes !== '-' && course.notes.trim() !== ''

  return (
    <div className="group relative rounded border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--text-muted)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side */}
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${statusConfig.order}`}>
            {course.order_in_track}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{course.name}</h3>
              {hasNotes && (
                <div className="group/note relative">
                  <StickyNote size={16} className="text-[var(--accent-yellow)] cursor-help" />
                  <div className="absolute bottom-full left-1/2 mb-2 hidden w-48 -translate-x-1/2 rounded bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-primary)] shadow-xl group-hover/note:block z-10 border border-[var(--border)]">
                    {course.notes}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium uppercase ${difficultyBadgeClass(course.difficulty)}`}>
                {course.difficulty}
              </span>
              <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig.badge}`}>
                {statusConfig.icon}
                {course.status}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center justify-between gap-8 sm:justify-end">
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold" style={{ color: masteryColor(mastery) }}>
              {mastery.toFixed(0)}%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Mastery</span>
            <div className="mt-1 h-1.5 w-[120px] overflow-hidden rounded-full bg-[var(--bg-primary)]">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${mastery}%`,
                  backgroundColor: masteryColor(mastery)
                }}
              />
            </div>
          </div>
          
          <button
            onClick={() => navigate(`/courses/${course.slug}`)}
            className={`h-10 rounded px-4 text-sm font-semibold transition-all ${
              course.status === 'Completed'
                ? 'border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-[var(--bg-primary)]'
                : course.status === 'In Progress'
                ? 'bg-[var(--accent-green)] text-[var(--bg-primary)] hover:brightness-110'
                : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Study Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TrackDetail() {
  const { trackSlug } = useParams()
  const navigate = useNavigate()
  const [track, setTrack] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetch(`/api/tracks/${trackSlug}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Track not found')
          throw new Error('Failed to fetch track details')
        }
        return res.json()
      })
      .then((data) => {
        if (isMounted) {
          setTrack(data)
          setError('')
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [trackSlug])

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonHeader />
        <div className="h-12 w-full animate-pulse rounded bg-[var(--bg-card)]" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCourseRow key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-[var(--accent-red)] bg-[rgba(255,77,77,0.05)] p-12 text-center">
        <AlertCircle size={48} className="mb-4 text-[var(--accent-red)]" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{error}</h2>
        <button 
          onClick={() => navigate('/tracks')}
          className="mt-6 rounded bg-[var(--accent-red)] px-6 py-2 font-semibold text-white hover:brightness-110"
        >
          Back to My Tracks
        </button>
      </div>
    )
  }

  if (!track) return null

  const progressPercent = (track.completed_count / track.course_count) * 100
  const isFinalTestUnlocked = track.overall_mastery >= 60

  return (
    <div className="space-y-8">
      {/* SECTION 1 - TRACK HEADER */}
      <header className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)]" style={{ borderLeft: `6px solid ${track.color}` }}>
        <div className="flex flex-col gap-8 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <Link to="/tracks" className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ArrowLeft size={16} /> My Tracks
            </Link>
            <div className="mt-4 flex items-center gap-4">
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">{track.name}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${languageBadgeClass(track.language)}`}>
                {track.language}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-[var(--text-muted)]">{track.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:shrink-0">
            <div className="flex flex-col items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-center">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{track.course_count}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total Courses</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-center">
              <span className="text-2xl font-bold text-[var(--accent-green)]">{track.completed_count}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Completed</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-center">
              <span className="text-2xl font-bold text-[var(--accent-yellow)]">{track.in_progress_count}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">In Progress</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-center">
              <span className="text-2xl font-bold" style={{ color: masteryColor(track.overall_mastery) }}>
                {Number(track.overall_mastery ?? 0).toFixed(0)}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Track Mastery</span>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 2 - PROGRESS BAR */}
      <section className="space-y-3 rounded border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Track Progress</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {track.completed_count} of {track.course_count} courses completed
            </p>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-[var(--bg-primary)]">
          <div 
            className="h-full rounded-full transition-all duration-1000"
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: track.color
            }}
          />
        </div>
      </section>

      {/* SECTION 3 - COURSE LIST */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)] px-1">Curriculum</h2>
        <div className="grid gap-4">
          {track.courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* SECTION 4 - TRACK FINAL TEST BANNER */}
      <section className={`rounded border-2 p-6 transition-all ${
        isFinalTestUnlocked 
          ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.05)]' 
          : 'border-[var(--border)] bg-[var(--bg-card)] opacity-75'
      }`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={`text-xl font-bold ${isFinalTestUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              {isFinalTestUnlocked ? '🎯 Track Final Test Available' : '🔒 Track Final Test Locked'}
            </h2>
            <p className="mt-1 text-[var(--text-muted)]">
              {isFinalTestUnlocked 
                ? "You've reached enough mastery to attempt the final assessment for this track."
                : `Reach 60% overall mastery to unlock the final assessment. Current: ${Number(track.overall_mastery ?? 0).toFixed(1)}%`
              }
            </p>
          </div>
          <button
            onClick={() => navigate(`/track-test/${track.slug}`)}
            disabled={!isFinalTestUnlocked}
            className={`rounded px-8 py-3 font-bold transition-all ${
              isFinalTestUnlocked
                ? 'bg-[var(--accent-green)] text-[var(--bg-primary)] hover:scale-105 active:scale-95'
                : 'cursor-not-allowed bg-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            Take Final Test
          </button>
        </div>
      </section>
    </div>
  )
}
