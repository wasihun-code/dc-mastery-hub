import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import Dashboard from '../../pages/Dashboard'

const mockDashboardData = {
  user_stats: {
    total_xp: 4850,
    current_streak: 12,
    longest_streak: 34,
    level: 'Expert'
  },
  overall_stats: {
    total_attempts: 1200,
    correct_attempts: 960,
    total_time_secs: 86400,
    avg_accuracy: 80
  },
  daily_activity: [
    { date: '2026-05-20', total_attempts: 15, total_time_secs: 3600 },
    { date: '2026-05-21', total_attempts: 22, total_time_secs: 4800 }
  ],
  exercise_breakdown: [
    { exercise_type: 'flashcard', total_attempts: 300 },
    { exercise_type: 'quiz', total_attempts: 200 },
    { exercise_type: 'fillblank', total_attempts: 100 },
    { exercise_type: 'dataset', total_attempts: 50 },
    { exercise_type: 'matching', total_attempts: 30 },
    { exercise_type: 'bossbattle', total_attempts: 10 }
  ],
  tracks_summary: [
    { id: 1, name: 'Python Track', color: '#a78bfa', language: 'Python', completed_count: 3, course_count: 5, overall_mastery: 78 },
    { id: 2, name: 'SQL Track', color: '#34d399', language: 'SQL', completed_count: 1, course_count: 3, overall_mastery: 45 }
  ],
  weak_spots: [
    { concept_id: 'c1', concept_name: 'Recursion', course_name: 'Python Mastery', correct_rate: 0.35, attempt_count: 20 },
    { concept_id: 'c2', concept_name: 'JOIN Operations', course_name: 'SQL Fundamentals', correct_rate: 0.42, attempt_count: 15 }
  ],
  recent_activity: [
    { id: 1, type: 'quiz', course: 'Python Mastery', score: 80, date: '2026-05-21' }
  ]
}

const mockCourses = [
  { id: 1, name: 'Python Mastery', slug: 'python-mastery', status: 'Completed', overall_mastery: 92 },
  { id: 2, name: 'SQL Fundamentals', slug: 'sql-fundamentals', status: 'In Progress', overall_mastery: 60 },
  { id: 3, name: 'Advanced Pandas', slug: 'advanced-pandas', status: 'Not Started', overall_mastery: 0 }
]

const mockEmptyDashboard = {
  user_stats: null,
  overall_stats: null,
  daily_activity: [],
  exercise_breakdown: [],
  tracks_summary: [],
  weak_spots: [],
  recent_activity: []
}

function renderComponent() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
})

describe('Dashboard', () => {
  it('shows loading state initially', () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('fetches dashboard data from API on mount', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/progress/dashboard')
    })
    expect(fetch).toHaveBeenCalledWith('/api/courses')
  })

  it('shows user stats after loading', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('4850')).toBeInTheDocument()
    })

    expect(screen.getByText('12 days')).toBeInTheDocument()
    expect(screen.getByText('Expert')).toBeInTheDocument()
    expect(screen.getByText('24h')).toBeInTheDocument()
    expect(screen.getByText('80.0%')).toBeInTheDocument()
  })

  it('shows tracks summary', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Track')).toBeInTheDocument()
    })

    expect(screen.getByText('3/5 courses')).toBeInTheDocument()
    expect(screen.getByText('SQL Track')).toBeInTheDocument()
    expect(screen.getByText('1/3 courses')).toBeInTheDocument()
  })

  it('shows weak spots section', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Target Areas (Weak Spots)')).toBeInTheDocument()
    })

    expect(screen.getByText('Recursion')).toBeInTheDocument()
    expect(screen.getByText('JOIN Operations')).toBeInTheDocument()
    expect(screen.getByText('35% Accuracy')).toBeInTheDocument()
    expect(screen.getByText('42% Accuracy')).toBeInTheDocument()
  })

  it('shows recent activity', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Track Progression')).toBeInTheDocument()
    })
  })

  it('shows exercise breakdown', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDashboardData })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Practice Distribution')).toBeInTheDocument()
    })

    expect(screen.getByText(/Flashcards/)).toBeInTheDocument()
    expect(screen.getByText(/Quizzes/)).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/Dashboard fetch failed/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no data returned', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => null })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('No dashboard data found. Check your database connection.')).toBeInTheDocument()
    })
  })
})
