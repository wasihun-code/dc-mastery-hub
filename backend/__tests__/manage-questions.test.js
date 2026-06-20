import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'
import db from '../db/database.pg.js'

jest.setTimeout(30000)

let testData, env, app

async function getSessionUser(req) {
  const header = req.headers.cookie || ''
  const m = header.match(/session_id=([^;]+)/)
  if (!m) return null
  const s = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(m[1])
  if (!s) return null
  if (s.expires_at < new Date().toISOString()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').run(m[1])
    return null
  }
  return await db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(s.user_id)
}

function createExerciseFile(courseFolder, fileName, data) {
  const exercisesDir = path.join(courseFolder, 'exercises')
  fs.mkdirSync(exercisesDir, { recursive: true })
  fs.writeFileSync(path.join(exercisesDir, fileName), JSON.stringify(data), 'utf-8')
}

beforeAll(async () => {
  env = await setupTestEnvironment()
  process.env.CONTENT_PATH = path.join(env.tmpDir, 'content')
  jest.resetModules()

  testData = await seedTestData()

  const contentDir = path.join(env.tmpDir, 'content')
  const dsCourseFolder = path.join(contentDir, 'tracks', 'data-science', 'python-basics')

  createExerciseFile(dsCourseFolder, 'mcq.json', {
    questions: [
      { id: 1, question_text: 'What is Python?', options: { a: 'Snake', b: 'Language', c: 'Tool', d: 'Game' }, correct_option: 'B', concept_id: 'concept_001' },
      { id: 2, question_text: 'What is a list?', options: { a: 'Data type', b: 'Function', c: 'Module', d: 'Loop' }, correct_option: 'A', concept_id: 'concept_001' }
    ]
  })
  createExerciseFile(dsCourseFolder, 'flashcards.json', {
    cards: [
      { id: 101, front: 'What is a variable?', back: 'Storage for data', concept_id: 'concept_001' },
      { id: 102, front: 'What is a function?', back: 'Reusable code', concept_id: 'concept_002' }
    ]
  })
  createExerciseFile(dsCourseFolder, 'ftb.json', {
    exercises: [
      { id: 201, concept_id: 'concept_001', task_description: 'Fill in the blank', code_template: 'print(___1___)', blanks: [{ answer: '"hello"' }] }
    ]
  })

  const manageQuestionsRouter = (await import('../routes/manage-questions.js')).default

  app = express()
  app.use(express.json())

  app.use(async (req, res, next) => {
    try {
      const user = await getSessionUser(req)
      if (!user) return res.status(401).json({ error: 'Unauthorized' })
      req.user = user
      next()
    } catch (e) {
      next(e)
    }
  })

  app.use('/', manageQuestionsRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(async () => {
  await cleanupTestEnvironment()
})

describe('Manage Questions Routes', () => {
  describe('GET /manage/courses/:courseSlug/questions', () => {
    test('returns questions from mcq.json', async () => {
      const res = await request(app)
        .get('/manage/courses/python-basics/questions')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      const mcqItems = res.body.filter(q => q._exerciseType === 'mcq')
      expect(mcqItems.length).toBe(2)
      expect(mcqItems[0].question_text).toBe('What is Python?')
    })

    test('returns questions from flashcards.json', async () => {
      const res = await request(app)
        .get('/manage/courses/python-basics/questions')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      const flashcardItems = res.body.filter(q => q._exerciseType === 'flashcards')
      expect(flashcardItems.length).toBe(2)
      expect(flashcardItems[0].front).toBe('What is a variable?')
    })

    test('returns 404 for non-existent course', async () => {
      const res = await request(app)
        .get('/manage/courses/nonexistent-course/questions')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Course not found')
    })
  })

  describe('POST /manage/courses/:courseSlug/questions/save', () => {
    test('creates a new question (missing id)', async () => {
      const res = await request(app)
        .post('/manage/courses/python-basics/questions/save')
        .set('Cookie', testData.studentSession)
        .send({
          exerciseType: 'mcq',
          questionData: {
            question_text: 'New question?',
            options: { a: 'A', b: 'B', c: 'C', d: 'D' },
            correct_option: 'A',
            concept_id: 'concept_001'
          }
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.id).toMatch(/^new_\d+/)

      const mcqPath = path.join(env.tmpDir, 'content', 'tracks', 'data-science', 'python-basics', 'exercises', 'mcq.json')
      const saved = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'))
      expect(saved.questions.length).toBe(3)
    })

    test('updates existing question', async () => {
      const res = await request(app)
        .post('/manage/courses/python-basics/questions/save')
        .set('Cookie', testData.studentSession)
        .send({
          exerciseType: 'mcq',
          questionData: {
            id: 1,
            question_text: 'Updated question text'
          }
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.id).toBe(1)

      const mcqPath = path.join(env.tmpDir, 'content', 'tracks', 'data-science', 'python-basics', 'exercises', 'mcq.json')
      const saved = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'))
      const updated = saved.questions.find(q => String(q.id) === '1')
      expect(updated.question_text).toBe('Updated question text')
    })

    test('returns 400 missing exerciseType or questionData', async () => {
      const res = await request(app)
        .post('/manage/courses/python-basics/questions/save')
        .set('Cookie', testData.studentSession)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Missing type or data')
    })

    test('returns 404 for non-existent course', async () => {
      const res = await request(app)
        .post('/manage/courses/nonexistent/questions/save')
        .set('Cookie', testData.studentSession)
        .send({
          exerciseType: 'mcq',
          questionData: { question_text: 'Test' }
        })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Course not found')
    })
  })

  describe('POST /manage/courses/:courseSlug/questions/delete', () => {
    test('removes a question', async () => {
      const res = await request(app)
        .post('/manage/courses/python-basics/questions/delete')
        .set('Cookie', testData.studentSession)
        .send({
          exerciseType: 'mcq',
          questionId: 1
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const mcqPath = path.join(env.tmpDir, 'content', 'tracks', 'data-science', 'python-basics', 'exercises', 'mcq.json')
      const saved = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'))
      expect(saved.questions.length).toBe(2)
      expect(saved.questions.find(q => String(q.id) === '1')).toBeUndefined()
    })

    test('returns 400 missing type or id', async () => {
      const res = await request(app)
        .post('/manage/courses/python-basics/questions/delete')
        .set('Cookie', testData.studentSession)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Missing type or id')
    })

    test('returns 404 for non-existent course', async () => {
      const res = await request(app)
        .post('/manage/courses/nonexistent/questions/delete')
        .set('Cookie', testData.studentSession)
        .send({
          exerciseType: 'mcq',
          questionId: 1
        })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Course not found')
    })
  })
})
