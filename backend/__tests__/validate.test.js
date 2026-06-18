import { jest } from '@jest/globals'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.js'

let db, testData, env, validateDatabase

beforeAll(async () => {
  env = setupTestEnvironment()
  jest.resetModules()

  const { initSchema } = await import('../db/schema.js')
  initSchema()

  const Database = (await import('better-sqlite3')).default
  db = new Database(env.dbPath)
  db.pragma('journal_mode = WAL')

  db.prepare('DELETE FROM user_stats').run()
  db.prepare('DELETE FROM sessions').run()
  db.prepare('DELETE FROM users').run()

  testData = seedTestData(db)

  const mod = await import('../db/validate.js')
  validateDatabase = mod.validateDatabase
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

describe('validateDatabase', () => {
  test('returns isValid: false when seed data does not match expected tracks', () => {
    const result = validateDatabase()
    expect(result.isValid).toBe(false)
  })

  test('returns an array of errors', () => {
    const result = validateDatabase()
    expect(Array.isArray(result.errors)).toBe(true)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('returns a report array', () => {
    const result = validateDatabase()
    expect(Array.isArray(result.report)).toBe(true)
    expect(result.report.length).toBeGreaterThan(0)
    expect(result.report[0]).toMatch(/Tracks found:/)
  })

  test('handles missing tracks gracefully without throwing', () => {
    expect(() => validateDatabase()).not.toThrow()
    const result = validateDatabase()
    expect(result).toHaveProperty('isValid', false)
    expect(result).toHaveProperty('errors')
    expect(result).toHaveProperty('report')
    const missingTrackErrors = result.errors.filter(e => e.startsWith('Missing track:'))
    expect(missingTrackErrors.length).toBe(5)
    expect(missingTrackErrors).toContain('Missing track: associate-data-scientist-python')
    expect(missingTrackErrors).toContain('Missing track: data-engineer-python')
    expect(missingTrackErrors).toContain('Missing track: data-analyst-python')
    expect(missingTrackErrors).toContain('Missing track: associate-data-analyst-sql')
    expect(missingTrackErrors).toContain('Missing track: associate-python-developer')
  })

  test('report contains track listing and summary info even when errors exist', () => {
    const result = validateDatabase()
    expect(result.report.some(r => r.startsWith('Tracks found:'))).toBe(true)
    expect(result.report.some(r => r.startsWith('Total memberships'))).toBe(true)
    const trackLines = result.report.filter(r => r.startsWith('  - Track:'))
    expect(trackLines.length).toBe(2)
    expect(trackLines[0]).toMatch(/Data Science/)
    expect(trackLines[1]).toMatch(/SQL Mastery/)
  })

  test('detects course count mismatch when track exists with fewer courses than expected', () => {
    const track = db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('associate-data-scientist-python', 'Associate Data Scientist', 'Python', '#ff0000')").run()
    const trackId = track.lastInsertRowid
    const course = db.prepare("INSERT INTO courses (slug, name) VALUES ('test-course', 'Test Course')").run()
    db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(trackId, course.lastInsertRowid, 1)

    const result = validateDatabase()
    const countErrors = result.errors.filter(e => e.startsWith('Track associate-data-scientist-python has course count'))
    expect(countErrors.length).toBe(1)
    expect(countErrors[0]).toMatch(/has course count 1, but expected 23/)
  })

  test('shared courses validation reports correct memberships when courses appear in multiple tracks', () => {
    const t1r = db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('data-engineer-python', 'Data Engineer', 'Python', '#0000ff')").run()
    const t2r = db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('data-analyst-python', 'Data Analyst', 'Python', '#ff00ff')").run()
    const t3r = db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('associate-data-analyst-sql', 'Associate Data Analyst SQL', 'SQL', '#ffff00')").run()
    const t4r = db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('associate-python-developer', 'Associate Python Developer', 'Python', '#00ffff')").run()

    const cr = db.prepare("INSERT INTO courses (slug, name) VALUES ('introduction-to-python', 'Introduction to Python')").run()
    db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(t1r.lastInsertRowid, cr.lastInsertRowid, 1)
    db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(t2r.lastInsertRowid, cr.lastInsertRowid, 1)

    const result = validateDatabase()
    const sharedLines = result.report.filter(r => r.startsWith('    Shared course'))
    expect(sharedLines.length).toBeGreaterThanOrEqual(1)
    expect(sharedLines.some(r => r.includes('introduction-to-python'))).toBe(true)
    expect(sharedLines[0]).toMatch(/verified with \d+ track memberships/)
  })
})
