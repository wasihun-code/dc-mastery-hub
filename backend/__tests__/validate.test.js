import { jest } from '@jest/globals'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'

let db, testData, env, validateDatabase

beforeAll(async () => {
  env = await setupTestEnvironment()
  jest.resetModules()

  const { initSchema } = await import('../db/schema.js')
  await initSchema()

  const pgDb = (await import('../db/database.pg.js')).default
  db = pgDb

  await db.prepare('DELETE FROM user_stats').run()
  await db.prepare('DELETE FROM sessions').run()
  await db.prepare('DELETE FROM users').run()

  testData = await seedTestData(db)

  const mod = await import('../db/validate.js')
  validateDatabase = mod.validateDatabase
})

afterAll(async () => {
  await cleanupTestEnvironment(env.tmpDir)
  if (typeof db !== 'undefined' && db && db.end) await db.end();
})

describe('validateDatabase', () => {
  test('returns isValid: false when seed data does not match expected tracks', async () => {
    const result = validateDatabase()
    expect(result.isValid).toBe(false)
  })

  test('returns an array of errors', async () => {
    const result = validateDatabase()
    expect(Array.isArray(result.errors)).toBe(true)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('returns a report array', async () => {
    const result = validateDatabase()
    expect(Array.isArray(result.report)).toBe(true)
    expect(result.report.length).toBeGreaterThan(0)
    expect(result.report[0]).toMatch(/Tracks found:/)
  })

  test('handles missing tracks gracefully without throwing', async () => {
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

  test('report contains track listing and summary info even when errors exist', async () => {
    const result = validateDatabase()
    expect(result.report.some(r => r.startsWith('Tracks found:'))).toBe(true)
    expect(result.report.some(r => r.startsWith('Total memberships'))).toBe(true)
    const trackLines = result.report.filter(r => r.startsWith('  - Track:'))
    expect(trackLines.length).toBe(2)
    expect(trackLines[0]).toMatch(/Data Science/)
    expect(trackLines[1]).toMatch(/SQL Mastery/)
  })

  test('detects course count mismatch when track exists with fewer courses than expected', async () => {
    const track = await db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('associate-data-scientist-python', 'Associate Data Scientist', 'Python', '#ff0000')").run()
    const trackId = track.lastInsertRowid
    const course = await db.prepare("INSERT INTO courses (slug, name) VALUES ('test-course', 'Test Course')").run()
    await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(trackId, course.lastInsertRowid, 1)

    const result = validateDatabase()
    const countErrors = result.errors.filter(e => e.startsWith('Track associate-data-scientist-python has course count'))
    expect(countErrors.length).toBe(1)
    expect(countErrors[0]).toMatch(/has course count 1, but expected 23/)
  })

  test('shared courses validation reports correct memberships when courses appear in multiple tracks', async () => {
    const t1r = await db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('data-engineer-python', 'Data Engineer', 'Python', '#0000ff')").run()
    const t2r = await db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('data-analyst-python', 'Data Analyst', 'Python', '#ff00ff')").run()
    const t3r = await db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('associate-data-analyst-sql', 'Associate Data Analyst SQL', 'SQL', '#ffff00')").run()
    const t4r = await db.prepare("INSERT INTO tracks (slug, name, language, color) VALUES ('associate-python-developer', 'Associate Python Developer', 'Python', '#00ffff')").run()

    const cr = await db.prepare("INSERT INTO courses (slug, name) VALUES ('introduction-to-python', 'Introduction to Python')").run()
    await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(t1r.lastInsertRowid, cr.lastInsertRowid, 1)
    await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(t2r.lastInsertRowid, cr.lastInsertRowid, 1)

    const result = validateDatabase()
    const sharedLines = result.report.filter(r => r.startsWith('    Shared course'))
    expect(sharedLines.length).toBeGreaterThanOrEqual(1)
    expect(sharedLines.some(r => r.includes('introduction-to-python'))).toBe(true)
    expect(sharedLines[0]).toMatch(/verified with \d+ track memberships/)
  })
})
