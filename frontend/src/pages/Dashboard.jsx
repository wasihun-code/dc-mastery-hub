import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import {
  Award,
  Flame,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Brain,
  Swords
} from 'lucide-react'

// Curated aesthetic colors for exercise type breakdown
const EXERCISE_COLORS = {
  flashcard: '#a78bfa',   // Purple
  quiz: '#60a5fa',        // Blue
  fillblank: '#f59e0b',   // Yellow
  dataset: '#14b8a6',     // Teal
  matching: '#ec4899',    // Pink
  bossbattle: '#ef4444'   // Red
}

const typeNames = {
  flashcard: 'Flashcards',
  quiz: 'Quizzes',
  fillblank: 'Fill In Blank',
  dataset: 'Dataset Challenge',
  matching: 'Matching Game',
  bossbattle: 'Boss Battle'
}

function StatCard({ label, value, subtext, icon: Icon, colorClass = "", iconBg = "", iconColor = "" }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-200 hover:scale-102 hover:border-[var(--text-muted)] select-none flex items-center justify-between gap-4 shadow-sm">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
        <div className={`mt-2 text-3xl font-extrabold text-[var(--text-primary)] ${colorClass}`}>{value}</div>
        {subtext && <div className="mt-1 text-xs text-[var(--text-muted)]">{subtext}</div>}
      </div>
      {Icon && (
        <div className={`rounded-xl p-3 ${iconBg || 'bg-[var(--bg-primary)]'} ${iconColor || 'text-[var(--text-muted)]'} shrink-0`}>
          <Icon size={24} />
        </div>
      )}
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 rounded bg-[var(--bg-card)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-72 lg:col-span-2 rounded bg-[var(--bg-card)]" />
        <div className="h-72 rounded bg-[var(--bg-card)]" />
      </div>
    </div>
  )
}

function formatTime(seconds) {
  if (!seconds) return '0m';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    Promise.all([
      fetch('/api/progress/dashboard').then((res) => {
        if (!res.ok) throw new Error(`Dashboard fetch failed (${res.status})`)
        return res.json()
      }),
      fetch('/api/courses').then((res) => {
        if (!res.ok) throw new Error(`Courses fetch failed (${res.status})`)
        return res.json()
      }),
    ])
      .then(([dashboardData, coursesData]) => {
        if (isMounted) {
          setDashboard(dashboardData)
          setCourses(coursesData)
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

  // Top course masteries data formatting
  const topCoursesChartData = useMemo(() => {
    const activeCourses = [...courses]
      .filter((c) => (c.overall_mastery || 0) > 0)
      .sort((a, b) => (b.overall_mastery || 0) - (a.overall_mastery || 0))
      .slice(0, 6)

    return activeCourses.map((c) => ({
      name: c.name.length > 18 ? `${c.name.slice(0, 15)}...` : c.name,
      mastery: Number(c.overall_mastery ?? 0),
    }))
  }, [courses])

  // Daily activity trend formatting
  const activityTrendData = useMemo(() => {
    if (!dashboard || !dashboard.daily_activity) return [];
    return dashboard.daily_activity.map(day => ({
      date: formatDate(day.date),
      attempts: day.total_attempts,
      time: Math.round(day.total_time_secs / 60)
    }));
  }, [dashboard])

  // Practice type distribution pie data
  const pieChartData = useMemo(() => {
    if (!dashboard || !dashboard.exercise_breakdown) return [];
    return dashboard.exercise_breakdown.map(item => ({
      name: typeNames[item.exercise_type] || item.exercise_type,
      value: item.total_attempts,
      type: item.exercise_type
    })).filter(item => item.value > 0);
  }, [dashboard])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <LoadingBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="rounded-xl border border-[var(--accent-red)] bg-[rgba(255,77,77,0.05)] p-6 text-[var(--accent-red)] text-center font-medium">
          {error}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)] font-medium">
          No dashboard data found. Check your database connection.
        </div>
      </div>
    )
  }

  const userStats = dashboard.user_stats ?? {}
  const recentActivity = dashboard.recent_activity ?? []
  const weakSpots = dashboard.weak_spots ?? []
  const overallStats = dashboard.overall_stats ?? { total_attempts: 0, correct_attempts: 0, total_time_secs: 0, avg_accuracy: 0 }
  const completedCoursesCount = courses.filter((c) => c.status === 'Completed').length
  const inProgressCourses = courses.filter((c) => c.status === 'In Progress')
  const tracksSummary = dashboard.tracks_summary ?? []

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Track your progress, analyze performance, and master data science.</p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard 
          label="Total XP" 
          value={userStats.total_xp ?? 0} 
          subtext="Lifetime XP earned"
          icon={TrendingUp} 
          colorClass="text-[var(--accent-green)]" 
          iconBg="bg-[rgba(3,239,98,0.08)]"
          iconColor="text-[var(--accent-green)]"
        />
        <StatCard 
          label="Streak" 
          value={`${userStats.current_streak ?? 0} days`} 
          subtext={`Longest: ${userStats.longest_streak ?? 0} days`}
          icon={Flame} 
          colorClass="text-orange-500" 
          iconBg="bg-[rgba(249,115,22,0.08)]"
          iconColor="text-orange-500"
        />
        <StatCard 
          label="Level" 
          value={userStats.level ?? 'Beginner'} 
          subtext="Skill tier"
          icon={Award} 
          colorClass="text-[var(--accent-blue)]" 
          iconBg="bg-[rgba(59,130,246,0.08)]"
          iconColor="text-[var(--accent-blue)]"
        />
        <StatCard 
          label="Time Studied" 
          value={formatTime(overallStats.total_time_secs)} 
          subtext="Active session time"
          icon={Clock} 
          colorClass="text-[var(--accent-yellow)]" 
          iconBg="bg-[rgba(234,179,8,0.08)]"
          iconColor="text-[var(--accent-yellow)]"
        />
        <StatCard 
          label="Avg Accuracy" 
          value={`${Number(overallStats.avg_accuracy ?? 0).toFixed(1)}%`} 
          subtext={`${overallStats.total_attempts} total exercises`}
          icon={CheckCircle2} 
          colorClass="text-emerald-500" 
          iconBg="bg-[rgba(16,185,129,0.08)]"
          iconColor="text-emerald-500"
        />
      </div>

      {/* CHARTS CONTAINER: ACTIVITY TREND & PRACTICE DISTRIBUTION */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Activity Trend */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:col-span-2 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Study Activity Trend</h2>
              <p className="text-xs text-[var(--text-muted)]">Exercises completed over the last 30 days</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-green)]" /> Exercises</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Minutes</span>
            </div>
          </div>

          <div className="h-64 mt-6">
            {activityTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="attempts" stroke="var(--accent-green)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAttempts)" name="Exercises" />
                  <Area type="monotone" dataKey="time" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTime)" name="Minutes Studied" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                No recent activity records to chart. Complete an exercise to see trends!
              </div>
            )}
          </div>
        </div>

        {/* Practice Type Distribution */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Practice Distribution</h2>
            <p className="text-xs text-[var(--text-muted)]">Breakdown of practice by exercise type</p>
          </div>

          <div className="h-48 mt-4 relative flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXERCISE_COLORS[entry.type] || '#888888'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                No exercise data yet.
              </div>
            )}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-[var(--text-muted)]">
            {pieChartData.length > 0 ? (
              pieChartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: EXERCISE_COLORS[item.type] }} />
                  <span className="truncate">{item.name} ({item.value})</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center">Practice to view distribution.</div>
            )}
          </div>
        </div>
      </div>

      {/* TRACKS & COURSE MASTERIES */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Track Overview & Mastery */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Track Progression</h2>
            <p className="text-xs text-[var(--text-muted)]">Your mastery levels across study tracks</p>
          </div>

          <div className="space-y-4 mt-6">
            {tracksSummary.map(track => (
              <div key={track.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
                    <span className="font-bold text-sm text-[var(--text-primary)]">{track.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {track.completed_count}/{track.course_count} courses
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1 text-[var(--text-muted)]">
                  <span>Language: <span className="font-bold text-[var(--text-primary)]">{track.language}</span></span>
                  <span className="font-bold" style={{ color: track.overall_mastery >= 70 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {track.overall_mastery}% Mastered
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden mt-1">
                  <div 
                    className="h-full rounded-full transition-all duration-700" 
                    style={{ 
                      width: `${track.overall_mastery}%`,
                      backgroundColor: track.color || 'var(--accent-green)'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Courses Masteries Chart */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Top Course Masteries</h2>
            <p className="text-xs text-[var(--text-muted)]">Your highest calculated course mastery percentages</p>
          </div>

          <div className="h-64 mt-6">
            {topCoursesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCoursesChartData} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="mastery" fill="var(--accent-green)" radius={[4, 4, 0, 0]} name="Mastery %">
                    {topCoursesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent-green)' : 'rgba(3, 239, 98, 0.75)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                Start completing course exercises to display mastery scores.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTINUATION: JUMP BACK IN */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Jump Back In</h2>
        {inProgressCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgressCourses.slice(0, 3).map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-all hover:border-[var(--text-muted)] group select-none shadow-sm"
                style={{ borderLeft: `4px solid ${course.track_color || 'var(--accent-blue)'}` }}
              >
                <div className="flex-1 pr-4 min-w-0">
                  <div className="font-bold text-sm text-[var(--text-primary)] truncate" title={course.name}>
                    {course.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <span>Mastery:</span>
                    <span className="font-bold text-[var(--accent-green)]">
                      {Number(course.overall_mastery ?? 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/courses/${course.slug}`)}
                  className="rounded-lg bg-[var(--accent-green)] text-[var(--bg-primary)] p-2 hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] p-6 text-center text-xs text-[var(--text-muted)]">
            No courses currently in progress. Start one from the Courses catalog!
          </div>
        )}
      </section>

      {/* WEAK SPOTS & RECENT ACTIVITY FEED */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weak Spots */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Target Areas (Weak Spots)</h2>
            <p className="text-xs text-[var(--text-muted)]">Concepts needing reinforcement based on exercise accuracy</p>
          </div>

          <div className="mt-4 space-y-3">
            {weakSpots.length > 0 ? (
              weakSpots.slice(0, 5).map((spot) => (
                <div key={spot.concept_id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[var(--text-primary)] truncate">{spot.concept_name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{spot.course_name}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-bold text-[var(--accent-red)]">
                      {(Number(spot.correct_rate ?? 0) * 100).toFixed(0)}% Accuracy
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{spot.attempt_count} attempts</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-muted)]">
                No weak spots detected yet. Practice exercises to see data.
              </div>
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Recent Activity</h2>
            <p className="text-xs text-[var(--text-muted)]">Your latest exercise sessions and question submissions</p>
          </div>

          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: EXERCISE_COLORS[activity.exercise_type] || '#888888' }} />
                      <span className="font-bold text-[var(--text-primary)]">{typeNames[activity.exercise_type] || activity.exercise_type}</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate mt-1">{activity.course_name}</div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      {activity.time_taken_secs > 0 && (
                        <div className="text-[10px] text-[var(--text-muted)] font-medium flex items-center justify-end gap-1">
                          <span>{activity.time_taken_secs}s</span>
                        </div>
                      )}
                      <div className="text-[10px] text-[var(--text-muted)]">{formatDate(activity.attempted_at)}</div>
                    </div>
                    <span className={`rounded-lg px-2 py-1 font-bold text-[10px] ${
                      activity.was_correct === 1 
                        ? 'bg-[rgba(3,239,98,0.1)] text-[var(--accent-green)]' 
                        : 'bg-[rgba(239,68,68,0.1)] text-[var(--accent-red)]'
                    }`}>
                      {activity.was_correct === 1 ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-muted)]">
                No activities completed yet. Start learning today!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
