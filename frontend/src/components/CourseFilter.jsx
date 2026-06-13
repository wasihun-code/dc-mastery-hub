import { useState } from 'react'
import { Search, SlidersHorizontal, ChevronDown, Check } from 'lucide-react'

export const CATEGORIES = [
  { id: 'python', label: 'Python' },
  { id: 'sql', label: 'SQL' },
  { id: 'powerbi', label: 'Power BI' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'ML', label: 'Machine Learning' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'data communication', label: 'Data Communication' },
  { id: 'data visualization', label: 'Data Visualization' },
]

export function getCourseCategories(course) {
  const categories = []
  const slug = course.slug.toLowerCase()
  const name = course.name.toLowerCase()

  if (
    course.track_language?.toLowerCase() === 'python' ||
    slug.includes('python') ||
    slug.includes('pandas') ||
    slug.includes('seaborn') ||
    slug.includes('matplotlib') ||
    slug.includes('scikit-learn') ||
    slug.includes('statsmodels')
  ) {
    categories.push('python')
  }
  if (course.track_language?.toLowerCase() === 'sql' || slug.includes('sql') || slug.includes('postgresql')) {
    categories.push('sql')
  }
  if (slug.includes('powerbi') || slug.includes('power-bi')) {
    categories.push('powerbi')
  }
  if (
    slug.includes('statistics') ||
    slug.includes('sampling') ||
    slug.includes('hypothesis') ||
    slug.includes('regression') ||
    name.includes('statistics') ||
    name.includes('regression') ||
    name.includes('hypothesis') ||
    name.includes('sampling')
  ) {
    categories.push('statistics')
  }
  if (
    slug.includes('supervised-learning') ||
    slug.includes('scikit-learn') ||
    slug.includes('machine-learning') ||
    slug.includes('ml') ||
    slug.includes('regression') ||
    name.includes('learning') ||
    name.includes('machine learning') ||
    name.includes('regression')
  ) {
    categories.push('ML')
  }
  if (
    slug.includes('chatgpt') ||
    slug.includes('gpt') ||
    slug.includes('llm') ||
    slug.includes('generative-ai') ||
    name.includes('chatgpt') ||
    name.includes('gpt')
  ) {
    categories.push('chatgpt')
  }
  if (
    slug.includes('communication') ||
    slug.includes('communicating') ||
    slug.includes('insight') ||
    name.includes('communication') ||
    name.includes('communicating')
  ) {
    categories.push('data communication')
  }
  if (
    slug.includes('visualization') ||
    slug.includes('seaborn') ||
    slug.includes('matplotlib') ||
    slug.includes('visualizing') ||
    name.includes('visualization') ||
    name.includes('visualizing') ||
    name.includes('seaborn') ||
    name.includes('matplotlib')
  ) {
    categories.push('data visualization')
  }
  return categories
}

// Custom Premium Dropdown Component
function FilterDropdown({ label, value, options, onChange, icon }) {
  const [isOpen, setIsOpen] = useState(false)

  // Find the selected option to display its count
  const selectedOption = options.find((opt) => opt.value === value)
  const selectedLabel = selectedOption ? `${selectedOption.label}` : label
  const selectedCount = selectedOption ? selectedOption.count : 0

  return (
    <div className="space-y-1.5 relative select-none">
      <label className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-zinc-700 hover:bg-zinc-900/20 focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] cursor-pointer text-left transition-all"
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          <span className="truncate">{selectedLabel}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-850 font-bold font-mono text-[var(--text-muted)]">
            {selectedCount}
          </span>
        </span>
        <ChevronDown size={12} className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay to handle clicking outside */}
          <div className="fixed inset-0 z-30 cursor-default" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown Menu */}
          <div className="absolute left-0 mt-1.5 w-full min-w-[200px] max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-zinc-950/95 backdrop-blur-md p-1.5 shadow-2xl z-40 animate-in fade-in duration-100 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)] font-bold'
                      : opt.disabled
                      ? 'opacity-30 cursor-not-allowed text-[var(--text-muted)]'
                      : 'text-[var(--text-primary)] hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2 flex items-center gap-2">
                    {opt.color && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                    )}
                    <span>{opt.label}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold font-mono ${isSelected ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>
                      {opt.count}
                    </span>
                    {isSelected && <Check size={12} className="text-[var(--accent-green)]" />}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function CourseFilter({
  courses,
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedReviewed,
  onReviewedChange,
  selectedDifficulty,
  onDifficultyChange,
  selectedCategory,
  onCategoryChange,
  selectedTrack,
  onTrackChange,
  selectedArchive = 'active',
  onArchiveChange,
  showArchiveFilter = false,
  selectedHasExercises = 'present',
  onHasExercisesChange,
  onReset
}) {
  // Collect unique tracks from loaded courses
  const uniqueTracks = []
  const trackNames = new Set()
  for (const c of courses) {
    if (c.tracks && Array.isArray(c.tracks)) {
      for (const t of c.tracks) {
        if (!trackNames.has(t.name)) {
          trackNames.add(t.name)
          uniqueTracks.push({ name: t.name, id: t.id, color: t.color, language: t.language })
        }
      }
    } else if (c.track_name && !trackNames.has(c.track_name)) {
      trackNames.add(c.track_name)
      uniqueTracks.push({ name: c.track_name, id: c.track_id, color: c.track_color, language: c.track_language })
    }
  }

  // Faceted search helper: returns courses matching all filters except excludeFilter
  const getFilteredSubset = (excludeFilter = null) => {
    return courses.filter((c) => {
      // 1. Keyword search
      if (excludeFilter !== 'search' && search) {
        const query = search.toLowerCase()
        const matchesSearch =
          c.name.toLowerCase().includes(query) ||
          c.slug.toLowerCase().includes(query) ||
          c.track_name?.toLowerCase().includes(query) ||
          (c.tracks && c.tracks.some(t => t.name.toLowerCase().includes(query)))
        if (!matchesSearch) return false
      }

      // 2. Track
      if (excludeFilter !== 'track' && selectedTrack !== 'all') {
        const matchesSelectedTrack = (c.tracks && c.tracks.some(t => t.name === selectedTrack)) || c.track_name === selectedTrack
        if (!matchesSelectedTrack) return false
      }

      // 3. Category
      if (excludeFilter !== 'category' && selectedCategory !== 'all') {
        const categories = getCourseCategories(c)
        if (!categories.includes(selectedCategory)) return false
      }

      // 4. Status
      if (excludeFilter !== 'status' && selectedStatus !== 'all') {
        if (c.status !== selectedStatus) return false
      }

      // 5. Difficulty
      if (excludeFilter !== 'difficulty' && selectedDifficulty !== 'all') {
        if ((c.difficulty || 'Unknown') !== selectedDifficulty) return false
      }

      // 6. Reviewed
      if (excludeFilter !== 'reviewed' && selectedReviewed !== 'all') {
        if (c.reviewed !== selectedReviewed) return false
      }

      // 7. Has Exercises
      if (excludeFilter !== 'hasExercises' && selectedHasExercises !== 'all') {
        const hasEx = c.quiz_question_count && c.quiz_question_count > 0
        if (!hasEx) return false
      }

      // 8. Archive status
      if (excludeFilter !== 'archive') {
        if (showArchiveFilter) {
          if (selectedArchive === 'active' && c.is_archived === 1) return false
          if (selectedArchive === 'archived' && c.is_archived !== 1) return false
        } else {
          if (c.is_archived === 1) return false
        }
      }

      return true
    })
  }

  // Calculate dynamic counts for each category
  const baseForCategory = getFilteredSubset('category')
  const getCategoryCount = (catId) => {
    return baseForCategory.filter((c) => getCourseCategories(c).includes(catId)).length
  }
  const totalCategoryCount = baseForCategory.length

  // Calculate dynamic counts for each track
  const baseForTrack = getFilteredSubset('track')
  const getTrackCount = (trackName) => {
    return baseForTrack.filter((c) => (c.tracks && c.tracks.some(t => t.name === trackName)) || c.track_name === trackName).length
  }
  const totalTrackCount = baseForTrack.length

  // Calculate dynamic counts for exercises status
  const baseForHasExercises = getFilteredSubset('hasExercises')
  const exercisesGeneratedCount = baseForHasExercises.filter(c => c.quiz_question_count && c.quiz_question_count > 0).length
  const totalHasExercisesCount = baseForHasExercises.length

  // Calculate dynamic counts for completion status
  const baseForStatus = getFilteredSubset('status')
  const getStatusCount = (status) => {
    return baseForStatus.filter((c) => c.status === status).length
  }
  const totalStatusCount = baseForStatus.length

  // Calculate dynamic counts for difficulty level
  const baseForDifficulty = getFilteredSubset('difficulty')
  const getDifficultyCount = (difficulty) => {
    return baseForDifficulty.filter((c) => (c.difficulty || 'Unknown') === difficulty).length
  }
  const totalDifficultyCount = baseForDifficulty.length

  // Calculate dynamic counts for reviewed status
  const baseForReviewed = getFilteredSubset('reviewed')
  const getReviewedCount = (reviewed) => {
    return baseForReviewed.filter((c) => c.reviewed === reviewed).length
  }
  const totalReviewedCount = baseForReviewed.length

  // Calculate dynamic counts for archive status
  const baseForArchive = getFilteredSubset('archive')
  const getArchiveCount = (archiveVal) => {
    if (archiveVal === 'active') return baseForArchive.filter((c) => c.is_archived !== 1).length
    if (archiveVal === 'archived') return baseForArchive.filter((c) => c.is_archived === 1).length
    return baseForArchive.length
  }

  // Setup options for each dropdown
  const exercisesOptions = [
    { value: 'present', label: 'Practice Available', count: exercisesGeneratedCount },
    { value: 'all', label: 'All Courses', count: totalHasExercisesCount }
  ]

  const trackOptions = [
    { value: 'all', label: 'All Tracks', count: totalTrackCount },
    ...uniqueTracks.map(tr => ({
      value: tr.name,
      label: tr.name,
      count: getTrackCount(tr.name),
      color: tr.color
    }))
  ]

  const categoryOptions = [
    { value: 'all', label: 'All Categories', count: totalCategoryCount },
    ...CATEGORIES.map(cat => ({
      value: cat.id,
      label: cat.label,
      count: getCategoryCount(cat.id),
      disabled: getCategoryCount(cat.id) === 0
    }))
  ]

  const statusOptions = [
    { value: 'all', label: 'All Statuses', count: totalStatusCount },
    { value: 'Completed', label: 'Completed', count: getStatusCount('Completed') },
    { value: 'In Progress', label: 'In Progress', count: getStatusCount('In Progress') },
    { value: 'Not Started', label: 'Not Started', count: getStatusCount('Not Started') }
  ]

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulties', count: totalDifficultyCount },
    { value: 'Easy', label: 'Easy', count: getDifficultyCount('Easy') },
    { value: 'Medium', label: 'Medium', count: getDifficultyCount('Medium') },
    { value: 'Hard', label: 'Hard', count: getDifficultyCount('Hard') },
    { value: 'Unknown', label: 'Unknown', count: getDifficultyCount('Unknown') }
  ]

  const reviewedOptions = [
    { value: 'all', label: 'All Reviewed Statuses', count: totalReviewedCount },
    { value: 'Yes', label: 'Reviewed', count: getReviewedCount('Yes') },
    { value: 'No', label: 'Not Reviewed', count: getReviewedCount('No') }
  ]

  const archiveOptions = [
    { value: 'active', label: 'Active Only', count: getArchiveCount('active') },
    { value: 'archived', label: 'Archived Only', count: getArchiveCount('archived') },
    { value: 'all', label: 'All', count: getArchiveCount('all') }
  ]

  // Find track color indicator for track dropdown button
  const selectedTrackColor = uniqueTracks.find(t => t.name === selectedTrack)?.color
  const trackIcon = selectedTrackColor ? (
    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: selectedTrackColor }} />
  ) : null

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-4 shadow-sm">
      {/* Header and Reset Row */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
          <SlidersHorizontal size={12} /> Filters
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline font-bold transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Grid Controls Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
        {/* Search Box */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Keyword Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-1.5 pl-8 pr-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
            />
          </div>
        </div>

        {/* Exercises Status Dropdown */}
        {onHasExercisesChange && (
          <FilterDropdown
            label="Practice Status"
            value={selectedHasExercises}
            options={exercisesOptions}
            onChange={onHasExercisesChange}
          />
        )}

        {/* Track Dropdown */}
        <FilterDropdown
          label="Learning Path (Track)"
          value={selectedTrack}
          options={trackOptions}
          onChange={onTrackChange}
          icon={trackIcon}
        />

        {/* Category Dropdown */}
        <FilterDropdown
          label="Category"
          value={selectedCategory}
          options={categoryOptions}
          onChange={onCategoryChange}
        />

        {/* Completion Status Dropdown */}
        <FilterDropdown
          label="Completion Status"
          value={selectedStatus}
          options={statusOptions}
          onChange={onStatusChange}
        />

        {/* Difficulty Level Dropdown */}
        <FilterDropdown
          label="Difficulty Level"
          value={selectedDifficulty}
          options={difficultyOptions}
          onChange={onDifficultyChange}
        />

        {/* Reviewed Status Dropdown */}
        <FilterDropdown
          label="Reviewed Status"
          value={selectedReviewed}
          options={reviewedOptions}
          onChange={onReviewedChange}
        />

        {/* Archive Status Dropdown */}
        {showArchiveFilter && onArchiveChange && (
          <FilterDropdown
            label="Archive Status"
            value={selectedArchive}
            options={archiveOptions}
            onChange={onArchiveChange}
          />
        )}
      </div>
    </div>
  )
}
