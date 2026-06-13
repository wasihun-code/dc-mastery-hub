import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { 
  ArrowLeft, 
  Brain, 
  HelpCircle, 
  PenLine, 
  Database, 
  Shuffle, 
  Swords, 
  FileText, 
  AlertCircle,
  Book,
  AlertTriangle,
  X
} from 'lucide-react'
import PdfViewer from '../components/PdfViewer'

function masteryColor(value) {
  if (value >= 70) return 'var(--accent-green)'
  if (value >= 40) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function masteryTier(value) {
  if (value >= 90) return 'Mastered ⭐'
  if (value >= 70) return 'Proficient'
  if (value >= 40) return 'Learning'
  return 'Beginner'
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
    case 'In Progress': return 'border-[var(--accent-yellow)] text-[var(--accent-yellow)]'
    default: return 'border-[var(--border)] text-[var(--text-muted)]'
  }
}

function SkeletonHeader() {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 rounded bg-[var(--border)]" />
          <div className="h-8 w-64 rounded bg-[var(--border)]" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-[var(--border)]" />
            <div className="h-6 w-24 rounded-full bg-[var(--border)]" />
            <div className="h-6 w-20 rounded-full bg-[var(--border)]" />
          </div>
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

function ExerciseCard({ icon: Icon, title, description, stat, statColor, buttonText, onClick, disabled, warning, isBoss, stats }) {
  let itemLabel = "questions"
  let availableLabel = "questions available"
  let unattemptedLabel = "unattempted"

  if (title === "Flashcards") {
    itemLabel = "cards reviewed"
    availableLabel = "cards available"
    unattemptedLabel = "unattempted"
  } else if (title === "Fill in the Blank") {
    itemLabel = "concepts practiced"
    availableLabel = "concepts available"
    unattemptedLabel = "unattempted"
  } else if (title === "Dataset Challenge") {
    itemLabel = "challenges attempted"
    availableLabel = "challenges available"
    unattemptedLabel = "unattempted"
  } else if (title === "Matching Game") {
    itemLabel = "pairs matched"
    availableLabel = "pairs available"
    unattemptedLabel = "unattempted"
  } else if (title === "Boss Battle 🔥") {
    itemLabel = "questions faced"
    availableLabel = "questions available"
    unattemptedLabel = "unattempted"
  }

  return (
    <div className={`flex flex-col justify-between rounded border p-5 transition-all ${
      isBoss 
        ? 'border-transparent bg-gradient-to-br from-[#1e2130] to-[#2d2130] ring-1 ring-[var(--accent-red)]/50' 
        : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
    }`}>
      <div>
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${isBoss ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]' : 'bg-[var(--bg-primary)] text-[var(--accent-blue)]'}`}>
            <Icon size={20} />
          </div>
          <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>
        </div>
        <p className="mt-3 text-sm text-[var(--text-muted)]">{description}</p>
        
        {stats && (
          <div className="mt-3 space-y-2 select-none">
            {stats.sessions > 0 ? (
              <>
                <div className="flex flex-wrap gap-[6px] text-[11px] font-bold">
                  <span className="rounded px-2 py-0.5 border border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-primary)]">
                    {stats.sessions} attempted
                  </span>
                  <span className="rounded px-2 py-0.5 border border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-primary)]">
                    {stats.attempted} {itemLabel}
                  </span>
                  <span className="rounded px-2 py-0.5 border border-[var(--accent-green)]/30 text-[var(--accent-green)] bg-[rgba(3,239,98,0.05)]">
                    {stats.correct} correct
                  </span>
                  <span className="rounded px-2 py-0.5 border border-[var(--accent-red)]/30 text-[var(--accent-red)] bg-[rgba(239,68,68,0.05)]">
                    {stats.wrong} wrong
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]/20 pt-1.5 mt-1 font-medium">
                  <span>{stats.available} {availableLabel}</span>
                  <span>{stats.unattempted} {unattemptedLabel}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] italic text-[var(--text-muted)]">No attempts yet</div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]/20 pt-1.5 mt-1 font-medium">
                  <span>{stats.available} {availableLabel}</span>
                  <span>{stats.available} {unattemptedLabel}</span>
                </div>
              </>
            )}
          </div>
        )}

        <p className={`mt-4 text-xs font-medium ${statColor || 'text-[var(--text-muted)]'}`}>{stat}</p>
        {warning && <p className="mt-1 text-[10px] text-[var(--accent-red)]">{warning}</p>}
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`mt-6 w-full rounded py-2 text-sm font-bold transition-all ${
          disabled
            ? 'cursor-not-allowed bg-[var(--border)] text-[var(--text-muted)]'
            : isBoss
            ? 'bg-[var(--accent-red)] text-white hover:brightness-110'
            : 'bg-[var(--accent-green)] text-[var(--bg-primary)] hover:brightness-110'
        }`}
      >
        {buttonText}
      </button>
    </div>
  )
}

export default function CourseDetail() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [course, setCourse] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // PDF Viewer states
  const [showPdf, setShowPdf] = useState(false)
  const [pdfType, setPdfType] = useState('slides')
  
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const fetchData = async () => {
      try {
        const [courseRes, statsRes] = await Promise.all([
          fetch(`/api/courses/${courseSlug}`),
          fetch(`/api/progress/exercise-stats/${courseSlug}`)
        ])

        if (!courseRes.ok) throw new Error(courseRes.status === 404 ? 'Course not found' : 'Failed to fetch course')
        if (!statsRes.ok) throw new Error('Failed to fetch exercise stats')
        
        const courseData = await courseRes.json()
        const statsData = await statsRes.json()

        if (isMounted) {
          setCourse(courseData)
          setStats(statsData)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { isMounted = false }
  }, [courseSlug, location.search])

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonHeader />
        <div className="h-24 w-full animate-pulse rounded bg-[var(--bg-card)]" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 animate-pulse rounded border border-[var(--border)] bg-[var(--bg-card)]" />
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
        <Link to="/courses" className="mt-6 rounded bg-[var(--accent-red)] px-6 py-2 font-semibold text-white hover:brightness-110">
          Back to My Courses
        </Link>
      </div>
    )
  }

  if (!course) return null

  if (course.reviewed !== 'Yes') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200 text-left">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
            <div className="flex items-center gap-2 text-[var(--accent-yellow)]">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Course Not Reviewed</h3>
            </div>
            <button 
              onClick={() => navigate('/courses')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-none cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-[var(--text-primary)]">
              For a better experience we recommend you to review the course. After reviewing change the status in the content management page.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => navigate('/courses')}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-[var(--accent-green)] text-black hover:opacity-90 transition-opacity cursor-pointer"
              >
                Back to My Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {showPdf && (
        <PdfViewer 
          courseSlug={courseSlug} 
          type={pdfType} 
          courseName={course.name} 
          onClose={() => setShowPdf(false)} 
        />
      )}

      {/* SECTION 1 - COURSE HEADER */}
      <header className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)]" style={{ borderLeft: `6px solid ${course.track.color}` }}>
        <div className="flex flex-col gap-8 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <Link to="/courses" className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ArrowLeft size={16} /> Back to My Courses
            </Link>
            <h1 className="mt-4 text-[26px] font-bold text-[var(--text-primary)]">{course.name}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase ${difficultyBadgeClass(course.difficulty)}`}>
                {course.difficulty}
              </span>
              <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${statusBadgeClass(course.status)}`}>
                {course.status}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${course.track.language === 'SQL' ? 'bg-[rgba(52,211,153,0.16)] text-[#34d399]' : 'bg-[rgba(167,139,250,0.16)] text-[#a78bfa]'}`}>
                {course.track.language}
              </span>
              
              {/* Slides Badge */}
              <button 
                onClick={() => { if (course.has_pdf) { setPdfType('slides'); setShowPdf(true); } }}
                disabled={!course.has_pdf}
                className={`flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold transition-all ${
                  course.has_pdf 
                    ? 'bg-[rgba(3,239,98,0.1)] text-[var(--accent-green)] hover:scale-105 active:scale-95' 
                    : 'bg-[rgba(148,163,184,0.1)] text-[var(--text-muted)] cursor-default'
                }`}
              >
                <FileText size={12} /> {course.has_pdf ? 'Slides' : 'No Slides'}
              </button>

              {/* Glossary Badge */}
              {course.has_glossary === 1 && (
                <button 
                  onClick={() => { setPdfType('glossary'); setShowPdf(true); }}
                  className="flex items-center gap-1 rounded-full bg-[rgba(96,165,250,0.1)] text-[var(--accent-blue)] px-3 py-0.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
                >
                  <Book size={12} /> Glossary
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 2 - OVERALL MASTERY BAR */}
      <section className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Course Mastery</h2>
          </div>
          <span className="text-sm font-bold" style={{ color: masteryColor(course.overall_mastery) }}>
            {masteryTier(course.overall_mastery)} ({Math.round(course.overall_mastery || 0)}%)
          </span>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-[var(--bg-primary)]">
          <div 
            className="h-full rounded-full transition-all duration-1000"
            style={{ 
              width: `${Math.round(course.overall_mastery || 0)}%`,
              backgroundColor: masteryColor(course.overall_mastery)
            }}
          />
        </div>
      </section>

      {/* SECTION 3 - EXERCISE HUB */}
      <section>
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Exercise Hub</h2>
            <p className="text-sm text-[var(--text-muted)]">Choose an exercise type to practice this course</p>
          </div>
          <div className="flex gap-2">
            {course.has_pdf === 1 && (
              <button 
                onClick={() => { setPdfType('slides'); setShowPdf(true); }}
                className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all"
              >
                <FileText size={14} /> View Slides
              </button>
            )}
            {course.has_glossary === 1 && (
              <button 
                onClick={() => { setPdfType('glossary'); setShowPdf(true); }}
                className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all"
              >
                <Book size={14} /> View Glossary
              </button>
            )}
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ExerciseCard 
            icon={Brain}
            title="Flashcards"
            description="Spaced repetition to lock in concepts"
            stat={`${course.flashcards_due_today || 0} cards due today`}
            statColor={course.flashcards_due_today > 0 ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-muted)]'}
            buttonText="Start Flashcards"
            onClick={() => navigate(`/exercise/flashcards/${courseSlug}`)}
            disabled={course.flashcard_count === 0}
            warning={course.flashcard_count === 0 ? "No flashcards yet — add slides first" : null}
            stats={stats?.flashcard}
          />
          <ExerciseCard 
            icon={HelpCircle}
            title="Multiple Choice Quiz"
            description="Test your knowledge with timed questions"
            stat={`${course.quiz_question_count || 0} questions available`}
            buttonText="Start Quiz"
            onClick={() => navigate(`/exercise/quiz/${courseSlug}`)}
            disabled={course.quiz_question_count === 0}
            warning={course.quiz_question_count === 0 ? "No questions yet — add slides first" : null}
            stats={stats?.mcq}
          />
          <ExerciseCard 
            icon={PenLine}
            title="Fill in the Blank"
            description="Complete code snippets from memory"
            stat={`${course.concept_count || 0} concepts available`}
            buttonText="Start Coding"
            onClick={() => navigate(`/exercise/fillblank/${courseSlug}`)}
            disabled={course.concept_count === 0}
            stats={stats?.ftb}
          />
          <ExerciseCard 
            icon={Database}
            title="Dataset Challenge"
            description="Write real code against real datasets"
            stat="Hands-on coding exercises"
            buttonText="Start Challenge"
            onClick={() => navigate(`/exercise/dataset/${courseSlug}`)}
            stats={stats?.dataset}
          />
          <ExerciseCard 
            icon={Shuffle}
            title="Matching Game"
            description="Match concepts to definitions — timed"
            stat={`${course.concept_count || 0} pairs available`}
            buttonText="Start Matching"
            onClick={() => navigate(`/exercise/matching/${courseSlug}`)}
            disabled={course.concept_count === 0}
            stats={stats?.matching}
          />
          <ExerciseCard 
            icon={Swords}
            isBoss={true}
            title="Boss Battle 🔥"
            description="Mixed challenge — prove your mastery"
            stat="Ready to battle!"
            statColor="text-[var(--accent-green)]"
            buttonText="Enter Battle"
            onClick={() => navigate(`/exercise/boss/${courseSlug}`)}
            disabled={false}
            stats={stats?.boss_battle}
          />
        </div>
      </section>
    </div>
  )
}
