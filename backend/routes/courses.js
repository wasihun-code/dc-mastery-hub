import express from 'express'
import db from '../db/database.js'

const router = express.Router()
const allowedCourseUpdates = ['status', 'notes', 'reviewed', 'has_pdf', 'has_glossary']

function getCourseBySlug(slug) {
  return db
    .prepare(`
      SELECT
        c.*,
        ms.overall_mastery,
        ms.flashcard_score,
        ms.quiz_score,
        ms.code_score,
        ms.dataset_score
      FROM courses c
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id
      WHERE c.slug = ?
    `)
    .get(slug)
}

router.get('/courses/:slug', (req, res, next) => {
  try {
    const course = getCourseBySlug(req.params.slug)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const track = db
      .prepare('SELECT id, name, slug, color, language FROM tracks WHERE id = ?')
      .get(course.track_id)

    const conceptCount = db
      .prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?')
      .get(course.id).count

    const flashcardCount = db
      .prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?')
      .get(course.id).count

    const quizQuestionCount = db
      .prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?')
      .get(course.id).count

    const flashcardsDueToday = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM flashcards
        WHERE course_id = ? AND next_review_date <= date('now')
      `)
      .get(course.id).count

    res.status(200).json({
      ...course,
      track,
      concept_count: conceptCount,
      flashcard_count: flashcardCount,
      quiz_question_count: quizQuestionCount,
      flashcards_due_today: flashcardsDueToday,
    })
  } catch (err) {
    next(err)
  }
})

router.patch('/courses/:slug', (req, res, next) => {
  try {
    const course = getCourseBySlug(req.params.slug)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const updates = allowedCourseUpdates.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    )

    if (updates.length > 0) {
      const assignments = updates.map((field) => `${field} = @${field}`).join(', ')
      const params = {
        id: course.id,
      }

      for (const field of updates) {
        params[field] = req.body[field]
      }

      db.prepare(`UPDATE courses SET ${assignments} WHERE id = @id`).run(params)
    }

    res.status(200).json(getCourseBySlug(req.params.slug))
  } catch (err) {
    next(err)
  }
})

router.get('/courses/:slug/concepts', (req, res, next) => {
  try {
    const course = getCourseBySlug(req.params.slug)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const concepts = db
      .prepare(`
        SELECT *
        FROM concepts
        WHERE course_id = ?
        ORDER BY category, name
      `)
      .all(course.id)

    res.status(200).json(concepts)
  } catch (err) {
    next(err)
  }
})

router.get('/courses/:slug/flashcards/due', (req, res, next) => {
  try {
    const course = getCourseBySlug(req.params.slug)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const flashcards = db
      .prepare(`
        SELECT
          f.*,
          c.name AS concept_name
        FROM flashcards f
        LEFT JOIN concepts c ON c.id = f.concept_id
        WHERE f.course_id = ? AND f.next_review_date <= date('now')
        ORDER BY f.next_review_date
      `)
      .all(course.id)

    res.status(200).json(flashcards)
  } catch (err) {
    next(err)
  }
})

router.get('/courses/:slug/quiz-questions', (req, res, next) => {
  try {
    const course = getCourseBySlug(req.params.slug)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const parsedCount = Number.parseInt(req.query.count, 10)
    const count = Number.isFinite(parsedCount) ? Math.min(Math.max(parsedCount, 1), 20) : 10
    const parsedDifficulty = Number.parseInt(req.query.difficulty, 10)
    const hasDifficulty = Number.isFinite(parsedDifficulty)

    let excludeIds = []
    if (req.query.exclude_ids) {
      excludeIds = req.query.exclude_ids.split(',').map(id => Number.parseInt(id, 10)).filter(id => Number.isFinite(id))
    }

    let queryStr = `
      SELECT *
      FROM quiz_questions
      WHERE course_id = ?
    `
    const queryParams = [course.id]

    if (hasDifficulty) {
      queryStr += ` AND difficulty = ?`
      queryParams.push(parsedDifficulty)
    }

    if (excludeIds.length > 0) {
      queryStr += ` AND id NOT IN (${excludeIds.map(() => '?').join(',')})`
      queryParams.push(...excludeIds)
    }

    queryStr += ` ORDER BY RANDOM() LIMIT ?`
    queryParams.push(count)

    const questions = db.prepare(queryStr).all(...queryParams)

    res.status(200).json(questions)
  } catch (err) {
    next(err)
  }
})

export default router
