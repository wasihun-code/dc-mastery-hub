import express from 'express'
import config from '../../config.js'
import db from '../../db/database.js'
import authRouter from '../../routes/auth.js'

// Creates an Express app pointed at the test DB (must be set before import)
// The caller must set global.__TEST_DB__ before importing this module
export function createTestApp(testDb) {
  // Override the db module's internal connection
  // We do this by replacing the default import with testDb reference
  // Since better-sqlite3 is synchronous, we can just use testDb directly

  const app = express()
  app.use(express.json())

  // Session verification helper (from index.js)
  function getSessionUser(req) {
    const cookieHeader = req.headers.cookie || ''
    const match = cookieHeader.match(/session_id=([^;]+)/)
    if (!match) return null
    const sessionId = match[1]

    const session = testDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
    if (!session) return null

    const now = new Date().toISOString()
    if (session.expires_at < now) {
      testDb.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
      return null
    }

    const user = testDb.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(session.user_id)
    return user
  }

  // Mount public auth endpoints
  app.use('/api/auth', authRouter)

  // Authenticate all subsequent /api/* endpoints
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth/') || req.path === '/api/health') {
      return next()
    }

    const userCount = testDb.prepare('SELECT COUNT(*) AS count FROM users').get().count
    if (userCount === 0) {
      return res.status(401).json({ error: 'No users registered', code: 'NO_USERS' })
    }

    const user = getSessionUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
    }

    req.user = user
    next()
  })

  // Override db references in route modules by attaching db to req
  app.use((req, res, next) => {
    req.__testDb = testDb
    next()
  })

  // Error handler
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })

  return app
}
