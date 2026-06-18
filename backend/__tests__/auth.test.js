import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.js'

let db, testData, env, app

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

  const authRouter = (await import('../routes/auth.js')).default

  app = express()
  app.use(express.json())
  app.use('/api/auth', authRouter)

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

describe('Auth Routes', () => {
  test('POST /api/auth/register creates a new user and returns session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser@test.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.user.username).toBe('newuser@test.com')
    expect(res.body.user.is_admin).toBe(0)
    expect(res.headers['set-cookie']).toBeDefined()
    expect(res.headers['set-cookie'][0]).toMatch(/session_id=/)
  })

  test('POST /api/auth/register rejects duplicate username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'student@test.com', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Username is already taken')
  })

  test('POST /api/auth/register rejects short username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/at least 3 characters/)
  })

  test('POST /api/auth/register rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'valid@test.com', password: '12345' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/at least 6 characters/)
  })

  test('POST /api/auth/register rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test@test.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Username and password are required')
  })

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'student@test.com', password: 'student123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.user.username).toBe('student@test.com')
    expect(res.headers['set-cookie']).toBeDefined()
    expect(res.headers['set-cookie'][0]).toMatch(/session_id=/)
  })

  test('POST /api/auth/login fails with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'student@test.com', password: 'wrongpass' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid username or password')
  })

  test('POST /api/auth/login fails with non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody@test.com', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid username or password')
  })

  test('POST /api/auth/login rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'student@test.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Username and password are required')
  })

  test('GET /api/auth/session returns authenticated for valid session', async () => {
    const res = await request(app)
      .get('/api/auth/session')
      .set('Cookie', testData.studentSession)

    expect(res.status).toBe(200)
    expect(res.body.authenticated).toBe(true)
    expect(res.body.user.username).toBe('student@test.com')
    expect(res.body.user.is_admin).toBe(0)
  })

  test('GET /api/auth/session returns unauthenticated with no cookie', async () => {
    const res = await request(app)
      .get('/api/auth/session')

    expect(res.status).toBe(200)
    expect(res.body.authenticated).toBe(false)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  test('GET /api/auth/session returns unauthenticated with bad cookie', async () => {
    const res = await request(app)
      .get('/api/auth/session')
      .set('Cookie', 'session_id=invalidtoken123')

    expect(res.status).toBe(200)
    expect(res.body.authenticated).toBe(false)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  test('POST /api/auth/logout clears the session', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'student@test.com', password: 'student123' })

    const sessionCookie = loginRes.headers['set-cookie'][0]

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookie)

    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.success).toBe(true)
    expect(logoutRes.headers['set-cookie'][0]).toMatch(/Max-Age=0/)

    const sessionRes = await request(app)
      .get('/api/auth/session')
      .set('Cookie', sessionCookie)

    expect(sessionRes.body.authenticated).toBe(false)
  })

  test('POST /api/auth/logout works without cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
