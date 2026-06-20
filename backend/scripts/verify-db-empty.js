import db from '../db/database.pg.js'
import { setupTestEnvironment, cleanupTestEnvironment } from '../__tests__/helpers/testEnv.pg.js'
import { performance } from 'perf_hooks'

const tables = [
  'users', 'sessions', 'tracks', 'courses', 'track_courses', 'concepts', 
  'flashcards', 'quiz_questions', 'deleted_questions', 'user_tracks', 
  'user_courses', 'user_flashcard_progress', 'user_stats', 'mastery_scores', 
  'exercise_attempts', 'spaced_repetition_queue'
]

async function verify() {
  console.log('--- Row Counts ---')
  for (const table of tables) {
    const { count } = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
    console.log(`${table.padEnd(25)} | ${count}`)
  }

  console.log('\n--- Timing Test Setup/Teardown ---')
  const start = performance.now()
  await setupTestEnvironment()
  const setupEnd = performance.now()
  await cleanupTestEnvironment()
  const teardownEnd = performance.now()

  console.log(`Setup time: ${(setupEnd - start).toFixed(2)}ms`)
  console.log(`Teardown time: ${(teardownEnd - setupEnd).toFixed(2)}ms`)
  console.log(`Total cycle time: ${(teardownEnd - start).toFixed(2)}ms`)

  process.exit(0)
}

verify().catch(e => {
  console.error(e)
  process.exit(1)
})
