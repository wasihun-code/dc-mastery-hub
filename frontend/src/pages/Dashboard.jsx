import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function StatCard({ label, value }) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded bg-[var(--bg-card)]" />
        ))}
      </div>
      <div className="h-64 rounded bg-[var(--bg-card)]" />
    </div>
  )
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

  const chartData = useMemo(() => {
    // Take courses with some mastery score and sort by score descending
    const activeCourses = [...courses]
      .filter((c) => (c.overall_mastery || 0) > 0)
      .sort((a, b) => (b.overall_mastery || 0) - (a.overall_mastery || 0))
      .slice(0, 6)

    return activeCourses.map((c) => ({
      name: c.name.length > 20 ? `${c.name.slice(0, 20)}...` : c.name,
      mastery: Number(c.overall_mastery ?? 0),
    }))
  }, [courses])

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="mt-8">
          <LoadingBlock />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="mt-8 rounded border border-[var(--accent-red)] bg-[rgba(255,77,77,0.12)] p-4 text-[var(--accent-red)]">
          {error}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="mt-8 rounded border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-10 text-center text-[var(--text-muted)]">
          No dashboard data found. Check your database connection.
        </div>
      </div>
    )
  }

  const userStats = dashboard.user_stats ?? {}
  const recentActivity = dashboard.recent_activity ?? []
  const weakSpots = dashboard.weak_spots ?? []
  const completedCoursesCount = courses.filter((c) => c.status === 'Completed').length
  const inProgressCourses = courses.filter((c) => c.status === 'In Progress')

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total XP" value={userStats.total_xp ?? 0} />
        <StatCard label="Current Streak" value={`${userStats.current_streak ?? 0} days`} />
        <StatCard label="Level" value={userStats.level ?? 'Beginner'} />
        <StatCard label="Flashcards Due" value={dashboard.due_flashcards_count ?? 0} />
      </div>

      <section className="mt-8 rounded border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">My Courses Progress</h2>
          <span className="text-sm text-[var(--text-muted)]">
            {completedCoursesCount}/{courses.length} courses completed
          </span>
        </div>

        {courses.length > 0 ? (
          <>
            {/* Active Courses (Jump Back In) */}
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Jump Back In</h3>
              {inProgressCourses.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {inProgressCourses.slice(0, 4).map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-all hover:border-[var(--text-muted)]"
                      style={{ borderLeft: `4px solid ${course.track_color || 'var(--accent-blue)'}` }}
                    >
                      <div className="flex-1 pr-4 min-w-0">
                        <div className="font-semibold text-sm text-[var(--text-primary)] truncate" title={course.name}>
                          {course.name}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)]">Mastery:</span>
                          <span className="text-xs font-bold text-[var(--accent-green)]">
                            {Number(course.overall_mastery ?? 0).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/courses/${course.slug}`)}
                        className="shrink-0 rounded bg-[var(--accent-green)] px-3 py-1.5 text-xs font-bold text-[var(--bg-primary)] hover:brightness-110 transition-all"
                      >
                        Continue
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-dashed border-[var(--border)] bg-[var(--bg-primary)] p-6 text-center text-xs text-[var(--text-muted)]">
                  No courses currently in progress. Start one from the Courses catalog!
                </div>
              )}
            </div>

            {/* Top Courses Chart */}
            {chartData.length > 0 && (
              <div className="mt-8 border-t border-[var(--border)] pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
                  Top Course Masteries
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 16, left: -24 }}>
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval={0} height={40} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <Bar dataKey="mastery" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-5 text-[var(--text-muted)]">No courses found. Check your database connection.</p>
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                  <div className="font-semibold text-[var(--text-primary)]">{activity.exercise_type}</div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">
                    {activity.course_name ?? 'Unknown course'} · Score {activity.score ?? 0}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[var(--text-muted)]">No activity yet. Start a study session to begin!</p>
          )}
        </section>

        <section className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Weak Spots</h2>
          {weakSpots.length > 0 ? (
            <div className="mt-4 space-y-3">
              {weakSpots.map((spot) => (
                <div key={spot.concept_id} className="rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                  <div className="font-semibold text-[var(--text-primary)]">{spot.concept_name}</div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">
                    {spot.course_name} · {(Number(spot.correct_rate ?? 0) * 100).toFixed(1)}% correct
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[var(--text-muted)]">No weak spots detected yet. Complete some exercises first!</p>
          )}
        </section>
      </div>
    </div>
  )
}
