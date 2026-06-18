import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../../components/ErrorBoundary'

const GoodChild = () => <div data-testid="good-child">All good</div>
const BadChild = () => {
  throw new Error('Test error!')
}

beforeEach(() => {
  jestSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jestSpy?.mockRestore()
})

let jestSpy

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('good-child')).toBeInTheDocument()
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Go Home')).toBeInTheDocument()
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
  })

  it('shows custom context message when provided', () => {
    render(
      <ErrorBoundary context="Failed to load exercise">
        <BadChild />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Failed to load exercise/)).toBeInTheDocument()
  })

  it('calls custom fallback render when provided', () => {
    const customFallback = vi.fn((error, reset) => (
      <div>
        <span data-testid="custom-error">{error.message}</span>
        <button onClick={reset}>Custom Reset</button>
      </div>
    ))

    render(
      <ErrorBoundary fallback={customFallback}>
        <BadChild />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom-error')).toHaveTextContent('Test error!')
    expect(customFallback).toHaveBeenCalled()
  })

  it('resets error state when Try Again is clicked', async () => {
    let renderError = true

    const ConditionalChild = () => {
      if (renderError) {
        throw new Error('Oops')
      }
      return <div data-testid="recovered">Recovered!</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    renderError = false

    await userEvent.click(screen.getByText('Try Again'))

    expect(screen.getByTestId('recovered')).toBeInTheDocument()
    expect(screen.getByText('Recovered!')).toBeInTheDocument()
  })

  it('logs error to console.error', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    )

    expect(console.error).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary]',
      expect.any(Error),
      expect.any(Object)
    )
  })
})
