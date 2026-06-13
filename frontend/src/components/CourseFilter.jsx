import { Search, SlidersHorizontal } from 'lucide-react'

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
  onReset
}) {
  // Collect unique tracks from loaded courses
  const uniqueTracks = []
  const trackIds = new Set()
  for (const c of courses) {
    if (c.track_name && !trackIds.has(c.track_name)) {
      trackIds.add(c.track_name)
      uniqueTracks.push({ name: c.track_name, id: c.track_id, color: c.track_color, language: c.track_language })
    }
  }

  // Calculate course counts dynamically for categories
  const getCategoryCount = (catId) => {
    return courses.filter((c) => getCourseCategories(c).includes(catId)).length
  }

  // Calculate course counts dynamically for tracks
  const getTrackCount = (trackName) => {
    return courses.filter((c) => c.track_name === trackName).length
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
          <SlidersHorizontal size={14} /> Filters
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline font-semibold"
        >
          Reset Filters
        </button>
      </div>

      {/* Search Box */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Keyword Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]"
          />
        </div>
      </div>

      {/* Archive Status Filter */}
      {showArchiveFilter && onArchiveChange && (
        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Archive Status
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'active', label: 'Active Courses Only' },
              { id: 'archived', label: 'Archived Courses Only' },
              { id: 'all', label: 'All (Active & Archived)' }
            ].map(st => {
              const isActive = selectedArchive === st.id
              const count = st.id === 'active'
                ? courses.filter(c => c.is_archived !== 1).length
                : st.id === 'archived'
                ? courses.filter(c => c.is_archived === 1).length
                : courses.length

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onArchiveChange(st.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                    isActive
                      ? 'bg-[var(--accent-green)] text-black'
                      : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                      isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="space-y-2 pt-4 border-t border-[var(--border)]">
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Completion Status
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'Completed', label: 'Completed' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'Not Started', label: 'Not Started' }
          ].map(st => {
            const isActive = selectedStatus === st.id
            const count = st.id === 'all'
              ? courses.length
              : courses.filter(c => c.status === st.id).length

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onStatusChange(st.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-[var(--accent-green)] text-black'
                    : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                    isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reviewed Filter */}
      <div className="space-y-2 pt-4 border-t border-[var(--border)]">
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Reviewed Status
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'all', label: 'All Reviewed Statuses' },
            { id: 'Yes', label: 'Reviewed' },
            { id: 'No', label: 'Not Reviewed' }
          ].map(rev => {
            const isActive = selectedReviewed === rev.id
            const count = rev.id === 'all'
              ? courses.length
              : courses.filter(c => c.reviewed === rev.id).length

            return (
              <button
                key={rev.id}
                type="button"
                onClick={() => onReviewedChange(rev.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-[var(--accent-green)] text-black'
                    : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                }`}
              >
                <span>{rev.label}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                    isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Difficulty Filter */}
      <div className="space-y-2 pt-4 border-t border-[var(--border)]">
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Difficulty Level
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'all', label: 'All Difficulties' },
            { id: 'Easy', label: 'Easy' },
            { id: 'Medium', label: 'Medium' },
            { id: 'Hard', label: 'Hard' },
            { id: 'Unknown', label: 'Unknown' }
          ].map(df => {
            const isActive = selectedDifficulty === df.id
            const count = df.id === 'all'
              ? courses.length
              : courses.filter(c => (c.difficulty || 'Unknown') === df.id).length

            return (
              <button
                key={df.id}
                type="button"
                onClick={() => onDifficultyChange(df.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-[var(--accent-green)] text-black'
                    : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                }`}
              >
                <span>{df.label}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                    isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Category Filter list */}
      <div className="space-y-2 pt-4 border-t border-[var(--border)]">
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Categories & Languages
        </label>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onCategoryChange('all')}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
              selectedCategory === 'all'
                ? 'bg-[var(--accent-green)] text-black'
                : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
            }`}
          >
            <span>All Categories</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                selectedCategory === 'all' ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {courses.length}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id)
            const isActive = selectedCategory === cat.id

            return (
              <button
                key={cat.id}
                type="button"
                disabled={count === 0}
                onClick={() => onCategoryChange(cat.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-[var(--accent-green)] text-black'
                    : count === 0
                    ? 'opacity-40 cursor-not-allowed bg-transparent text-[var(--text-muted)]'
                    : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/80 text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                    isActive
                      ? 'bg-black/10 text-black'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Track Filter list */}
      {uniqueTracks.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Learning Path (Track)
          </label>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onTrackChange('all')}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                selectedTrack === 'all'
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                All Tracks
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                  selectedTrack === 'all' ? 'bg-black/10 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {courses.length}
              </span>
            </button>

            {uniqueTracks.map((tr) => {
              const count = getTrackCount(tr.name)
              const isActive = selectedTrack === tr.name

              return (
                <button
                  key={tr.name}
                  type="button"
                  onClick={() => {
                    onTrackChange(tr.name)
                    const trackLang = tr.language?.toLowerCase()
                    if (trackLang && CATEGORIES.some(cat => cat.id === trackLang)) {
                      onCategoryChange(trackLang)
                    }
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all ${
                    isActive
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate pr-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: tr.color || 'var(--text-muted)' }}
                    />
                    <span className="truncate">{tr.name}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold font-mono shrink-0 ${
                      isActive ? 'bg-black/10 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
