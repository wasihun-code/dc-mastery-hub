import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'
import { scanContent } from '../services/contentScanner.js'
import { parseCourse } from '../services/pdfParser.js'

const router = express.Router()

router.use((req, res, next) => {
  console.log(`[Content Router] ${req.method} ${req.path}`);
  next();
});
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

router.post('/scan', (req, res, next) => {
  try {
    const summary = scanContent()
    res.status(200).json(summary)
  } catch (err) {
    next(err)
  }
})

router.post('/parse/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    
    const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(courseSlug)
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }
    if (!course.has_pdf) {
      return res.status(400).json({ error: 'No PDF available. Add slides first.' })
    }
    
    const result = parseCourse(courseSlug)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/pdf/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const type = req.query.type || 'slides'
    
    const course = db.prepare('SELECT id, track_id, has_pdf, has_glossary FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    if (type === 'slides' && !course.has_pdf) return res.status(404).json({ error: 'Slides PDF not found' })
    if (type === 'glossary' && !course.has_glossary) return res.status(404).json({ error: 'Glossary PDF not found' })

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) return res.status(404).json({ error: 'Track not found' })

    const contentFolder = process.env.CONTENT_FOLDER || DEFAULT_CONTENT_FOLDER
    const fileName = type === 'slides' ? `${courseSlug}.pdf` : `${courseSlug}-glossary.pdf`
    const absolutePath = path.join(contentFolder, 'tracks', track.slug, courseSlug, fileName)

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found on disk' })
    }

    res.contentType('application/pdf')
    res.sendFile(absolutePath)
  } catch (err) {
    next(err)
  }
})

router.get('/datasets/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const course = db.prepare('SELECT track_id FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) return res.status(404).json({ error: 'Track not found' })

    const contentFolder = process.env.CONTENT_FOLDER || DEFAULT_CONTENT_FOLDER
    const datasetsPath = path.join(contentFolder, 'tracks', track.slug, courseSlug, 'datasets')

    if (!fs.existsSync(datasetsPath) || !fs.statSync(datasetsPath).isDirectory()) {
      return res.status(200).json([])
    }

    const files = fs.readdirSync(datasetsPath)
    const validExtensions = ['.csv', '.sql', '.pkl', '.p', '.json', '.xlsx']
    
    const datasets = files
      .filter(file => !file.startsWith('.') && validExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => {
        const stats = fs.statSync(path.join(datasetsPath, file))
        return {
          name: file,
          extension: path.extname(file),
          size_kb: Math.round(stats.size / 1024)
        }
      })

    res.status(200).json(datasets)
  } catch (err) {
    next(err)
  }
})

export default router
