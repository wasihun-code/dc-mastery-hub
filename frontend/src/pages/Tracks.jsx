import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Play,
  Layers,
  FileText,
  AlertTriangle,
  X
} from 'lucide-react'
import CourseFilter, { getCourseCategories } from '../components/CourseFilter'

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

function CourseCard({ course, onShowNoQuestions, selectedTrack }) {
  const navigate = useNavigate()
  const mastery = Math.round(Number(course.overall_mastery ?? 0))

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

  const handleClick = (e) => {
    if (e) e.stopPropagation();
    if (course.reviewed !== 'Yes') {
      onShowNoQuestions(course, 'not_reviewed')
    } else if (!course.quiz_question_count || course.quiz_question_count === 0) {
      onShowNoQuestions(course, 'no_questions')
    } else {
      navigate(`/courses/${course.slug}`)
    }
  }

  const activeTrackObj = course.tracks?.find(t => t.name === selectedTrack) || course.tracks?.[0]
  const cardBorderColor = activeTrackObj?.color || course.track_color || 'var(--border)'

  return (
    <article
      onClick={handleClick}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/15 transition-all cursor-pointer select-none gap-6 group relative overflow-hidden"
      style={{ borderLeftWidth: '5px', borderLeftColor: cardBorderColor }}
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
        
        {course.tracks && course.tracks.length > 0 ? (
          <div className="mt-2 text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-zinc-500">Tracks:</span>
            {course.tracks.map((t) => (
              <span key={t.id} className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-0.5 rounded text-[10px] text-zinc-300 font-semibold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course.track_color }} />
            Part of {course.track_name}
          </p>
        )}
      </div>

      {/* Actions and Progress Wrapper */}
      <div className="flex flex-wrap items-center gap-4 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end pt-4 sm:pt-0 border-t sm:border-0 border-[var(--border)]/60 w-full sm:w-auto">
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
              {mastery}%
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
          onClick={handleClick}
          className={`shrink-0 rounded-lg px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
            course.status === 'Completed'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
              : 'bg-[var(--accent-green)] text-black hover:opacity-90'
          }`}
        >
          {course.status === 'In Progress' ? (
            <Play size={12} className="fill-current" />
          ) : (
            <BookOpen size={12} />
          )}
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
  const [selectedTrack, setSelectedTrack] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedReviewed, setSelectedReviewed] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedHasExercises, setSelectedHasExercises] = useState('present')
  const [noQuestionsModal, setNoQuestionsModal] = useState({ show: false, courseName: '', courseSlug: '', type: 'no_questions' })

  const handleShowNoQuestions = (course, type = 'no_questions') => {
    setNoQuestionsModal({ show: true, courseName: course.name, courseSlug: course.slug, type })
  }

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
      uniqueTracks.push({ name: c.track_name, id: c.track_id, color: c.track_color, language: c.track_language })
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
    const matchesCategory = selectedCategory === 'all' || courseCategories.includes(selectedCategory)
    const matchesTrack = selectedTrack === 'all' || (course.tracks && course.tracks.some(t => t.name === selectedTrack))
    const matchesStatus = selectedStatus === 'all' || course.status === selectedStatus
    const matchesReviewed = selectedReviewed === 'all' || course.reviewed === selectedReviewed
    const matchesDifficulty = selectedDifficulty === 'all' || (course.difficulty || 'Unknown') === selectedDifficulty
    const matchesHasExercises = selectedHasExercises === 'all' || (course.quiz_question_count && course.quiz_question_count > 0)

    return matchesSearch && matchesCategory && matchesTrack && matchesStatus && matchesReviewed && matchesDifficulty && matchesHasExercises
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

      {/* Filters on top */}
      <div className="w-full">
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
        />
      </div>

      {/* Main Content Area */}
      <main className="w-full space-y-4">
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
              <CourseCard key={course.id} course={course} onShowNoQuestions={handleShowNoQuestions} selectedTrack={selectedTrack} />
            ))}
          </div>
        ) : null}
      </main>
      
      {noQuestionsModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200 text-left">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[var(--accent-yellow)]">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-lg text-[var(--text-primary)]">
                  {noQuestionsModal.type === 'not_reviewed' ? 'Course Not Reviewed' : 'No Questions Yet'}
                </h3>
              </div>
              <button 
                onClick={() => setNoQuestionsModal({ show: false, courseName: '', courseSlug: '', type: 'no_questions' })}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {noQuestionsModal.type === 'not_reviewed' ? (
                <p className="text-sm text-[var(--text-primary)]">
                  For a better experience we recommend you to review the course. After reviewing change the status in the content management page.
                </p>
              ) : (
                <p className="text-sm text-[var(--text-primary)]">
                  The course <strong>{noQuestionsModal.courseName}</strong> does not have any questions generated yet.
                </p>
              )}
              
              {noQuestionsModal.type !== 'not_reviewed' && (
                <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] text-xs text-[var(--text-muted)] space-y-2 font-mono">
                  <p className="font-bold text-[var(--accent-green)]">To generate questions:</p>
                  <p>1. Open your terminal or query the agent.</p>
                  <p className="bg-black/40 p-2 rounded text-[var(--text-primary)] border border-zinc-800">
                    extract {noQuestionsModal.courseSlug}
                  </p>
                  <p>2. Refresh the course page or study session once completed.</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setNoQuestionsModal({ show: false, courseName: '', courseSlug: '', type: 'no_questions' })}
                  className="px-5 py-2.5 text-xs font-bold rounded-lg bg-[var(--accent-green)] text-black hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
