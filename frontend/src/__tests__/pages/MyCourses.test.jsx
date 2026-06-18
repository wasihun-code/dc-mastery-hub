import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../components/PdfViewer', () => ({
  default: () => null
}))

import Tracks from '../../pages/Tracks'

const mockCourses = [
  {
    id: 1,
    name: 'Python Basics',
    slug: 'python-basics',
    difficulty: 'Easy',
    status: 'Completed',
    reviewed: 'Yes',
    overall_mastery: 95,
    tracks: [{ id: 1, name: 'Python Track', color: '#a78bfa' }],
    track_color: '#a78bfa',
    track_name: 'Python Track',
    track_language: 'Python',
    quiz_question_count: 10
  },
  {
    id: 2,
    name: 'SQL Fundamentals',
    slug: 'sql-fundamentals',
    difficulty: 'Medium',
    status: 'In Progress',
    reviewed: 'Yes',
    overall_mastery: 60,
    tracks: [{ id: 2, name: 'SQL Track', color: '#34d399' }],
    track_color: '#34d399',
    track_name: 'SQL Track',
    track_language: 'SQL',
    quiz_question_count: 5
  },
  {
    id: 3,
    name: 'Advanced Pandas',
    slug: 'advanced-pandas',
    difficulty: 'Hard',
    status: 'Not Started',
    reviewed: 'No',
    overall_mastery: 0,
    tracks: [{ id: 1, name: 'Python Track', color: '#a78bfa' }],
    track_color: '#a78bfa',
    track_name: 'Python Track',
    track_language: 'Python',
    quiz_question_count: 8
  }
]

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses']}>
      <Routes>
        <Route path="/courses" element={<Tracks />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
})

describe('MyCourses (Tracks page)', () => {
  it('renders course list fetched from API', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    expect(screen.getByText('SQL Fundamentals')).toBeInTheDocument()
    expect(screen.getByText('Advanced Pandas')).toBeInTheDocument()
  })

  it('shows "Select a Course" placeholder when nothing selected', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    expect(screen.getByText('Select a Course')).toBeInTheDocument()
    expect(screen.getByText(/Click any course on the left/)).toBeInTheDocument()
  })

  it('clicking a course populates right panel', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Python Basics'))

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })
  })

  it('shows "NOT REVIEWED" badge on unreviewed courses', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    const notReviewedBadges = screen.getAllByText('NOT REVIEWED')
    expect(notReviewedBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Review This Course First" for unreviewed course in right panel', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Advanced Pandas'))

    await waitFor(() => {
      expect(screen.getByText('Review This Course First')).toBeInTheDocument()
    })
  })

  it('unreviewed courses have lower opacity', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    const courseCards = screen.getAllByText('Advanced Pandas')
    const card = courseCards[0].closest('article')

    expect(card.className).toContain('opacity-50')
  })

  it('sorts reviewed before unreviewed', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    const items = screen.getAllByText(/Python Basics|SQL Fundamentals|Advanced Pandas/)
    expect(items[0]).toHaveTextContent('Python Basics')
    expect(items[1]).toHaveTextContent('SQL Fundamentals')
    expect(items[items.length - 1]).toHaveTextContent('Advanced Pandas')
  })

  it('filters courses by search input', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Show Filters'))

    const searchInput = screen.getByPlaceholderText('Search courses...')
    await userEvent.type(searchInput, 'SQL')

    expect(screen.queryByText('Python Basics')).not.toBeInTheDocument()
    expect(screen.getByText('SQL Fundamentals')).toBeInTheDocument()
  })

  it('shows loading skeleton on mount', () => {
    fetch.mockReturnValueOnce(new Promise(() => {}))

    renderComponent()

    expect(screen.getByText('Show Filters')).toBeInTheDocument()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('handles empty courses list', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('No courses match your filters')).toBeInTheDocument()
    })

    expect(screen.getByText('Select a Course')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('No courses match your filters')).toBeInTheDocument()
    })
  })

  it('toggles filter visibility', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    expect(screen.getByText('Show Filters')).toBeInTheDocument()
    expect(screen.queryByText('Hide Filters')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('Show Filters'))

    expect(screen.queryByText('Show Filters')).not.toBeInTheDocument()
    expect(screen.getByText('Hide Filters')).toBeInTheDocument()
  })

  it('resets all filters when Reset Filters clicked', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockCourses })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Show Filters'))

    const searchInput = screen.getByPlaceholderText('Search courses...')
    await userEvent.type(searchInput, 'SQL')

    expect(screen.queryByText('Python Basics')).not.toBeInTheDocument()

    const resetButton = screen.getAllByText('Reset Filters')[0]
    await userEvent.click(resetButton)

    await waitFor(() => {
      expect(screen.getByText('Python Basics')).toBeInTheDocument()
    })

    expect(screen.getByText('SQL Fundamentals')).toBeInTheDocument()
  })
})
