import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'

const router = express.Router()
const allowedCourseUpdates = ['status', 'notes', 'reviewed', 'has_pdf', 'has_glossary', 'difficulty']

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

function getCourseFolder(contentFolder, courseSlug, trackSlug) {
  // First try the primary track slug
  const primaryPath = path.join(contentFolder, 'tracks', trackSlug, courseSlug)
  if (fs.existsSync(primaryPath)) {
    return primaryPath
  }
  // Search other track folders
  const tracksDir = path.join(contentFolder, 'tracks')
  if (fs.existsSync(tracksDir)) {
    const trackDirs = fs.readdirSync(tracksDir)
    for (const tDir of trackDirs) {
      const checkPath = path.join(tracksDir, tDir, courseSlug)
      if (fs.existsSync(checkPath)) {
        return checkPath
      }
    }
  }
  return primaryPath
}

function getCourseBySlug(slug, userId) {
  const course = db
    .prepare(`
      SELECT
        c.id,
        c.slug,
        c.name,
        c.difficulty AS default_difficulty,
        c.has_pdf,
        c.has_glossary,
        c.created_at,
        COALESCE(uc.status, 'Not Started') AS status,
        COALESCE(uc.difficulty, c.difficulty) AS difficulty,
        COALESCE(uc.notes, c.notes) AS notes,
        COALESCE(uc.reviewed, c.reviewed) AS reviewed,
        COALESCE(uc.is_deleted, 0) AS is_deleted,
        COALESCE(uc.is_archived, 0) AS is_archived,
        (
          SELECT json_group_array(json_object(
            'id', t.id,
            'slug', t.slug,
            'name', t.name,
            'color', t.color,
            'language', t.language,
            'order_in_track', tc.order_in_track
          ))
          FROM track_courses tc
          JOIN tracks t ON t.id = tc.track_id
          WHERE tc.course_id = c.id
        ) AS tracks_json
      FROM courses c
      LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
      WHERE c.slug = ?
    `)
    .get(userId, slug)

  if (course) {
    course.tracks = JSON.parse(course.tracks_json || '[]')
    if (course.tracks.length > 0) {
      course.track_id = course.tracks[0].id
      course.track_slug = course.tracks[0].slug
      course.track_name = course.tracks[0].name
      course.track_color = course.tracks[0].color
      course.track_language = course.tracks[0].language
      course.order_in_track = course.tracks[0].order_in_track
    }
  }
  return course
}

function getMasteryScores(courseId, userId) {
  const scores = db
    .prepare(`
      SELECT * FROM mastery_scores WHERE course_id = ? AND user_id = ?
    `)
    .get(courseId, userId)

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
    const userId = req.user.id
    const courses = db.prepare(`
      SELECT 
        c.id,
        c.slug,
        c.name,
        c.has_pdf,
        c.has_glossary,
        c.created_at,
        COALESCE(uc.status, 'Not Started') AS status,
        COALESCE(uc.difficulty, c.difficulty) AS difficulty,
        COALESCE(uc.notes, c.notes) AS notes,
        COALESCE(uc.reviewed, c.reviewed) AS reviewed,
        COALESCE(uc.is_deleted, 0) AS is_deleted,
        COALESCE(uc.is_archived, 0) AS is_archived,
        ms.overall_mastery,
        ms.flashcard_score,
        ms.quiz_score,
        ms.code_score,
        ms.dataset_score,
        ms.matching_score,
        ms.boss_score,
        (SELECT COUNT(*) FROM quiz_questions WHERE course_id = c.id) AS quiz_question_count,
        (
          SELECT json_group_array(json_object(
            'id', t.id,
            'slug', t.slug,
            'name', t.name,
            'color', t.color,
            'language', t.language,
            'order_in_track', tc.order_in_track
          ))
          FROM track_courses tc
          JOIN tracks t ON t.id = tc.track_id
          WHERE tc.course_id = c.id
        ) AS tracks_json
      FROM courses c
      LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
      WHERE COALESCE(uc.is_deleted, 0) = 0 AND COALESCE(uc.is_archived, 0) = 0
      ORDER BY c.name
    `).all(userId, userId);
    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) ? process.env.CONTENT_FOLDER : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER;

    for (const c of courses) {
      c.tracks = JSON.parse(c.tracks_json || '[]')
      if (c.tracks.length > 0) {
        c.track_id = c.tracks[0].id
        c.track_slug = c.tracks[0].slug
        c.track_name = c.tracks[0].name
        c.track_color = c.tracks[0].color
        c.track_language = c.tracks[0].language
        c.order_in_track = c.tracks[0].order_in_track
      }

      if (c.quiz_question_count === 0) {
        const courseFolder = getCourseFolder(contentFolder, c.slug, c.track_slug);
        const mcqPath = path.join(courseFolder, 'exercises', 'mcq.json');
        if (fs.existsSync(mcqPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'));
            c.quiz_question_count = (Array.isArray(data) ? data : (data.questions || [])).length;
          } catch (e) {}
        }
      }
    }

    res.status(200).json(courses);
  } catch (err) {
    next(err);
  }
});

router.get('/courses/:slug', (req, res, next) => {
  try {
    const userId = req.user.id
    const course = getCourseBySlug(req.params.slug, userId)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const scores = getMasteryScores(course.id, userId)
    const { id: _msId, course_id: _msCourseId, user_id: _msUserId, ...scoresData } = scores

    let conceptCount = db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course.id).count
    let flashcardCount = db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(course.id).count
    let quizQuestionCount = db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course.id).count
    const dueToday = db
      .prepare(`
        SELECT COUNT(*) AS count 
        FROM flashcards f
        LEFT JOIN user_flashcard_progress ufp ON ufp.flashcard_id = f.id AND ufp.user_id = ?
        WHERE f.course_id = ? AND COALESCE(ufp.next_review_date, date('now')) <= date('now')
      `)
      .get(userId, course.id).count

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
    const userId = req.user.id
    const course = getCourseBySlug(req.params.slug, userId)

    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const updates = req.body
    const userFields = []
    const userValues = []
    const globalFields = []
    const globalValues = []

    const userAllowed = ['status', 'notes', 'reviewed', 'difficulty']
    const globalAllowed = ['has_pdf', 'has_glossary']

    for (const key of Object.keys(updates)) {
      if (userAllowed.includes(key)) {
        userFields.push(`${key} = ?`)
        userValues.push(updates[key])
      } else if (globalAllowed.includes(key)) {
        globalFields.push(`${key} = ?`)
        globalValues.push(updates[key])
      }
    }

    if (globalFields.length > 0) {
      globalValues.push(course.id)
      db.prepare(`UPDATE courses SET ${globalFields.join(', ')} WHERE id = ?`).run(...globalValues)
    }

    if (userFields.length > 0) {
      const exists = db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(userId, course.id)
      if (!exists) {
        db.prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)').run(userId, course.id)
      }
      userValues.push(userId, course.id)
      db.prepare(`UPDATE user_courses SET ${userFields.join(', ')} WHERE user_id = ? AND course_id = ?`).run(...userValues)
    }

    res.status(200).json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
})

router.get('/courses/:slug/concepts', (req, res, next) => {
  try {
    const userId = req.user.id
    const course = getCourseBySlug(req.params.slug, userId)

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
    const userId = req.user.id
    const course = getCourseBySlug(req.params.slug, userId)

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
          c.name AS concept_name,
          COALESCE(ufp.interval_days, 1) AS interval_days,
          COALESCE(ufp.ease_factor, 2.5) AS ease_factor,
          COALESCE(ufp.repetitions, 0) AS repetitions,
          COALESCE(ufp.next_review_date, date('now')) AS next_review_date
        FROM flashcards f
        LEFT JOIN concepts c ON c.id = f.concept_id
        LEFT JOIN user_flashcard_progress ufp ON ufp.flashcard_id = f.id AND ufp.user_id = ?
        WHERE f.course_id = ? AND COALESCE(ufp.next_review_date, date('now')) <= date('now')
        ORDER BY COALESCE(ufp.next_review_date, date('now'))
      `)
      .all(userId, course.id)

    res.status(200).json(flashcards)
  } catch (err) {
    next(err)
  }
})

router.get('/courses/:slug/quiz-questions', (req, res, next) => {
  try {
    const course = getCourseBySlug(req.params.slug, req.user.id)

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
