import { useState, useEffect } from 'react'
import { Award, BookOpen, ChevronRight, CheckCircle2, Loader2, Sparkles, Layers, Shield, HelpCircle } from 'lucide-react'

export default function MasteryMap() {
  const [tracks, setTracks] = useState([])
  const [courses, setCourses] = useState([])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [concepts, setConcepts] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(true)
  const [loadingConcepts, setLoadingConcepts] = useState(false)

  // Fetch tracks and courses
  useEffect(() => {
    async function loadData() {
      try {
        const resTracks = await fetch('/api/tracks')
        const dataTracks = await resTracks.json()
        setTracks(dataTracks)
        if (dataTracks.length > 0) {
          setSelectedTrack(dataTracks[0])
        }

        const resCourses = await fetch('/api/courses')
        const dataCourses = await resCourses.json()
        setCourses(dataCourses)
      } catch (err) {
        console.error('Error loading mastery map data:', err)
      } finally {
        setLoadingTracks(false)
      }
    }
    loadData()
  }, [])

  // Fetch concepts when a course is selected
  useEffect(() => {
    if (!selectedCourse) {
      setConcepts([])
      return
    }

    async function loadConcepts() {
      setLoadingConcepts(true)
      try {
        const res = await fetch(`/api/progress/course-concepts-mastery/${selectedCourse.id}`)
        if (res.ok) {
          const data = await res.json()
          setConcepts(data)
        }
      } catch (err) {
        console.error('Error loading course concepts:', err)
      } finally {
        setLoadingConcepts(false)
      }
    }
    loadConcepts()
  }, [selectedCourse])

  if (loadingTracks) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 text-[var(--accent-green)] animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Assembling mastery node network...</p>
      </div>
    )
  }

  // Filter courses for the selected track
  const trackCourses = courses.filter(c => c.track_id === selectedTrack?.id)

  // Calculate some aggregate stats for the selected track
  const trackMasteryAvg = trackCourses.length > 0
    ? Math.round(trackCourses.reduce((acc, c) => acc + (c.overall_mastery || 0), 0) / trackCourses.length)
    : 0

  const trackCompletedCount = trackCourses.filter(c => c.status === 'Completed').length

  const getMasteryColor = (score) => {
    if (score === 0) return 'text-[var(--text-muted)] bg-zinc-800/50 border-zinc-700/50'
    if (score < 40) return 'text-orange-400 bg-orange-950/20 border-orange-800/40' // Beginner
    if (score < 70) return 'text-yellow-400 bg-yellow-950/20 border-yellow-800/40' // Learning
    if (score < 90) return 'text-[var(--accent-blue)] bg-blue-950/20 border-blue-800/40' // Proficient
    return 'text-[var(--accent-green)] bg-green-950/20 border-[var(--accent-green)]/30' // Mastered
  }

  const getMasteryBadge = (score) => {
    if (score === 0) return { label: 'Unstarted', style: 'bg-zinc-800 text-zinc-400' }
    if (score < 40) return { label: 'Beginner', style: 'bg-orange-950/40 text-orange-400 border border-orange-800/40' }
    if (score < 70) return { label: 'Learning', style: 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/40' }
    if (score < 90) return { label: 'Proficient', style: 'bg-blue-950/40 text-[var(--accent-blue)] border border-blue-800/40' }
    return { label: 'Mastered', style: 'bg-green-950/40 text-[var(--accent-green)] border border-[var(--accent-green)]/40 font-bold' }
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Layers className="text-[var(--accent-green)]" /> Mastery Map
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Explore your learning paths, track concept-level depth, and focus on weak spots.
          </p>
        </div>

        {/* Track Picker Dropdown */}
        <div className="w-full md:w-auto">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Selected Learning Path
          </label>
          <select
            value={selectedTrack?.id || ''}
            onChange={(e) => {
              const track = tracks.find(t => String(t.id) === e.target.value)
              setSelectedTrack(track)
              setSelectedCourse(null)
            }}
            className="w-full md:w-80 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
          >
            {tracks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Track Stats Overview Cards */}
      {selectedTrack && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-800 text-zinc-300">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-medium">Path Progress</div>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-1">
                {trackCompletedCount} / {trackCourses.length} Courses
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-800 text-[var(--accent-green)]">
              <Award size={20} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-medium">Average Mastery</div>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-1">
                {trackMasteryAvg}%
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-800 text-[var(--accent-blue)]">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-medium">Language</div>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-1">
                {selectedTrack.language}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Map Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Course Path Nodes */}
        <div className="lg:col-span-5 space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Course Sequence Map
          </h3>
          
          <div className="relative pl-6 space-y-6 border-l-2 border-dashed border-zinc-800">
            {trackCourses.map((course, index) => {
              const isActive = selectedCourse?.id === course.id
              const isCompleted = course.status === 'Completed'
              const isInProgress = course.status === 'In Progress'

              return (
                <div key={course.id} className="relative">
                  {/* Timeline bullet */}
                  <span className={`absolute -left-[35px] top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-[var(--accent-green)] text-black ring-4 ring-green-950/30'
                      : isInProgress
                      ? 'bg-[var(--accent-yellow)] text-black ring-4 ring-yellow-950/30 animate-pulse'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {index + 1}
                  </span>

                  {/* Course Node Card */}
                  <div
                    onClick={() => setSelectedCourse(course)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--bg-primary)] border-[var(--accent-green)] shadow-[0_0_12px_rgba(3,239,98,0.15)] translate-x-1'
                        : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-zinc-700 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                          {course.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold tracking-wider ${
                            isCompleted
                              ? 'bg-green-950/40 text-[var(--accent-green)] border border-green-900/40'
                              : isInProgress
                              ? 'bg-yellow-950/40 text-[var(--accent-yellow)] border border-yellow-900/40'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}>
                            {course.status}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Order: {course.order_in_track}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-[var(--text-muted)]">Mastery</div>
                        <div className="text-lg font-extrabold text-[var(--text-primary)] mt-0.5">
                          {course.overall_mastery || 0}%
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${course.overall_mastery || 0}%`,
                          backgroundColor: isCompleted
                            ? 'var(--accent-green)'
                            : isInProgress
                            ? 'var(--accent-yellow)'
                            : 'var(--text-muted)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Side: Course Drill-down (Concept Node Level) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Concept Breakdown
            </h3>
            {selectedCourse && (
              <span className="text-xs text-[var(--accent-green)] font-mono">
                {selectedCourse.name}
              </span>
            )}
          </div>

          {!selectedCourse ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
              <HelpCircle className="w-12 h-12 text-zinc-600 mb-4" />
              <h4 className="font-bold text-[var(--text-primary)]">Select a Course Node</h4>
              <p className="text-xs text-[var(--text-muted)] mt-2 max-w-xs leading-relaxed">
                Click on any course in the path map to explore concept-level mastery, review counts, and definitions.
              </p>
            </div>
          ) : loadingConcepts ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] gap-3">
              <Loader2 className="w-6 h-6 text-[var(--accent-green)] animate-spin" />
              <p className="text-xs text-[var(--text-muted)]">Parsing concept maps & student history...</p>
            </div>
          ) : concepts.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
              <Shield className="w-12 h-12 text-[var(--accent-yellow)] opacity-40 mb-4" />
              <h4 className="font-bold text-[var(--text-primary)]">No Concepts Available Yet</h4>
              <p className="text-xs text-[var(--text-muted)] mt-2 max-w-xs leading-relaxed">
                Concepts are generated dynamically. Open this course in the sidebar and trigger an extraction to view it.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mastery Legend */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Mastery Tiers:</span>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-green)]"></span> Mastered (≥90)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)]"></span> Proficient (70-89)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Learning (40-69)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Beginner (1-39)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span> Unstarted (0)
                  </span>
                </div>
              </div>

              {/* Concepts Grid list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {concepts.map(c => {
                  const badge = getMasteryBadge(c.mastery)
                  const masteryCol = getMasteryColor(c.mastery)
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3 hover:border-zinc-750 transition-colors"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badge.style}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            Difficulty: {c.difficulty}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-[var(--text-primary)] mt-2 line-clamp-1">
                          {c.name}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2" title={c.definition}>
                          {c.definition || 'No definition available.'}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]/40 mt-1">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          Attempts: {c.attempts || 0}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-muted)]">Mastery:</span>
                          <span className={`font-mono text-sm font-extrabold ${masteryCol.split(' ')[0]}`}>
                            {c.mastery || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
