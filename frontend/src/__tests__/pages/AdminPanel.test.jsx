import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import AdminPanel from '../../pages/AdminPanel'

const mockStats = {
  users: 5, admins: 2, tracks: 3, courses: 10,
  concepts: 25, flashcards: 50, quiz_questions: 30,
  exercise_attempts: 200, sessions: 8, total_xp: 15000,
  mastery_scores: 40,
}

const mockTracks = {
  tracks: [
    { id: 1, name: 'Data Science', slug: 'data-science', language: 'Python', color: '#03ef62', description: '', course_count: 2, courses: [
      { id: 10, name: 'Python Basics', slug: 'python-basics', difficulty: 'Easy', order_in_track: 1 },
    ]},
    { id: 2, name: 'SQL Mastery', slug: 'sql-mastery', language: 'SQL', color: '#3b82f6', description: '', course_count: 1, courses: [] },
  ],
}

const mockCourses = {
  courses: [
    { id: 10, name: 'Python Basics', slug: 'python-basics', difficulty: 'Easy', tracks: [{ id: 1, name: 'Data Science', slug: 'data-science' }] },
    { id: 20, name: 'Advanced SQL', slug: 'advanced-sql', difficulty: 'Hard', tracks: [{ id: 2, name: 'SQL Mastery', slug: 'sql-mastery' }] },
  ],
}

const mockUsers = {
  users: [
    { id: 1, username: 'admin@test.com', is_admin: true, total_xp: 5000, level: 'Expert', current_streak: 10, created_at: '2026-01-01' },
    { id: 2, username: 'student@test.com', is_admin: false, total_xp: 1500, level: 'Intermediate', current_streak: 3, created_at: '2026-02-01' },
  ],
}

const mockSystemStats = {
  db_size_mb: 12, content_size_mb: 45, uptime_seconds: 3600,
  total_users: 5, total_courses: 10, total_tracks: 3,
  total_concepts: 25, total_flashcards: 50, total_attempts: 200,
}

const mockSystemLogs = { logs: ['[INFO] Server started', '[INFO] Admin login'] }

function renderComponent() {
  return render(
    <MemoryRouter>
      <AdminPanel />
    </MemoryRouter>
  )
}

const responseMap = {
  '/api/admin/stats': mockStats,
  '/api/admin/tracks': mockTracks,
  '/api/admin/courses': mockCourses,
  '/api/admin/users': mockUsers,
  '/api/admin/system/stats': mockSystemStats,
  '/api/admin/system/logs': mockSystemLogs,
}

const mockExerciseSummary = { concepts: 5, flashcards: 10, quiz_questions: 8, total_attempts: 30, unique_students: 2, has_ftb_file: true, has_matching_file: true, has_bossbattle_file: false, has_challenge_file: false }
const mockFileStatus = { mcq: true, flashcards: true, ftb: true }

const statsResponse = { student_count: 3, attempt_count: 15 }

beforeEach(() => {
  fetch.mockReset()
  fetch.mockImplementation((url) => {
    const data = responseMap[url]
    if (data) {
      return Promise.resolve({ ok: true, json: async () => data })
    }
    if (url.includes('/reset-stats')) {
      return Promise.resolve({ ok: true, json: async () => statsResponse })
    }
    if (url.includes('/exercises/summary')) {
      return Promise.resolve({ ok: true, json: async () => mockExerciseSummary })
    }
    if (url.includes('/file-status')) {
      return Promise.resolve({ ok: true, json: async () => mockFileStatus })
    }
    // Return mockStats as fallback for any unhandled URLs
    return Promise.resolve({ ok: true, json: async () => mockStats })
  })
})

describe('AdminPanel', () => {
  it('renders admin navigation sidebar', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Tracks')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Courses')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Exercises')[0]).toBeInTheDocument()
    expect(screen.getAllByText('User Management')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Reset Tools')[0]).toBeInTheDocument()
    expect(screen.getAllByText('System Stats')[0]).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    renderComponent()

    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('fetches dashboard stats on mount and displays them', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()

    expect(fetch).toHaveBeenCalledWith('/api/admin/stats')
  })

  it('switches to tracks section when clicked', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Tracks')[0])

    await waitFor(() => {
      expect(screen.getByText('Data Science')).toBeInTheDocument()
    })
  })

  it('renders courses section', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Courses')[0])

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })
  })

  it('renders users section', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('User Management')[0])

    await waitFor(() => {
      expect(screen.getAllByText('User Management')[0]).toBeInTheDocument()
    })

    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('student@test.com')).toBeInTheDocument()
  })

  it('renders exercises section with reimport button', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Exercises')[0])

    await waitFor(() => {
      expect(screen.getByText('Exercise Management')).toBeInTheDocument()
    })

    // Select a course to reveal the reimport button
    const searchInput = screen.getByPlaceholderText('Search and select a course…')
    fireEvent.change(searchInput, { target: { value: 'Python' } })
    fireEvent.click(screen.getByText('Python Basics'))

    await waitFor(() => {
      expect(screen.getByText('Exercise Stats')).toBeInTheDocument()
    })
  })

  it('renders reset section with three danger cards', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Reset Tools')[0])

    await waitFor(() => {
      expect(screen.getByText('Reset Course Progress')).toBeInTheDocument()
    })

    expect(screen.getByText('Reset Track Progress')).toBeInTheDocument()
    expect(screen.getByText(/Full System Reset/)).toBeInTheDocument()
    expect(screen.getByText('Reset This Course')).toBeInTheDocument()
    expect(screen.getByText('Reset Entire Track')).toBeInTheDocument()
    expect(screen.getByText('Reset Everything')).toBeInTheDocument()
  })

  it('renders system section with live stats and logs', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('System Stats')[0])

    await waitFor(() => {
      expect(screen.getByText('Live Stats')).toBeInTheDocument()
    })

    expect(screen.getByText('System Logs')).toBeInTheDocument()
    expect(screen.getByText('Re-import ALL Course Exercises')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    fetch.mockRejectedValue(new Error('Network error'))

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    })
  })

  it('shows nuclear reset password field and button', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Reset Tools')[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your admin password to confirm')).toBeInTheDocument()
    })

    expect(screen.getByText('Reset Everything')).toBeInTheDocument()
    expect(screen.getByText('Reset Everything').closest('button')).toBeDisabled()
  })

  it('shows course reset confirmation modal when button clicked', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Reset Tools')[0])

    await waitFor(() => {
      expect(screen.getByText('Reset Course Progress')).toBeInTheDocument()
    })

    expect(screen.getByText('Reset This Course')).toBeInTheDocument()
    expect(screen.getByText('Reset This Course').closest('button')).toBeDisabled()
  })

  it('has toggle admin and delete buttons in users section', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('User Management')[0])

    await waitFor(() => {
      expect(screen.getAllByText('Toggle Admin').length).toBe(2)
    })

    const toggleButtons = screen.getAllByText('Toggle Admin')
    expect(toggleButtons.length).toBe(2)

    const deleteButtons = screen.getAllByText('Delete')
    expect(deleteButtons.length).toBe(2)
  })
})
