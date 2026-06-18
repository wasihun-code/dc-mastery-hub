import config from '../config.js'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

function getCourseFolder(courseSlug) {
  const course = db.prepare(`
    SELECT (SELECT track_id FROM track_courses WHERE course_id = c.id LIMIT 1) AS track_id
    FROM courses c WHERE c.slug = ?
  `).get(courseSlug)
  if (!course) return null
  const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
  if (!track) return null
  const contentFolder = config.CONTENT_PATH
  return path.join(contentFolder, 'tracks', track.slug, courseSlug)
}

function getFileNameForType(type) {
  const mapping = {
    'mcq': 'mcq.json',
    'quiz': 'mcq.json',
    'flashcard': 'flashcards.json',
    'flashcards': 'flashcards.json',
    'ftb': 'ftb.json',
    'fillblank': 'ftb.json',
    'dataset': 'challenge.json',
    'challenge': 'challenge.json',
    'matching': 'matching.json',
    'bossbattle': 'bossbattle.json',
    'boss_battle': 'bossbattle.json'
  }
  return mapping[type]
}

router.get('/manage/courses/:courseSlug/questions', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const folder = getCourseFolder(courseSlug)
    if (!folder) return res.status(404).json({ error: 'Course not found' })

    const exercisesDir = path.join(folder, 'exercises')
    const allQuestions = []

    const types = ['mcq', 'flashcards', 'ftb', 'challenge', 'matching', 'bossbattle']
    for (const t of types) {
      const filePath = path.join(exercisesDir, `${t}.json`)
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          const items = Array.isArray(data) ? data : (data.questions || data.cards || data.exercises || data.challenges || data.rounds || [])
          
          for (const item of items) {
             allQuestions.push({
               _exerciseType: t,
               ...item
             })
          }
        } catch (e) {}
      }
    }

    res.json(allQuestions)
  } catch (err) {
    next(err)
  }
})

router.post('/manage/courses/:courseSlug/questions/save', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const { exerciseType, questionData } = req.body
    
    if (!exerciseType || !questionData) return res.status(400).json({ error: 'Missing type or data' })

    const folder = getCourseFolder(courseSlug)
    if (!folder) return res.status(404).json({ error: 'Course not found' })

    const fileName = getFileNameForType(exerciseType)
    if (!fileName) return res.status(400).json({ error: 'Invalid exercise type' })

    const exercisesDir = path.join(folder, 'exercises')
    if (!fs.existsSync(exercisesDir)) {
      fs.mkdirSync(exercisesDir, { recursive: true })
    }

    const filePath = path.join(exercisesDir, fileName)
    let data = {}
    let items = []
    let isArray = false

    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        if (Array.isArray(data)) {
          items = data
          isArray = true
        } else {
          items = data.questions || data.cards || data.exercises || data.challenges || data.rounds || []
        }
      } catch (e) {}
    }

    const qId = questionData.id
    if (!qId && qId !== 0) {
      // Add new
      questionData.id = `new_${Date.now()}`
      items.push(questionData)
    } else {
      // Update
      const index = items.findIndex(i => String(i.id) === String(qId))
      if (index >= 0) {
        items[index] = { ...items[index], ...questionData }
      } else {
        items.push(questionData)
      }
    }

    // Wrap back if it was an object
    let finalData = data
    if (isArray) {
      finalData = items
    } else {
      if (fileName === 'mcq.json' || fileName === 'bossbattle.json') finalData.questions = items
      else if (fileName === 'flashcards.json') finalData.cards = items
      else if (fileName === 'ftb.json') finalData.exercises = items
      else if (fileName === 'challenge.json') finalData.challenges = items
      else if (fileName === 'matching.json') finalData.rounds = items
    }

    fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2), 'utf-8')
    res.json({ success: true, id: questionData.id })
  } catch (err) {
    next(err)
  }
})

// Physical delete from JSON (unlike the user-specific deleted_questions)
router.post('/manage/courses/:courseSlug/questions/delete', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const { exerciseType, questionId } = req.body
    
    if (!exerciseType || !questionId) return res.status(400).json({ error: 'Missing type or id' })

    const folder = getCourseFolder(courseSlug)
    if (!folder) return res.status(404).json({ error: 'Course not found' })

    const fileName = getFileNameForType(exerciseType)
    if (!fileName) return res.status(400).json({ error: 'Invalid exercise type' })

    const filePath = path.join(folder, 'exercises', fileName)
    if (fs.existsSync(filePath)) {
      try {
        let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        let isArray = Array.isArray(data)
        let items = isArray ? data : (data.questions || data.cards || data.exercises || data.challenges || data.rounds || [])
        
        items = items.filter(i => String(i.id) !== String(questionId))
        
        let finalData = data
        if (isArray) {
          finalData = items
        } else {
          if (fileName === 'mcq.json' || fileName === 'bossbattle.json') finalData.questions = items
          else if (fileName === 'flashcards.json') finalData.cards = items
          else if (fileName === 'ftb.json') finalData.exercises = items
          else if (fileName === 'challenge.json') finalData.challenges = items
          else if (fileName === 'matching.json') finalData.rounds = items
        }

        fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2), 'utf-8')
      } catch (e) {
        return res.status(500).json({ error: 'Failed to delete' })
      }
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
