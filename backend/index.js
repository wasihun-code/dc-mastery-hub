import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import db from './db/database.js'
import { seedDatabase } from './db/seed.js'
import { initSchema } from './db/schema.js'
import coursesRouter from './routes/courses.js'
import progressRouter, { recalculateMastery } from './routes/progress.js'
import tracksRouter from './routes/tracks.js'
import contentRouter from './routes/content.js'
import manageRouter from './routes/manage.js'
import authRouter from './routes/auth.js'
import { scanContent } from './services/contentScanner.js'
import { importJsonExercises } from './db/jsonImporter.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Session verification helper
function getSessionUser(req) {
  const cookieHeader = req.headers.cookie || ''
  const match = cookieHeader.match(/session_id=([^;]+)/)
  if (!match) return null
  const sessionId = match[1]
  
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  if (!session) return null
  
  const now = new Date().toISOString()
  if (session.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    return null
  }
  
  const user = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(session.user_id)
  return user
}

// Mount public auth endpoints
app.use('/api/auth', authRouter)

// Authenticate all subsequent /api/* endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/') || req.path === '/api/health') {
    return next()
  }

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
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

app.get('/api/db-check', (req, res) => {
  const tracks = db.prepare('SELECT COUNT(*) AS count FROM tracks').get().count
  const courses = db.prepare('SELECT COUNT(*) AS count FROM courses').get().count
  const userStats = db.prepare('SELECT * FROM user_stats ORDER BY id LIMIT 1').get()

  res.json({
    tracks,
    courses,
    user_stats: userStats,
  })
})

app.use('/api/content', contentRouter)
app.use('/api', tracksRouter)
app.use('/api', coursesRouter)
app.use('/api', progressRouter)
app.use('/api', manageRouter)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

initSchema()
seedDatabase()
console.log('DB initialized and seeded')

const scanResult = scanContent()
console.log('Content scan result:', scanResult)

const importResult = importJsonExercises()
console.log('JSON exercises import result:', importResult)

// Recalculate mastery for all courses on startup to ensure consistency
try {
  const allUsers = db.prepare('SELECT id FROM users').all()
  const allCourses = db.prepare('SELECT id FROM courses').all()
  for (const u of allUsers) {
    for (const c of allCourses) {
      recalculateMastery(c.id, u.id)
    }
  }
  console.log('All course mastery scores recalculated successfully.')
} catch (e) {
  console.error('Failed to recalculate mastery scores on startup:', e)
}

app.listen(PORT, HOST, () => {
  console.log(`DC Mastery Hub backend running on http://${HOST}:${PORT}`)
})
