import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GraduationCap
} from 'lucide-react'
import CourseFilter, { getCourseCategories } from '../components/CourseFilter'
import CourseDetail from './CourseDetail'
import MasteryRing from '../components/MasteryRing'

function CourseCard({ course, onSelect, selectedTrack, isSelected }) {
  const mastery = Math.round(Number(course.overall_mastery ?? 0))
  const activeTrackObj = course.tracks?.find(t => t.name === selectedTrack) || course.tracks?.[0]
  const cardBorderLeftColor = isSelected
    ? 'var(--accent-green)'
    : (activeTrackObj?.color || course.track_color || 'var(--accent-blue)')
  const isUnreviewed = course.reviewed !== 'Yes'

  const difficultyDot = {
    easy: 'var(--accent-green)',
    medium: 'var(--accent-yellow)',
    hard: 'var(--accent-red)',
    beginner: 'var(--accent-green)',
    intermediate: 'var(--accent-yellow)',
    advanced: 'var(--accent-red)',
  }[course.difficulty?.toLowerCase()] || 'var(--text-muted)'

  const difficultyColor = {
    easy: 'var(--accent-green)',
    medium: 'var(--accent-yellow)',
    hard: 'var(--accent-red)',
    beginner: 'var(--accent-green)',
    intermediate: 'var(--accent-yellow)',
    advanced: 'var(--accent-red)',
  }[course.difficulty?.toLowerCase()] || 'var(--text-muted)'

  const statusStyle = ({
    Completed: { bg: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', color: 'var(--accent-green)' },
    'In Progress': { bg: 'color-mix(in srgb, var(--accent-yellow) 15%, transparent)', color: 'var(--accent-yellow)' },
    'Not Started': { bg: 'color-mix(in srgb, var(--text-muted) 10%, transparent)', color: 'var(--text-muted)' },
  })[course.status] || null

  return (
    <>
      <style>{`
        .course-card:not(.is-selected):hover {
          border-left-color: color-mix(in srgb, var(--accent-green) 60%, transparent) !important;
          border-top-color: color-mix(in srgb, var(--accent-green) 40%, transparent) !important;
          border-right-color: color-mix(in srgb, var(--accent-green) 40%, transparent) !important;
          border-bottom-color: color-mix(in srgb, var(--accent-green) 40%, transparent) !important;
        }
      `}</style>
    <article
      onClick={() => onSelect(course)}
      className={`course-card flex items-center justify-between rounded-[10px] border p-3 transition-all duration-150 cursor-pointer select-none gap-3 group relative overflow-hidden ${
        isSelected
          ? 'is-selected'
          : 'hover:translate-x-[2px]'
      } ${isUnreviewed ? 'opacity-50 hover:opacity-75' : 'opacity-100'}`}
      style={{
        borderLeft: `3px solid ${cardBorderLeftColor}`,
        borderTop: `1px solid ${isSelected ? 'color-mix(in srgb, var(--accent-green) 40%, transparent)' : 'var(--border)'}`,
        borderRight: `1px solid ${isSelected ? 'color-mix(in srgb, var(--accent-green) 40%, transparent)' : 'var(--border)'}`,
        borderBottom: `1px solid ${isSelected ? 'color-mix(in srgb, var(--accent-green) 40%, transparent)' : 'var(--border)'}`,
        background: isSelected
          ? 'color-mix(in srgb, var(--accent-green) 6%, var(--bg-card))'
          : 'linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card), var(--accent-green) 3%) 100%)',
        boxShadow: isSelected
          ? '0 0 0 1px color-mix(in srgb, var(--accent-green) 30%, transparent)'
          : 'none',
      }}
    >
      <div className="flex-1 min-w-0">
        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: difficultyColor }}>
            <span style={{ color: difficultyDot }}>●</span>
            {course.difficulty || 'Unknown'}
          </span>
          {statusStyle && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
              style={{ background: statusStyle.bg, color: statusStyle.color }}
            >
              {course.status}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className={`text-[15px] font-semibold leading-tight line-clamp-1 ${
          isSelected ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'
        }`}>
          {course.name}
        </h2>

        {/* Track pills */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {course.tracks?.slice(0, 2).map((t) => (
            <span
              key={t.id}
              className="text-[9px] text-[var(--text-muted)] font-normal"
              style={{ background: 'color-mix(in srgb, var(--text-muted) 5%, transparent)', border: 'none', borderRadius: 3, padding: '1px 6px' }}
            >
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* Right: mastery ring */}
      <div className="shrink-0 flex items-center gap-2">
        {isUnreviewed && (
          <span className="text-[var(--accent-yellow)] font-bold uppercase tracking-wider text-[9px] whitespace-nowrap">
            NOT REVIEWED
          </span>
        )}
        <MasteryRing percentage={mastery} size={36} />
      </div>
    </article>
    </>
  )
}

function SkeletonCard() {
  return (
    <div className="h-20 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse flex items-center justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 rounded bg-[var(--border)]" />
        <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
      </div>
      <div className="w-8 h-8 rounded-full bg-[var(--border)] shrink-0" />
    </div>
  )
}

export default function Tracks() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTrack, setSelectedTrack] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedReviewed, setSelectedReviewed] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedHasExercises, setSelectedHasExercises] = useState('present')
  const [selectedNotesTaken, setSelectedNotesTaken] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [scrolledDown, setScrolledDown] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem('tracksLeftPanelWidth')) || 400
  })
  const [isResizing, setIsResizing] = useState(false)

  const listRef = useRef(null)

  const MIN_LIST_PANEL_WIDTH = 280
  const MIN_DETAIL_PANEL_WIDTH = 420
  const containerRef = useRef(null)
  const detailRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const canFitSideBySide = containerWidth >= 920
  const isMobile = containerWidth > 0 && containerWidth < MIN_LIST_PANEL_WIDTH

  useEffect(() => {
    localStorage.setItem('tracksLeftPanelWidth', leftPanelWidth)
  }, [leftPanelWidth])

  useEffect(() => {
    if (!canFitSideBySide) return
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const sidebarWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 0
      const maxLeft = canFitSideBySide ? containerWidth - MIN_DETAIL_PANEL_WIDTH - 20 : 600
      const newWidth = Math.max(300, Math.min(e.clientX - sidebarWidth, maxLeft))
      setLeftPanelWidth(newWidth)
    }
    const handleMouseUp = () => { setIsResizing(false) }
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
  }, [isResizing, canFitSideBySide])

  useEffect(() => {
    let isMounted = true
    fetch('/api/courses')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (isMounted) {
          const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2, Unknown: 3 }
          const sorted = [...data].sort((a, b) => {
            // Primary: mastery % descending (highest first)
            const ma = Number(a.overall_mastery ?? 0)
            const mb = Number(b.overall_mastery ?? 0)
            if (mb !== ma) return mb - ma
            // Secondary: difficulty Easy → Medium → Hard
            const da = difficultyOrder[a.difficulty] ?? 3
            const db = difficultyOrder[b.difficulty] ?? 3
            return da - db
          })
          setCourses(sorted)
          setError('')
        }
      })
      .catch(() => { if (isMounted) setError('Failed to load courses') })
      .finally(() => { if (isMounted) setLoading(false) })
    return () => { isMounted = false }
  }, [])

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.slug.toLowerCase().includes(search.toLowerCase()) ||
      course.track_name?.toLowerCase().includes(search.toLowerCase())
    const courseCategories = getCourseCategories(course)
    const matchesCategory = selectedCategory === 'all' || courseCategories.includes(selectedCategory)
    const matchesTrack = selectedTrack === 'all' || (course.tracks && course.tracks.some(t => t.name === selectedTrack))
    const matchesStatus = selectedStatus === 'all' || course.status === selectedStatus
    const matchesReviewed = selectedReviewed === 'all' || course.reviewed === selectedReviewed
    const matchesNotesTaken = selectedNotesTaken === 'all' || (selectedNotesTaken === 'taken' && course.notes_taken == 1) || (selectedNotesTaken === 'not_taken' && course.notes_taken != 1)
    const matchesDifficulty = selectedDifficulty === 'all' || (course.difficulty || 'Unknown') === selectedDifficulty
    const hasEx = course.quiz_question_count && course.quiz_question_count > 0
    const matchesHasExercises =
      selectedHasExercises === 'all' ||
      (selectedHasExercises === 'present' && hasEx) ||
      (selectedHasExercises === 'absent' && !hasEx)
    return matchesSearch && matchesCategory && matchesTrack && matchesStatus && matchesReviewed && matchesNotesTaken && matchesDifficulty && matchesHasExercises
  })

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    setScrolledDown(scrollTop > 20)
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100
    setScrollProgress(isNaN(progress) ? 0 : progress)
  }

  const scrollByAmount = (amount) => {
    if (listRef.current) {
      listRef.current.scrollBy({ top: amount, behavior: 'smooth' })
    }
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div
      ref={containerRef}
      className="fixed top-[56px] right-0 bottom-0 overflow-hidden flex bg-[var(--border)] z-0"
      style={{
        left: isMobile ? '0px' : 'var(--sidebar-width)',
        flexDirection: canFitSideBySide ? 'row' : 'column',
      }}
    >
      {/* LEFT PANEL - COURSE LIST */}
      <aside
        className="relative flex flex-col bg-[var(--bg-primary)] overflow-hidden shrink-0"
        style={{
          width: canFitSideBySide ? `${leftPanelWidth}px` : '100%',
          maxHeight: canFitSideBySide ? undefined : '45vh',
          borderRight: canFitSideBySide ? '1px solid var(--border)' : undefined,
          borderBottom: canFitSideBySide ? undefined : '1px solid var(--border)',
        }}
      >
        {/* Resize Handle (only in side-by-side mode) */}
        {canFitSideBySide && (
          <div
            onMouseDown={() => setIsResizing(true)}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-green)]/30 transition-colors z-20"
          />
        )}

        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-primary)] z-10 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <CourseFilter
                courses={courses}
                search={search}
                onSearchChange={setSearch}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                selectedReviewed={selectedReviewed}
                onReviewedChange={setSelectedReviewed}
                selectedDifficulty={selectedDifficulty}
                onDifficultyChange={setSelectedDifficulty}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedTrack={selectedTrack}
                onTrackChange={setSelectedTrack}
                selectedHasExercises={selectedHasExercises}
                onHasExercisesChange={setSelectedHasExercises}
                selectedNotesTaken={selectedNotesTaken}
                onNotesTakenChange={setSelectedNotesTaken}
                onReset={() => {
                  setSelectedCategory('all')
                  setSelectedTrack('all')
                  setSelectedStatus('all')
                  setSelectedReviewed('all')
                  setSelectedDifficulty('all')
                  setSelectedHasExercises('present')
                  setSelectedNotesTaken('all')
                  setSearch('')
                }}
                compact={true}
              />
            </div>
          )}
        </div>

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-scroll p-4 pb-24 space-y-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] animate-pulse" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] text-sm flex flex-col items-center gap-3">
              <Layers size={40} className="opacity-20" />
              No courses match your filters
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isSelected={selectedCourseId === course.id}
                  onSelect={(c) => {
                    if (isMobile) {
                      navigate(`/courses/${c.slug}`)
                    } else {
                      setSelectedCourseId(c.id)
                      if (!canFitSideBySide && detailRef.current) {
                        requestAnimationFrame(() => {
                          detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        })
                      }
                    }
                  }}
                  selectedTrack={selectedTrack}
                />
              ))}
            </div>
          )}
        </div>

        {/* Custom Scrollbar Track */}
        <div className="absolute right-0 top-0 bottom-0 w-[8px] bg-[var(--bg-sidebar)] z-20 pointer-events-none">
          <div
            className="w-full bg-[var(--accent-green)] rounded-full transition-all duration-75"
            style={{ height: '10%', transform: `translateY(${scrollProgress * 9}%)` }}
          />
        </div>

        {/* Scroll Buttons */}
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 z-30 pointer-events-none">
          {scrolledDown && (
            <button
              onClick={(e) => { e.stopPropagation(); scrollByAmount(-120) }}
              className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent-green)] shadow-xl hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronUp size={24} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); scrollByAmount(120) }}
            className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent-green)] shadow-xl hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL - COURSE DETAIL */}
      <main
        ref={detailRef}
        className={`overflow-y-auto bg-[var(--bg-primary)] scroll-smooth ${
          isMobile ? 'hidden' : canFitSideBySide ? 'flex-1' : 'flex-1 min-h-0'
        }`}
      >
        {!selectedCourseId ? (
          <div
            className="flex h-full flex-col items-center text-center animate-in fade-in duration-300"
            style={{ justifyContent: 'center', padding: '48px' }}
          >
            <div style={{ transform: 'translateY(-15%)' }}>
              {/* Decorative dashed line */}
              <svg width="160" height="24" className="mb-5 opacity-25" aria-hidden="true">
                <line x1="0" y1="12" x2="160" y2="12" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6" />
                <circle cx="8" cy="12" r="2.5" fill="var(--border)" />
                <circle cx="80" cy="12" r="2.5" fill="var(--border)" />
                <circle cx="152" cy="12" r="2.5" fill="var(--border)" />
              </svg>
              <div
                className="flex items-center justify-center mb-5"
                style={{
                  width: 88, height: 88,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at center, color-mix(in srgb, var(--accent-green) 15%, transparent) 0%, transparent 70%)',
                  border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
                }}
              >
                <GraduationCap size={36} className="text-[var(--text-muted)]" />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Select a Course</h2>
              <p className="text-[13px] text-[var(--text-muted)] max-w-[280px] leading-relaxed">
                Click any course on the left to explore its exercise breakdown, mastery scores, and study options.
              </p>
            </div>
          </div>
        ) : selectedCourse?.reviewed !== 'Yes' ? (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
            <div className="mb-6 text-[var(--accent-yellow)]">
              <AlertTriangle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Review This Course First</h2>
            <p className="mt-4 max-w-[320px] text-sm text-[var(--text-muted)]">
              For the best experience, review the course slides before attempting exercises. Once done, mark it as Reviewed in the Content Manager.
            </p>
            <div className="mt-8 flex flex-col gap-[10px] w-[220px]">
              <button
                onClick={() => navigate('/manage')}
                className="w-full bg-[var(--accent-green)] text-black font-bold py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90"
              >
                Go to Content Manager
              </button>
            </div>
          </div>
        ) : (
          <div key={selectedCourseId} className="animate-in fade-in slide-in-from-right-4 duration-150">
            <div className="p-8">
              <InlineCourseDetail courseSlug={selectedCourse?.slug} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function InlineCourseDetail({ courseSlug }) {
  return <CourseDetail overrideCourseSlug={courseSlug} isInline={true} />
}
