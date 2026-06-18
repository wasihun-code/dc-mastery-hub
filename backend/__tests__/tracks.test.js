import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.js'

let db, testData, env, app

function getSessionUser(req) {
  const header = req.headers.cookie || ''
  const m = header.match(/session_id=([^;]+)/)
  if (!m) return null
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(m[1])
  if (!s) return null
  if (s.expires_at < new Date().toISOString()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(m[1])
    return null
  }
  return db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(s.user_id)
}

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

  const tracksRouter = (await import('../routes/tracks.js')).default

  app = express()
  app.use(express.json())

  app.use((req, res, next) => {
    const user = getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  })

  app.use('/api', tracksRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

describe('Tracks Routes', () => {
  describe('GET /api/tracks', () => {
    test('should return tracks list with correct structure', async () => {
      const res = await request(app)
        .get('/api/tracks')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(2)

      for (const track of res.body) {
        expect(track).toHaveProperty('id')
        expect(track).toHaveProperty('slug')
        expect(track).toHaveProperty('name')
        expect(track).toHaveProperty('description')
        expect(track).toHaveProperty('language')
        expect(track).toHaveProperty('color')
        expect(track).toHaveProperty('course_count')
        expect(track).toHaveProperty('completed_count')
        expect(track).toHaveProperty('in_progress_count')
        expect(track).toHaveProperty('overall_mastery')
        expect(track).toHaveProperty('is_deleted')
        expect(track).toHaveProperty('is_archived')
        expect(track).toHaveProperty('created_at')
      }
    })

    test('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/tracks')

      expect(res.status).toBe(401)
    })

    test('should include correct computed fields from seed data', async () => {
      const res = await request(app)
        .get('/api/tracks')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)

      const dataScience = res.body.find(t => t.slug === 'data-science')
      expect(dataScience).toBeDefined()
      expect(dataScience.course_count).toBe(2)
      expect(dataScience.completed_count).toBe(0)
      expect(dataScience.in_progress_count).toBe(1)
      expect(dataScience.overall_mastery).toBe(0)

      const sqlMastery = res.body.find(t => t.slug === 'sql-mastery')
      expect(sqlMastery).toBeDefined()
      expect(sqlMastery.course_count).toBe(1)
      expect(sqlMastery.completed_count).toBe(1)
      expect(sqlMastery.in_progress_count).toBe(0)
      expect(sqlMastery.overall_mastery).toBe(0)
    })
  })

  describe('GET /api/tracks/:slug', () => {
    test('should return track detail with courses array', async () => {
      const res = await request(app)
        .get('/api/tracks/data-science')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.slug).toBe('data-science')
      expect(res.body.name).toBe('Data Science')
      expect(res.body.language).toBe('Python')
      expect(res.body.color).toBe('#03ef62')
      expect(res.body.course_count).toBe(2)
      expect(Array.isArray(res.body.courses)).toBe(true)
      expect(res.body.courses.length).toBe(2)
    })

    test('should return 404 for non-existent slug', async () => {
      const res = await request(app)
        .get('/api/tracks/non-existent-track')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Track not found')
    })

    test('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/tracks/data-science')

      expect(res.status).toBe(401)
    })

    test('course objects should have correct fields', async () => {
      const res = await request(app)
        .get('/api/tracks/data-science')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)

      for (const course of res.body.courses) {
        expect(course).toHaveProperty('id')
        expect(course).toHaveProperty('slug')
        expect(course).toHaveProperty('name')
        expect(course).toHaveProperty('track_id')
        expect(course).toHaveProperty('order_in_track')
        expect(course).toHaveProperty('has_pdf')
        expect(course).toHaveProperty('has_glossary')
        expect(course).toHaveProperty('created_at')
        expect(course).toHaveProperty('status')
        expect(course).toHaveProperty('difficulty')
        expect(course).toHaveProperty('notes')
        expect(course).toHaveProperty('reviewed')
        expect(course).toHaveProperty('is_deleted')
        expect(course).toHaveProperty('is_archived')
        expect(course).toHaveProperty('overall_mastery')
        expect(course).toHaveProperty('flashcard_score')
        expect(course).toHaveProperty('quiz_score')
        expect(course).toHaveProperty('code_score')
        expect(course).toHaveProperty('dataset_score')
        expect(course).toHaveProperty('quiz_question_count')
      }
    })

    test('courses should be ordered by order_in_track', async () => {
      const res = await request(app)
        .get('/api/tracks/data-science')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)

      const orders = res.body.courses.map(c => c.order_in_track)
      expect(orders).toEqual([1, 2])

      const slugs = res.body.courses.map(c => c.slug)
      expect(slugs[0]).toBe('python-basics')
      expect(slugs[1]).toBe('pandas-fundamentals')
    })
  })
})
