import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CourseFilter, { CATEGORIES, getCourseCategories } from '../../components/CourseFilter'

const mockCourses = [
  {
    id: 1,
    name: 'Python Basics',
    slug: 'python-basics',
    difficulty: 'Easy',
    status: 'Completed',
    reviewed: 'Yes',
    overall_mastery: 95,
    tracks: [{ id: 1, name: 'Python Track', color: '#a78bfa' }],
    track_name: 'Python Track',
    track_color: '#a78bfa',
    track_language: 'Python',
    quiz_question_count: 10,
    is_archived: false
  },
  {
    id: 2,
    name: 'SQL Fundamentals',
    slug: 'sql-fundamentals',
    difficulty: 'Medium',
    status: 'In Progress',
    reviewed: 'No',
    overall_mastery: 60,
    tracks: [{ id: 2, name: 'SQL Track', color: '#34d399' }],
    track_name: 'SQL Track',
    track_color: '#34d399',
    track_language: 'SQL',
    quiz_question_count: 0,
    is_archived: false
  },
  {
    id: 3,
    name: 'Advanced Pandas',
    slug: 'advanced-pandas',
    difficulty: 'Hard',
    status: 'Not Started',
    reviewed: 'Yes',
    overall_mastery: 0,
    tracks: [{ id: 1, name: 'Python Track', color: '#a78bfa' }],
    track_name: 'Python Track',
    track_color: '#a78bfa',
    track_language: 'Python',
    quiz_question_count: 8,
    is_archived: true
  }
]

const defaultProps = {
  courses: mockCourses,
  search: '',
  onSearchChange: vi.fn(),
  selectedStatus: 'all',
  onStatusChange: vi.fn(),
  selectedReviewed: 'all',
  onReviewedChange: vi.fn(),
  selectedDifficulty: 'all',
  onDifficultyChange: vi.fn(),
  selectedCategory: 'all',
  onCategoryChange: vi.fn(),
  selectedTrack: 'all',
  onTrackChange: vi.fn(),
  selectedHasExercises: 'present',
  onHasExercisesChange: vi.fn(),
  onReset: vi.fn()
}

describe('CourseFilter', () => {
  describe('compact mode', () => {
    it('renders search input', () => {
      render(<CourseFilter {...defaultProps} compact />)
      expect(screen.getByPlaceholderText('Search courses...')).toBeInTheDocument()
    })

    it('renders all filter dropdowns', () => {
      render(<CourseFilter {...defaultProps} compact />)
      expect(screen.getByText('Track')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      const practiceLabels = screen.getAllByText('Practice Available')
      expect(practiceLabels.length).toBe(2)
      expect(screen.getByText('Reviewed Status')).toBeInTheDocument()
    })

    it('renders reset filters button', () => {
      render(<CourseFilter {...defaultProps} compact />)
      expect(screen.getByText('Reset Filters')).toBeInTheDocument()
    })

    it('calls onSearchChange when typing in search', async () => {
      const onSearchChange = vi.fn()
      render(<CourseFilter {...defaultProps} onSearchChange={onSearchChange} compact />)
      const input = screen.getByPlaceholderText('Search courses...')
      await userEvent.type(input, 'Python')
      expect(onSearchChange).toHaveBeenCalled()
    })

    it('opens dropdown and selects a track option', async () => {
      const onTrackChange = vi.fn()
      render(<CourseFilter {...defaultProps} onTrackChange={onTrackChange} compact />)

      const trackButton = screen.getByText('All Tracks').closest('button')
      await userEvent.click(trackButton)

      const pythonTrackOption = screen.getByText('Python Track')
      await userEvent.click(pythonTrackOption)

      expect(onTrackChange).toHaveBeenCalledWith('Python Track')
    })

    it('opens dropdown and selects a status option', async () => {
      const onStatusChange = vi.fn()
      render(<CourseFilter {...defaultProps} onStatusChange={onStatusChange} compact />)

      const statusButton = screen.getByText('All Statuses').closest('button')
      await userEvent.click(statusButton)

      const completedOption = screen.getByText('Completed')
      await userEvent.click(completedOption)

      expect(onStatusChange).toHaveBeenCalledWith('Completed')
    })

    it('calls onReset when reset button clicked', async () => {
      const onReset = vi.fn()
      render(<CourseFilter {...defaultProps} onReset={onReset} compact />)

      await userEvent.click(screen.getByText('Reset Filters'))
      expect(onReset).toHaveBeenCalledTimes(1)
    })

    it('shows active filter state in dropdown button', () => {
      render(<CourseFilter {...defaultProps} selectedStatus="Completed" compact />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('opens practice available dropdown and changes selection', async () => {
      const onHasExercisesChange = vi.fn()
      render(
        <CourseFilter
          {...defaultProps}
          onHasExercisesChange={onHasExercisesChange}
          compact
        />
      )

      const practiceButtons = screen.getAllByText('Practice Available')
      const practiceButton = practiceButtons[1].closest('button')
      await userEvent.click(practiceButton)

      const allCoursesOption = screen.getByText('All Courses')
      await userEvent.click(allCoursesOption)

      expect(onHasExercisesChange).toHaveBeenCalledWith('all')
    })
  })

  describe('full mode', () => {
    it('renders header with Filters text', () => {
      render(<CourseFilter {...defaultProps} />)
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('renders keyword search label', () => {
      render(<CourseFilter {...defaultProps} />)
      expect(screen.getByText('Keyword Search')).toBeInTheDocument()
    })

    it('renders search input in full mode', () => {
      render(<CourseFilter {...defaultProps} />)
      expect(screen.getByPlaceholderText('Search courses...')).toBeInTheDocument()
    })

    it('renders track dropdown with Learning Path label', () => {
      render(<CourseFilter {...defaultProps} />)
      expect(screen.getByText('Learning Path (Track)')).toBeInTheDocument()
    })

    it('renders archive dropdown when showArchiveFilter is true', () => {
      render(<CourseFilter {...defaultProps} showArchiveFilter onArchiveChange={vi.fn()} />)
      expect(screen.getByText('Archive Status')).toBeInTheDocument()
    })

    it('does not render archive dropdown when showArchiveFilter is false', () => {
      render(<CourseFilter {...defaultProps} showArchiveFilter={false} />)
      expect(screen.queryByText('Archive Status')).not.toBeInTheDocument()
    })

    it('calls onSearchChange when typing in full mode', async () => {
      const onSearchChange = vi.fn()
      render(<CourseFilter {...defaultProps} onSearchChange={onSearchChange} />)

      const input = screen.getByPlaceholderText('Search courses...')
      await userEvent.type(input, 'SQL')
      expect(onSearchChange).toHaveBeenCalled()
    })

    it('shows All Tracks option in track dropdown', () => {
      render(<CourseFilter {...defaultProps} />)
      expect(screen.getByText('All Tracks')).toBeInTheDocument()
    })
  })

  describe('getCourseCategories', () => {
    it('returns python category for python-related courses', () => {
      const course = { slug: 'python-basics', name: 'Python Basics', track_language: 'Python' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('python')
    })

    it('returns sql category for sql courses', () => {
      const course = { slug: 'sql-fundamentals', name: 'SQL Fundamentals' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('sql')
    })

    it('returns statistics category when name contains statistics', () => {
      const course = { slug: 'intro-to-stats', name: 'Introduction to Statistics' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('statistics')
    })

    it('returns ML category for machine learning courses', () => {
      const course = { slug: 'machine-learning-101', name: 'ML Fundamentals' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('ML')
    })

    it('returns chatgpt category for gpt courses', () => {
      const course = { slug: 'chatgpt-basics', name: 'ChatGPT' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('chatgpt')
    })

    it('returns data communication category for communication courses', () => {
      const course = { slug: 'data-communication', name: 'Data Communication' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('data communication')
    })

    it('returns data visualization category for visualization courses', () => {
      const course = { slug: 'data-visualization', name: 'Data Visualization' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('data visualization')
    })

    it('returns powerbi category for powerbi courses', () => {
      const course = { slug: 'powerbi-dashboard', name: 'Power BI Dashboard' }
      const cats = getCourseCategories(course)
      expect(cats).toContain('powerbi')
    })

    it('returns multiple categories when applicable', () => {
      const course = {
        slug: 'python-machine-learning-with-statsmodels',
        name: 'Machine Learning with Python',
        track_language: 'Python'
      }
      const cats = getCourseCategories(course)
      expect(cats).toContain('python')
      expect(cats).toContain('ML')
    })

    it('returns empty array for unrelated courses', () => {
      const course = { slug: 'random-course', name: 'Random Topic' }
      const cats = getCourseCategories(course)
      expect(cats).toEqual([])
    })
  })

  describe('CATEGORIES', () => {
    it('exports all predefined categories', () => {
      const ids = CATEGORIES.map(c => c.id)
      expect(ids).toContain('python')
      expect(ids).toContain('sql')
      expect(ids).toContain('powerbi')
      expect(ids).toContain('statistics')
      expect(ids).toContain('ML')
      expect(ids).toContain('chatgpt')
      expect(ids).toContain('data communication')
      expect(ids).toContain('data visualization')
    })
  })
})
