import express from 'express'
import crypto from 'crypto'
import db from '../db/database.pg.js'

const router = express.Router()

// Helper: Hash password using PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

// Helper: Verify password
function verifyPassword(password, salt, hash) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

// GET /api/auth/session
router.get('/session', async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie || ''
    const match = cookieHeader.match(/session_id=([^;]+)/)
    
    const userCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count)
    if (userCount === 0) {
      return res.json({ authenticated: false, code: 'NO_USERS' })
    }

    if (!match) {
      return res.json({ authenticated: false, code: 'UNAUTHORIZED' })
    }

    const sessionId = match[1]
    const session = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
    if (!session) {
      return res.json({ authenticated: false, code: 'UNAUTHORIZED' })
    }

    const now = new Date().toISOString()
    if (session.expires_at < now) {
      await db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
      return res.json({ authenticated: false, code: 'UNAUTHORIZED' })
    }

    const user = await db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(session.user_id)
    if (!user) {
      return res.json({ authenticated: false, code: 'UNAUTHORIZED' })
    }

    res.json({ authenticated: true, user: { id: user.id, username: user.username, is_admin: user.is_admin } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const trimmedUsername = username.trim()
    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    // Check if username already exists
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUsername)
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken' })
    }

    const { salt, hash } = hashPassword(password)
    
    const result = await db.prepare(`
      INSERT INTO users (username, password_hash, salt)
      VALUES (?, ?, ?)
    `).run(trimmedUsername, hash, salt)

    const userId = result.lastInsertRowid
    
    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    
    await db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(sessionId, userId, expiresAt)

    res.setHeader('Set-Cookie', `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
    res.json({ success: true, user: { id: userId, username: trimmedUsername, is_admin: false } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim())
    if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
      return res.status(400).json({ error: 'Invalid username or password' })
    }

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    
    await db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(sessionId, user.id, expiresAt)

    res.setHeader('Set-Cookie', `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
    res.json({ success: true, user: { id: user.id, username: user.username, is_admin: user.is_admin } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie || ''
    const match = cookieHeader.match(/session_id=([^;]+)/)
    if (match) {
      await db.prepare('DELETE FROM sessions WHERE id = ?').run(match[1])
    }
    res.setHeader('Set-Cookie', 'session_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
