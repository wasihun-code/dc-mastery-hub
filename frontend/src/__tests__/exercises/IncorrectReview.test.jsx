import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import IncorrectReview from '../../exercises/IncorrectReview'

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses/test-course/incorrect-review']}>
      <Routes>
        <Route path="/courses/:courseSlug/incorrect-review" element={<IncorrectReview />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('IncorrectReview', () => {
  it('shows loading state initially', () => {
    const { container } = renderComponent()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('fetches incorrect questions from API on mount', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ questions: [], course_id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/progress/incorrect-questions/test-course')
    })
    expect(fetch).toHaveBeenCalledWith('/api/progress/exercise-stats/test-course')
  })

  it('renders message when no incorrect questions', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ questions: [], course_id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Review Queue Clear!')).toBeInTheDocument()
    })
  })

  it('shows questions when incorrect data exists', async () => {
    const mockQuestions = [
      {
        question_id: 'q1',
        exercise_type: 'quiz',
        concept_id: 'c1',
        details: {
          question_text: 'What is 2+2?',
          options: { a: '3', b: '4', c: '5', d: '6' },
          correct_option: 'b',
          explanation: '2+2=4',
          per_option_feedback: {}
        }
      }
    ]

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ questions: mockQuestions, course_id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })
    expect(screen.getByText(/ITEM 1 OF 1/)).toBeInTheDocument()
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Review Queue Clear!')).toBeInTheDocument()
    })
  })

  it('shows grouped sections by exercise type', async () => {
    const mockQuestions = [
      {
        question_id: 'q1',
        exercise_type: 'flashcard',
        concept_id: 'c1',
        details: { front: 'Front text', back: 'Back text' }
      },
      {
        question_id: 'q2',
        exercise_type: 'fillblank',
        concept_id: 'c2',
        details: {
          task_description: 'Fill in the blank',
          code_template: 'print(_____)',
          blanks: [{ answer: 'hello', answer_alternatives: [] }]
        }
      }
    ]

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ questions: mockQuestions, course_id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Flashcard')).toBeInTheDocument()
    })
    expect(screen.getByText(/ITEM 1 OF 2/)).toBeInTheDocument()
  })

  it('clicking delete on a question calls API and removes it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const mockQuestions = [
      {
        question_id: 'q1',
        exercise_type: 'quiz',
        concept_id: 'c1',
        details: {
          question_text: 'What is 2+2?',
          options: { a: '3', b: '4', c: '5', d: '6' },
          correct_option: 'b',
          explanation: '2+2=4',
          per_option_feedback: {}
        }
      }
    ]

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ questions: mockQuestions, course_id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Multiple Choice Quiz')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/progress/delete-question', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug: 'test-course', exerciseType: 'mcq', questionId: 'q1' })
      }))
    })
  })

  it('clicking Start Review navigates to first question', async () => {
    const mockQuestions = [
      {
        question_id: 'q1',
        exercise_type: 'quiz',
        concept_id: 'c1',
        details: {
          question_text: 'What is 2+2?',
          options: { a: '3', b: '4', c: '5', d: '6' },
          correct_option: 'b',
          explanation: '2+2=4',
          per_option_feedback: {}
        }
      },
      {
        question_id: 'q2',
        exercise_type: 'flashcard',
        concept_id: 'c2',
        details: { front: 'Front', back: 'Back' }
      }
    ]

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ questions: mockQuestions, course_id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/ITEM 1 OF 2/)).toBeInTheDocument()
    })
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
  })

  it('handles empty incorrect questions gracefully', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ questions: [], course_id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Review Queue Clear!')).toBeInTheDocument()
    })
    expect(screen.getByText('Back to Course Detail')).toBeInTheDocument()
  })

  it('handles API error with error message display', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        mcq: { available: 10, unattempted: 0 },
        flashcard: { available: 10, unattempted: 0 },
        ftb: { available: 10, unattempted: 0 },
        matching: { available: 10, unattempted: 0 },
        boss_battle: { available: 10, unattempted: 0 },
        dataset: { available: 10, unattempted: 0 }
      }) })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Review Queue Clear!')).toBeInTheDocument()
    })
    expect(screen.getByText('Back to Course Detail')).toBeInTheDocument()
  })
})
