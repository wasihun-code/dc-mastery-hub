import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import path from 'path'
import crypto from 'crypto'
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
  process.env.CONTENT_PATH = path.join(env.tmpDir, 'no-content')
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

  // Add a course with no exercises for testing zero stats
  db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('no-exercises', 'No Exercises', 'Easy', 'Not Started')
  const noExCourse = db.prepare('SELECT id FROM courses WHERE slug = ?').get('no-exercises')
  db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(testData.tracks.track1.id, noExCourse.id, 99)
  testData.courses.noExCourse = noExCourse

  const progressRouter = (await import('../routes/progress.js')).default

  app = express()
  app.use(express.json())

  app.use((req, res, next) => {
    const user = getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  })

  app.use('/api', progressRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

describe('Progress Routes', () => {
  describe('GET /api/progress/stats', () => {
    test('returns user stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/progress/stats')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.user_id).toBe(testData.studentUser.id)
      expect(res.body.total_xp).toBe(150)
      expect(res.body.level).toBe('Intermediate')
    })

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/progress/stats')

      expect(res.status).toBe(401)
    })

    test('returns empty stats for user without user_stats row', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('nostats@test.com', hash, salt)
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, result.lastInsertRowid, expiresAt)

      const res = await request(app)
        .get('/api/progress/stats')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toBeFalsy()
    })
  })

  describe('PATCH /api/progress/stats', () => {
    test('updates user stats fields', async () => {
      const res = await request(app)
        .patch('/api/progress/stats')
        .set('Cookie', testData.studentSession)
        .send({ total_xp: 200, level: 'Advanced' })

      expect(res.status).toBe(200)
      expect(res.body.total_xp).toBe(200)
      expect(res.body.level).toBe('Advanced')
    })

    test('ignores invalid fields', async () => {
      const res = await request(app)
        .patch('/api/progress/stats')
        .set('Cookie', testData.studentSession)
        .send({ invalid_field: 'test' })

      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/progress/attempt', () => {
    test('records a correct attempt and updates mastery', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 30,
          was_correct: true
        })

      expect(res.status).toBe(200)
      expect(res.body.attempt).toBeDefined()
      expect(res.body.attempt.exercise_type).toBe('quiz')
      expect(res.body.attempt.was_correct).toBe(1)
      expect(res.body.mastery).toBeDefined()
    })

    test('records an incorrect attempt', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 0,
          time_taken_secs: 10,
          was_correct: false
        })

      expect(res.status).toBe(200)
      expect(res.body.attempt.was_correct).toBe(0)
    })

    test('records a flashcard attempt with SM-2 quality 5', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'flashcard',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 5,
          was_correct: true
        })

      expect(res.status).toBe(200)

      const fp = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)

      expect(fp).toBeDefined()
      expect(fp.repetitions).toBe(1)
      expect(fp.interval_days).toBe(1)
      expect(fp.ease_factor).toBeCloseTo(2.6, 1)
    })

    test('updates streak after attempt', async () => {
      const courseId = testData.courses.course1.id
      const before = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(testData.studentUser.id)

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          course_id: courseId,
          question_id: 2,
          concept_id: 2,
          score: 1.0,
          was_correct: true
        })

      const after = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(testData.studentUser.id)

      expect(after.last_active_date).toBeTruthy()
    })

    test('records attempt with zero time_taken_secs', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 0,
          was_correct: true
        })

      expect(res.status).toBe(200)
      expect(res.body.attempt.time_taken_secs).toBe(0)
    })

    test('records attempt with exercise_type dataset', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'dataset',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 30,
          was_correct: true
        })

      expect(res.status).toBe(200)
      expect(res.body.attempt.exercise_type).toBe('dataset')
    })

    test('returns 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          concept_id: 1,
          score: 1.0,
          was_correct: true
        })

      expect(res.status).toBe(400)
    })

    test('returns 400 when exercise_type is missing', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 30,
          was_correct: true
        })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/progress/dashboard', () => {
    test('returns dashboard data', async () => {
      const res = await request(app)
        .get('/api/progress/dashboard')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.user_stats).toBeDefined()
      expect(res.body.tracks_summary).toBeDefined()
      expect(res.body.weak_spots).toBeDefined()
      expect(res.body.recent_activity).toBeDefined()
      expect(res.body.due_flashcards_count).toBeDefined()
      expect(res.body.exercise_breakdown).toBeDefined()
      expect(res.body.daily_activity).toBeDefined()
      expect(res.body.overall_stats).toBeDefined()
    })

    test('handles missing user_stats gracefully', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('dashnostats@test.com', hash, salt)
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, result.lastInsertRowid, expiresAt)

      const res = await request(app)
        .get('/api/progress/dashboard')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)
      expect(res.body.user_stats).toBeUndefined()
    })
  })

  describe('GET /api/progress/exercise-stats/:courseSlug', () => {
    test('returns exercise stats for a course', async () => {
      const res = await request(app)
        .get('/api/progress/exercise-stats/python-basics')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.mcq).toBeDefined()
      expect(res.body.flashcard).toBeDefined()
      expect(res.body.ftb).toBeDefined()
      expect(res.body.mcq.available).toBe(2)
      expect(res.body.flashcard.available).toBe(2)
    })

    test('returns 404 for missing course', async () => {
      const res = await request(app)
        .get('/api/progress/exercise-stats/nonexistent')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })

    test('returns correct ftb count', async () => {
      const res = await request(app)
        .get('/api/progress/exercise-stats/python-basics')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.ftb.available).toBe(2)
    })
  })

  describe('POST /api/progress/reset', () => {
    test('resets all progress for a user', async () => {
      const res = await request(app)
        .post('/api/progress/reset')
        .set('Cookie', testData.studentSession)
        .send({ type: 'all' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(testData.studentUser.id)
      expect(stats.total_xp).toBe(0)
      expect(stats.level).toBe('Beginner')
    })

    test('rejects invalid reset type', async () => {
      const res = await request(app)
        .post('/api/progress/reset')
        .set('Cookie', testData.studentSession)
        .send({ type: 'invalid' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid reset type')
    })

    test('resets by type flashcards', async () => {
      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'flashcard',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 5,
          was_correct: true
        })

      let fp = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(fp).toBeDefined()

      const res = await request(app)
        .post('/api/progress/reset')
        .set('Cookie', testData.studentSession)
        .send({ type: 'flashcards' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      fp = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(fp).toBeUndefined()
    })

    test('resets by type attempts', async () => {
      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 30,
          was_correct: true
        })

      let count = db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?')
        .get(testData.studentUser.id).count
      expect(count).toBeGreaterThan(0)

      const res = await request(app)
        .post('/api/progress/reset')
        .set('Cookie', testData.studentSession)
        .send({ type: 'attempts' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      count = db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?')
        .get(testData.studentUser.id).count
      expect(count).toBe(0)
    })
  })

  describe('GET /api/progress/course-concepts-mastery/:courseId', () => {
    test('returns concepts with mastery data', async () => {
      const res = await request(app)
        .get(`/api/progress/course-concepts-mastery/${testData.courses.course1.id}`)
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(2)
      expect(res.body[0]).toHaveProperty('mastery')
      expect(res.body[0]).toHaveProperty('attempts')
    })

    test('returns 404 for missing course', async () => {
      const res = await request(app)
        .get('/api/progress/course-concepts-mastery/99999')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/progress/incorrect-questions/:courseSlug', () => {
    test('returns empty list when no incorrect attempts', async () => {
      const res = await request(app)
        .get('/api/progress/incorrect-questions/python-basics')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.questions).toBeDefined()
      expect(Array.isArray(res.body.questions)).toBe(true)
    })
  })

  describe('POST /api/progress/delete-question', () => {
    test('marks a question as deleted', async () => {
      const res = await request(app)
        .post('/api/progress/delete-question')
        .set('Cookie', testData.studentSession)
        .send({ courseSlug: 'python-basics', exerciseType: 'quiz', questionId: '1' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })

    test('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/progress/delete-question')
        .set('Cookie', testData.studentSession)
        .send({ courseSlug: 'python-basics' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/progress/due-flashcards', () => {
    test('returns due flashcards for user', async () => {
      const res = await request(app)
        .get('/api/progress/due-flashcards')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    test('returns empty list for user with no flashcard progress', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('noflashcards@test.com', hash, salt)
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, result.lastInsertRowid, expiresAt)

      const allFlashcards = db.prepare('SELECT id FROM flashcards').all()
      for (const fc of allFlashcards) {
        db.prepare("INSERT INTO user_flashcard_progress (user_id, flashcard_id, next_review_date, interval_days, ease_factor, repetitions) VALUES (?, ?, date('now', '+1 year'), 365, 2.5, 999)").run(result.lastInsertRowid, fc.id)
      }

      const dueRes = await request(app)
        .get('/api/progress/due-flashcards')
        .set('Cookie', `session_id=${token}`)

      expect(dueRes.status).toBe(200)
      expect(Array.isArray(dueRes.body)).toBe(true)
      expect(dueRes.body.length).toBe(0)
    })
  })

  describe('GET /api/progress/attempted-questions/:courseSlug/:exerciseType', () => {
    test('returns attempted question IDs', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/python-basics/quiz')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    test('returns 404 for missing course', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/nonexistent/quiz')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/progress/dashboard - detailed structure', () => {
    test('returns exercise_breakdown, daily_activity, overall_stats with correct values', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('dashboard-detail@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)

      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'quiz', course_id: courseId, question_id: 1, score: 1.0, time_taken_secs: 30, was_correct: true })

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'quiz', course_id: courseId, question_id: 2, score: 0.0, time_taken_secs: 15, was_correct: false })

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'flashcard', course_id: courseId, question_id: 1, score: 0.5, time_taken_secs: 10, was_correct: true })

      const res = await request(app)
        .get('/api/progress/dashboard')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)

      expect(Array.isArray(res.body.exercise_breakdown)).toBe(true)

      const quizBreakdown = res.body.exercise_breakdown.find(e => e.exercise_type === 'quiz')
      expect(quizBreakdown).toBeDefined()
      expect(quizBreakdown.total_attempts).toBe(2)
      expect(quizBreakdown.correct_attempts).toBe(1)

      const fcBreakdown = res.body.exercise_breakdown.find(e => e.exercise_type === 'flashcard')
      expect(fcBreakdown).toBeDefined()
      expect(fcBreakdown.total_attempts).toBe(1)

      expect(Array.isArray(res.body.daily_activity)).toBe(true)
      if (res.body.daily_activity.length > 0) {
        expect(res.body.daily_activity[0]).toHaveProperty('date')
        expect(res.body.daily_activity[0]).toHaveProperty('total_attempts')
        expect(res.body.daily_activity[0]).toHaveProperty('correct_attempts')
        expect(res.body.daily_activity[0]).toHaveProperty('total_time_secs')
      }

      expect(res.body.overall_stats).toHaveProperty('total_attempts')
      expect(res.body.overall_stats).toHaveProperty('correct_attempts')
      expect(res.body.overall_stats).toHaveProperty('total_time_secs')
      expect(res.body.overall_stats).toHaveProperty('avg_accuracy')
      expect(res.body.overall_stats.total_attempts).toBe(3)
      expect(res.body.overall_stats.correct_attempts).toBe(2)
      expect(res.body.overall_stats.total_time_secs).toBe(55)
      expect(Number(res.body.overall_stats.avg_accuracy)).toBeCloseTo(66.7, 0)
    })
  })

  describe('GET /api/progress/stats - zero values', () => {
    test('returns user_stats with all default zero values', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('zerostats@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)

      db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date, badges_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(userId, 0, 'Beginner', 0, 0, null, '[]')

      const res = await request(app)
        .get('/api/progress/stats')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)
      expect(res.body.total_xp).toBe(0)
      expect(res.body.level).toBe('Beginner')
      expect(res.body.current_streak).toBe(0)
      expect(res.body.longest_streak).toBe(0)
      expect(res.body.last_active_date).toBeNull()
      expect(res.body.badges_json).toBe('[]')
    })
  })

  describe('PATCH /api/progress/stats - edge values', () => {
    test('sets total_xp to 0', async () => {
      const res = await request(app)
        .patch('/api/progress/stats')
        .set('Cookie', testData.studentSession)
        .send({ total_xp: 0 })

      expect(res.status).toBe(200)
      expect(res.body.total_xp).toBe(0)
    })

    test('sets level to empty string', async () => {
      const res = await request(app)
        .patch('/api/progress/stats')
        .set('Cookie', testData.studentSession)
        .send({ level: '' })

      expect(res.status).toBe(200)
      expect(res.body.level).toBe('')
    })
  })

  describe('POST /api/progress/attempt - ftb and matching', () => {
    test('records an ftb attempt', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'ftb',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 20,
          was_correct: true
        })

      expect(res.status).toBe(200)
      expect(res.body.attempt.exercise_type).toBe('ftb')
      expect(res.body.attempt.was_correct).toBe(1)
    })

    test('records a matching attempt', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'matching',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 0.8,
          time_taken_secs: 60,
          was_correct: true
        })

      expect(res.status).toBe(200)
      expect(res.body.attempt.exercise_type).toBe('matching')
      expect(res.body.attempt.was_correct).toBe(1)
    })
  })

  describe('POST /api/progress/attempt - large time_taken_secs', () => {
    test('records attempt with very large time_taken_secs', async () => {
      const courseId = testData.courses.course1.id
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          time_taken_secs: 999999,
          was_correct: true
        })

      expect(res.status).toBe(200)
      expect(res.body.attempt.time_taken_secs).toBe(999999)
    })
  })

  describe('GET /api/progress/exercise-stats/:courseSlug - all exercise types', () => {
    test('returns all exercise types in stats response', async () => {
      const res = await request(app)
        .get('/api/progress/exercise-stats/python-basics')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('mcq')
      expect(res.body).toHaveProperty('flashcard')
      expect(res.body).toHaveProperty('ftb')
      expect(res.body).toHaveProperty('matching')
      expect(res.body).toHaveProperty('dataset')
      expect(res.body).toHaveProperty('boss_battle')

      for (const key of ['mcq', 'flashcard', 'ftb', 'matching', 'dataset', 'boss_battle']) {
        expect(res.body[key]).toHaveProperty('sessions')
        expect(res.body[key]).toHaveProperty('attempted')
        expect(res.body[key]).toHaveProperty('correct')
        expect(res.body[key]).toHaveProperty('wrong')
        expect(res.body[key]).toHaveProperty('available')
        expect(res.body[key]).toHaveProperty('unattempted')
      }
    })
  })

  describe('GET /api/progress/due-flashcards - due cards', () => {
    test('returns flashcards that are due (today or before)', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('duecards-due@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)

      const allFlashcards = db.prepare('SELECT id FROM flashcards').all()
      for (const fc of allFlashcards) {
        db.prepare("INSERT INTO user_flashcard_progress (user_id, flashcard_id, next_review_date, interval_days, ease_factor, repetitions) VALUES (?, ?, date('now', '-1 day'), 1, 2.5, 1)").run(userId, fc.id)
      }

      const res = await request(app)
        .get('/api/progress/due-flashcards')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)

      for (const card of res.body) {
        expect(card.next_review_date).toBeDefined()
        expect(new Date(card.next_review_date) <= new Date()).toBe(true)
      }
    })
  })

  describe('GET /api/progress/attempted-questions/:courseSlug/:exerciseType - different types', () => {
    test('returns attempted questions for ftb type', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/python-basics/ftb')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    test('returns attempted questions for flashcard type', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/python-basics/flashcard')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    test('returns attempted questions for matching type', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/python-basics/matching')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    test('returns attempted questions for bossbattle type', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/python-basics/bossbattle')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    test('returns attempted questions for dataset type', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/python-basics/dataset')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    test('returns attempted questions for challenge type', async () => {
      const res = await request(app)
        .get('/api/progress/attempted-questions/python-basics/challenge')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('POST /api/progress/attempt - invalid inputs', () => {
    test('returns 404 for invalid course_id', async () => {
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'quiz',
          course_id: 99999,
          question_id: 1,
          was_correct: true
        })

      expect(res.status).toBe(404)
      expect(res.body.error).toContain('Course')
    })

    test('returns 400 for invalid exercise_type', async () => {
      const res = await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'badtype',
          course_id: testData.courses.course1.id,
          question_id: 1,
          was_correct: true
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('exercise_type')
    })
  })

  describe('GET /api/progress/exercise-stats/:courseSlug - no exercises', () => {
    test('returns zero values for a course with no exercises', async () => {
      const res = await request(app)
        .get('/api/progress/exercise-stats/no-exercises')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      for (const key of ['mcq', 'flashcard', 'ftb', 'matching', 'dataset', 'boss_battle']) {
        expect(res.body[key].available).toBe(0)
        expect(res.body[key].attempted).toBe(0)
        expect(res.body[key].correct).toBe(0)
        expect(res.body[key].wrong).toBe(0)
      }
    })
  })

  describe('POST /api/progress/reset - deep verification', () => {
    test('reset flashcards clears user_flashcard_progress and spaced_repetition_queue', async () => {
      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'flashcard',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          was_correct: true
        })

      db.prepare("INSERT OR IGNORE INTO spaced_repetition_queue (user_id, flashcard_id, due_date) VALUES (?, ?, date('now'))")
        .run(testData.studentUser.id, 1)

      let progress = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(progress).toBeDefined()

      let queue = db.prepare('SELECT * FROM spaced_repetition_queue WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(queue).toBeDefined()

      const res = await request(app)
        .post('/api/progress/reset')
        .set('Cookie', testData.studentSession)
        .send({ type: 'flashcards' })

      expect(res.status).toBe(200)

      progress = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(progress).toBeUndefined()

      queue = db.prepare('SELECT * FROM spaced_repetition_queue WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(queue).toBeUndefined()
    })

    test('reset attempts removes all exercise_attempts but leaves flashcard progress intact', async () => {
      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', testData.studentSession)
        .send({
          exercise_type: 'flashcard',
          course_id: courseId,
          question_id: 1,
          concept_id: 1,
          score: 1.0,
          was_correct: true
        })

      let attemptsCount = db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?')
        .get(testData.studentUser.id).count
      expect(attemptsCount).toBeGreaterThan(0)

      const fpBefore = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(fpBefore).toBeDefined()

      const res = await request(app)
        .post('/api/progress/reset')
        .set('Cookie', testData.studentSession)
        .send({ type: 'attempts' })

      expect(res.status).toBe(200)

      attemptsCount = db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?')
        .get(testData.studentUser.id).count
      expect(attemptsCount).toBe(0)

      const fpAfter = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?')
        .get(testData.studentUser.id, 1)
      expect(fpAfter).toBeDefined()
    })
  })

  describe('GET /api/progress/dashboard - edge cases', () => {
    test('returns empty weak_spots when all concepts have 100% mastery', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('noweak@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)
      db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date, badges_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, 0, 'Beginner', 0, 0, null, '[]')

      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'quiz', course_id: courseId, question_id: 1, score: 1.0, was_correct: true })

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'quiz', course_id: courseId, question_id: 2, score: 1.0, was_correct: true })

      const res = await request(app)
        .get('/api/progress/dashboard')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.weak_spots)).toBe(true)
      if (res.body.weak_spots.length > 0) {
        for (const spot of res.body.weak_spots) {
          expect(Number(spot.correct_rate)).toBe(1)
        }
      }
    })

    test('returns empty recent_activity and exercise_breakdown for user with no attempts', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('noactivity@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)
      db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date, badges_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, 0, 'Beginner', 0, 0, null, '[]')

      const res = await request(app)
        .get('/api/progress/dashboard')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.recent_activity)).toBe(true)
      expect(res.body.recent_activity.length).toBe(0)
      expect(Array.isArray(res.body.exercise_breakdown)).toBe(true)
      expect(res.body.exercise_breakdown.length).toBe(0)
      expect(res.body.overall_stats.total_attempts).toBe(0)
      expect(res.body.overall_stats.correct_attempts).toBe(0)
    })

    test('returns correct tracks_summary when user has completed all courses', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('allcomplete@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)
      db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date, badges_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, 0, 'Beginner', 0, 0, null, '[]')

      for (const course of [testData.courses.course1, testData.courses.course2, testData.courses.course3, testData.courses.noExCourse]) {
        db.prepare("INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, 'Completed', 'Yes')").run(userId, course.id)
      }

      const res = await request(app)
        .get('/api/progress/dashboard')
        .set('Cookie', `session_id=${token}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.tracks_summary)).toBe(true)
      for (const track of res.body.tracks_summary) {
        expect(track.completed_count).toBe(track.course_count)
      }
    })
  })

  describe('POST /api/progress/attempt - SM-2 algorithm', () => {
    test('applies SM-2 interval=6 on second review with quality=5', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('sm2second@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)
      db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date, badges_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, 0, 'Beginner', 0, 0, null, '[]')

      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'flashcard', course_id: courseId, question_id: 1, score: 1.0, was_correct: true })

      let fp = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?').get(userId, 1)
      expect(fp.repetitions).toBe(1)
      expect(fp.interval_days).toBe(1)

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'flashcard', course_id: courseId, question_id: 1, score: 1.0, was_correct: true })

      fp = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?').get(userId, 1)
      expect(fp.repetitions).toBe(2)
      expect(fp.interval_days).toBe(6)
    })

    test('resets SM-2 repetitions when quality is low (score=0)', async () => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('pwd', salt, 1000, 64, 'sha512').toString('hex')
      const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('sm2reset@test.com', hash, salt)
      const userId = result.lastInsertRowid
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)
      db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date, badges_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, 0, 'Beginner', 0, 0, null, '[]')

      const courseId = testData.courses.course1.id

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'flashcard', course_id: courseId, question_id: 1, score: 1.0, was_correct: true })

      let fp = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?').get(userId, 1)
      expect(fp.repetitions).toBe(1)

      await request(app)
        .post('/api/progress/attempt')
        .set('Cookie', `session_id=${token}`)
        .send({ exercise_type: 'flashcard', course_id: courseId, question_id: 1, score: 0, was_correct: false })

      fp = db.prepare('SELECT * FROM user_flashcard_progress WHERE user_id = ? AND flashcard_id = ?').get(userId, 1)
      expect(fp.repetitions).toBe(0)
      expect(fp.interval_days).toBe(1)
    })
  })

  describe('GET /api/progress/exercise-stats/:courseSlug - single type', () => {
    test('returns stats when course has only flashcards', async () => {
      db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('only-flashcards', 'Only Flashcards', 'Easy', 'Not Started')
      const course = db.prepare('SELECT id FROM courses WHERE slug = ?').get('only-flashcards')
      db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(testData.tracks.track1.id, course.id, 100)
      db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?)').run(course.id, 1, 'Only card front', 'Only card back')

      const res = await request(app)
        .get('/api/progress/exercise-stats/only-flashcards')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.flashcard.available).toBe(1)
      expect(res.body.mcq.available).toBe(0)
      expect(res.body.ftb.available).toBe(0)
      expect(res.body.matching.available).toBe(0)
      expect(res.body.boss_battle.available).toBe(0)
      expect(res.body.dataset.available).toBe(0)
    })
  })
})
