import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import db from './db/database.js'
import { seedDatabase } from './db/seed.js'
import { initSchema } from './db/schema.js'
import coursesRouter from './routes/courses.js'
import progressRouter from './routes/progress.js'
import tracksRouter from './routes/tracks.js'
import contentRouter from './routes/content.js'
import { scanContent } from './services/contentScanner.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '127.0.0.1'

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

app.use('/api', tracksRouter)
app.use('/api', coursesRouter)
app.use('/api', progressRouter)
app.use('/api/content', contentRouter)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

initSchema()
seedDatabase()
console.log('DB initialized and seeded')

const scanResult = scanContent()
console.log('Content scan result:', scanResult)

app.listen(PORT, HOST, () => {
  console.log(`DC Mastery Hub backend running on http://${HOST}:${PORT}`)
})
