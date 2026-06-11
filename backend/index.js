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
  const allCourses = db.prepare('SELECT id FROM courses').all()
  for (const c of allCourses) {
    recalculateMastery(c.id)
  }
  console.log('All course mastery scores recalculated successfully.')
} catch (e) {
  console.error('Failed to recalculate mastery scores on startup:', e)
}

app.listen(PORT, HOST, () => {
  console.log(`DC Mastery Hub backend running on http://${HOST}:${PORT}`)
})
