import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function masteryColor(value) {
  if (value >= 70) return 'var(--accent-green)'
  if (value >= 40) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function languageBadgeClass(language) {
  return language === 'SQL'
    ? 'bg-[rgba(52,211,153,0.16)] text-[#34d399]'
    : 'bg-[rgba(167,139,250,0.16)] text-[#a78bfa]'
}

function SkeletonCard() {
  return (
    <div className="h-[316px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="h-1 bg-[var(--border)]" />
      <div className="animate-pulse p-6">
        <div className="h-7 w-2/3 rounded bg-[var(--border)]" />
        <div className="mt-4 h-6 w-20 rounded-full bg-[var(--border)]" />
        <div className="mt-6 flex gap-3">
          <div className="h-8 flex-1 rounded bg-[var(--border)]" />
          <div className="h-8 flex-1 rounded bg-[var(--border)]" />
          <div className="h-8 flex-1 rounded bg-[var(--border)]" />
        </div>
        <div className="mt-8 h-4 w-40 rounded bg-[var(--border)]" />
        <div className="mt-3 h-3 rounded-full bg-[var(--border)]" />
        <div className="mt-8 flex gap-3">
          <div className="h-10 flex-1 rounded bg-[var(--border)]" />
          <div className="h-10 flex-1 rounded bg-[var(--border)]" />
        </div>
      </div>
    </div>
  )
}

function TrackCard({ track }) {
  const navigate = useNavigate()
  const mastery = Number(track.overall_mastery ?? 0)
  const hasProgress = track.in_progress_count > 0 || track.completed_count > 0

  return (
    <article className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="h-1" style={{ backgroundColor: track.color || 'var(--accent-blue)' }} />
      <div className="flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{track.name}</h2>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${languageBadgeClass(track.language)}`}>
            {track.language}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <span className="rounded border border-[var(--border)] px-3 py-2 text-center text-sm text-[var(--text-muted)]">
            {track.course_count} Courses
          </span>
          <span
            className={`rounded border border-[var(--border)] px-3 py-2 text-center text-sm ${
              track.completed_count > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {track.completed_count} Completed
          </span>
          <span
            className={`rounded border border-[var(--border)] px-3 py-2 text-center text-sm ${
              track.in_progress_count > 0 ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {track.in_progress_count} In Progress
          </span>
        </div>

        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Overall Mastery</span>
            <span className="font-semibold text-[var(--text-primary)]">{mastery.toFixed(1)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(Math.max(mastery, 0), 100)}%`,
                backgroundColor: masteryColor(mastery),
              }}
            />
          </div>
        </div>

        <div className={`mt-8 grid gap-3 ${hasProgress ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            type="button"
            onClick={() => navigate(`/tracks/${track.slug}`)}
            className="h-10 rounded border border-[var(--accent-green)] px-4 text-sm font-semibold text-[var(--accent-green)]"
          >
            View Track
          </button>
          {hasProgress ? (
            <button
              type="button"
              onClick={() => navigate(`/tracks/${track.slug}`)}
              className="h-10 rounded bg-[var(--accent-green)] px-4 text-sm font-semibold text-[var(--bg-primary)]"
            >
              Continue
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function Tracks() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    fetch('/api/tracks')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load tracks (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        if (isMounted) {
          setTracks(data)
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

  return (
    <div>
      <header>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">My Tracks</h1>
        <p className="mt-2 text-[var(--text-muted)]">Your active learning paths</p>
      </header>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-8 rounded border border-[var(--accent-red)] bg-[rgba(255,77,77,0.12)] p-4 text-[var(--accent-red)]">
          {error}
        </div>
      ) : null}

      {!loading && !error && tracks.length === 0 ? (
        <div className="mt-16 rounded border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-10 text-center text-[var(--text-muted)]">
          No tracks found. Check your database connection.
        </div>
      ) : null}

      {!loading && !error && tracks.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
