import db from '../db/database.pg.js'

const tables = [
  'users', 'sessions', 'tracks', 'courses', 'track_courses', 'concepts', 
  'flashcards', 'quiz_questions', 'deleted_questions', 'user_tracks', 
  'user_courses', 'user_flashcard_progress', 'user_stats', 'mastery_scores', 
  'exercise_attempts', 'spaced_repetition_queue'
]

async function cleanup() {
  await db.exec('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
  
  console.log('--- Row Counts after TRUNCATE ---')
  for (const table of tables) {
    const { count } = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
    console.log(`${table.padEnd(25)} | ${count}`)
  }
  process.exit(0)
}

cleanup().catch(console.error)
