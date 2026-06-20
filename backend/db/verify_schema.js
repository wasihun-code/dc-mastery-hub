import db from './database.pg.js'

const expected = {
  users: 6,
  sessions: 3,
  tracks: 9,
  courses: 13,
  track_courses: 3,
  concepts: 9,
  flashcards: 9,
  quiz_questions: 12,
  deleted_questions: 6,
  user_tracks: 4,
  user_courses: 9,
  user_flashcard_progress: 6,
  user_stats: 8,
  mastery_scores: 12,
  exercise_attempts: 10,
  spaced_repetition_queue: 5
}

async function verify() {
  for (const [table, expectedCount] of Object.entries(expected)) {
    const cols = await db.prepare(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`).all(table)
    console.log(`${table.padEnd(25)} | ${String(expectedCount).padEnd(3)} | ${String(cols.length).padEnd(3)} | ${expectedCount === cols.length ? 'yes' : 'no'}`)
  }
  process.exit(0)
}

verify().catch(console.error)
