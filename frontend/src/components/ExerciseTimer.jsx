import { useState, useEffect, useRef, useCallback } from 'react'
import { Timer as TimerIcon } from 'lucide-react'
import { timerFeedback } from '../services/feedbackService'

export default function ExerciseTimer({ durationSeconds, isRunning, onExpire, resetKey }) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [expired, setExpired] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)
  const expiredRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    startTimeRef.current = null
  }, [])

  useEffect(() => {
    clearTimer()
    setRemaining(durationSeconds)
    setExpired(false)
    setFlashing(false)
    expiredRef.current = false

    if (isRunning && durationSeconds > 0) {
      startTimeRef.current = Date.now()

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const left = Math.max(0, durationSeconds - elapsed)
        setRemaining(left)

        if (left <= 0 && !expiredRef.current) {
          expiredRef.current = true
          clearTimer()
          setExpired(true)
          setFlashing(true)
          timerFeedback.expire()
          onExpire()
          setTimeout(() => {
            setFlashing(false)
          }, 600)
        }
      }, 100)
    }

    return clearTimer
  }, [durationSeconds, isRunning, resetKey, onExpire, clearTimer])

  if (flashing) {
    return (
      <div
        style={{
          padding: '6px 14px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--accent-red)',
          color: 'white',
          fontWeight: 700,
          fontSize: '13px',
          fontFamily: 'monospace',
        }}
      >
        <TimerIcon size={14} />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>0:00</span>
      </div>
    )
  }

  if (expired) return null

  const ratio = durationSeconds > 0 ? remaining / durationSeconds : 0
  const displaySecs = Math.ceil(remaining)

  let bgColor
  let textColor = 'var(--text-primary)'
  let pulseAnim = ''
  let fontSize = '13px'

  if (ratio > 0.5) {
    bgColor = 'color-mix(in srgb, var(--accent-blue) 12%, transparent)'
  } else if (ratio > 0.25) {
    bgColor = 'color-mix(in srgb, var(--accent-yellow) 12%, transparent)'
  } else {
    bgColor = 'color-mix(in srgb, var(--accent-red) 12%, transparent)'
    textColor = 'var(--accent-red)'
    if (displaySecs <= 10) {
      pulseAnim = 'pulse 0.5s ease-in-out infinite'
      fontSize = '14px'
    } else {
      pulseAnim = 'pulse 1.5s ease-in-out infinite'
    }
  }

  return (
    <div
      style={{
        padding: '6px 14px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: bgColor,
        color: textColor,
        fontWeight: 700,
        fontSize,
        fontFamily: 'monospace',
        animation: pulseAnim,
      }}
    >
      <TimerIcon size={14} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.floor(displaySecs / 60)}:{String(displaySecs % 60).padStart(2, '0')}
      </span>
    </div>
  )
}
