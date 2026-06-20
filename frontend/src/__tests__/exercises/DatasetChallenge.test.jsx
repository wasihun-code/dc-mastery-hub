import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DatasetChallenge from '../../exercises/DatasetChallenge'

const mockChallenge = {
  id: 1,
  title: 'Test Dataset Challenge',
  description: 'Write code to analyze the dataset.',
  difficulty: 'easy',
  dataset_file: 'test_data.csv',
  starter_code: '# Starter code\nimport pandas as pd\n\ndf = pd.read_csv("test_data.csv")\n',
  solution_code: '# Solution\nprint("done")',
  expected_output_code: '# Solution\nprint("done")',
  expected_output: 'dummy expected output',
  hints: ['Try using .head()', 'Check the column names'],
  pre_loaded_data: {
    df: { type: 'csv', path: 'test_data.csv' },
    x: { type: 'value', data: 42 }
  },
  concepts_tested: ['concept-1']
}

const mockCourse = {
  id: 1,
  name: 'Test Course',
  reviewed: 'Yes',
  track: { slug: 'test-track' },
  track_slug: 'test-track'
}

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/courses/test-course/dataset-challenge']}>
      <Routes>
        <Route path="/courses/:courseSlug/dataset-challenge" element={<DatasetChallenge />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetch.mockReset()
})

describe('DatasetChallenge', () => {
  it('renders challenge title, pre-loaded comments, and code editor', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    expect(screen.getByText('Pre-loaded Variables')).toBeInTheDocument()
    expect(screen.getByText('df')).toBeInTheDocument()
    expect(screen.getByText('x')).toBeInTheDocument()
  })

  it('calls POST /api/content/run-code on Run Code click and shows output', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stdout: 'column1   42\ncolumn2   3.14',
        stderr: '',
        executionTime: 123,
        variables: { result: { type: 'DataFrame', preview: '...' } }
      })
    })

    await userEvent.click(screen.getByText('▶ Run Code'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/content/run-code', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('challenge_id')
      }))
    })

    await waitFor(() => {
      expect(screen.getByText(/column1/)).toBeInTheDocument()
      expect(screen.getByText('Executed in 123ms')).toBeInTheDocument()
    })
  })

  it('shows stderr in red', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stdout: '',
        stderr: 'NameError: name x is not defined',
        executionTime: 45,
        variables: {}
      })
    })

    await userEvent.click(screen.getByText('▶ Run Code'))

    await waitFor(() => {
      expect(screen.getByText('NameError: name x is not defined')).toBeInTheDocument()
      const stderr = screen.getByText('NameError: name x is not defined')
      expect(stderr.className).toContain('accent-red')
    })
  })

  it('submits challenge and shows pass/fail result', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passed: true, feedback: 'All tests passed!' })
    })

    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('✓ Submit'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/content/submit-challenge', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('challengeId')
      }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Correct/)).toBeInTheDocument()
    })
  })

  it('toggles console visibility with chevron button', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    expect(screen.getByText('Console')).toBeInTheDocument()

    const toggleButtons = screen.getAllByTitle('Toggle console (Ctrl+J)')
    await userEvent.click(toggleButtons[0])

    expect(screen.queryByText('Console')).not.toBeInTheDocument()
  })

  it('navigates prev/next challenges', async () => {
    const challenge2 = { ...mockChallenge, id: 2, title: 'Second Challenge', starter_code: '# Second\nprint("two")' }

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge, challenge2] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Next ⟩'))

    await waitFor(() => {
      expect(screen.getByText('Second Challenge')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('⟨ Prev'))

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })
  })

  it('shows solution when unlock confirmed', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    const solutionBtn = screen.getByTitle('Show solution')
    await userEvent.click(solutionBtn)

    await waitFor(() => {
      expect(screen.getByText('Reveal Solution')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Yes, Show Solution'))

    await waitFor(() => {
      expect(screen.getByText('script.py')).toBeInTheDocument()
    })
  })

  it('resets code to starter_code on Reset', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    const editor = screen.getByTestId('monaco-editor')
    expect(editor.value).toContain('import pandas as pd')

    fireEvent.change(editor, { target: { value: 'modified code' } })
    expect(editor.value).toBe('modified code')

    await userEvent.click(screen.getByTitle('Reset to starter code'))

    await waitFor(() => {
      expect(editor.value).toContain('import pandas as pd')
    })
  })

  it('shows Variables tab with Name/Type/Preview columns after run', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stdout: '',
        stderr: '',
        executionTime: 10,
        variables: {
          df: { type: 'DataFrame', shape: '(100, 5)', preview: 'col1 col2 ...' },
          result: { type: 'int', preview: '42' }
        }
      })
    })

    await userEvent.click(screen.getByText('▶ Run Code'))

    await waitFor(() => {
      expect(screen.getByText('(no output)')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Variables'))

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Preview')).toBeInTheDocument()
    })

    const dfElements = screen.getAllByText('df')
    expect(dfElements.length).toBe(2)
    expect(dfElements[1]).toBeInTheDocument()
    expect(screen.getByText('DataFrame ((100, 5))')).toBeInTheDocument()
  })

  it('shows History tab with last 5 runs', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stdout: 'output', stderr: '', executionTime: 10, variables: {} })
    })

    await userEvent.click(screen.getByText('▶ Run Code'))
    await userEvent.click(screen.getByText('History'))

    await waitFor(() => {
      expect(screen.getByText('Last 5 Runs')).toBeInTheDocument()
    })
  })

  it('allows snippet input via >>> prompt', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    const snippetInput = screen.getByPlaceholderText('Run a Python line...')

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stdout: '5', stderr: '', executionTime: 2 })
    })

    await userEvent.type(snippetInput, '2 + 3{Enter}')

    await waitFor(() => {
      expect(screen.getByText('>>> 2 + 3')).toBeInTheDocument()
    })
  })

  it('shows session complete summary after finishing all challenges', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passed: true, feedback: 'All tests passed!' })
    })
    fetch.mockResolvedValueOnce({ ok: true })

    await userEvent.click(screen.getByText('✓ Submit'))

    await waitFor(() => {
      expect(screen.getByText(/Correct/)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Next Challenge'))

    await waitFor(() => {
      expect(screen.getByText('Session Complete!')).toBeInTheDocument()
      expect(screen.getByText('1 / 1')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('+50 XP')).toBeInTheDocument()
    })
  })

  it('shows error message when challenge fetch fails', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockRejectedValueOnce(new Error('Network error'))

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Failed to load challenges.')).toBeInTheDocument()
    })
  })

  it('navigates to /courses when course is not reviewed', async () => {
    const unreviewedCourse = { ...mockCourse, reviewed: 'No' }

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => unreviewedCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    const { container } = renderComponent()

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
    })

    expect(screen.queryByText('Test Dataset Challenge')).not.toBeInTheDocument()
  })

  it('shows loading spinner during initial fetch', () => {
    fetch.mockImplementation(() => new Promise(() => {}))

    const { container } = renderComponent()

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows expected output when expected_output.txt tab is clicked', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourse })
      .mockResolvedValueOnce({ ok: true, json: async () => [mockChallenge] })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Dataset Challenge')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('expected_output.txt'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('dummy expected output')).toBeInTheDocument()
    })
  })
})
