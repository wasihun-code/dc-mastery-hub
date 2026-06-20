import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Flashcards from '../../exercises/Flashcards'

let mockNavigate
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  }
})

const mockCourse = { id: 1, name: 'Test Course', reviewed: 'Yes', track: { slug: 'test-track' } }
const mockCards = [
  { id: 1, front: 'What is Python?', back: 'A programming language', card_type: 'concept_to_code', concept_id: 'c1', explanation: 'Python is a high-level language.' },
  { id: 2, front: 'What is a list?', back: 'An ordered collection', card_type: 'code_to_concept', concept_id: 'c2', explanation: 'Lists store multiple items.' }
]

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses/test-course/flashcards']}>
      <Routes>
        <Route path="/courses/:courseSlug/flashcards" element={<Flashcards />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockNavigate = vi.fn()
  fetch.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('Flashcards', () => {
  it('renders greeting screen then starts exercise', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    expect(screen.getByText('2 Cards')).toBeInTheDocument()

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })
  })

  it('flips card on click revealing back and quality buttons', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    const card = screen.getByText('Click Card to Flip').closest('[onClick]') || screen.getByText('Click Card to Flip').parentElement?.parentElement
    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    expect(screen.getByText('Again')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
  })

  it('calls POST /api/progress/attempt when quality button clicked', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/progress/attempt', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('flashcard')
      }))
    })
  })

  it('shows session complete after reviewing all cards', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('An ordered collection'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total_xp: 10 }) })
    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Session Complete!')).toBeInTheDocument()
    })
  })

  it('advances progress bar after each card review', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument()
    })
  })

  it('renders greeting screen with course name and START button', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Course')).toBeInTheDocument()
    expect(screen.getByText('2 Cards')).toBeInTheDocument()
    expect(screen.getByText('START')).toBeInTheDocument()
  })

  it('shows flashcard front when started', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })
  })

  it('Clicking the card flips to show back', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })
  })

  it('Shows quality rating buttons (0-5) after flipping', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText('Again')).toBeInTheDocument()
      expect(screen.getByText('Hard')).toBeInTheDocument()
      expect(screen.getByText('Good')).toBeInTheDocument()
      expect(screen.getByText('Easy')).toBeInTheDocument()
    })
  })

  it('Clicking a quality button submits progress and loads next card', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/progress/attempt', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('flashcard')
      }))
    })

    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    })
  })

  it('Shows session complete screen after all cards reviewed', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('An ordered collection'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total_xp: 10 }) })
    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Session Complete!')).toBeInTheDocument()
    })
  })

  it('Clicking Finish returns to course page', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('An ordered collection'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total_xp: 10 }) })
    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Session Complete!')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Back to Course'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/courses/test-course?refresh=1')
    })
  })

  it('Handles API error gracefully', async () => {
    Math.random = () => 0.5
    fetch.mockRejectedValueOnce(new Error('Network error'))

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })
  })

  it('Shows empty state when no flashcards returned', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    expect(screen.getByText('0 Cards')).toBeInTheDocument()
  })

  it('cycles through multiple flashcards showing next card front after rating', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    })

    expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is a list?'))).toBeInTheDocument()
  })

  it('toggles flip state hiding and showing rating buttons', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    // Flip to back - rating buttons appear
    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText('Again')).toBeInTheDocument()
    })

    // Flip back to front - rating buttons disappear
    await userEvent.click(screen.getByText('Click Card to Flip Back'))

    await waitFor(() => {
      expect(screen.queryByText('Again')).not.toBeInTheDocument()
    })

    // Flip again - rating buttons reappear
    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText('Again')).toBeInTheDocument()
    })
  })

  it('displays correct keyboard shortcut values on rating buttons', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    expect(screen.getByText('Again').closest('button').querySelector('kbd').textContent).toBe('1')
    expect(screen.getByText('Hard').closest('button').querySelector('kbd').textContent).toBe('2')
    expect(screen.getByText('Good').closest('button').querySelector('kbd').textContent).toBe('3')
    expect(screen.getByText('Easy').closest('button').querySelector('kbd').textContent).toBe('4/5')
  })

  it('advances to next card when API attempt call fails', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockRejectedValueOnce(new Error('Network error'))

    await userEvent.click(screen.getByText('Good'))

    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    })
  })

  it('sends was_correct: 0 when rating Again for an incorrect answer', async () => {
    Math.random = () => 0.5
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard Study')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('What is Python'))).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Click Card to Flip'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c.includes('A programming language'))).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Again'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/progress/attempt', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"was_correct":false')
      }))
    })
  })
})
