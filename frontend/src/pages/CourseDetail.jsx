import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Brain, 
  HelpCircle, 
  PenLine, 
  Database, 
  Shuffle, 
  Swords, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Circle, 
  AlertCircle,
  BookOpen,
  Check,
  Save,
  ExternalLink
} from 'lucide-react'

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

function ExerciseCard({ icon: Icon, title, description, stat, statColor, buttonText, onClick, disabled, warning, isBoss }) {
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
  
  const [course, setCourse] = useState(null)
  const [concepts, setConcepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllConcepts, setShowAllConcepts] = useState(false)
  
  // Quick Actions states
  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState('') // 'saving', 'saved', ''
  
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const fetchData = async () => {
      try {
        const [courseRes, conceptsRes] = await Promise.all([
          fetch(`/api/courses/${courseSlug}`),
          fetch(`/api/courses/${courseSlug}/concepts`)
        ])

        if (!courseRes.ok) throw new Error(courseRes.status === 404 ? 'Course not found' : 'Failed to fetch course')
        
        const courseData = await courseRes.json()
        const conceptsData = await conceptsRes.json()

        if (isMounted) {
          setCourse(courseData)
          setConcepts(conceptsData)
          setNotes(courseData.notes || '')
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
  }, [courseSlug])

  const handleUpdateCourse = async (updates) => {
    // Optimistic update
    const previousCourse = { ...course }
    setCourse(prev => ({ ...prev, ...updates }))
    
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/courses/${courseSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) throw new Error('Update failed')
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      setCourse(previousCourse)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }

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
        <Link to="/tracks" className="mt-6 rounded bg-[var(--accent-red)] px-6 py-2 font-semibold text-white hover:brightness-110">
          Back to My Tracks
        </Link>
      </div>
    )
  }

  if (!course) return null

  const displayedConcepts = showAllConcepts ? concepts : concepts.slice(0, 10)

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1 - COURSE HEADER */}
      <header className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)]" style={{ borderLeft: `6px solid ${course.track.color}` }}>
        <div className="flex flex-col gap-8 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <Link to={`/tracks/${course.track.slug}`} className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ArrowLeft size={16} /> {course.track.name}
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
              <span className={`flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${course.has_pdf ? 'bg-[rgba(3,239,98,0.1)] text-[var(--accent-green)]' : 'bg-[rgba(148,163,184,0.1)] text-[var(--text-muted)]'}`}>
                <FileText size={12} /> {course.has_pdf ? 'Slides Available' : 'No Slides Yet'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:shrink-0">
            {[
              { label: 'Flashcards', score: course.flashcard_score },
              { label: 'Quizzes', score: course.quiz_score },
              { label: 'Coding', score: course.code_score },
              { label: 'Overall', score: course.overall_mastery, isOverall: true }
            ].map((box) => (
              <div key={box.label} className="flex flex-col items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-center">
                <span className={`text-2xl font-bold ${box.isOverall ? 'text-3xl' : ''}`} style={{ color: masteryColor(box.score) }}>
                  {Number(box.score ?? 0).toFixed(0)}%
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{box.label}</span>
              </div>
            ))}
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
            {masteryTier(course.overall_mastery)}
          </span>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-[var(--bg-primary)]">
          <div 
            className="h-full rounded-full transition-all duration-1000"
            style={{ 
              width: `${course.overall_mastery}%`,
              backgroundColor: masteryColor(course.overall_mastery)
            }}
          />
        </div>
      </section>

      {/* SECTION 3 - EXERCISE HUB */}
      <section>
        <header>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Exercise Hub</h2>
          <p className="text-sm text-[var(--text-muted)]">Choose an exercise type to practice this course</p>
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
          />
          <ExerciseCard 
            icon={PenLine}
            title="Fill in the Blank"
            description="Complete code snippets from memory"
            stat={`${course.concept_count || 0} concepts available`}
            buttonText="Start Coding"
            onClick={() => navigate(`/exercise/fillblank/${courseSlug}`)}
            disabled={course.concept_count === 0}
          />
          <ExerciseCard 
            icon={Database}
            title="Dataset Challenge"
            description="Write real code against real datasets"
            stat="Hands-on coding exercises"
            buttonText="Start Challenge"
            onClick={() => navigate(`/exercise/dataset/${courseSlug}`)}
          />
          <ExerciseCard 
            icon={Shuffle}
            title="Matching Game"
            description="Match concepts to definitions — timed"
            stat={`${course.concept_count || 0} pairs available`}
            buttonText="Start Matching"
            onClick={() => navigate(`/exercise/matching/${courseSlug}`)}
            disabled={course.concept_count === 0}
          />
          <ExerciseCard 
            icon={Swords}
            isBoss={true}
            title="Boss Battle 🔥"
            description="Mixed challenge — prove your mastery"
            stat={course.overall_mastery >= 40 ? "Ready to battle!" : "Complete other exercises first"}
            statColor={course.overall_mastery >= 40 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}
            buttonText="Enter Battle"
            onClick={() => navigate(`/exercise/boss/${courseSlug}`)}
            disabled={course.overall_mastery < 40}
          />
        </div>
      </section>

      {/* SECTION 4 - COURSE INFO PANEL */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Concepts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Key Concepts</h2>
            <span className="rounded bg-[var(--bg-card)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)] border border-[var(--border)]">
              {course.concept_count}
            </span>
          </div>

          {course.concept_count === 0 ? (
            <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
              <BookOpen size={48} className="mb-4 text-[var(--text-muted)] opacity-20" />
              <p className="font-bold text-[var(--text-primary)]">No concepts extracted yet</p>
              <p className="mt-2 text-sm text-[var(--text-muted)] max-w-xs">
                Add slides.pdf to this course folder to extract concepts automatically
              </p>
              <code className="mt-6 rounded bg-[var(--bg-primary)] px-3 py-1.5 text-[10px] text-[var(--text-muted)] border border-[var(--border)]">
                content/tracks/{course.track.slug}/{courseSlug}/slides.pdf
              </code>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedConcepts.map((concept) => (
                <article key={concept.id} className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-bold text-[var(--text-primary)]">{concept.name}</h3>
                    <span className="rounded bg-[var(--bg-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-blue)] border border-[var(--border)]">
                      {concept.category || 'General'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                    {concept.definition}
                  </p>
                  {concept.code_snippet && (
                    <div className="mt-4 overflow-hidden rounded bg-[var(--bg-primary)] border border-[var(--border)]">
                      <pre className="p-3 font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
                        <code>{concept.code_snippet}</code>
                      </pre>
                    </div>
                  )}
                </article>
              ))}
              
              {concepts.length > 10 && (
                <button
                  onClick={() => setShowAllConcepts(!showAllConcepts)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  {showAllConcepts ? 'Show Less' : `View all ${concepts.length} concepts`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          {/* Card 1 - Study Info */}
          <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Course Info</h3>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Track</span>
                <Link to={`/tracks/${course.track.slug}`} className="flex items-center gap-1 font-medium text-[var(--accent-blue)] hover:underline">
                  {course.track.name} <ExternalLink size={12} />
                </Link>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Status</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(course.status)}`}>
                  {course.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Difficulty</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${difficultyBadgeClass(course.difficulty)}`}>
                  {course.difficulty}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Reviewed</span>
                <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                  {course.reviewed === 'Yes' ? (
                    <><CheckCircle2 size={16} className="text-[var(--accent-green)]" /> Yes</>
                  ) : (
                    <><Circle size={16} className="text-[var(--text-muted)]" /> No</>
                  )}
                </div>
              </div>
              <div className="pt-2">
                <span className="text-[var(--text-muted)] block mb-1">Last Notes</span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed italic opacity-80">
                  {course.notes && course.notes !== '-' ? `"${course.notes}"` : 'No notes available'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 - Quick Actions */}
          <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Quick Actions</h3>
            
            <div className="mt-6 space-y-6">
              {/* Status Updater */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Update Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Not Started', 'In Progress', 'Completed'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateCourse({ status: s })}
                      className={`rounded py-2 text-[10px] font-bold transition-all ${
                        course.status === s
                          ? 'bg-[var(--accent-green)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {s === 'Not Started' ? 'Not Star...' : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reviewed Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Mark as Reviewed</label>
                <button
                  onClick={() => handleUpdateCourse({ reviewed: course.reviewed === 'Yes' ? 'No' : 'Yes' })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    course.reviewed === 'Yes' ? 'bg-[var(--accent-green)]' : 'bg-[var(--bg-primary)] border-[var(--border)]'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    course.reviewed === 'Yes' ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Notes Editor */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What was the key takeaway?"
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none transition-colors resize-none"
                  rows={3}
                />
                <button
                  onClick={() => handleUpdateCourse({ notes })}
                  disabled={saveStatus === 'saving'}
                  className="flex w-full items-center justify-center gap-2 rounded bg-[var(--accent-blue)] py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? (
                    'Saving...'
                  ) : saveStatus === 'saved' ? (
                    <><Check size={16} /> Saved!</>
                  ) : (
                    <><Save size={16} /> Save Notes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
