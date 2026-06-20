import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FillBlank from '../../exercises/FillBlank'

const mockCourse = { id: 1, name: 'Test Course', reviewed: 'Yes', track: { slug: 'test-track' } }
const mockExercises = [
  {
    id: 1,
    description: 'Complete the function to add two numbers',
    code: 'def add(a, b):\n    return [[0]]\n',
    answers: ['a + b'],
    word_bank: ['a + b', 'a - b', 'a * b', 'a / b'],
    concept_id: 'c1',
    explanation: 'The + operator adds two numbers.',
    per_tile_feedback: { 'a + b': 'Correct operator!' }
  }
]

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses/test-course/fillblank']}>
      <Routes>
        <Route path="/courses/:courseSlug/fillblank" element={<FillBlank />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
})

// Stabilize Math.random for deterministic exercise ordering
beforeAll(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('FillBlank', () => {
  it('renders greeting then exercise with code template and description', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    expect(screen.getByText((content) => content.includes('return'))).toBeInTheDocument()
  })

  it('allows typing in the blank input field', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    expect(input.value).toBe('a + b')
  })

  it('submits answer and shows correct feedback', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Check Answer'))

    await waitFor(() => {
      expect(screen.getByText('Explanation')).toBeInTheDocument()
    })

    expect(screen.getByText('The + operator adds two numbers.')).toBeInTheDocument()
  })

  it('shows word bank pills when choices enabled', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Enable Choices'))

    await waitFor(() => {
      expect(screen.getByText('Word Bank')).toBeInTheDocument()
    })

    expect(screen.getByText('a + b')).toBeInTheDocument()
    expect(screen.getByText('a - b')).toBeInTheDocument()
  })

  it('clicking a word bank pill fills the blank', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Enable Choices'))

    await waitFor(() => {
      expect(screen.getByText('Word Bank')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText(/^a \+ b/))

    await waitFor(() => {
      expect(screen.queryByText('_____')).not.toBeInTheDocument()
    })
  })

  it('handles API error when fetching exercises', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    expect(screen.getByText('0 Exercises')).toBeInTheDocument()
  })

  it('shows empty state when no exercises returned', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    expect(screen.getByText('0 Exercises')).toBeInTheDocument()
  })

  it('navigates to next exercise after correct answer', async () => {
    const twoExercises = [
      ...mockExercises,
      {
        id: 2,
        description: 'Complete the function to subtract two numbers',
        code: 'def subtract(a, b):\n    return [[0]]\n',
        answers: ['a - b'],
        word_bank: ['a + b', 'a - b', 'a * b', 'a / b'],
        concept_id: 'c2',
        explanation: 'The - operator subtracts two numbers.',
        per_tile_feedback: { 'a - b': 'Correct operator!' }
      }
    ]

    const mockMap = {
      '/api/courses/test-course': mockCourse,
      '/api/content/exercises/test-course/ftb': twoExercises,
      '/api/progress/attempted-questions/test-course/fillblank': [],
    }
    fetch.mockImplementation((url) => {
      const data = mockMap[url]
      return Promise.resolve({ ok: !!data, json: async () => data || {} })
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    fetch.mockImplementation((url, opts) => {
      if (opts && opts.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      const data = mockMap[url]
      return Promise.resolve({ ok: !!data, json: async () => data || {} })
    })

    await userEvent.click(screen.getByText('Check Answer'))

    await waitFor(() => {
      expect(screen.getByText('Next Exercise')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Next Exercise'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to subtract two numbers')).toBeInTheDocument()
    })
  })

  it('opens feedback modal after submitting answer', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Check Answer'))

    await waitFor(() => {
      expect(screen.getByText('Next Question')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Correct!')[0]).toBeInTheDocument()
    expect(screen.getByText('Explanation')).toBeInTheDocument()
  })

  it('closes feedback modal when Continue is clicked', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('Check Answer'))

    await waitFor(() => {
      expect(screen.getByText('Next Question')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

    await waitFor(() => {
      expect(screen.queryByText('Next Question')).not.toBeInTheDocument()
    })
  })

  it('advances to next exercise via modal Continue', async () => {
    const twoExercises = [
      ...mockExercises,
      {
        id: 2,
        description: 'Complete the function to subtract two numbers',
        code: 'def subtract(a, b):\n    return [[0]]\n',
        answers: ['a - b'],
        word_bank: ['a + b', 'a - b', 'a * b', 'a / b'],
        concept_id: 'c2',
        explanation: 'The - operator subtracts two numbers.',
        per_tile_feedback: { 'a - b': 'Correct operator!' }
      }
    ]

    const mockMap = {
      '/api/courses/test-course': mockCourse,
      '/api/content/exercises/test-course/ftb': twoExercises,
      '/api/progress/attempted-questions/test-course/fillblank': [],
    }
    fetch.mockImplementation((url) => {
      const data = mockMap[url]
      return Promise.resolve({ ok: !!data, json: async () => data || {} })
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    fetch.mockImplementation((url, opts) => {
      if (opts && opts.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      const data = mockMap[url]
      return Promise.resolve({ ok: !!data, json: async () => data || {} })
    })

    await userEvent.click(screen.getByText('Check Answer'))

    await waitFor(() => {
      expect(screen.getByText('Next Question')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to subtract two numbers')).toBeInTheDocument()
    })
  })

  it('starts next exercise with empty input after modal Continue', async () => {
    const twoExercises = [
      ...mockExercises,
      {
        id: 2,
        description: 'Complete the function to subtract two numbers',
        code: 'def subtract(a, b):\n    return [[0]]\n',
        answers: ['a - b'],
        word_bank: ['a + b', 'a - b', 'a * b', 'a / b'],
        concept_id: 'c2',
        explanation: 'The - operator subtracts two numbers.',
        per_tile_feedback: { 'a - b': 'Correct operator!' }
      }
    ]

    const mockMap = {
      '/api/courses/test-course': mockCourse,
      '/api/content/exercises/test-course/ftb': twoExercises,
      '/api/progress/attempted-questions/test-course/fillblank': [],
    }
    fetch.mockImplementation((url) => {
      const data = mockMap[url]
      return Promise.resolve({ ok: !!data, json: async () => data || {} })
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    fetch.mockImplementation((url, opts) => {
      if (opts && opts.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      const data = mockMap[url]
      return Promise.resolve({ ok: !!data, json: async () => data || {} })
    })

    await userEvent.click(screen.getByText('Check Answer'))

    await waitFor(() => {
      expect(screen.getByText('Next Question')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to subtract two numbers')).toBeInTheDocument()
    })

    const nextInput = screen.getByPlaceholderText('_____')
    expect(nextInput.value).toBe('')
  })

  it('clears user input when Clear button is clicked', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('_____')
    await userEvent.type(input, 'a + b')

    expect(input.value).toBe('a + b')

    await userEvent.click(screen.getByText('Clear'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('_____').value).toBe('')
    })
  })

  it('toggles between Enable Choices / Disable', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockExercises })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('Complete the function to add two numbers')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Enable Choices'))

    await waitFor(() => {
      expect(screen.getByText('Disable Choices')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Disable Choices'))

    await waitFor(() => {
      expect(screen.getByText('Enable Choices')).toBeInTheDocument()
    })
  })
})
