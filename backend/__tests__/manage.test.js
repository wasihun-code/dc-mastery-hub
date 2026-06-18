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

  const manageRouter = (await import('../routes/manage.js')).default

  app = express()
  app.use(express.json())

  app.use((req, res, next) => {
    const user = getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  })

  app.use('/api', manageRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

describe('Manage Routes', () => {
  describe('Permissions', () => {
    const adminOnlyRoutes = [
      { method: 'post', path: '/api/manage/track/add', body: { name: 'Test', slug: 'test' } },
      { method: 'post', path: '/api/manage/course/add', body: { name: 'Test', slug: 'test', trackId: 1 } },
    ]

    for (const route of adminOnlyRoutes) {
      test(`${route.method.toUpperCase()} ${route.path} returns 403 for non-admin`, async () => {
        const reqBuilder = request(app)[route.method](route.path)
          .set('Cookie', testData.studentSession)

        if (route.body) reqBuilder.send(route.body)

        const res = await reqBuilder
        expect(res.status).toBe(403)
        expect(res.body.error).toMatch(/Only administrators/)
      })
    }
  })

  describe('GET /api/manage/trash', () => {
    test('returns empty trash initially', async () => {
      const res = await request(app)
        .get('/api/manage/trash')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.tracks).toEqual([])
      expect(res.body.courses).toEqual([])
    })
  })

  describe('GET /api/manage/archived', () => {
    test('returns empty archived list initially', async () => {
      const res = await request(app)
        .get('/api/manage/archived')
        .set('Cookie', testData.studentSession)

      expect(res.status).toBe(200)
      expect(res.body.tracks).toEqual([])
      expect(res.body.courses).toEqual([])
    })
  })

  describe('POST /api/manage/track/add (admin)', () => {
    test('creates a new track with valid data', async () => {
      const res = await request(app)
        .post('/api/manage/track/add')
        .set('Cookie', testData.adminSession)
        .send({ name: 'Test Track', slug: 'test-track', language: 'Python', color: '#ff0000' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const track = db.prepare('SELECT * FROM tracks WHERE slug = ?').get('test-track')
      expect(track).toBeDefined()
      expect(track.name).toBe('Test Track')
    })

    test('rejects missing name and slug', async () => {
      const res = await request(app)
        .post('/api/manage/track/add')
        .set('Cookie', testData.adminSession)
        .send({ language: 'Python' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Name and slug are required')
    })
  })

  describe('POST /api/manage/track/update-flags', () => {
    test('marks a track as deleted for the user', async () => {
      const res = await request(app)
        .post('/api/manage/track/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ trackId: testData.tracks.track1.id, is_deleted: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const ut = db.prepare('SELECT * FROM user_tracks WHERE user_id = ? AND track_id = ?')
        .get(testData.studentUser.id, testData.tracks.track1.id)
      expect(ut.is_deleted).toBe(1)
      expect(ut.is_archived).toBe(0)
    })

    test('rejects missing trackId', async () => {
      const res = await request(app)
        .post('/api/manage/track/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ is_deleted: true })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/manage/course/add (admin)', () => {
    test('creates a new course in a track', async () => {
      const res = await request(app)
        .post('/api/manage/course/add')
        .set('Cookie', testData.adminSession)
        .send({ name: 'New Course', slug: 'new-course', trackId: testData.tracks.track1.id, difficulty: 'Medium' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get('new-course')
      expect(course).toBeDefined()
      expect(course.name).toBe('New Course')

      const tc = db.prepare('SELECT * FROM track_courses WHERE track_id = ? AND course_id = ?')
        .get(testData.tracks.track1.id, course.id)
      expect(tc).toBeDefined()
    })

    test('rejects missing required fields', async () => {
      const res = await request(app)
        .post('/api/manage/course/add')
        .set('Cookie', testData.adminSession)
        .send({ name: 'Incomplete' })

      expect(res.status).toBe(400)
    })

    test('rejects non-existent trackId', async () => {
      const res = await request(app)
        .post('/api/manage/course/add')
        .set('Cookie', testData.adminSession)
        .send({ name: 'Bad', slug: 'bad', trackId: 99999 })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Track not found')
    })
  })

  describe('POST /api/manage/course/update-flags', () => {
    test('archives a course for the user', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course1.id, is_archived: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course1.id)
      expect(uc.is_archived).toBe(1)
    })

    test('rejects missing courseId', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ is_deleted: true })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/manage/courses/bulk-action', () => {
    test('deletes multiple courses', async () => {
      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({
          courseIds: [testData.courses.course1.id, testData.courses.course2.id],
          action: 'delete'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test('archives a course', async () => {
      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({
          courseIds: [testData.courses.course3.id],
          action: 'archive'
        })

      expect(res.status).toBe(200)
    })

    test('rejects missing courseIds', async () => {
      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({ action: 'delete' })

      expect(res.status).toBe(400)
    })

    test('rejects copy action for non-admin', async () => {
      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({
          courseIds: [testData.courses.course1.id],
          action: 'copy',
          destTrackId: testData.tracks.track2.id
        })

      expect(res.status).toBe(500)
    })
  })

  describe('POST /api/manage/track/update-flags (is_archived)', () => {
    test('archives a track for the user', async () => {
      const res = await request(app)
        .post('/api/manage/track/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ trackId: testData.tracks.track2.id, is_archived: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const ut = db.prepare('SELECT * FROM user_tracks WHERE user_id = ? AND track_id = ?')
        .get(testData.studentUser.id, testData.tracks.track2.id)
      expect(ut.is_archived).toBe(1)
      expect(ut.is_deleted).toBe(0)
    })
  })

  describe('POST /api/manage/track/update-flags (both flags)', () => {
    test('marks a track as deleted and archived', async () => {
      const res = await request(app)
        .post('/api/manage/track/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ trackId: testData.tracks.track1.id, is_deleted: true, is_archived: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const ut = db.prepare('SELECT * FROM user_tracks WHERE user_id = ? AND track_id = ?')
        .get(testData.studentUser.id, testData.tracks.track1.id)
      expect(ut.is_deleted).toBe(1)
      expect(ut.is_archived).toBe(1)
    })
  })

  describe('POST /api/manage/course/update-flags (is_deleted)', () => {
    test('marks a course as deleted for the user', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course3.id, is_deleted: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course3.id)
      expect(uc.is_deleted).toBe(1)
    })
  })

  describe('POST /api/manage/course/update-properties', () => {
    test('changes status to In Progress', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-properties')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course1.id, status: 'In Progress' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course1.id)
      expect(uc.status).toBe('In Progress')
    })

    test('changes difficulty to Hard', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-properties')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course2.id, difficulty: 'Hard' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course2.id)
      expect(uc.difficulty).toBe('Hard')
    })

    test('changes reviewed to Yes', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-properties')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course3.id, reviewed: 'Yes' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course3.id)
      expect(uc.reviewed).toBe('Yes')
    })

    test('returns 400 when no courseId', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-properties')
        .set('Cookie', testData.studentSession)
        .send({ status: 'In Progress' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('courseId is required')
    })

    test('updates status, difficulty, and reviewed simultaneously', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-properties')
        .set('Cookie', testData.studentSession)
        .send({
          courseId: testData.courses.course2.id,
          status: 'Completed',
          difficulty: 'Hard',
          reviewed: 'Yes'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course2.id)
      expect(uc.status).toBe('Completed')
      expect(uc.difficulty).toBe('Hard')
      expect(uc.reviewed).toBe('Yes')
    })
  })

  describe('POST /api/manage/courses/bulk-action (restore)', () => {
    test('restores a previously deleted course', async () => {
      await request(app)
        .post('/api/manage/course/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course1.id, is_deleted: true })

      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({
          courseIds: [testData.courses.course1.id],
          action: 'restore'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course1.id)
      expect(uc.is_deleted).toBe(0)
    })
  })

  describe('POST /api/manage/courses/bulk-action (unarchive)', () => {
    test('unarchives a previously archived course', async () => {
      await request(app)
        .post('/api/manage/course/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course1.id, is_archived: true })

      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({
          courseIds: [testData.courses.course1.id],
          action: 'unarchive'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course1.id)
      expect(uc.is_archived).toBe(0)
    })
  })

  describe('POST /api/manage/courses/bulk-action (mark_reviewed)', () => {
    test('marks courses as reviewed', async () => {
      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({
          courseIds: [testData.courses.course1.id],
          action: 'mark_reviewed'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course1.id)
      expect(uc.reviewed).toBe('Yes')
    })
  })

  describe('POST /api/manage/courses/bulk-action (mark_unreviewed)', () => {
    test('marks courses as unreviewed', async () => {
      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.studentSession)
        .send({
          courseIds: [testData.courses.course2.id],
          action: 'mark_unreviewed'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course2.id)
      expect(uc.reviewed).toBe('No')
    })
  })

  describe('POST /api/manage/courses/bulk-action (move)', () => {
    test('admin moves a course to another track', async () => {
      const res = await request(app)
        .post('/api/manage/courses/bulk-action')
        .set('Cookie', testData.adminSession)
        .send({
          courseIds: [testData.courses.course3.id],
          action: 'move',
          destTrackId: testData.tracks.track1.id
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const tc = db.prepare('SELECT * FROM track_courses WHERE course_id = ?')
        .get(testData.courses.course3.id)
      expect(tc.track_id).toBe(testData.tracks.track1.id)
    })
  })

  describe('POST /api/manage/trash/permanently-delete (non-admin)', () => {
    test('user permanently deletes their own course data', async () => {
      const res = await request(app)
        .post('/api/manage/trash/permanently-delete')
        .set('Cookie', testData.studentSession)
        .send({ type: 'course', id: testData.courses.course1.id })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course1.id)
      expect(uc).toBeUndefined()
    })

    test('user permanently deletes their own track data', async () => {
      const res = await request(app)
        .post('/api/manage/trash/permanently-delete')
        .set('Cookie', testData.studentSession)
        .send({ type: 'track', id: testData.tracks.track2.id })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const ut = db.prepare('SELECT * FROM user_tracks WHERE user_id = ? AND track_id = ?')
        .get(testData.studentUser.id, testData.tracks.track2.id)
      expect(ut).toBeUndefined()
    })
  })

  describe('POST /api/manage/trash/permanently-delete (admin)', () => {
    test('admin permanently deletes a course', async () => {
      const createRes = await request(app)
        .post('/api/manage/course/add')
        .set('Cookie', testData.adminSession)
        .send({ name: 'Admin Delete Course', slug: 'admin-delete-course', trackId: testData.tracks.track1.id })

      expect(createRes.status).toBe(200)

      const course = db.prepare('SELECT id FROM courses WHERE slug = ?').get('admin-delete-course')
      expect(course).toBeDefined()

      const res = await request(app)
        .post('/api/manage/trash/permanently-delete')
        .set('Cookie', testData.adminSession)
        .send({ type: 'course', id: course.id })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const deleted = db.prepare('SELECT * FROM courses WHERE id = ?').get(course.id)
      expect(deleted).toBeUndefined()
    })

    test('admin permanently deletes a track', async () => {
      const createRes = await request(app)
        .post('/api/manage/track/add')
        .set('Cookie', testData.adminSession)
        .send({ name: 'Admin Delete Track', slug: 'admin-delete-track' })

      expect(createRes.status).toBe(200)

      const track = db.prepare('SELECT id FROM tracks WHERE slug = ?').get('admin-delete-track')
      expect(track).toBeDefined()

      const res = await request(app)
        .post('/api/manage/trash/permanently-delete')
        .set('Cookie', testData.adminSession)
        .send({ type: 'track', id: track.id })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const deleted = db.prepare('SELECT * FROM tracks WHERE id = ?').get(track.id)
      expect(deleted).toBeUndefined()
    })
  })

  describe('POST /api/manage/course/update-flags (both flags)', () => {
    test('marks a course as deleted and archived', async () => {
      const res = await request(app)
        .post('/api/manage/course/update-flags')
        .set('Cookie', testData.studentSession)
        .send({ courseId: testData.courses.course3.id, is_deleted: true, is_archived: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const uc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?')
        .get(testData.studentUser.id, testData.courses.course3.id)
      expect(uc.is_deleted).toBe(1)
      expect(uc.is_archived).toBe(1)
    })
  })

  describe('POST /api/manage/upload-material', () => {
    test('returns 400 for invalid fileType', async () => {
      const res = await request(app)
        .post('/api/manage/upload-material')
        .set('Cookie', testData.adminSession)
        .send({
          courseId: testData.courses.course2.id,
          fileType: 'invalid',
          fileName: 'test.pdf',
          fileContent: Buffer.from('test').toString('base64')
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid fileType')
    })

    test('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/manage/upload-material')
        .set('Cookie', testData.adminSession)
        .send({ courseId: testData.courses.course2.id })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('courseId, fileType, fileName, and fileContent are required')
    })

    test('returns 403 for non-admin', async () => {
      const res = await request(app)
        .post('/api/manage/upload-material')
        .set('Cookie', testData.studentSession)
        .send({
          courseId: testData.courses.course2.id,
          fileType: 'pdf',
          fileName: 'test.pdf',
          fileContent: Buffer.from('test').toString('base64')
        })

      expect(res.status).toBe(403)
      expect(res.body.error).toMatch(/Only administrators/)
    })

    test('uploads a PDF file successfully as admin', async () => {
      const res = await request(app)
        .post('/api/manage/upload-material')
        .set('Cookie', testData.adminSession)
        .send({
          courseId: testData.courses.course2.id,
          fileType: 'pdf',
          fileName: 'test.pdf',
          fileContent: Buffer.from('test pdf content').toString('base64')
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const course = db.prepare('SELECT has_pdf FROM courses WHERE id = ?').get(testData.courses.course2.id)
      expect(course.has_pdf).toBe(1)
    })

    test('uploads a glossary file successfully as admin', async () => {
      const res = await request(app)
        .post('/api/manage/upload-material')
        .set('Cookie', testData.adminSession)
        .send({
          courseId: testData.courses.course2.id,
          fileType: 'glossary',
          fileName: 'glossary.pdf',
          fileContent: Buffer.from('test glossary content').toString('base64')
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const course = db.prepare('SELECT has_glossary FROM courses WHERE id = ?').get(testData.courses.course2.id)
      expect(course.has_glossary).toBe(1)
    })

    test('uploads a dataset file successfully as admin', async () => {
      const res = await request(app)
        .post('/api/manage/upload-material')
        .set('Cookie', testData.adminSession)
        .send({
          courseId: testData.courses.course2.id,
          fileType: 'dataset',
          fileName: 'data.csv',
          fileContent: Buffer.from('col1,col2\n1,2').toString('base64')
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test('uploads a transcript file successfully as admin', async () => {
      const res = await request(app)
        .post('/api/manage/upload-material')
        .set('Cookie', testData.adminSession)
        .send({
          courseId: testData.courses.course2.id,
          fileType: 'transcript',
          fileName: 'transcript.txt',
          fileContent: Buffer.from('test transcript').toString('base64')
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /api/manage/course/copy', () => {
    test('admin copies a course to another track', async () => {
      const res = await request(app)
        .post('/api/manage/course/copy')
        .set('Cookie', testData.adminSession)
        .send({
          courseId: testData.courses.course2.id,
          destTrackId: testData.tracks.track2.id
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.newCourseId).toBe(testData.courses.course2.id)

      const tc = db.prepare('SELECT * FROM track_courses WHERE track_id = ? AND course_id = ?')
        .get(testData.tracks.track2.id, testData.courses.course2.id)
      expect(tc).toBeDefined()
    })

    test('returns 400 for missing courseId/destTrackId', async () => {
      const res = await request(app)
        .post('/api/manage/course/copy')
        .set('Cookie', testData.adminSession)
        .send({ courseId: testData.courses.course1.id })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('courseId and destTrackId are required')
    })
  })
})
