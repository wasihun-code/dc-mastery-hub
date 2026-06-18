import { jest } from '@jest/globals'
import { setupTestEnvironment, cleanupTestEnvironment } from './helpers/testEnv.js'

let env, db

beforeAll(async () => {
  env = setupTestEnvironment()
  jest.resetModules()

  const { initSchema } = await import('../db/schema.js')
  initSchema()

  const Database = (await import('better-sqlite3')).default
  db = new Database(env.dbPath)
  db.pragma('journal_mode = WAL')
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

describe('initSchema', () => {
  test('creates all required tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
    const tableNames = tables.map(t => t.name).sort()
    expect(tableNames).toContain('users')
    expect(tableNames).toContain('sessions')
    expect(tableNames).toContain('tracks')
    expect(tableNames).toContain('courses')
    expect(tableNames).toContain('track_courses')
    expect(tableNames).toContain('concepts')
    expect(tableNames).toContain('flashcards')
    expect(tableNames).toContain('quiz_questions')
    expect(tableNames).toContain('deleted_questions')
    expect(tableNames).toContain('user_tracks')
    expect(tableNames).toContain('user_courses')
    expect(tableNames).toContain('user_flashcard_progress')
    expect(tableNames).toContain('user_stats')
    expect(tableNames).toContain('mastery_scores')
    expect(tableNames).toContain('exercise_attempts')
    expect(tableNames).toContain('spaced_repetition_queue')
  })

  test('creates default admin user with is_admin=1', () => {
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin@gmail.com')
    expect(admin).toBeDefined()
    expect(admin.is_admin).toBe(1)
    expect(admin.password_hash).toBeTruthy()
    expect(admin.salt).toBeTruthy()
  })

  test('creates default wasihunageru user with is_admin=0', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('wasihunageru@gmail.com')
    expect(user).toBeDefined()
    expect(user.is_admin).toBe(0)
  })

  test('creates user_stats rows for both default users', () => {
    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin@gmail.com')
    const adminStats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(admin.id)
    expect(adminStats).toBeDefined()
    expect(adminStats.total_xp).toBe(0)
    expect(adminStats.level).toBe('Beginner')

    const wasihun = db.prepare('SELECT id FROM users WHERE username = ?').get('wasihunageru@gmail.com')
    const wasihunStats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(wasihun.id)
    expect(wasihunStats).toBeDefined()
    expect(wasihunStats.total_xp).toBe(0)
  })

  test('is idempotent - calling initSchema twice does not throw', async () => {
    jest.resetModules()
    const { initSchema } = await import('../db/schema.js')
    expect(() => initSchema()).not.toThrow()
    const admins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE username = 'admin@gmail.com'").get()
    expect(admins.count).toBe(1)
  })
})
