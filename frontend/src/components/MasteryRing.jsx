import React from 'react'

export default function MasteryRing({ percentage, size = 36 }) {
  const pct = Math.round(Number(percentage ?? 0))
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = pct === 0 ? circumference : circumference - (pct / 100) * circumference

  let strokeColor
  if (pct === 0) strokeColor = 'var(--border)'
  else if (pct <= 40) strokeColor = 'var(--accent-red)'
  else if (pct <= 70) strokeColor = 'var(--accent-yellow)'
  else if (pct <= 90) strokeColor = 'var(--accent-blue)'
  else strokeColor = 'var(--accent-green)'

  const center = size / 2

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: pct === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
          lineHeight: 1,
          fontFamily: 'inherit'
        }}>
          {pct === 0 ? '—' : `${pct}%`}
        </span>
      </div>
    </div>
  )
}
