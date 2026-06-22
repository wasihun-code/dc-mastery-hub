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
  X,
  Sparkles,
  ArrowRight,
  Star,
  Target,
  Flame
} from 'lucide-react'
import PdfViewer from '../components/PdfViewer'

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

const CARD_ACCENTS = {
  flashcard: 'var(--accent-blue)',
  mcq: 'var(--accent-green)',
  ftb: 'var(--accent-yellow)',
  dataset: 'var(--accent-blue)',
  matching: 'var(--accent-green)',
  boss_battle: 'var(--accent-red)',
}

function StatusDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
    </span>
  )
}

function SegmentedBar({ correct, wrong, total }) {
  if (total === 0) {
    return <div className="h-[6px] w-full rounded-full bg-[var(--border)]" />
  }
  const correctPct = (correct / total) * 100
  const wrongPct = (wrong / total) * 100
  return (
    <div className="flex h-[6px] w-full rounded-full overflow-hidden bg-[var(--border)]">
      {correct > 0 && (
        <div className="h-full transition-all duration-700" style={{ width: `${correctPct}%`, backgroundColor: 'var(--accent-green)' }} />
      )}
      {wrong > 0 && (
        <div className="h-full transition-all duration-700" style={{ width: `${wrongPct}%`, backgroundColor: 'var(--accent-red)' }} />
      )}
    </div>
  )
}

function ExerciseCard({ icon: Icon, title, description, buttonText, onClick, disabled, isBoss, stats, accentColor }) {
  const getStatus = () => {
    if (disabled) return { label: 'Locked', color: 'var(--accent-red)' }
    if (!stats || stats.sessions === 0) return { label: 'Not Started', color: 'var(--text-muted)' }
    if (stats.unattempted > 0) return { label: 'In Progress', color: 'var(--accent-yellow)' }
    return { label: 'Ready', color: 'var(--accent-green)' }
  }

  const status = getStatus()
  const total = stats ? (stats.correct + stats.wrong + (stats.unattempted || 0)) : 0
  const isDataset = title === 'Dataset Challenge'

  return (
    <div className={`group relative flex flex-col rounded-[10px] border transition-all duration-200 overflow-hidden ${
      disabled ? 'opacity-60' : 'hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5'
    } ${
      isBoss 
        ? 'border-[var(--accent-red)] bg-[var(--bg-card)]' 
        : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent-green)]'
    }`} style={isBoss ? { borderWidth: '1.5px', boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-red) 20%, transparent)' } : {}}>
      <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: accentColor }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-lg p-1.5 shrink-0" style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, color: accentColor }}>
              <Icon size={18} />
            </div>
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] truncate">{title}</h3>
          </div>
          <StatusDot color={status.color} label={status.label} />
        </div>
        
        <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">{description}</p>
        
        {stats && (
          <div className="space-y-1.5">
            <SegmentedBar correct={stats.correct} wrong={stats.wrong} total={total} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <span className={`font-bold text-[var(--accent-green)] ${isDataset ? 'font-mono' : ''}`}>{stats.correct}</span>
              <span className="text-[var(--text-muted)]">correct</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className={`font-bold text-[var(--accent-red)] ${isDataset ? 'font-mono' : ''}`}>{stats.wrong}</span>
              <span className="text-[var(--text-muted)]">wrong</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className={`font-bold text-[var(--text-muted)] ${isDataset ? 'font-mono' : ''}`}>{stats.available}</span>
              <span className="text-[var(--text-muted)]">available</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-end pt-1">
          <button
            onClick={onClick}
            disabled={disabled}
            className="min-h-[44px] rounded-lg px-5 py-2.5 text-[13px] font-bold transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              backgroundColor: disabled ? 'var(--border)' : accentColor,
              color: disabled ? 'var(--text-muted)' : '#ffffff',
            }}
          >
            {disabled ? 'Locked' : isBoss ? 'Enter Battle' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

function IncorrectReviewCard({ status, onCheckUnlock, checking, message, onStart }) {
  if (!status) return null

  const { isUnlocked, attempted, total, attemptRatio, incorrectCount } = status

  if (!isUnlocked) {
    return (
      <div className="group relative flex flex-col rounded-[10px] border border-[var(--accent-red)] bg-[var(--bg-card)] transition-all duration-200 overflow-hidden"
        style={{ backgroundColor: 'rgba(255, 0, 0, 0.03)' }}>
        <div className="h-[3px] w-full shrink-0 bg-[var(--accent-red)]" />
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="rounded-lg p-1.5 shrink-0" style={{ background: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', color: 'var(--accent-red)' }}>
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Incorrect Review</h3>
            </div>
            <StatusDot color="var(--accent-red)" label="Locked" />
          </div>
          
          <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
            Complete 70% of questions across Quiz, Fill in the Blank, and Boss Battle to unlock.
          </p>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)]">
              <span>Progress to Unlock</span>
              <span>{attempted} / {total} ({Math.round(attemptRatio * 100)}%)</span>
            </div>
            <div className="h-[6px] w-full rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border)]">
              <div className="h-full rounded-full bg-[var(--accent-yellow)] transition-all duration-500"
                style={{ width: `${Math.min(100, attemptRatio * 100)}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-center">
              <button
                onClick={onCheckUnlock}
                disabled={checking}
                className="min-h-[44px] rounded-lg px-5 py-2.5 text-[13px] font-bold bg-[var(--accent-blue)] text-white transition-all hover:opacity-90 disabled:opacity-50"
              >
                {checking ? 'Checking...' : 'Check Unlock Status'}
              </button>
            </div>
            {message && (
              <p className={`text-center text-[11px] font-medium ${message.includes('🎉') ? 'text-[var(--accent-green)] animate-pulse' : 'text-[var(--accent-red)]'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:border-[var(--accent-green)] overflow-hidden">
      <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: incorrectCount > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)' }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-lg p-1.5 shrink-0" style={{ background: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', color: 'var(--accent-red)' }}>
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Incorrect Review</h3>
          </div>
          <StatusDot 
            color={incorrectCount > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)'} 
            label={incorrectCount > 0 ? 'In Progress' : 'Ready'} 
          />
        </div>
        
        <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
          Re-attempt questions you answered incorrectly in other categories.
        </p>
        
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-bold text-[var(--text-primary)] leading-none">{incorrectCount}</span>
          <span className="text-[11px] text-[var(--text-muted)]">items in your review queue</span>
        </div>
        
        <div className="flex justify-end pt-1">
          <button
            onClick={onStart}
            disabled={incorrectCount === 0}
            className="min-h-[44px] rounded-lg px-5 py-2.5 text-[13px] font-bold transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              backgroundColor: incorrectCount === 0 ? 'var(--border)' : 'var(--accent-red)',
              color: incorrectCount === 0 ? 'var(--text-muted)' : '#ffffff',
            }}
          >
            {incorrectCount === 0 ? "Queue Empty \u2014 Great Work!" : 'Start Incorrect Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CourseDetail({ overrideCourseSlug, isInline }) {
  const { courseSlug: paramSlug } = useParams()
  const courseSlug = overrideCourseSlug || paramSlug
  const navigate = useNavigate()
  const location = useLocation()
  
  const [course, setCourse] = useState(null)
  const [stats, setStats] = useState(null)
  const [incorrectStatus, setIncorrectStatus] = useState(null)
  const [checkingUnlock, setCheckingUnlock] = useState(false)
  const [unlockMessage, setUnlockMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchIncorrectStatus = async () => {
    try {
      const res = await fetch(`/api/courses/${courseSlug}/incorrect-review-status`)
      if (res.ok) {
        const data = await res.json()
        setIncorrectStatus(data)
        return data
      }
    } catch (err) {
      console.error('Failed to fetch incorrect status:', err)
    }
    return null
  }

  const handleCheckUnlock = async () => {
    setCheckingUnlock(true)
    setUnlockMessage('')
    const data = await fetchIncorrectStatus()
    setCheckingUnlock(false)
    if (data) {
      if (data.isUnlocked) {
        setUnlockMessage('🎉 Incorrect Review unlocked!')
      } else {
        setUnlockMessage(`Not yet — you've attempted ${Math.round(data.attemptRatio * 100)}% of required questions.`)
      }
    }
  }

  // PDF Viewer states
  const [showPdf, setShowPdf] = useState(false)
  const [pdfType, setPdfType] = useState('slides')
  const [showCongrats, setShowCongrats] = useState(false)

  useEffect(() => {
    if (loading || !stats || !courseSlug) return

    const searchParams = new URLSearchParams(location.search)
    if (searchParams.get('refresh') === '1') {
      const keys = ['mcq', 'flashcard', 'ftb', 'matching', 'boss_battle', 'dataset']
      const allDone = keys.every(k => !stats[k] || stats[k].unattempted === 0)
      
      if (allDone) {
        // Clear parameter so it doesn't trigger again
        navigate(location.pathname, { replace: true })
        setShowCongrats(true)
      }
    }
  }, [stats, loading, location.search])
  
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const fetchData = async () => {
      try {
        const [courseRes, statsRes, incorrectRes] = await Promise.all([
          fetch(`/api/courses/${courseSlug}`),
          fetch(`/api/progress/exercise-stats/${courseSlug}`),
          fetch(`/api/courses/${courseSlug}/incorrect-review-status`)
        ])

        if (!courseRes.ok) throw new Error(courseRes.status === 404 ? 'Course not found' : 'Failed to fetch course')
        if (!statsRes.ok) throw new Error('Failed to fetch exercise stats')
        
        const courseData = await courseRes.json()
        const statsData = await statsRes.json()
        const incorrectData = incorrectRes.ok ? await incorrectRes.json() : null

        if (isMounted) {
          setCourse(courseData)
          setStats(statsData)
          setIncorrectStatus(incorrectData)
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

  // Calculate completion percentage across all categories
  const categoryKeys = ['mcq', 'flashcard', 'ftb', 'matching', 'boss_battle', 'dataset']

  // Calculate aggregate stats for header and mastery bar
  const aggregateStats = {
    totalSessions: 0,
    totalCorrect: 0,
    totalAvailable: 0,
    totalPracticed: 0,
    exerciseTypes: 0,
    totalXP: 0 // Placeholder or calculated if possible
  }

  if (stats) {
    categoryKeys.forEach(k => {
      if (stats[k] && stats[k].available > 0) {
        aggregateStats.totalSessions += stats[k].sessions || 0
        aggregateStats.totalCorrect += stats[k].correct || 0
        aggregateStats.totalAvailable += stats[k].available || 0
        aggregateStats.totalPracticed += (stats[k].available || 0) - (stats[k].unattempted || 0)
        aggregateStats.exerciseTypes++
      }
    })
    // Simple XP estimation: 10 XP per correct answer
    aggregateStats.totalXP = aggregateStats.totalCorrect * 10
  }

  const getMasteryLevel = (value) => {
    if (value >= 91) return { label: 'Mastered', color: 'var(--accent-green)' }
    if (value >= 71) return { label: 'Proficient', color: 'var(--accent-blue)' }
    if (value >= 41) return { label: 'Learning', color: 'var(--accent-yellow)' }
    return { label: 'Needs Work', color: 'var(--accent-red)' }
  }

  const completionPercentage = aggregateStats.totalAvailable > 0 ? (aggregateStats.totalPracticed / aggregateStats.totalAvailable) * 100 : 0
  const mastery = getMasteryLevel(course.overall_mastery || 0)

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
    <div className="space-y-7 pb-12">
      {showCongrats && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-green-950/40 border border-[var(--accent-green)]/40 text-[var(--accent-green)] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-950/20">
              <Sparkles size={40} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight italic">Course Fully Completed!</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Outstanding! You have attempted every single question across all categories for this course!
              </p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-2">
                As a master of this course, you are now qualified for the Time-Attack Code Training. Prepare your keyboard!
              </p>
            </div>
            
            <button
              onClick={() => {
                setShowCongrats(false)
                navigate(`/speedrun?course=${courseSlug}`)
              }}
              className="w-full bg-[var(--accent-green)] text-black font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Time-Attack Code Training <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showPdf && (
        <PdfViewer 
          courseSlug={courseSlug} 
          type={pdfType} 
          courseName={course.name} 
          onClose={() => setShowPdf(false)} 
        />
      )}

      {/* SECTION 1 - COURSE HEADER */}
      <header className="space-y-7">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            {!isInline && (
              <Link to="/courses" className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <ArrowLeft size={16} /> Back to My Courses
              </Link>
            )}
            <h1 className={`${isInline ? 'mt-0' : 'mt-4'} text-[26px] font-bold tracking-tight text-[var(--text-primary)]`}>{course.name}</h1>
          </div>

          {isInline && (
            <button
              onClick={() => navigate(`/courses/${courseSlug}`)}
              className="mt-1 shrink-0 rounded-lg border border-[var(--accent-green)] px-3 py-1.5 text-[12px] font-bold text-[var(--accent-green)] transition-all hover:bg-[var(--accent-green)]/5"
            >
              Open Full Page →
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${difficultyBadgeClass(course.difficulty)}`}>
            {course.difficulty}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass(course.status)}`}>
            {course.status}
          </span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${course.track.language === 'SQL' ? 'bg-[color-mix(in_srgb,var(--accent-green)_16%,transparent)] text-[var(--accent-green)]' : 'bg-[color-mix(in_srgb,var(--accent-blue)_16%,transparent)] text-[var(--accent-blue)]'}`}>
            {course.track.language}
          </span>
          {course.has_pdf === 1 && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--accent-green)_10%,transparent)] text-[var(--accent-green)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              Slides Available
            </span>
          )}
          {course.has_glossary === 1 && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--accent-blue)_10%,transparent)] text-[var(--accent-blue)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              Glossary Ready
            </span>
          )}
        </div>
        
        <div className="h-[1px] w-full bg-[var(--border)]" />
      </header>

      {/* SECTION 2 - OVERALL MASTERY BAR */}
      <section className="relative py-8">
        <div className="relative h-[10px] w-full rounded-[5px] bg-[var(--bg-card)] border border-[var(--border)] overflow-visible">
          {/* Progress Fill */}
          <div 
            className="h-full rounded-[5px] transition-all duration-1000 relative z-10"
            style={{ 
              width: `${Math.round(course.overall_mastery || 0)}%`,
              backgroundColor: mastery.color,
              boxShadow: `0 0 8px color-mix(in srgb, ${mastery.color} 40%, transparent)`
            }}
          />

          {/* Percentage Indicator with triangle connector */}
          <div 
            className="absolute -top-9 flex flex-col items-center transition-all duration-1000 z-20"
            style={{ left: `${Math.round(course.overall_mastery || 0)}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-[11px] font-bold text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border)] px-2 py-0.5 rounded-[4px] shadow-sm whitespace-nowrap">
              {Math.round(course.overall_mastery || 0)}%
            </span>
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-[var(--bg-card)] -mt-px" />
          </div>
          
          {/* Labels below the bar */}
          <div className="absolute -bottom-6 w-full flex justify-between px-1">
            <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Needs Work</span>
            <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Learning</span>
            <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Proficient</span>
            <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Mastered</span>
          </div>
        </div>
        
        <p className="mt-10 text-center text-xs text-[var(--text-muted)] italic">
          {aggregateStats.totalPracticed} concepts practiced across {aggregateStats.exerciseTypes} exercise types
        </p>

        {/* Stats Row — 3 mini-cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-primary)] shrink-0">
              <Star size={16} className="text-[var(--accent-green)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)] leading-none">Total XP</span>
              <span className="text-[20px] font-bold text-[var(--text-primary)] leading-none mt-0.5">{aggregateStats.totalXP}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-primary)] shrink-0">
              <Target size={16} className="text-[var(--accent-blue)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)] leading-none">Attempts</span>
              <span className="text-[20px] font-bold text-[var(--text-primary)] leading-none mt-0.5">{aggregateStats.totalSessions}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-primary)] shrink-0">
              <Flame size={16} className="text-[var(--accent-yellow)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)] leading-none">Streak Contrib.</span>
              <span className="text-[20px] font-bold text-[var(--text-primary)] leading-none mt-0.5">+{aggregateStats.totalCorrect}</span>
            </div>
          </div>
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

        <div className={`mt-6 grid gap-6 ${isInline ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {/* Row 1/2/3: Standard Exercises in Requested Order */}
          
          {/* 1. Flashcards */}
          {stats?.flashcard?.available > 0 && (
            <ExerciseCard 
              icon={Brain}
              title="Flashcards"
              description="Spaced repetition to lock in concepts"
              buttonText="Start Flashcards"
              onClick={() => navigate(`/exercise/flashcards/${courseSlug}`)}
              disabled={stats.flashcard.available === 0}
              stats={stats.flashcard}
              accentColor={CARD_ACCENTS.flashcard}
            />
          )}

          {/* 2. Multiple Choice Quiz */}
          {stats?.mcq?.available > 0 && (
            <ExerciseCard 
              icon={HelpCircle}
              title="Multiple Choice Quiz"
              description="Test your knowledge with timed questions"
              buttonText="Start Quiz"
              onClick={() => navigate(`/exercise/quiz/${courseSlug}`)}
              disabled={stats.mcq.available === 0}
              stats={stats.mcq}
              accentColor={CARD_ACCENTS.mcq}
            />
          )}

          {/* 3. Fill in the Blank */}
          {stats?.ftb?.available > 0 && (
            <ExerciseCard 
              icon={PenLine}
              title="Fill in the Blank"
              description="Complete code snippets from memory"
              buttonText="Start Coding"
              onClick={() => navigate(`/exercise/fillblank/${courseSlug}`)}
              disabled={stats.ftb.available === 0}
              stats={stats.ftb}
              accentColor={CARD_ACCENTS.ftb}
            />
          )}

          {/* 4. Dataset Challenge */}
          {stats?.dataset?.available > 0 && (
            <ExerciseCard 
              icon={Database}
              title="Dataset Challenge"
              description="Write real code against real datasets"
              buttonText="Start Challenge"
              onClick={() => navigate(`/exercise/dataset/${courseSlug}`)}
              disabled={stats.dataset.available === 0}
              stats={stats.dataset}
              accentColor={CARD_ACCENTS.dataset}
            />
          )}

          {/* 5. Matching Game */}
          {stats?.matching?.available > 0 && (
            <ExerciseCard 
              icon={Shuffle}
              title="Matching Game"
              description="Match concepts to definitions — timed"
              buttonText="Start Matching"
              onClick={() => navigate(`/exercise/matching/${courseSlug}`)}
              disabled={stats.matching.available === 0}
              stats={stats.matching}
              accentColor={CARD_ACCENTS.matching}
            />
          )}

          {/* 6. Boss Battle */}
          {stats?.boss_battle?.available > 0 && (
            <ExerciseCard 
              icon={Swords}
              isBoss={true}
              title="Boss Battle 🔥"
              description="Mixed challenge — prove your mastery"
              buttonText="Enter Battle"
              onClick={() => navigate(`/exercise/boss/${courseSlug}`)}
              disabled={stats.boss_battle.available === 0}
              stats={stats.boss_battle}
              accentColor={CARD_ACCENTS.boss_battle}
            />
          )}

          {/* Row 4: Incorrect Review (Full Width) */}
          <div className={isInline ? 'md:col-span-2' : 'md:col-span-2 lg:col-span-3'}>
            <IncorrectReviewCard 
              status={incorrectStatus}
              onCheckUnlock={handleCheckUnlock}
              checking={checkingUnlock}
              message={unlockMessage}
              onStart={() => navigate(`/exercise/review/${courseSlug}`)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
