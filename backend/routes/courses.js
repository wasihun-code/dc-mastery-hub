import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'

const router = express.Router()
const allowedCourseUpdates = ['status', 'notes', 'reviewed', 'has_pdf', 'has_glossary']

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

function getCourseBySlug(slug) {
  return db
    .prepare(`
      SELECT
        c.*,
        t.name AS track_name,
        t.slug AS track_slug,
        t.color AS track_color,
        t.language AS track_language
      FROM courses c
      JOIN tracks t ON t.id = c.track_id
      WHERE c.slug = ?
    `)
    .get(slug)
}

function getMasteryScores(courseId) {
  const scores = db
    .prepare(`
      SELECT * FROM mastery_scores WHERE course_id = ?
    `)
    .get(courseId)

  if (!scores) {
    return {
      flashcard_score: 0,
      quiz_score: 0,
      code_score: 0,
      dataset_score: 0,
      matching_score: 0,
      boss_score: 0,
      overall_mastery: 0,
    }
  }
  return scores
}

router.get('/courses', (req, res, next) => {
  try {
    const courses = db.prepare(`
      SELECT 
        c.*,
        t.slug AS track_slug,
        t.name AS track_name,
        t.color AS track_color,
        t.language AS track_language,
        ms.overall_mastery,
        ms.flashcard_score,
        ms.quiz_score,
        ms.code_score,
        ms.dataset_score,
        ms.matching_score,
        ms.boss_score
      FROM courses c
      JOIN tracks t ON t.id = c.track_id
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id
      WHERE c.is_deleted = 0 AND c.is_archived = 0
      ORDER BY t.id, c.order_in_track
    `).all();
    res.status(200).json(courses);
  } catch (err) {
    next(err);
  }
});

router.get('/courses/:slug', (req, res, next) => {
  try {
    const course = getCourseBySlug(req.params.slug)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const scores = getMasteryScores(course.id)
    const { id: _msId, course_id: _msCourseId, ...scoresData } = scores

    let conceptCount = db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course.id).count
    let flashcardCount = db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(course.id).count
    let quizQuestionCount = db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course.id).count
    const dueToday = db
      .prepare("SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ? AND next_review_date <= date('now')")
      .get(course.id).count

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) ? process.env.CONTENT_FOLDER : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER;

    if (quizQuestionCount === 0) {
      const mcqPath = path.join(contentFolder, 'tracks', course.track_slug, course.slug, 'exercises', 'mcq.json');
      if (fs.existsSync(mcqPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'));
          quizQuestionCount = (Array.isArray(data) ? data : (data.questions || [])).length;
        } catch (e) {}
      }
    }

    if (flashcardCount === 0) {
      const fcPath = path.join(contentFolder, 'tracks', course.track_slug, course.slug, 'exercises', 'flashcards.json');
      if (fs.existsSync(fcPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fcPath, 'utf-8'));
          flashcardCount = (Array.isArray(data) ? data : (data.cards || [])).length;
        } catch (e) {}
      }
    }

    if (conceptCount === 0) {
      const ftbPath = path.join(contentFolder, 'tracks', course.track_slug, course.slug, 'exercises', 'ftb.json');
      if (fs.existsSync(ftbPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(ftbPath, 'utf-8'));
          conceptCount = (Array.isArray(data) ? data : (data.exercises || [])).length;
        } catch (e) {}
      }
    }

    res.status(200).json({
      ...course,
      ...scoresData,
      track: {
        id: course.track_id,
        name: course.track_name,
        slug: course.track_slug,
        color: course.track_color,
        language: course.track_language,
      },
      concept_count: conceptCount,
      flashcard_count: flashcardCount,
      quiz_question_count: quizQuestionCount,
      flashcards_due_today: dueToday,
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

    const updates = req.body
    const fields = []
    const values = []

    for (const key of Object.keys(updates)) {
      if (allowedCourseUpdates.includes(key)) {
        fields.push(`${key} = ?`)
        values.push(updates[key])
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' })
      return
    }

    values.push(course.id)
    db.prepare(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`).run(...values)

    res.status(200).json({ status: 'ok' })
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

    const concepts = db.prepare('SELECT * FROM concepts WHERE course_id = ? ORDER BY source_page, id').all(course.id)

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

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id);
    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) ? process.env.CONTENT_FOLDER : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER;
      
    const exercisePath = path.join(contentFolder, 'tracks', track.slug, req.params.slug, 'exercises', 'flashcards.json');
    
    if (fs.existsSync(exercisePath)) {
      const data = JSON.parse(fs.readFileSync(exercisePath, 'utf-8'));
      let flashcards = Array.isArray(data) ? data : (data.cards || []);
      for (let i = flashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
      }
      return res.status(200).json(flashcards);
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

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id);
    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) ? process.env.CONTENT_FOLDER : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER;
      
    const exercisePath = path.join(contentFolder, 'tracks', track.slug, req.params.slug, 'exercises', 'mcq.json');
    const parsedCount = Number.parseInt(req.query.count, 10)
    const count = Number.isFinite(parsedCount) ? Math.min(Math.max(parsedCount, 1), 20) : 10
    
    if (fs.existsSync(exercisePath)) {
      const data = JSON.parse(fs.readFileSync(exercisePath, 'utf-8'));
      let questions = Array.isArray(data) ? data : (data.questions || []);
      
      let excludeIds = [];
      if (req.query.exclude_ids) {
        excludeIds = req.query.exclude_ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
      }
      
      if (excludeIds.length > 0) {
        questions = questions.filter(q => !excludeIds.includes(String(q.id)));
      }

      // Map schema for compatibility
      questions = questions.map(q => ({
        ...q,
        option_a: q.options?.a,
        option_b: q.options?.b,
        option_c: q.options?.c,
        option_d: q.options?.d
      }));
      
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      
      return res.status(200).json(questions.slice(0, count));
    }

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
