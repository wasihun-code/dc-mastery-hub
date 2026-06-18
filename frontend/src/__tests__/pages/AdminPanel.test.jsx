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
    { id: 1, username: 'admin@test.com', is_admin: 1, total_xp: 5000, level: 'Expert', current_streak: 10, created_at: '2026-01-01' },
    { id: 2, username: 'student@test.com', is_admin: 0, total_xp: 1500, level: 'Intermediate', current_streak: 3, created_at: '2026-02-01' },
  ],
}

const mockConfig = {
  config: {
    PORT: 3001, HOST: '127.0.0.1', NODE_ENV: 'test',
    DB_PATH: '/tmp/test.db', CONTENT_PATH: '/tmp/content',
    FRONTEND_URL: 'http://localhost:5173', CHALLENGE_TIMEOUT_MS: 15000,
    PYTHON_PATH: 'python3',
  },
}

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
  '/api/admin/system/config': mockConfig,
}

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

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getAllByText('Tracks')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Courses')[0]).toBeInTheDocument()
    expect(screen.getByText('Exercises')).toBeInTheDocument()
    expect(screen.getAllByText('Users')[0]).toBeInTheDocument()
    expect(screen.getByText('Reset Tools')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
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

    fireEvent.click(screen.getAllByText('Users')[0])

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })

    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('student@test.com')).toBeInTheDocument()
  })

  it('renders exercises section with reimport button', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Exercises'))

    await waitFor(() => {
      expect(screen.getByText('Exercise Management')).toBeInTheDocument()
    })

    expect(screen.getByText('Re-import Exercises')).toBeInTheDocument()
  })

  it('renders reset section with three danger cards', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Reset Tools'))

    await waitFor(() => {
      expect(screen.getByText('Reset Course Progress')).toBeInTheDocument()
    })

    expect(screen.getByText('Reset Track Progress')).toBeInTheDocument()
    expect(screen.getByText(/Full System Reset/)).toBeInTheDocument()
    expect(screen.getByText('Reset This Course')).toBeInTheDocument()
    expect(screen.getByText('Reset Entire Track')).toBeInTheDocument()
    expect(screen.getByText('Reset Everything')).toBeInTheDocument()
  })

  it('renders system section with config', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('System'))

    await waitFor(() => {
      expect(screen.getByText('System Configuration')).toBeInTheDocument()
    })

    expect(screen.getByText('3001')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    fetch.mockRejectedValue(new Error('Network error'))

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
    })
  })

  it('shows nuclear reset password field and button', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Reset Tools'))

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

    fireEvent.click(screen.getByText('Reset Tools'))

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

    fireEvent.click(screen.getAllByText('Users')[0])

    await waitFor(() => {
      expect(screen.getAllByText('Toggle Admin').length).toBe(2)
    })

    const toggleButtons = screen.getAllByText('Toggle Admin')
    expect(toggleButtons.length).toBe(2)

    const deleteButtons = screen.getAllByText('Delete')
    expect(deleteButtons.length).toBe(2)
  })
})
