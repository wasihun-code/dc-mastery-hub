import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditQuestionModal from '../../components/EditQuestionModal'

describe('EditQuestionModal', () => {
  const mcqProps = {
    courseSlug: 'test-course',
    exerciseType: 'mcq',
    questionData: {
      question_text: 'What is 2+2?',
      options: { a: 'One', b: 'Two', c: 'Three', d: 'Four' },
      correct_option: 'd',
      explanation: 'Simple arithmetic'
    },
    onClose: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders modal content when mounted', () => {
    render(<EditQuestionModal {...mcqProps} />)

    expect(screen.getByText(/EDIT MCQ QUESTION/i)).toBeInTheDocument()
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders mcq form fields with existing data', () => {
    render(<EditQuestionModal {...mcqProps} />)

    expect(screen.getByDisplayValue('What is 2+2?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('One')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Two')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Three')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Four')).toBeInTheDocument()
    expect(screen.getByDisplayValue('d')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Simple arithmetic')).toBeInTheDocument()
  })

  it('shows labels for mcq fields', () => {
    render(<EditQuestionModal {...mcqProps} />)

    expect(screen.getByText('Question Text')).toBeInTheDocument()
    expect(screen.getByText('Correct Option (a/b/c/d)')).toBeInTheDocument()
    expect(screen.getByText('Explanation')).toBeInTheDocument()
    expect(screen.getByText('Option a')).toBeInTheDocument()
    expect(screen.getByText('Option b')).toBeInTheDocument()
    expect(screen.getByText('Option c')).toBeInTheDocument()
    expect(screen.getByText('Option d')).toBeInTheDocument()
  })

  it('renders flashcard form fields when exerciseType is flashcards', () => {
    render(
      <EditQuestionModal
        courseSlug="test-course"
        exerciseType="flashcards"
        questionData={{ front: 'What is Python?', back: 'A language' }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText((c) => c.includes('FLASHCARDS'))).toBeInTheDocument()
    expect(screen.getByDisplayValue('What is Python?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A language')).toBeInTheDocument()
    expect(screen.getByText('Front (Question)')).toBeInTheDocument()
    expect(screen.getByText('Back (Answer)')).toBeInTheDocument()
  })

  it('renders ftb form fields when exerciseType is ftb', () => {
    render(
      <EditQuestionModal
        courseSlug="test-course"
        exerciseType="ftb"
        questionData={{
          description: 'Fill the output',
          code: 'print([[0]])',
          code_template: 'print([[0]])',
          blanks: [
            { position: 0, answer: 'hello', distractors: ['hi', 'hey'] }
          ],
          explanation: 'Prints greeting'
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText(/EDIT FILL-IN-THE-BLANK QUESTION/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Fill the output')).toBeInTheDocument()
    expect(screen.getByDisplayValue('print([[0]])')).toBeInTheDocument()
    expect(screen.getByDisplayValue('hello|hi,hey')).toBeInTheDocument()
    expect(screen.getByText('Task Description')).toBeInTheDocument()
    expect(screen.getByText('Code Template')).toBeInTheDocument()
    expect(screen.getByText('Blanks')).toBeInTheDocument()
    expect(screen.getByText('Explanation')).toBeInTheDocument()
  })

  it('calls onSave when save button is clicked', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    fetch.mockResolvedValueOnce({ ok: true })

    render(<EditQuestionModal {...mcqProps} onSave={onSave} />)

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
  })

  it('calls onSave with the edited question data', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    fetch.mockResolvedValueOnce({ ok: true })

    render(<EditQuestionModal {...mcqProps} onSave={onSave} />)

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        question_text: 'What is 2+2?',
        correct_option: 'd',
      }))
    })
  })

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<EditQuestionModal {...mcqProps} onClose={onClose} />)

    await user.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when X close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<EditQuestionModal {...mcqProps} onClose={onClose} />)

    const closeButtons = screen.getAllByRole('button')
    const xButton = closeButtons.find(b => b.querySelector('svg'))
    if (xButton) {
      await user.click(xButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('shows error message when save fails', async () => {
    const user = userEvent.setup()

    fetch.mockResolvedValueOnce({ ok: false })

    render(<EditQuestionModal {...mcqProps} />)

    expect(screen.queryByText(/Failed to save/)).not.toBeInTheDocument()

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText(/Failed to save/)).toBeInTheDocument()
    })
  })

  it('shows success message after save', async () => {
    const user = userEvent.setup()

    fetch.mockResolvedValueOnce({ ok: true })

    render(<EditQuestionModal {...mcqProps} />)

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText(/Question updated/)).toBeInTheDocument()
    })
  })

  it('renders with bossbattle exercise type showing mcq fields', () => {
    render(
      <EditQuestionModal
        courseSlug="test-course"
        exerciseType="bossbattle"
        questionData={{
          question: 'What is 1+1?',
          option_a: '1',
          option_b: '2',
          option_c: '3',
          option_d: '4',
          correct_option: 'b',
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText(/EDIT BOSSBATTLE QUESTION/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('What is 1+1?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
  })

  it('renders matching form fields when exerciseType is matching', () => {
    render(
      <EditQuestionModal
        courseSlug="test-course"
        exerciseType="matching"
        questionData={{ term: 'var', match: 'variable' }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText(/EDIT MATCHING QUESTION/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('var')).toBeInTheDocument()
    expect(screen.getByDisplayValue('variable')).toBeInTheDocument()
  })

  it('renders challenge form fields when exerciseType is challenge', () => {
    render(
      <EditQuestionModal
        courseSlug="test-course"
        exerciseType="challenge"
        questionData={{
          title: 'My Challenge',
          description: 'Do the thing',
          dataset_file: 'data.csv',
          starter_code: '// start',
          solution_code: '// solution',
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText(/EDIT CHALLENGE QUESTION/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('My Challenge')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Do the thing')).toBeInTheDocument()
    expect(screen.getByDisplayValue('data.csv')).toBeInTheDocument()
    expect(screen.getByDisplayValue('// start')).toBeInTheDocument()
    expect(screen.getByDisplayValue('// solution')).toBeInTheDocument()
  })

  it('renders ftb live preview for code template with blanks', () => {
    render(
      <EditQuestionModal
        courseSlug="test-course"
        exerciseType="ftb"
        questionData={{
          description: 'Test',
          code: 'x = [[0]]\ny = [[1]]',
          code_template: 'x = [[0]]\ny = [[1]]',
          blanks: [
            { position: 0, answer: 'a', distractors: ['b'] },
            { position: 1, answer: 'c', distractors: ['d'] },
          ],
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText('Preview')).toBeInTheDocument()
  })


})
