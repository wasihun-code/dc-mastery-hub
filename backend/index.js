import cors from 'cors'
import express from 'express'
import config from './config.js'
import pgDb from './db/database.pg.js'
import { seedDatabase } from './db/seed.js'
import { initSchema } from './db/schema.js'
import coursesRouter from './routes/courses.js'
import progressRouter, { recalculateMastery } from './routes/progress.js'
import tracksRouter from './routes/tracks.js'
import contentRouter from './routes/content.js'
import manageRouter from './routes/manage.js'
import manageQuestionsRouter from './routes/manage-questions.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import { scanContent } from './services/contentScanner.js'
import { importJsonExercises } from './db/jsonImporter.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = config.PORT
const HOST = config.HOST

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Session verification helper
async function getSessionUser(req) {
  const cookieHeader = req.headers.cookie || ''
  const match = cookieHeader.match(/session_id=([^;]+)/)
  if (!match) return null
  const sessionId = match[1]
  
  const session = await pgDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  if (!session) return null
  
  const now = new Date().toISOString()
  if (session.expires_at < now) {
    await pgDb.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    return null
  }
  
  const user = await pgDb.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(session.user_id)
  return user
}

// Mount public auth endpoints
app.use('/api/auth', authRouter)

// Authenticate all subsequent /api/* endpoints
app.use(async (req, res, next) => {
  try {
    if (!req.path.startsWith('/api') || req.path.startsWith('/api/auth/') || req.path === '/api/health') {
      return next()
    }

    const userCount = parseInt((await pgDb.prepare('SELECT COUNT(*) AS count FROM users').get()).count)
    if (userCount === 0) {
      return res.status(401).json({ error: 'No users registered', code: 'NO_USERS' })
    }

    const user = await getSessionUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
    }

    req.user = user
    next()
  } catch(err) {
    next(err)
  }
})

app.get('/api/db-check', async (req, res) => {
  try {
    const tracks = parseInt((await pgDb.prepare('SELECT COUNT(*) AS count FROM tracks').get()).count)
    const courses = parseInt((await pgDb.prepare('SELECT COUNT(*) AS count FROM courses').get()).count)
    const userStats = await pgDb.prepare('SELECT * FROM user_stats ORDER BY id LIMIT 1').get()

    res.json({
      tracks,
      courses,
      user_stats: userStats,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.use('/api/content', contentRouter)
app.use('/api', tracksRouter)
app.use('/api', coursesRouter)
app.use('/api', progressRouter)
app.use('/api', manageRouter)
app.use('/api', manageQuestionsRouter)
app.use('/api', adminRouter)

if (config.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
    } else {
      next()
    }
  })
}

app.use((err, req, res, next) => {
  // console.error(err.stack) // removed for cleaner logs if it logs sensitive stuff
  res.status(500).json({ error: err.message })
})

;(async () => {
  await initSchema()
  await seedDatabase()
  console.log('DB initialized and seeded')

  const scanResult = await scanContent()
  console.log('Content scan result:', scanResult)

  const importResult = await importJsonExercises()
  console.log('JSON exercises import result:', importResult)

  // Recalculate mastery for all courses on startup to ensure consistency
  try {
    const allUsers = await pgDb.prepare('SELECT id FROM users').all()
    const allCourses = await pgDb.prepare('SELECT id FROM courses').all()
    for (const u of allUsers) {
      for (const c of allCourses) {
        await recalculateMastery(c.id, u.id)
      }
    }
    console.log('All course mastery scores recalculated successfully.')
  } catch (e) {
    console.error('Failed to recalculate mastery scores on startup:', e)
  }

  app.listen(PORT, HOST, () => {
    console.log(`DC Mastery Hub backend running on http://${HOST}:${PORT}`)
  })
})()

