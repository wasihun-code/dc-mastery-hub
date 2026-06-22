import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'
import db from '../db/database.pg.js'

jest.setTimeout(30000)

let testData, env, app, contentDir

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

  contentDir = path.join(env.tmpDir, 'content')
  process.env.CONTENT_PATH = contentDir

  jest.resetModules()




  await db.prepare('DELETE FROM user_stats').run()
  await db.prepare('DELETE FROM sessions').run()
  await db.prepare('DELETE FROM users').run()

  testData = await seedTestData(db)

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

  const sqlCourseFolder = path.join(contentDir, 'tracks', 'sql-mastery', 'advanced-sql')
  fs.mkdirSync(sqlCourseFolder, { recursive: true })

  // Setup for additional tests
  const pfCourseFolder = path.join(contentDir, 'tracks', 'data-science', 'pandas-fundamentals')
  fs.mkdirSync(pfCourseFolder, { recursive: true })

  createExerciseFile(pfCourseFolder, 'bossbattle.json', {
    questions: [
      { id: 1, question_text: 'What is Pandas?', options: { a: 'Library', b: 'Animal', c: 'Tool', d: 'Game' }, correct_option: 'A', concept_id: 'concept_003' }
    ]
  })

  createExerciseFile(pfCourseFolder, 'challenge.json', {
    challenges: [
      { id: 'chal_test_1', title: 'Test Challenge', difficulty: 1, description: 'A test challenge', dataset_file: 'test.csv', starter_code: '', expected_output_code: '', hints: [], concepts_tested: [] }
    ]
  })

  const pfDatasetsDir = path.join(pfCourseFolder, 'datasets')
  fs.mkdirSync(pfDatasetsDir, { recursive: true })
  fs.writeFileSync(path.join(pfDatasetsDir, 'data.csv'), 'col1,col2\n1,2\n3,4', 'utf-8')
  fs.writeFileSync(path.join(pfDatasetsDir, 'extra.csv'), 'a,b\nx,y', 'utf-8')

  createExerciseFile(sqlCourseFolder, 'challenge.json', {
    challenges: [
      { id: 'sql_chal_1', title: 'SQL Test', difficulty: 1, description: 'Test SQL challenge', solution_code: 'SELECT 1 AS result' }
    ]
  })

  fs.writeFileSync(path.join(contentDir, 'tracks', 'data-science', 'track.json'), JSON.stringify({ slug: 'data-science' }), 'utf-8')
  fs.writeFileSync(path.join(pfCourseFolder, 'pandas-fundamentals.pdf'), '%PDF-1.4 fake pdf content', 'utf-8')
  fs.writeFileSync(path.join(pfCourseFolder, 'pandas-fundamentals-glossary.pdf'), '%PDF-1.4 fake glossary content', 'utf-8')

  // Course with empty challenge.json for "empty challenges" test
  const emptyChalCourseFolder = path.join(contentDir, 'tracks', 'data-science', 'empty-challenges')
  fs.mkdirSync(path.join(emptyChalCourseFolder, 'exercises'), { recursive: true })
  fs.writeFileSync(path.join(emptyChalCourseFolder, 'exercises', 'challenge.json'), JSON.stringify({ challenges: [] }), 'utf-8')
  await db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('empty-challenges', 'Empty Challenges', 'Easy', 'Not Started')
  const emptyChalCourse = await db.prepare('SELECT id FROM courses WHERE slug = ?').get('empty-challenges')
  await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(testData.tracks.track1.id, emptyChalCourse.id, 10)

  // Course with only dotfiles in datasets
  const dotfilesCourseFolder = path.join(contentDir, 'tracks', 'data-science', 'dotfiles-datasets')
  fs.mkdirSync(path.join(dotfilesCourseFolder, 'datasets'), { recursive: true })
  fs.writeFileSync(path.join(dotfilesCourseFolder, 'datasets', '.DS_Store'), '', 'utf-8')
  fs.writeFileSync(path.join(dotfilesCourseFolder, 'datasets', '.gitkeep'), '', 'utf-8')
  await db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('dotfiles-datasets', 'Dotfiles Datasets', 'Easy', 'Not Started')
  const dotfilesCourse = await db.prepare('SELECT id FROM courses WHERE slug = ?').get('dotfiles-datasets')
  await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(testData.tracks.track1.id, dotfilesCourse.id, 11)

  const contentRouter = (await import('../routes/content.js')).default

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

  app.use('/api/content', contentRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(async () => {
  await cleanupTestEnvironment(env.tmpDir)
  if (typeof db !== 'undefined' && db && db.end) await db.end();
})

describe('Content Routes', () => {
  describe('GET /api/content/exercises/:courseSlug/:exerciseType', () => {
    test('returns MCQ questions from file', async () => {
      const res = await request(app)
        .get('/api/content/exercises/python-basics/mcq')
        .set('Cookie', testData.studentSession)

      if (res.status !== 200) console.log(res.body, res.text)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(2)
      expect(res.body[0].option_a).toBeDefined()
    })

    test('returns flashcards from file', async () => {
      const res = await request(app)
        .get('/api/content/exercises/python-basics/flashcards')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(2)
      expect(res.body[0].front).toBe('What is a variable?')
    })

    test('returns ftb exercises from file', async () => {
      const res = await request(app)
        .get('/api/content/exercises/python-basics/ftb')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0].code).toBeDefined()
    })

    test('returns 400 for invalid exercise type', async () => {
      const res = await request(app)
        .get('/api/content/exercises/python-basics/invalid')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid exercise type')
    })

    test('returns 404 for missing course', async () => {
      const res = await request(app)
        .get('/api/content/exercises/nonexistent/mcq')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })

    test('maps quiz exercise type to mcq', async () => {
      const res = await request(app)
        .get('/api/content/exercises/python-basics/quiz')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(2)
      expect(res.body[0].option_a).toBeDefined()
    })
  })

  describe('GET /api/content/challenges/:courseSlug', () => {
    test('returns 404 for course with no challenges', async () => {
      const res = await request(app)
        .get('/api/content/challenges/python-basics')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/content/datasets/:courseSlug', () => {
    test('returns empty list for course with no datasets', async () => {
      const res = await request(app)
        .get('/api/content/datasets/python-basics')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('POST /api/content/run-code', () => {
    test('runs SQL code for SQL-based course', async () => {
      const res = await request(app)
        .post('/api/content/run-code')
        .set('Cookie', testData.studentSession)
        .send({ code: 'SELECT 1 AS result', courseSlug: 'advanced-sql' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.output).toContain('result')
      expect(res.body.output).toContain('1')
    })

    test('rejects missing courseSlug', async () => {
      const res = await request(app)
        .post('/api/content/run-code')
        .set('Cookie', testData.studentSession)
        .send({ code: 'print("hello")' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('courseSlug')
    })

    test('rejects missing code', async () => {
      const res = await request(app)
        .post('/api/content/run-code')
        .set('Cookie', testData.studentSession)
        .send({ courseSlug: 'advanced-sql' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('code')
    })

    test('handles SQL error gracefully', async () => {
      const res = await request(app)
        .post('/api/content/run-code')
        .set('Cookie', testData.studentSession)
        .send({ code: 'SELECT FROM invalid', courseSlug: 'advanced-sql' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toContain('SQL Error')
    })

    test('handles empty code string', async () => {
      const res = await request(app)
        .post('/api/content/run-code')
        .set('Cookie', testData.studentSession)
        .send({ code: '', courseSlug: 'advanced-sql' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('code')
    })

    test('handles non-SQL course gracefully', async () => {
      const res = await request(app)
        .post('/api/content/run-code')
        .set('Cookie', testData.studentSession)
        .send({ code: 'print("hello")', courseSlug: 'python-basics' })

      expect(res.status).toBe(200)
      expect(typeof res.body).toBe('object')
    })
  })

  describe('POST /api/content/run-snippet', () => {
    test('runs SQL snippet for SQL-based course', async () => {
      const res = await request(app)
        .post('/api/content/run-snippet')
        .set('Cookie', testData.studentSession)
        .send({ snippet: 'SELECT 42 AS answer', courseSlug: 'advanced-sql' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.output).toContain('42')
    })

    test('rejects missing snippet', async () => {
      const res = await request(app)
        .post('/api/content/run-snippet')
        .set('Cookie', testData.studentSession)
        .send({ courseSlug: 'advanced-sql' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('snippet')
    })

    test('rejects missing courseSlug', async () => {
      const res = await request(app)
        .post('/api/content/run-snippet')
        .set('Cookie', testData.studentSession)
        .send({ snippet: 'SELECT 1' })

      expect(res.status).toBe(400)
    })

    test('handles SQL syntax error', async () => {
      const res = await request(app)
        .post('/api/content/run-snippet')
        .set('Cookie', testData.studentSession)
        .send({ snippet: 'SELECT FROM invalid', courseSlug: 'advanced-sql' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toContain('SQL Error')
    })

    test('handles empty snippet', async () => {
      const res = await request(app)
        .post('/api/content/run-snippet')
        .set('Cookie', testData.studentSession)
        .send({ snippet: '', courseSlug: 'advanced-sql' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('snippet')
    })
  })

  describe('POST /api/content/scan', () => {
    test('returns scan result', async () => {
      const res = await request(app)
        .post('/api/content/scan')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(typeof res.body).toBe('object')
    })

    test('returns scan result with expected keys', async () => {
      const res = await request(app)
        .post('/api/content/scan')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('scanned_tracks')
      expect(res.body).toHaveProperty('scanned_courses')
      expect(res.body).toHaveProperty('pdfs_found')
      expect(res.body).toHaveProperty('glossaries_found')
      expect(res.body).toHaveProperty('courses_with_datasets')
      expect(res.body).toHaveProperty('updates_made')
    })
  })

  describe('GET /api/content/pdf/:courseSlug', () => {
    test('returns 404 when no PDF exists', async () => {
      const res = await request(app)
        .get('/api/content/pdf/python-basics')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })

    test('returns 404 when course does not exist', async () => {
      const res = await request(app)
        .get('/api/content/pdf/nonexistent')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/content/challenges/:courseSlug with data', () => {
    test('returns challenges from file', async () => {
      const res = await request(app)
        .get('/api/content/challenges/pandas-fundamentals')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(1)
      expect(res.body[0].id).toBe('chal_test_1')
      expect(res.body[0].title).toBe('Test Challenge')
    })
  })

  describe('GET /api/content/datasets/:courseSlug with data', () => {
    test('returns datasets from directory', async () => {
      const res = await request(app)
        .get('/api/content/datasets/pandas-fundamentals')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(2)
      const names = res.body.map(d => d.name).sort()
      expect(names).toEqual(['data.csv', 'extra.csv'])
      expect(res.body[0]).toHaveProperty('extension')
      expect(res.body[0]).toHaveProperty('size_kb')
    })
  })

  describe('POST /api/content/submit-challenge', () => {
    test('submits valid SQL challenge successfully', async () => {
      const res = await request(app)
        .post('/api/content/submit-challenge')
        .set('Cookie', testData.studentSession)
        .send({ code: 'SELECT 1 AS result', courseSlug: 'advanced-sql', challengeId: 'sql_chal_1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.passed).toBe(1)
      expect(res.body.score).toBe(100)
      expect(res.body.feedback).toContain('Correct')
    })

    test('fails gracefully for wrong SQL output', async () => {
      const res = await request(app)
        .post('/api/content/submit-challenge')
        .set('Cookie', testData.studentSession)
        .send({ code: 'SELECT 2 AS result', courseSlug: 'advanced-sql', challengeId: 'sql_chal_1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.passed).toBe(0)
      expect(res.body.score).toBe(0)
      expect(res.body.feedback).toContain('Not quite')
    })

    test('returns 400 for missing code', async () => {
      const res = await request(app)
        .post('/api/content/submit-challenge')
        .set('Cookie', testData.studentSession)
        .send({ courseSlug: 'advanced-sql', challengeId: 'sql_chal_1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    test('returns 404 for missing courseSlug', async () => {
      const res = await request(app)
        .post('/api/content/submit-challenge')
        .set('Cookie', testData.studentSession)
        .send({ code: 'SELECT 1', challengeId: 'sql_chal_1' })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Course not found')
    })
  })

  describe('POST /api/content/scan with detailed content', () => {
    test('detects PDFs, glossaries, and datasets', async () => {
      const res = await request(app)
        .post('/api/content/scan')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.scanned_tracks).toBe(1)
      expect(res.body.scanned_courses).toBe(4)
      expect(res.body.pdfs_found).toBe(1)
      expect(res.body.glossaries_found).toBe(1)
      expect(res.body.courses_with_datasets).toBe(1)
    })
  })

  describe('GET /api/content/pdf/:courseSlug with existing PDF', () => {
    test('returns 200 with PDF when file exists', async () => {
      const res = await request(app)
        .get('/api/content/pdf/pandas-fundamentals')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
    })

    test('returns glossary type when exists', async () => {
      const res = await request(app)
        .get('/api/content/pdf/pandas-fundamentals?type=glossary')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/content/exercises/:courseSlug/bossbattle', () => {
    test('returns bossbattle questions from file', async () => {
      const res = await request(app)
        .get('/api/content/exercises/pandas-fundamentals/bossbattle')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(1)
      expect(res.body[0].option_a).toBeDefined()
      expect(res.body[0].question_text).toBe('What is Pandas?')
    })
  })

  describe('POST /api/content/submit-challenge - additional coverage', () => {
    test('returns 400 when submitted SQL code has a syntax error', async () => {
      const res = await request(app)
        .post('/api/content/submit-challenge')
        .set('Cookie', testData.studentSession)
        .send({ code: 'SELECT FROM invalid', courseSlug: 'advanced-sql', challengeId: 'sql_chal_1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    test('handles missing code for non-SQL challenge gracefully', async () => {
      const res = await request(app)
        .post('/api/content/submit-challenge')
        .set('Cookie', testData.studentSession)
        .send({ courseSlug: 'pandas-fundamentals', challengeId: 'chal_test_1' })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('passed')
    })
  })

  describe('POST /api/content/run-code - non-SQL error handling', () => {
    test('handles non-SQL code that causes a runtime error', async () => {
      const res = await request(app)
        .post('/api/content/run-code')
        .set('Cookie', testData.studentSession)
        .send({ code: '1/0', courseSlug: 'python-basics' })

      expect(res.status).toBe(200)
      expect(res.body.error || res.body.stderr).toBeDefined()
    })
  })

  describe('POST /api/content/run-snippet - error handling', () => {
    test('handles snippet that causes a runtime error', async () => {
      const res = await request(app)
        .post('/api/content/run-snippet')
        .set('Cookie', testData.studentSession)
        .send({ snippet: '1/0', courseSlug: 'python-basics' })

      expect(res.status).toBe(200)
      expect(res.body.error || res.body.stderr).toBeDefined()
    })
  })

  describe('GET /api/content/challenges/:courseSlug - empty challenge.json', () => {
    test('returns 404 when challenge.json exists but is empty', async () => {
      const res = await request(app)
        .get('/api/content/challenges/empty-challenges')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/content/datasets/:courseSlug - only dotfiles', () => {
    test('returns empty array when datasets directory has only dotfiles', async () => {
      const res = await request(app)
        .get('/api/content/datasets/dotfiles-datasets')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })
})
