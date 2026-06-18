import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MatchingGame from '../../exercises/MatchingGame'

vi.mock('../../services/settingsService', () => ({
  getSessionLimit: vi.fn(() => 10)
}))

let userEvent

const mockCourse = { id: 1, name: 'Test Course', reviewed: 'Yes', track: { slug: 'test-track' } }

const mockMatchingData = [
  {
    pairs: [
      { id: 1, concept_id: 11, term: 'Array', match: 'A collection of elements' },
      { id: 2, concept_id: 22, term: 'String', match: 'A sequence of characters' },
      { id: 3, concept_id: 33, term: 'Integer', match: 'A whole number' },
      { id: 4, concept_id: 44, term: 'Float', match: 'A decimal number' },
      { id: 5, concept_id: 55, term: 'Boolean', match: 'True or false value' },
    ]
  }
]

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/exercise/matching/test-course']}>
      <Routes>
        <Route path="/exercise/matching/:courseSlug" element={<MatchingGame />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
  localStorage.clear()
  fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
})

afterEach(() => {
  cleanup()
})

describe('MatchingGame', () => {
  it('renders greeting screen with Start button', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockMatchingData })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Matching Game')).toBeInTheDocument()
    })

    expect(screen.getByText('START')).toBeInTheDocument()
    expect(screen.getByText('Test Course')).toBeInTheDocument()
  })

  it('clicking Start begins the game and shows matchable items', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockMatchingData })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Matching Game')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Array')).toBeInTheDocument()
    })

    expect(screen.getByText('A collection of elements')).toBeInTheDocument()
    expect(screen.getByText(/0 \/ 5 matched/)).toBeInTheDocument()
  })

  it('selecting a correct match pair increases match count', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockMatchingData })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Matching Game')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Array')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Array'))
    await userEvent.click(screen.getByText('A collection of elements'))

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 5 matched/)).toBeInTheDocument()
    })
  })

  it('shows summary screen after completing all matches', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockMatchingData })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Matching Game')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Array')).toBeInTheDocument()
    })

    const pairs = [
      ['Array', 'A collection of elements'],
      ['String', 'A sequence of characters'],
      ['Integer', 'A whole number'],
      ['Float', 'A decimal number'],
    ]

    for (const [term, def] of pairs) {
      await userEvent.click(screen.getByText(term))
      await userEvent.click(screen.getByText(def))
    }

    await waitFor(() => {
      expect(screen.getByText('All pairs matched!')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Finish Match Game'))

    await waitFor(() => {
      expect(screen.getByText('Game Complete!')).toBeInTheDocument()
    })

    expect(screen.getByText(/\+15 XP/)).toBeInTheDocument()
  })

  it('posts attempt to API on correct match', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockMatchingData })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Matching Game')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Array')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Array'))
    await userEvent.click(screen.getByText('A collection of elements'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/progress/attempt', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"exercise_type":"matching"')
      }))
    })

    const attemptCall = fetch.mock.calls.find(
      ([url]) => url === '/api/progress/attempt'
    )
    const body = JSON.parse(attemptCall[1].body)
    expect(body.score).toBe(1.0)
    expect(body.was_correct).toBe(1)
    expect(body.question_id).toBe(1)
  })
})
