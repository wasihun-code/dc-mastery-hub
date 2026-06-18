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

  const coursesRouter = (await import('../routes/courses.js')).default

  app = express()
  app.use(express.json())

  app.use((req, res, next) => {
    const user = getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  })

  app.use('/api', coursesRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

describe('Courses Routes', () => {
  test('GET /api/courses returns course list for authenticated user', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const slugs = res.body.map(c => c.slug)
    expect(slugs).toContain('python-basics')
    expect(slugs).toContain('pandas-fundamentals')
    expect(slugs).toContain('advanced-sql')
  })

  test('GET /api/courses returns 401 without auth', async () => {
    const res = await request(app)
      .get('/api/courses')

    expect(res.status).toBe(401)
  })

  test('GET /api/courses/:slug returns course detail', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(res.body.slug).toBe('python-basics')
    expect(res.body.concept_count).toBe(2)
    expect(res.body.flashcard_count).toBe(2)
    expect(res.body.quiz_question_count).toBe(2)
    expect(res.body.flashcards_due_today).toBeGreaterThanOrEqual(0)
    expect(res.body.track).toBeDefined()
    expect(res.body.track.slug).toBe('data-science')
  })

  test('GET /api/courses/:slug returns 404 for missing course', async () => {
    const res = await request(app)
      .get('/api/courses/nonexistent-course')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Course not found')
  })

  test('GET /api/courses/:slug/concepts returns concepts for course', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/concepts')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(2)
    const names = res.body.map(c => c.name)
    expect(names).toContain('Variables')
    expect(names).toContain('Loops')
  })

  test('PATCH /api/courses/:slug updates course status', async () => {
    const res = await request(app)
      .patch('/api/courses/python-basics')
      .set('Cookie', testData.studentSession)
      .send({ status: 'In Progress', notes: 'Started learning' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  test('PATCH /api/courses/:slug returns 404 for missing course', async () => {
    const res = await request(app)
      .patch('/api/courses/nonexistent')
      .set('Cookie', testData.studentSession)
      .send({ status: 'Completed' })

    expect(res.status).toBe(404)
  })

  test('GET /api/courses/:slug/flashcards/due returns due flashcards', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/flashcards/due')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    if (res.body.length > 0) {
      expect(res.body[0].front).toBeDefined()
      expect(res.body[0].back).toBeDefined()
    }
  })

  test('GET /api/courses/:slug/quiz-questions returns quiz questions', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/quiz-questions')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body[0].question_text).toBeDefined()
    expect(res.body[0].option_a).toBeDefined()
  })

  test('GET /api/courses/:slug/quiz-questions respects count param', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/quiz-questions?count=1')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeLessThanOrEqual(1)
  })

  test('GET /api/courses/:courseSlug/incorrect-review-status returns review data', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/incorrect-review-status')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('attemptRatio')
    expect(res.body).toHaveProperty('attempted')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('isUnlocked')
    expect(res.body).toHaveProperty('incorrectCount')
    expect(res.body.attempted).toBe(0)
    expect(res.body.isUnlocked).toBe(false)
  })

  test('GET /api/courses returns all courses with correct structure', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(3)
    for (const course of res.body) {
      expect(course).toHaveProperty('id')
      expect(course).toHaveProperty('slug')
      expect(course).toHaveProperty('name')
      expect(course).toHaveProperty('difficulty')
      expect(course).toHaveProperty('status')
      expect(course).toHaveProperty('has_pdf')
      expect(course).toHaveProperty('has_glossary')
      expect(course).toHaveProperty('overall_mastery')
      expect(course).toHaveProperty('flashcard_score')
      expect(course).toHaveProperty('quiz_score')
      expect(course).toHaveProperty('code_score')
      expect(course).toHaveProperty('dataset_score')
      expect(course).toHaveProperty('matching_score')
      expect(course).toHaveProperty('boss_score')
      expect(course).toHaveProperty('quiz_question_count')
      expect(typeof course.quiz_question_count).toBe('number')
      expect(course).toHaveProperty('tracks')
      expect(Array.isArray(course.tracks)).toBe(true)
      if (course.tracks.length > 0) {
        expect(course.tracks[0]).toHaveProperty('id')
        expect(course.tracks[0]).toHaveProperty('slug')
        expect(course.tracks[0]).toHaveProperty('name')
        expect(course.tracks[0]).toHaveProperty('color')
      }
    }
  })

  test('GET /api/courses/:slug returns course detail with all expected fields', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(testData.courses.course1.id)
    expect(res.body.slug).toBe('python-basics')
    expect(res.body.name).toBe('Python Basics')
    expect(res.body.difficulty).toBe('Unknown')
    expect(res.body).toHaveProperty('status')
    expect(res.body).toHaveProperty('has_pdf')
    expect(res.body).toHaveProperty('has_glossary')
    expect(res.body).toHaveProperty('notes')
    expect(res.body).toHaveProperty('reviewed')
    expect(res.body).toHaveProperty('flashcard_score')
    expect(res.body).toHaveProperty('quiz_score')
    expect(res.body).toHaveProperty('code_score')
    expect(res.body).toHaveProperty('dataset_score')
    expect(res.body).toHaveProperty('matching_score')
    expect(res.body).toHaveProperty('boss_score')
    expect(res.body).toHaveProperty('overall_mastery')
    expect(res.body.track).toBeDefined()
    expect(res.body.track.id).toBe(testData.tracks.track1.id)
    expect(res.body.track.slug).toBe('data-science')
    expect(res.body.track.name).toBe('Data Science')
    expect(res.body.track.color).toBe('#03ef62')
    expect(res.body.track.language).toBe('Python')
  })

  test('GET /api/courses/:slug includes flashcard_count and quiz_question_count matching DB', async () => {
    const res = await request(app)
      .get('/api/courses/pandas-fundamentals')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(res.body.concept_count).toBe(1)
    expect(res.body.flashcard_count).toBe(0)
    expect(res.body.quiz_question_count).toBe(0)
    expect(res.body.flashcards_due_today).toBeGreaterThanOrEqual(0)
  })

  test('GET /api/courses/:slug/concepts returns concepts array with correct fields', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/concepts')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(2)
    for (const concept of res.body) {
      expect(concept).toHaveProperty('id')
      expect(concept).toHaveProperty('course_id')
      expect(concept).toHaveProperty('name')
      expect(concept).toHaveProperty('definition')
      expect(concept.course_id).toBe(testData.courses.course1.id)
    }
  })

  test('GET /api/courses/:slug/flashcards/due returns flashcards array with correct fields', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/flashcards/due')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    for (const card of res.body) {
      expect(card).toHaveProperty('id')
      expect(card).toHaveProperty('course_id')
      expect(card).toHaveProperty('concept_id')
      expect(card).toHaveProperty('front')
      expect(card).toHaveProperty('back')
      expect(card.course_id).toBe(testData.courses.course1.id)
    }
  })

  test('GET /api/courses/:slug/quiz-questions returns quiz_questions array with correct fields', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics/quiz-questions')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    for (const q of res.body) {
      expect(q).toHaveProperty('id')
      expect(q).toHaveProperty('course_id')
      expect(q).toHaveProperty('concept_id')
      expect(q).toHaveProperty('question_text')
      expect(q).toHaveProperty('option_a')
      expect(q).toHaveProperty('option_b')
      expect(q).toHaveProperty('option_c')
      expect(q).toHaveProperty('option_d')
      expect(q.course_id).toBe(testData.courses.course1.id)
    }
  })

  test('GET /api/courses/:slug includes flashcard questions with correct field names', async () => {
    const res = await request(app)
      .get('/api/courses/python-basics')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('flashcard_count')
    expect(res.body).toHaveProperty('flashcards_due_today')

    const dbCount = db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?')
      .get(testData.courses.course1.id).count
    expect(res.body.flashcard_count).toBe(dbCount)
  })

  test('GET /api/courses/:slug returns all concepts for the course', async () => {
    const conceptsRes = await request(app)
      .get('/api/courses/python-basics/concepts')
      .set('Cookie', testData.studentSession)

    expect(conceptsRes.status).toBe(200)

    const dbCount = db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?')
      .get(testData.courses.course1.id).count
    expect(conceptsRes.body.length).toBe(dbCount)

    for (const c of conceptsRes.body) {
      expect(c.course_id).toBe(testData.courses.course1.id)
    }
  })

  test('GET /api/courses returns courses sorted alphabetically', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    const names = res.body.map(c => c.name)
    const sorted = [...names].sort()
    expect(names).toEqual(sorted)
  })
})
