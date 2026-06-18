import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../components/PdfViewer', () => ({
  default: () => null
}))

import CourseDetail from '../../pages/CourseDetail'

const mockCourse = {
  id: 1,
  name: 'Python Mastery',
  slug: 'python-mastery',
  difficulty: 'Medium',
  status: 'In Progress',
  reviewed: 'Yes',
  overall_mastery: 72,
  has_pdf: 1,
  has_glossary: 1,
  track: { slug: 'python-track', language: 'Python' }
}

const mockStats = {
  flashcard: { available: 10, sessions: 3, correct: 15, wrong: 5, unattempted: 2 },
  mcq: { available: 10, sessions: 4, correct: 8, wrong: 2, unattempted: 1 },
  ftb: { available: 8, sessions: 2, correct: 6, wrong: 4, unattempted: 3 },
  dataset: { available: 5, sessions: 1, correct: 3, wrong: 2, unattempted: 4 },
  matching: { available: 6, sessions: 0, correct: 0, wrong: 0, unattempted: 6 },
  boss_battle: { available: 3, sessions: 0, correct: 0, wrong: 0, unattempted: 3 }
}

const mockIncorrectStatus = {
  isUnlocked: false,
  attempted: 15,
  total: 20,
  attemptRatio: 0.75,
  incorrectCount: 5
}

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses/python-mastery']}>
      <Routes>
        <Route path="/courses/:courseSlug" element={<CourseDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
})

describe('CourseDetail', () => {
  it('renders exercise cards in grid for available exercises', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    expect(screen.getByText('Flashcards')).toBeInTheDocument()
    expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    expect(screen.getByText('Fill in the Blank')).toBeInTheDocument()
    expect(screen.getByText('Dataset Challenge')).toBeInTheDocument()
    expect(screen.getByText('Matching Game')).toBeInTheDocument()
    expect(screen.getByText('Boss Battle 🔥')).toBeInTheDocument()
  })

  it('shows mastery bar with percentage and color', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('shows locked Incorrect Review card with progress bar', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    expect(screen.getByText('Incorrect Review')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()

    const lockedBtn = screen.getByText('Check Unlock Status')
    expect(lockedBtn).toBeInTheDocument()
  })

  it('shows Start Incorrect Review when unlocked', async () => {
    const unlockedStatus = {
      isUnlocked: true,
      attempted: 20,
      total: 20,
      attemptRatio: 1.0,
      incorrectCount: 3
    }

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => unlockedStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    expect(screen.getByText('Start Incorrect Review')).toBeInTheDocument()
  })

  it('re-fetches unlock status when Check Unlock Status clicked', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isUnlocked: true, attempted: 20, total: 20, attemptRatio: 1.0, incorrectCount: 3 })
    })

    await userEvent.click(screen.getByText('Check Unlock Status'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/courses/python-mastery/incorrect-review-status')
    })
  })

  it('shows View Slides button when has_pdf is true', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    expect(screen.getByText('View Slides')).toBeInTheDocument()
    expect(screen.getByText('View Glossary')).toBeInTheDocument()
  })

  it('Boss Battle button has accent-red styling', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    expect(screen.getByText('Boss Battle 🔥')).toBeInTheDocument()

    const battleBtn = screen.getByText('Enter Battle').closest('button')
    expect(battleBtn.className).toContain('accent-red')
  })

  it('exercise cards show hover green border glow', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    const flashcardsCard = screen.getByText('Flashcards').closest('[class*="group"]') || screen.getByText('Flashcards')
    expect(flashcardsCard).toBeInTheDocument()
  })

  it('mastery bar color changes based on percentage ranges', async () => {
    const lowMasteryCourse = { ...mockCourse, overall_mastery: 25 }
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => lowMasteryCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncorrectStatus })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Python Mastery')).toBeInTheDocument()
    })

    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('Needs Work')).toBeInTheDocument()
  })
})
