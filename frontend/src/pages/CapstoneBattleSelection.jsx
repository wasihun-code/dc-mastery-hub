import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Flame,
  Lock,
  Unlock,
  ChevronRight,
  Loader2,
  Trophy,
  Award,
  BookOpen
} from 'lucide-react'

export default function CapstoneBattleSelection() {
  const navigate = useNavigate()
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTracks() {
      try {
        const res = await fetch('/api/tracks')
        if (res.ok) {
          const data = await res.json()
          setTracks(data)
        }
      } catch (err) {
        console.error('Error fetching tracks:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTracks()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-red)]" />
        <p className="text-sm text-[var(--text-muted)] font-mono">Loading data science tracks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-950/40 via-orange-950/20 to-zinc-950 border border-red-900/40 rounded-3xl p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-950/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/60 border border-red-900/60 text-red-500 font-mono text-[10px] uppercase font-bold tracking-wider">
            <Flame size={12} className="animate-pulse fill-red-500/25" />
            <span>End-Game Content</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase italic font-black">
            Learning Path Capstone Battles 🔥
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Ready to test your limits? Choose an unlocked learning path to enter the Capstone Exam. 
            You must defend 5 lives against 20 random challenges across all courses in the path. 
            Achieving 40%+ track mastery is required to unlock each battle.
          </p>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tracks.map((track) => {
          const roundedMastery = Math.round(track.overall_mastery || 0)
          const isUnlocked = roundedMastery >= 40
          
          return (
            <div
              key={track.id}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col justify-between p-6 ${
                isUnlocked
                  ? 'bg-[var(--bg-card)] border-red-900/30 hover:border-red-600/60 shadow-lg hover:shadow-red-950/20 hover:-translate-y-1'
                  : 'bg-[var(--bg-card)]/40 border-[var(--border)] opacity-75'
              }`}
            >
              {/* Unlock Indicator Badge */}
              <div className="absolute top-4 right-4">
                {isUnlocked ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-950/40 border border-green-800/40 text-green-400 font-mono text-[10px] uppercase font-bold">
                    <Unlock size={10} /> Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase font-bold">
                    <Lock size={10} /> Locked
                  </span>
                )}
              </div>

              {/* Course Info */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-widest text-[var(--accent-blue)] bg-blue-950/30 border border-blue-900/30 px-2.5 py-1 rounded-lg font-mono font-bold">
                  {track.completed_count === track.course_count ? 'COMPLETED PATH' : 'IN PROGRESS'}
                </span>
                
                <h3 className="text-xl font-bold text-white pr-20 leading-snug">
                  {track.name}
                </h3>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Contains {track.course_count} courses ({track.completed_count} completed).
                </p>

                {/* Progress Indicators */}
                <div className="grid grid-cols-2 gap-4 pt-2 font-mono">
                  <div className="bg-[var(--bg-primary)]/40 border border-[var(--border)]/30 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-[var(--text-muted)] font-semibold">Track Progress</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {track.completed_count}/{track.course_count} Courses
                    </div>
                  </div>
                  <div className="bg-[var(--bg-primary)]/40 border border-[var(--border)]/30 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-[var(--text-muted)] font-semibold">Track Mastery</div>
                    <div className="text-sm font-bold text-[var(--accent-green)] mt-1">
                      {roundedMastery}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="mt-6 pt-4 border-t border-[var(--border)]/40 flex items-center justify-between">
                {!isUnlocked && (
                  <span className="text-[11px] text-[var(--accent-red)] font-semibold flex items-center gap-1 font-mono">
                    ⚠️ Needs 40% mastery to enter (Current: {roundedMastery}%)
                  </span>
                )}
                {isUnlocked && (
                  <span className="text-[11px] text-[var(--accent-green)] font-semibold flex items-center gap-1 font-mono">
                    Ready for deployment
                  </span>
                )}

                <button
                  disabled={!isUnlocked}
                  onClick={() => navigate(`/track-test/${track.slug}`)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                    isUnlocked
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40 hover:scale-105 active:scale-95 cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                  }`}
                >
                  Launch Battle <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* General tips banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex items-start gap-4">
        <div className="p-2.5 bg-zinc-800 rounded-xl text-[var(--accent-blue)]">
          <Trophy size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">How Track Mastery is Computed</h4>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-3xl">
            Overall Track Mastery is the average of overall mastery scores across all courses mapping to this path. 
            To boost track mastery, review flashcards, solve quiz challenges, complete code exercises, and submit dataset challenges on individual courses.
          </p>
        </div>
      </div>
    </div>
  )
}
