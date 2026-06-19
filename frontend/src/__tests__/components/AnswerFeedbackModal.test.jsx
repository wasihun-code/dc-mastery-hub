import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import AnswerFeedbackModal from '../../components/AnswerFeedbackModal'

describe('AnswerFeedbackModal', () => {
  const baseProps = {
    isOpen: true,
    isCorrect: true,
    explanation: 'This is the explanation text.',
    onContinue: vi.fn(),
  }

  afterEach(() => {
    cleanup()
  })

  it('renders correct state with green indicator when isCorrect=true', () => {
    render(<AnswerFeedbackModal {...baseProps} />)

    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Explanation')).toBeInTheDocument()
    expect(screen.getByText('This is the explanation text.')).toBeInTheDocument()
  })

  it('renders incorrect state with answer comparison when isCorrect=false', () => {
    render(
      <AnswerFeedbackModal
        {...baseProps}
        isCorrect={false}
        userAnswer="Paris"
        correctAnswer="London"
      />
    )

    expect(screen.getByText('Not Quite')).toBeInTheDocument()
    expect(screen.getByText(/Your answer:/)).toBeInTheDocument()
    expect(screen.getByText(/Correct answer:/)).toBeInTheDocument()
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
  })

  it('does not render answer comparison when isCorrect=true', () => {
    render(
      <AnswerFeedbackModal
        {...baseProps}
        isCorrect={true}
        userAnswer="Paris"
        correctAnswer="London"
      />
    )

    expect(screen.queryByText(/Your answer:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument()
  })

  it('renders explanation text', () => {
    render(<AnswerFeedbackModal {...baseProps} />)

    expect(screen.getByText('This is the explanation text.')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <AnswerFeedbackModal {...baseProps}>
        <p data-testid="child-content">Extra feedback content</p>
      </AnswerFeedbackModal>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Extra feedback content')).toBeInTheDocument()
  })

  it('clicking Continue calls onContinue', () => {
    const onContinue = vi.fn()
    render(<AnswerFeedbackModal {...baseProps} onContinue={onContinue} />)

    fireEvent.click(screen.getByText('Next Question'))

    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('Enter key calls onContinue while modal is open', () => {
    const onContinue = vi.fn()
    render(<AnswerFeedbackModal {...baseProps} onContinue={onContinue} />)

    fireEvent.keyDown(window, { key: 'Enter' })

    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('Space key calls onContinue while modal is open', () => {
    const onContinue = vi.fn()
    render(<AnswerFeedbackModal {...baseProps} onContinue={onContinue} />)

    fireEvent.keyDown(window, { key: ' ' })

    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('does not render when isOpen=false', () => {
    render(<AnswerFeedbackModal {...baseProps} isOpen={false} />)

    expect(screen.queryByText('Correct!')).not.toBeInTheDocument()
    expect(screen.queryByText('Next Question')).not.toBeInTheDocument()
  })
})
