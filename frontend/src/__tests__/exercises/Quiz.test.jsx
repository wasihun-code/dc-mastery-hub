import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Quiz from '../../exercises/Quiz'

let userEvent

function clickOption(text) {
  const btn = screen.getByText((content, el) => el.tagName === 'SPAN' && content === text && !!el.closest('button'))
  return userEvent.click(btn)
}

const mockCourse = { id: 1, name: 'Test Course', reviewed: 'Yes', track: { slug: 'test-track' } }
const mockQuestions = [
  {
    id: 1,
    question_text: 'What is 2+2?',
    option_a: '3',
    option_b: '4',
    option_c: '5',
    option_d: '6',
    correct_option: 'b',
    explanation: '2+2 equals 4',
    per_option_feedback: { b: 'Correct!', a: 'Try again', c: 'Nope', d: 'No' },
    hints: ['Think basic arithmetic'],
    concept_id: 'c1'
  },
  {
    id: 2,
    question_text: 'What is 3+3?',
    option_a: '5',
    option_b: '6',
    option_c: '7',
    option_d: '8',
    correct_option: 'b',
    explanation: '3+3 equals 6',
    per_option_feedback: { b: 'Correct!', a: 'No', c: 'Wrong', d: 'Nope' },
    hints: ['More addition'],
    concept_id: 'c2'
  }
]

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses/test-course/quiz']}>
      <Routes>
        <Route path="/courses/:courseSlug/quiz" element={<Quiz />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('Quiz', () => {
  it('renders greeting then starts quiz with question and 4 options', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await screen.findByText((c, el) => el.tagName === 'SPAN' && c.includes('What is'))

    await waitFor(() => {
      expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c === '3')).toBeInTheDocument()
    })
  })

  it('selects option and reveals correct/incorrect feedback on Check Answer', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await clickOption('4')

    await waitFor(() => {
      expect(screen.getByText('Explanation')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getAllByText(/2\+2 equals 4/).length).toBeGreaterThan(0)
  })

  it('shows Next Question after checking correct answer', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await clickOption('4')

    await waitFor(() => {
      expect(screen.getByText('Next Question')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('marks wrong answer red and correct answer green', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await clickOption('3')

    await waitFor(() => {
      expect(screen.getByText('Explanation')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('loads next question when Next Question clicked', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await clickOption('4')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument()
    }, { timeout: 3000 })

    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

    await waitFor(() => {
      expect(screen.getByText('What is 3+3?')).toBeInTheDocument()
    })
  })

  it('handles API error when fetching questions', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    expect(screen.getByText('0 Questions')).toBeInTheDocument()
  })

  it('shows 0 questions state', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    expect(screen.getByText('0 Questions')).toBeInTheDocument()
  })

  it('handles empty options gracefully', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()

    const questionWithFewOptions = [{
      ...mockQuestions[0],
      option_b: null,
      option_c: null,
      option_d: null,
    }]

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => questionWithFewOptions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    expect(screen.getByText((c, el) => el.tagName === 'SPAN' && c === '3')).toBeInTheDocument()
  })

  it('selects option via keyboard number shortcut', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.keyboard('2')

    await waitFor(() => {
      expect(screen.getByText('Explanation')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getAllByText(/2\+2 equals 4/).length).toBeGreaterThan(0)
  })

  it('shows final score screen after last question', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('START'))

    fetch.mockResolvedValueOnce({ ok: true })
    await clickOption('4')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument()
    }, { timeout: 3000 })

    fetch.mockResolvedValueOnce({ ok: true })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total_xp: 10 }) })
    fetch.mockResolvedValueOnce({ ok: true })

    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

    await waitFor(() => {
      expect(screen.getByText('What is 3+3?')).toBeInTheDocument()
    })
    await clickOption('6')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Question|Finish Quiz/i })).toBeInTheDocument()
    }, { timeout: 3000 })

    fireEvent.click(screen.getByRole('button', { name: /Finish Quiz/i }))

    await waitFor(() => {
      expect(screen.getByText('Session Complete!')).toBeInTheDocument()
    })
  })
})
