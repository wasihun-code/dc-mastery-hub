import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Play,
  Layers,
  FileText,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  GraduationCap
} from 'lucide-react'
import CourseFilter, { getCourseCategories } from '../components/CourseFilter'
import CourseDetail from './CourseDetail'

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
    <div className="h-20 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse flex items-center justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 rounded bg-[var(--border)]" />
        <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
      </div>
      <div className="w-8 h-8 rounded-full bg-[var(--border)] shrink-0" />
    </div>
  )
}

function CourseCard({ course, onSelect, selectedTrack, isSelected }) {
  const mastery = Math.round(Number(course.overall_mastery ?? 0))
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (mastery / 100) * circumference

  const activeTrackObj = course.tracks?.find(t => t.name === selectedTrack) || course.tracks?.[0]
  const cardBorderLeftColor = isSelected ? 'var(--accent-green)' : (activeTrackObj?.color || course.track_color || 'var(--accent-blue)')
  
  const isUnreviewed = course.reviewed !== 'Yes'

  return (
    <article
      onClick={() => onSelect(course)}
      onDoubleClick={() => navigate(`/courses/${course.slug}`)}
      className={`flex items-center justify-between rounded-xl border p-[12px_14px] transition-all cursor-pointer select-none gap-3 group relative overflow-hidden ${
        isSelected 
          ? 'bg-[rgba(3,239,98,0.06)] border-[var(--accent-green)]/30' 
          : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-zinc-700'
      } ${isUnreviewed ? 'opacity-50 hover:opacity-75' : 'opacity-100'}`}
      style={{ borderLeft: `3px solid ${cardBorderLeftColor}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-[9px] mb-1.5">
          <span className={`rounded-full border px-1.5 py-0.5 font-bold uppercase ${difficultyBadgeClass(course.difficulty)}`}>
            {course.difficulty}
          </span>
          {course.status === 'Completed' && (
            <span className={`rounded-full border px-1.5 py-0.5 font-semibold ${statusBadgeClass(course.status)}`}>
              {course.status}
            </span>
          )}
        </div>

        <h2 className={`text-[14px] font-bold leading-tight line-clamp-1 ${isSelected ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'}`}>
          {course.name}
        </h2>
        
        <div className="mt-1 flex flex-wrap gap-1">
          {course.tracks?.slice(0, 2).map((t) => (
            <span key={t.id} className="bg-zinc-900/60 border border-zinc-800/80 px-1.5 py-0.5 rounded text-[11px] text-zinc-400 font-semibold">
              {t.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isUnreviewed && (
          <span className="text-[var(--accent-yellow)] font-bold uppercase tracking-wider text-[12px] whitespace-nowrap">
            NOT REVIEWED
          </span>
        )}
        <div className="relative flex items-center justify-center">
          <svg className="w-7 h-7 transform -rotate-90">
            <circle cx="14" cy="14" r={radius} stroke="var(--bg-primary)" strokeWidth="2" fill="transparent" />
            <circle
              cx="14" cy="14" r={radius}
              stroke={masteryColor(mastery)}
              strokeWidth="2.5" fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute text-[7px] font-extrabold text-[var(--text-primary)]">
            {mastery}%
          </span>
        </div>
      </div>
    </article>
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
  const [showFilters, setShowFilters] = useState(false)
  
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [scrolledDown, setScrolledDown] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem('tracksLeftPanelWidth')) || 400
  })
  const [isResizing, setIsResizing] = useState(false)
  
  const listRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('tracksLeftPanelWidth', leftPanelWidth)
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

  useEffect(() => {
    let isMounted = true
    fetch('/api/courses')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (isMounted) {
          // Sort reviewed first
          const sorted = [...data].sort((a, b) => {
            if (a.reviewed === 'Yes' && b.reviewed !== 'Yes') return -1
            if (a.reviewed !== 'Yes' && b.reviewed === 'Yes') return 1
            return 0
          })
          setCourses(sorted)
          setError('')
        }
      })
      .catch((err) => {
        if (isMounted) setError('Failed to load courses')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
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
    const matchesDifficulty = selectedDifficulty === 'all' || (course.difficulty || 'Unknown') === selectedDifficulty
    const hasEx = course.quiz_question_count && course.quiz_question_count > 0
    const matchesHasExercises =
      selectedHasExercises === 'all' ||
      (selectedHasExercises === 'present' && hasEx) ||
      (selectedHasExercises === 'absent' && !hasEx)

    return matchesSearch && matchesCategory && matchesTrack && matchesStatus && matchesReviewed && matchesDifficulty && matchesHasExercises
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
      className="fixed top-[56px] right-0 bottom-0 overflow-hidden flex bg-[var(--border)] z-0"
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
                onReset={() => {
                  setSelectedCategory('all')
                  setSelectedTrack('all')
                  setSelectedStatus('all')
                  setSelectedReviewed('all')
                  setSelectedDifficulty('all')
                  setSelectedHasExercises('present')
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
          className="flex-1 overflow-y-scroll scrollbar-none p-4 pb-24 space-y-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            <div className="space-y-3">
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
            <div className="space-y-3">
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  isSelected={selectedCourseId === course.id}
                  onSelect={(c) => setSelectedCourseId(c.id)}
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
            style={{ 
              height: '10%', 
              transform: `translateY(${scrollProgress * 9}%)` 
            }}
          />
        </div>

        {/* Scroll Buttons */}
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 z-30 pointer-events-none">
          {scrolledDown && (
            <button 
              onClick={(e) => { e.stopPropagation(); scrollByAmount(-120); }}
              className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent-green)] shadow-xl hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronUp size={24} />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); scrollByAmount(120); }}
            className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent-green)] shadow-xl hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL - COURSE DETAIL */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg-primary)] scroll-smooth">
        {!selectedCourseId ? (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
            <div className="mb-6 rounded-full bg-[var(--bg-card)] p-8 text-[var(--text-muted)] border border-[var(--border)]">
              <GraduationCap size={64} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Select a Course</h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
              Click any course on the left to explore its exercise breakdown, mastery scores, and study options.
            </p>
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
