import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import crypto from 'crypto'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'

import db from '../db/database.pg.js'
let testData, env, app

jest.setTimeout(60000)

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

beforeAll(async () => {
  env = await setupTestEnvironment()
  jest.resetModules()

  testData = await seedTestData()

  const adminRouter = (await import('../routes/admin.js')).default

  app = express()
  app.use(express.json())

  app.use(async (req, res, next) => {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  })

  app.use('/api', adminRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(async () => {
  await cleanupTestEnvironment(env ? env.tmpDir : undefined)
  if (typeof db !== 'undefined' && db && db.end) await db.end();
})

describe('Admin Routes', () => {
  describe('Permission checks', () => {
    const adminOnlyRoutes = [
      { method: 'get', path: '/api/admin/stats' },
      { method: 'get', path: '/api/admin/users' },
      { method: 'get', path: '/api/admin/tracks' },
      { method: 'get', path: '/api/admin/courses' },
      { method: 'post', path: '/api/admin/exercises/reimport' },
      { method: 'get', path: '/api/admin/system/config' },
    ]

    for (const route of adminOnlyRoutes) {
      test(`${route.method.toUpperCase()} ${route.path} returns 403 for non-admin`, async () => {
        const reqBuilder = request(app)[route.method](route.path)
          .set('Cookie', testData.studentSession)

        const res = await reqBuilder
        expect(res.status).toBe(403)
        expect(res.body.error).toMatch(/Admin access required/)
      })
    }
  })

  describe('GET /api/admin/stats', () => {
    test('returns system statistics for admin', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('users')
      expect(res.body).toHaveProperty('tracks')
      expect(res.body).toHaveProperty('courses')
      expect(res.body).toHaveProperty('total_xp')
      expect(res.body.users).toBeGreaterThanOrEqual(2)
      expect(res.body.tracks).toBeGreaterThanOrEqual(2)
      expect(res.body.courses).toBeGreaterThanOrEqual(3)
    })
  })

  describe('GET /api/admin/users', () => {
    test('returns list of users for admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.users).toBeInstanceOf(Array)
      expect(res.body.users.length).toBeGreaterThanOrEqual(2)

      const adminUser = res.body.users.find(u => u.is_admin === true)
      expect(adminUser).toBeDefined()
      expect(adminUser.username).toBe('admin@test.com')

      const studentUser = res.body.users.find(u => u.is_admin === false)
      expect(studentUser).toBeDefined()
      expect(studentUser).not.toHaveProperty('password_hash')
      expect(studentUser).not.toHaveProperty('salt')
    })
  })

  describe('GET /api/admin/users/:id/progress', () => {
    test('returns user progress for admin', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${testData.studentUser.id}/progress`)
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.username).toBe('student@test.com')
      expect(res.body.courses).toBeInstanceOf(Array)
      expect(res.body.stats).toBeDefined()
    })

    test('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/admin/users/99999/progress')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('User not found')
    })
  })

  describe('POST /api/admin/users/:id/toggle-admin', () => {
    test('toggles admin status for another user', async () => {
      const res = await request(app)
        .post(`/api/admin/users/${testData.studentUser.id}/toggle-admin`)
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.is_admin).toBe(true)

      const user = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(testData.studentUser.id)
      expect(user.is_admin).toBe(true)
    })

    test('prevents self-demotion', async () => {
      const res = await request(app)
        .post(`/api/admin/users/${testData.adminUser.id}/toggle-admin`)
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('You cannot change your own admin status')
    })

    test('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/admin/users/99999/toggle-admin')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    test('prevents self-deletion', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${testData.adminUser.id}`)
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('You cannot delete your own account')
    })

    test('deletes another user', async () => {
      const targetId = testData.studentUser.id

      const res = await request(app)
        .delete(`/api/admin/users/${targetId}`)
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const deleted = await db.prepare('SELECT id FROM users WHERE id = ?').get(targetId)
      expect(deleted).toBeUndefined()
    })

    test('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .delete('/api/admin/users/99999')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/admin/tracks', () => {
    test('returns tracks with course counts for admin', async () => {
      const res = await request(app)
        .get('/api/admin/tracks')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.tracks).toBeInstanceOf(Array)
      expect(res.body.tracks.length).toBeGreaterThanOrEqual(1)

      const found = res.body.tracks.find(t => t.slug === 'data-science')
      expect(found).toBeDefined()
      expect(found.course_count).toBeGreaterThanOrEqual(1)
      expect(found.courses).toBeInstanceOf(Array)
    })
  })

  describe('PUT /api/admin/tracks/:id', () => {
    test('updates track fields', async () => {
      const track = await db.prepare('SELECT id FROM tracks LIMIT 1').get()

      const res = await request(app)
        .patch(`/api/admin/tracks/${track.id}`)
        .set('Cookie', testData.adminSession)
        .send({ name: 'Updated Track', color: '#ff0000' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const updated = await db.prepare('SELECT * FROM tracks WHERE id = ?').get(track.id)
      expect(updated.name).toBe('Updated Track')
      expect(updated.color).toBe('#ff0000')
    })

    test('returns 404 for non-existent track', async () => {
      const res = await request(app)
        .put('/api/admin/tracks/99999')
        .set('Cookie', testData.adminSession)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/tracks/reorder', () => {
    test('reorders courses within a track', async () => {
      const track = await db.prepare('SELECT id FROM tracks LIMIT 1').get()
      const courses = await db.prepare('SELECT course_id AS id FROM track_courses WHERE track_id = ? ORDER BY order_in_track ASC').all(track.id)
      const reversedIds = courses.map(c => c.id).reverse()

      const res = await request(app)
        .post('/api/admin/tracks/reorder')
        .set('Cookie', testData.adminSession)
        .send({ trackId: track.id, courseIds: reversedIds })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const updated = await db.prepare('SELECT course_id, order_in_track FROM track_courses WHERE track_id = ? ORDER BY order_in_track ASC').all(track.id)
      expect(updated[0].course_id).toBe(reversedIds[0])
    })

    test('rejects missing trackId or courseIds', async () => {
      const res = await request(app)
        .post('/api/admin/tracks/reorder')
        .set('Cookie', testData.adminSession)
        .send({ trackId: 1 })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/admin/courses', () => {
    test('returns courses list with tracks for admin', async () => {
      const res = await request(app)
        .get('/api/admin/courses')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.courses).toBeInstanceOf(Array)
      expect(res.body.courses.length).toBeGreaterThanOrEqual(1)
      expect(res.body.courses[0]).toHaveProperty('tracks')
    })
  })

  describe('PUT /api/admin/courses/:id', () => {
    test('updates course fields', async () => {
      const course = await db.prepare('SELECT id FROM courses LIMIT 1').get()

      const res = await request(app)
        .put(`/api/admin/courses/${course.id}`)
        .set('Cookie', testData.adminSession)
        .send({ name: 'Updated Course', difficulty: 'Hard' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const updated = await db.prepare('SELECT * FROM courses WHERE id = ?').get(course.id)
      expect(updated.name).toBe('Updated Course')
      expect(updated.difficulty).toBe('Hard')
    })

    test('returns 404 for non-existent course', async () => {
      const res = await request(app)
        .put('/api/admin/courses/99999')
        .set('Cookie', testData.adminSession)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/exercises/reimport', () => {
    test('runs reimport and returns scan and import results', async () => {
      const res = await request(app)
        .post('/api/admin/exercises/reimport')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body).toHaveProperty('scan')
      expect(res.body).toHaveProperty('import')
    })
  })

  describe('GET /api/admin/system/config', () => {
    test('returns system config for admin', async () => {
      const res = await request(app)
        .get('/api/admin/system/config')
        .set('Cookie', testData.adminSession)

      expect(res.status).toBe(200)
      expect(res.body.config).toBeDefined()
      expect(res.body.config).toHaveProperty('PORT')
      expect(res.body.config).toHaveProperty('NODE_ENV')
      expect(res.body.config).toHaveProperty('DB_PATH')
      expect(res.body.config).toHaveProperty('CONTENT_PATH')
      expect(res.body.config).not.toHaveProperty('SESSION_SECRET')
    })
  })

  describe('POST /api/admin/reset/nuclear', () => {
    let savedAdminSession

    beforeAll(async () => {
      const sessionRow = await db.prepare('SELECT id FROM sessions WHERE user_id = ?').get(testData.adminUser.id)
      savedAdminSession = `session_id=${sessionRow.id}`
    })

    test('rejects missing credentials', async () => {
      const res = await request(app)
        .post('/api/admin/reset/nuclear')
        .set('Cookie', savedAdminSession)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/Username and password are required/)
    })

    test('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/admin/reset/nuclear')
        .set('Cookie', savedAdminSession)
        .send({ username: 'admin@test.com', password: 'wrongpass' })

      expect(res.status).toBe(403)
      expect(res.body.error).toMatch(/Invalid credentials/)
    })

    test('performs nuclear reset with valid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/reset/nuclear')
        .set('Cookie', savedAdminSession)
        .send({ username: 'admin@test.com', password: 'admin123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/Nuclear reset complete/)

      const courseCount = (await db.prepare('SELECT COUNT(*) AS count FROM courses').get()).count
      const trackCount = (await db.prepare('SELECT COUNT(*) AS count FROM tracks').get()).count
      const attemptCount = (await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts').get()).count

      expect(parseInt(courseCount)).toBe(0)
      expect(parseInt(trackCount)).toBe(0)
      expect(parseInt(attemptCount)).toBe(0)

      const admin = await db.prepare('SELECT id FROM users WHERE username = ?').get('admin@test.com')
      expect(admin).toBeDefined()
    })
  })
})
