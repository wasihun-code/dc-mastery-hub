import { useEffect, useMemo, useState } from 'react'
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
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    fetch('/api/progress/dashboard')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load dashboard (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        if (isMounted) {
          setDashboard(data)
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
    return (dashboard?.tracks_summary ?? []).map((track) => ({
      name: track.name.replace(' in ', '\nin '),
      mastery: Number(track.overall_mastery ?? 0),
    }))
  }, [dashboard])

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
  const tracks = dashboard.tracks_summary ?? []
  const recentActivity = dashboard.recent_activity ?? []
  const weakSpots = dashboard.weak_spots ?? []

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
          <h2 className="text-xl font-bold text-[var(--text-primary)]">My Tracks</h2>
          <span className="text-sm text-[var(--text-muted)]">Mastery overview</span>
        </div>

        {tracks.length > 0 ? (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {tracks.map((track) => (
                <div key={track.id} className="rounded border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{track.name}</div>
                      <div className="mt-1 text-sm text-[var(--text-muted)]">
                        {track.completed_count}/{track.course_count} courses completed
                      </div>
                    </div>
                    <div className="text-lg font-bold text-[var(--accent-green)]">
                      {Number(track.overall_mastery ?? 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 16, left: -24 }}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} interval={0} height={48} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[0, 100]} />
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
          </>
        ) : (
          <p className="mt-5 text-[var(--text-muted)]">No tracks found. Check your database connection.</p>
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
