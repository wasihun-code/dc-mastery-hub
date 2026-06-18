import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BossBattle from '../../exercises/BossBattle'

let userEvent

const mockCourse = { id: 1, name: 'Python Boss', reviewed: 'Yes', track: { slug: 'test-track' } }
const mockQuestions = [
  {
    id: 101,
    question_text: 'What is the output of `print(2**3)`?',
    option_a: '6',
    option_b: '8',
    option_c: '9',
    option_d: 'Error',
    correct_option: 'b',
    code: 'print(2**3)',
    hints: ['Exponentiation in Python'],
    concept_id: 'c1',
    wave: 1
  },
  {
    id: 102,
    question_text: 'What is the capital of France?',
    option_a: 'London',
    option_b: 'Paris',
    option_c: 'Berlin',
    option_d: 'Madrid',
    correct_option: 'b',
    hints: ['Think of the Eiffel Tower'],
    concept_id: 'c2',
    wave: 1
  }
]

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses/test-course/bossbattle']}>
      <Routes>
        <Route path="/courses/:courseSlug/bossbattle" element={<BossBattle />} />
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

describe('BossBattle', () => {
  it('renders greeting screen', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    expect(screen.getByText('Python Boss')).toBeInTheDocument()
    expect(screen.getByText(/Boss Battle/)).toBeInTheDocument()
  })

  it('starts the boss battle on button click', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('ENTER BATTLE'))

    await waitFor(() => {
      expect(screen.getByText(/What is the output/)).toBeInTheDocument()
    })

    const optionBtns = screen.getAllByRole('button').filter(
      b => b.closest('[class*="exercise-layout"]') || b.parentElement?.closest('[class*="grid"]')
    )

    expect(optionBtns.length).toBeGreaterThanOrEqual(4)
  })

  it('shows code blocks in questions', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('ENTER BATTLE'))

    await waitFor(() => {
      expect(screen.getAllByText('print(2**3)').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles answer submission', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('ENTER BATTLE'))

    await waitFor(() => {
      expect(screen.getByText(/What is the output/)).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    const optBtn = screen.getByText((content, el) => {
      return el.tagName === 'SPAN' && content === '8' && !!el.closest('button')
    }).closest('button')

    await userEvent.click(optBtn)

    await waitFor(() => {
      expect(optBtn.disabled).toBe(true)
    })
  })

  it('shows wrong answer feedback when incorrect option selected', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('ENTER BATTLE'))

    await waitFor(() => {
      expect(screen.getByText(/What is the output/)).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    const wrongBtn = screen.getByText((content, el) => {
      return el.tagName === 'SPAN' && content === '6' && !!el.closest('button')
    }).closest('button')

    await userEvent.click(wrongBtn)

    await waitFor(() => {
      expect(wrongBtn.disabled).toBe(true)
    })

    expect(screen.getByText('0 pts')).toBeInTheDocument()
  })

  it('shows multiple questions in sequence', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('ENTER BATTLE'))

    await waitFor(() => {
      expect(screen.getByText(/What is the output/)).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    const optBtn = screen.getByText((content, el) => {
      return el.tagName === 'SPAN' && content === '8' && !!el.closest('button')
    }).closest('button')

    await userEvent.click(optBtn)

    await waitFor(() => {
      expect(screen.getByText(/capital of France/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows boss health decreasing on correct answers', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    const { container } = renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('ENTER BATTLE'))

    await waitFor(() => {
      expect(screen.getByText(/What is the output/)).toBeInTheDocument()
    })

    const healthBar = container.querySelector('[class*="bg-gradient-to-r"]')
    expect(healthBar).toHaveStyle('width: 100%')

    fetch.mockResolvedValueOnce({ ok: true })

    const optBtn = screen.getByText((content, el) => {
      return el.tagName === 'SPAN' && content === '8' && !!el.closest('button')
    }).closest('button')

    await userEvent.click(optBtn)

    await waitFor(() => {
      expect(healthBar).toHaveStyle('width: 50%')
    })
  })

  it('shows session complete screen after all questions answered', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('ENTER BATTLE')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('ENTER BATTLE'))

    await waitFor(() => {
      expect(screen.getByText(/What is the output/)).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({ ok: true })

    const q1Btn = screen.getByText((content, el) => {
      return el.tagName === 'SPAN' && content === '8' && !!el.closest('button')
    }).closest('button')

    await userEvent.click(q1Btn)

    await waitFor(() => {
      expect(screen.getByText(/capital of France/)).toBeInTheDocument()
    }, { timeout: 3000 })

    fetch.mockResolvedValueOnce({ ok: true })
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total_xp: 0 }) })
    fetch.mockResolvedValueOnce({ ok: true })

    const q2Btn = screen.getByText((content, el) => {
      return el.tagName === 'SPAN' && content === 'Paris' && !!el.closest('button')
    }).closest('button')

    await userEvent.click(q2Btn)

    await waitFor(() => {
      expect(screen.getByText(/UNDEFEATED/)).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText(/\+10 XP/)).toBeInTheDocument()
  })

  it('shows API error state gracefully', async () => {
    Math.random = () => 0.5
    userEvent = userEventLib.setup()
    fetch.mockRejectedValue(new Error('Network error'))

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/ENTER BATTLE/)).toBeInTheDocument()
    })
  })
})
