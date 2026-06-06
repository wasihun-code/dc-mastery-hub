import db from './database.js'

const tracks = [
  {
    slug: 'associate-data-scientist-python',
    name: 'Associate Data Scientist in Python',
    language: 'Python',
    color: '#a78bfa',
    description: 'From data manipulation to machine learning in Python',
  },
  {
    slug: 'data-analyst-python',
    name: 'Data Analyst in Python',
    language: 'Python',
    color: '#60a5fa',
    description: 'Manipulate, analyze, and visualize data using Python',
  },
  {
    slug: 'data-engineer-python',
    name: 'Data Engineer in Python',
    language: 'Python',
    color: '#f97316',
    description: 'Ingest, clean, manage data and schedule pipelines',
  },
  {
    slug: 'associate-data-analyst-sql',
    name: 'Associate Data Analyst in SQL',
    language: 'SQL',
    color: '#34d399',
    description: 'Query databases and analyze results using SQL',
  },
]

const coursesByTrack = {
  'associate-data-scientist-python': [
    ['introduction-to-python', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['intermediate-python', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['data-manipulation-with-pandas', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['joining-data-with-pandas', 'Completed', 'Medium', 'Completed', 'Yes'],
    ['introduction-to-statistics-in-python', 'In Progress', 'Hard', 'In Progress', 'No'],
    ['introduction-to-data-visualization-with-seaborn', 'Not Started', 'Unknown', '-', 'No'],
    ['exploratory-data-analysis-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['sampling-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['hypothesis-testing-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['introduction-to-regression-with-statsmodels-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['supervised-learning-with-scikit-learn', 'Not Started', 'Unknown', '-', 'No'],
    ['data-communication-concepts', 'Not Started', 'Unknown', '-', 'No'],
    ['communicating-data-insights', 'Not Started', 'Unknown', '-', 'No'],
  ],
  'data-analyst-python': [
    ['introduction-to-python', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['intermediate-python', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['data-manipulation-with-pandas', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['joining-data-with-pandas', 'Completed', 'Medium', 'Completed', 'Yes'],
    ['introduction-to-statistics-in-python', 'In Progress', 'Hard', 'In Progress', 'No'],
    ['introduction-to-data-visualization-with-matplotlib', 'Not Started', 'Medium', '-', 'No'],
    ['introduction-to-data-visualization-with-seaborn', 'Not Started', 'Medium', '-', 'No'],
    ['introduction-to-functions-in-python', 'Completed', 'Easy', 'UNSURE', 'No'],
    ['python-toolbox', 'Completed', 'Medium', 'UNSURE', 'No'],
    ['exploratory-data-analysis-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['working-with-categorical-data-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['data-communication-concepts', 'Not Started', 'Unknown', '-', 'No'],
    ['introduction-to-importing-data-in-python', 'In Progress', 'Medium', 'In Progress', 'No'],
    ['cleaning-data-in-python', 'Not Started', 'Unknown', '-', 'No'],
  ],
  'data-engineer-python': [
    ['understanding-cloud-computing', 'Completed', 'Medium', 'In Progress', 'No'],
    ['introduction-to-python-for-developers', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['intermediate-python-for-developers', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['introduction-to-importing-data-in-python', 'In Progress', 'Medium', 'In Progress', 'No'],
    ['intermediate-importing-data-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['introduction-to-apis-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['cleaning-data-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['writing-efficient-python-code', 'Not Started', 'Unknown', '-', 'No'],
    ['streamlined-data-ingestion-with-pandas', 'Not Started', 'Unknown', '-', 'No'],
    ['introduction-to-git', 'Completed', 'Easy', 'Not Started', 'No'],
    ['intermediate-git', 'Not Started', 'Unknown', '-', 'No'],
    ['software-engineering-principles-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['etl-and-elt-in-python', 'Not Started', 'Unknown', '-', 'No'],
    ['introduction-to-apache-airflow-in-python', 'Not Started', 'Unknown', '-', 'No'],
  ],
  'associate-data-analyst-sql': [
    ['introduction-to-sql', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['intermediate-sql', 'Completed', 'Easy', 'Completed', 'Yes'],
    ['joining-data-in-sql', 'Completed', 'Medium', 'Completed', 'Yes'],
    ['data-manipulation-in-sql', 'Not Started', 'Unknown', '-', 'No'],
    ['postgresql-summary-stats-and-window-functions', 'Not Started', 'Unknown', '-', 'No'],
    ['functions-for-manipulating-data-in-postgresql', 'Not Started', 'Unknown', '-', 'No'],
    ['introduction-to-statistics', 'Not Started', 'Unknown', '-', 'No'],
    ['exploratory-data-analysis-in-sql', 'Not Started', 'Unknown', '-', 'No'],
    ['data-driven-decision-making-in-sql', 'Not Started', 'Unknown', '-', 'No'],
    ['understanding-data-visualization', 'Not Started', 'Unknown', '-', 'No'],
    ['data-communication-concepts', 'Not Started', 'Unknown', '-', 'No'],
  ],
}

const wordExceptions = {
  sql: 'SQL',
  pandas: 'pandas',
  python: 'python',
  postgresql: 'PostgreSQL',
  apis: 'APIs',
  etl: 'ETL',
  elt: 'ELT',
  git: 'Git',
  statsmodels: 'statsmodels',
}

function courseNameFromSlug(slug) {
  return slug
    .split('-')
    .map((word) => wordExceptions[word] ?? `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

export function seedDatabase() {
  const existingTracks = db.prepare('SELECT COUNT(*) AS count FROM tracks').get().count

  if (existingTracks > 0) {
    return
  }

  const insertTrack = db.prepare(`
    INSERT INTO tracks (slug, name, description, language, color)
    VALUES (@slug, @name, @description, @language, @color)
  `)

  const getTrackId = db.prepare('SELECT id FROM tracks WHERE slug = ?')

  const insertCourse = db.prepare(`
    INSERT OR IGNORE INTO courses (
      slug,
      name,
      track_id,
      difficulty,
      order_in_track,
      status,
      notes,
      reviewed
    )
    VALUES (
      @slug,
      @name,
      @track_id,
      @difficulty,
      @order_in_track,
      @status,
      @notes,
      @reviewed
    )
  `)

  const insertMasteryScore = db.prepare(`
    INSERT OR IGNORE INTO mastery_scores (course_id)
    VALUES (?)
  `)

  const insertUserStats = db.prepare('INSERT INTO user_stats DEFAULT VALUES')

  const seed = db.transaction(() => {
    for (const track of tracks) {
      insertTrack.run(track)
    }

    for (const [trackSlug, courses] of Object.entries(coursesByTrack)) {
      const trackId = getTrackId.get(trackSlug).id

      courses.forEach(([slug, status, difficulty, notes, reviewed], index) => {
        insertCourse.run({
          slug,
          name: courseNameFromSlug(slug),
          track_id: trackId,
          difficulty,
          order_in_track: index + 1,
          status,
          notes,
          reviewed,
        })
      })
    }

    const courseIds = db.prepare('SELECT id FROM courses').all()

    for (const course of courseIds) {
      insertMasteryScore.run(course.id)
    }

    insertUserStats.run()
  })

  seed()
}
