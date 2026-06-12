import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'
import { getChallenges } from '../services/challengeGenerator.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')
const allowedStatsUpdates = [
  'total_xp',
  'level',
  'current_streak',
  'longest_streak',
  'last_active_date',
  'badges_json',
]

function getUserStats() {
  return db.prepare('SELECT * FROM user_stats WHERE id = 1').get()
}

function getTracksSummary() {
  return db
    .prepare(`
      SELECT
        t.id,
        t.slug,
        t.name,
        t.color,
        t.language,
        COUNT(c.id) AS course_count,
        SUM(CASE WHEN c.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
        ROUND(COALESCE(AVG(ms.overall_mastery), 0), 1) AS overall_mastery
      FROM tracks t
      LEFT JOIN courses c ON c.track_id = t.id
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id
      GROUP BY t.id
      ORDER BY t.id
    `)
    .all()
}

function scoreForExerciseType(courseId, whereClause) {
  const result = db
    .prepare(`
      SELECT COALESCE(AVG(was_correct), 0) * 100 AS score
      FROM exercise_attempts
      WHERE course_id = ? AND ${whereClause}
    `)
    .get(courseId)

  return result.score ?? 0
}

export function recalculateMastery(courseId) {
  // 1. Get course and track info
  const course = db.prepare('SELECT id, slug, track_id FROM courses WHERE id = ?').get(courseId)
  if (!course) return null

  const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
  const trackSlug = track ? track.slug : ''

  const contentFolder = process.env.CONTENT_FOLDER 
    ? (path.isAbsolute(process.env.CONTENT_FOLDER) ? process.env.CONTENT_FOLDER : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
    : DEFAULT_CONTENT_FOLDER;

  // Step 1 — Get all unique concepts for this course
  const conceptIdsSet = new Set()
  const exercisesDir = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises')

  // Parse concept_ids from JSON files
  // mcq.json
  const mcqPath = path.join(exercisesDir, 'mcq.json')
  if (fs.existsSync(mcqPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'))
      const questions = Array.isArray(data) ? data : (data.questions || [])
      for (const q of questions) {
        if (q.concept_id) conceptIdsSet.add(q.concept_id)
      }
    } catch (e) {}
  }

  // flashcards.json
  const fcPath = path.join(exercisesDir, 'flashcards.json')
  if (fs.existsSync(fcPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fcPath, 'utf-8'))
      const cards = Array.isArray(data) ? data : (data.cards || [])
      for (const c of cards) {
        if (c.concept_id) conceptIdsSet.add(c.concept_id)
      }
    } catch (e) {}
  }

  // ftb.json
  const ftbPath = path.join(exercisesDir, 'ftb.json')
  if (fs.existsSync(ftbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(ftbPath, 'utf-8'))
      const exercises = Array.isArray(data) ? data : (data.exercises || [])
      for (const ex of exercises) {
        const cId = ex.concept_id || ex.id
        if (cId) conceptIdsSet.add(cId)
      }
    } catch (e) {}
  }

  // bossbattle.json
  const bossPath = path.join(exercisesDir, 'bossbattle.json')
  if (fs.existsSync(bossPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(bossPath, 'utf-8'))
      const questions = Array.isArray(data) ? data : (data.questions || [])
      for (const q of questions) {
        if (q.concept_id) conceptIdsSet.add(q.concept_id)
      }
    } catch (e) {}
  }

  // Fallback: query concepts table in DB
  if (conceptIdsSet.size === 0) {
    const dbConcepts = db.prepare('SELECT id FROM concepts WHERE course_id = ?').all(courseId)
    for (const c of dbConcepts) {
      conceptIdsSet.add(`concept_${String(c.id).padStart(3, '0')}`)
    }
  }

  const totalConcepts = conceptIdsSet.size
  if (totalConcepts === 0) return null

  // Step 2 — Get all exercise_attempts for this course
  const attempts = db.prepare('SELECT * FROM exercise_attempts WHERE course_id = ?').all(courseId)

  // Step 3 — Calculate per-concept mastery
  const conceptMastery = {}
  const conceptByType = {}

  for (const attempt of attempts) {
    if (!attempt.concept_id) continue
    const key = attempt.concept_id
    if (!conceptByType[key]) {
      conceptByType[key] = {}
    }
    const type = attempt.exercise_type
    if (!conceptByType[key][type]) {
      conceptByType[key][type] = []
    }
    conceptByType[key][type].push(attempt)
  }

  for (const conceptId of conceptIdsSet) {
    let bestMastery = 0
    const typesWithAttempts = conceptByType[conceptId]

    if (!typesWithAttempts) {
      conceptMastery[conceptId] = 0
      continue
    }

    for (const type in typesWithAttempts) {
      const typeAttempts = typesWithAttempts[type]
      const correct = typeAttempts.filter(a => a.was_correct === 1).length
      const wrong = typeAttempts.length - correct

      let itemMastery = 0
      if (correct > 0) {
        itemMastery = correct / (correct + 0.5 * wrong)
      }

      if (itemMastery > bestMastery) {
        bestMastery = itemMastery
      }
    }

    conceptMastery[conceptId] = bestMastery
  }

  // Step 4 — Calculate base mastery from concepts
  let conceptsCovered = 0
  let conceptDepthSum = 0

  for (const conceptId of conceptIdsSet) {
    const m = conceptMastery[conceptId] || 0
    if (m > 0) {
      conceptsCovered++
    }
    conceptDepthSum += m
  }

  const conceptCoverage = totalConcepts > 0 ? (conceptsCovered / totalConcepts) : 0
  const conceptDepth = totalConcepts > 0 ? (conceptDepthSum / totalConcepts) : 0

  const baseMastery = (conceptCoverage * 0.4) + (conceptDepth * 0.6)

  // Step 5 — Calculate exercise type bonuses (max 0.20 total)
  let flashcardBonus = 0
  const fcAttempts = attempts.filter(a => a.exercise_type === 'flashcard')
  if (fcAttempts.length > 0) {
    const fcCorrect = fcAttempts.filter(a => a.was_correct === 1).length
    flashcardBonus = Math.min(0.05, (fcCorrect / fcAttempts.length) * 0.05)
  }

  let matchingBonus = 0
  const matchAttempts = attempts.filter(a => a.exercise_type === 'matching')
  if (matchAttempts.length > 0) {
    let sumScore = 0
    for (const a of matchAttempts) {
      let sc = a.score !== null ? a.score : 1.0
      if (sc > 1) sc = sc / 100
      sumScore += sc
    }
    const avgScore = sumScore / matchAttempts.length
    matchingBonus = Math.min(0.05, avgScore * 0.05)
  }

  let datasetBonus = 0
  const dsAttempts = attempts.filter(a => a.exercise_type === 'dataset')
  if (dsAttempts.length > 0) {
    const dsCorrect = dsAttempts.filter(a => a.was_correct === 1).length
    datasetBonus = Math.min(0.05, (dsCorrect / dsAttempts.length) * 0.05)
  }

  let bossBonus = 0
  const bossAttempts = attempts.filter(a => a.exercise_type === 'bossbattle')
  if (bossAttempts.length > 0) {
    const bossCorrect = bossAttempts.filter(a => a.was_correct === 1).length
    bossBonus = Math.min(0.05, (bossCorrect / bossAttempts.length) * 0.05)
  }

  const totalBonus = flashcardBonus + matchingBonus + datasetBonus + bossBonus

  // Step 6 — Compute final scores for storage
  const overallMastery = Math.min(100, (baseMastery + totalBonus) * 100)

  const getConceptDepthForType = (type) => {
    const conceptsWithType = []
    for (const conceptId of conceptIdsSet) {
      if (conceptByType[conceptId] && conceptByType[conceptId][type]) {
        conceptsWithType.push(conceptId)
      }
    }
    if (conceptsWithType.length === 0) return 0
    const sum = conceptsWithType.reduce((acc, c) => acc + conceptMastery[c], 0)
    return sum / conceptsWithType.length
  }

  const flashcardScore = getConceptDepthForType('flashcard') * 100
  const quizScore = getConceptDepthForType('quiz') * 100
  const codeScore = getConceptDepthForType('fillblank') * 100

  let datasetScore = 0
  if (dsAttempts.length > 0) {
    const dsCorrect = dsAttempts.filter(a => a.was_correct === 1).length
    datasetScore = (dsCorrect / dsAttempts.length) * 100
  }

  const matchingScore = matchingBonus * 20 * 100
  const bossScore = getConceptDepthForType('bossbattle') * 100

  // Step 7 — Update mastery_scores table
  db.prepare(`
    INSERT INTO mastery_scores (
      course_id,
      flashcard_score,
      quiz_score,
      code_score,
      dataset_score,
      matching_score,
      boss_score,
      overall_mastery,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(course_id) DO UPDATE SET
      flashcard_score = excluded.flashcard_score,
      quiz_score = excluded.quiz_score,
      code_score = excluded.code_score,
      dataset_score = excluded.dataset_score,
      matching_score = excluded.matching_score,
      boss_score = excluded.boss_score,
      overall_mastery = excluded.overall_mastery,
      updated_at = excluded.updated_at
  `).run(courseId, flashcardScore, quizScore, codeScore, datasetScore, matchingScore, bossScore, overallMastery)

  return db.prepare('SELECT * FROM mastery_scores WHERE course_id = ?').get(courseId)
}

router.get('/progress/dashboard', (req, res, next) => {
  try {
    const weakSpots = db
      .prepare(`
        SELECT
          COALESCE(qq.concept_id, fc.concept_id) AS concept_id,
          con.name AS concept_name,
          crs.name AS course_name,
          COUNT(*) AS attempt_count,
          ROUND(CAST(SUM(ea.was_correct) AS REAL) / COUNT(*), 3) AS correct_rate
        FROM exercise_attempts ea
        LEFT JOIN quiz_questions qq ON ea.exercise_type IN ('quiz', 'bossbattle') AND qq.id = ea.question_id
        LEFT JOIN flashcards fc ON ea.exercise_type = 'flashcard' AND fc.id = ea.question_id
        JOIN concepts con ON con.id = COALESCE(qq.concept_id, fc.concept_id)
        JOIN courses crs ON crs.id = ea.course_id
        GROUP BY COALESCE(qq.concept_id, fc.concept_id)
        HAVING COUNT(*) >= 1
        ORDER BY correct_rate ASC, attempt_count DESC
        LIMIT 10
      `)
      .all()

    const recentActivity = db
      .prepare(`
        SELECT
          ea.*,
          c.name AS course_name,
          c.slug AS course_slug
        FROM exercise_attempts ea
        LEFT JOIN courses c ON c.id = ea.course_id
        ORDER BY ea.attempted_at DESC
        LIMIT 10
      `)
      .all()

    const dueFlashcardsCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM flashcards
        WHERE next_review_date <= date('now')
      `)
      .get().count

    const exerciseBreakdown = db
      .prepare(`
        SELECT
          exercise_type,
          COUNT(*) AS total_attempts,
          SUM(was_correct) AS correct_attempts,
          SUM(COALESCE(time_taken_secs, 0)) AS total_time_secs,
          ROUND(AVG(CASE 
            WHEN score IS NOT NULL AND score <= 1.0 THEN score * 100.0 
            WHEN score IS NOT NULL AND score <= 100.0 THEN score 
            ELSE was_correct * 100.0 
          END), 1) AS avg_score
        FROM exercise_attempts
        GROUP BY exercise_type
      `)
      .all()

    const dailyActivity = db
      .prepare(`
        SELECT
          date(attempted_at) AS date,
          COUNT(*) AS total_attempts,
          SUM(was_correct) AS correct_attempts,
          SUM(COALESCE(time_taken_secs, 0)) AS total_time_secs
        FROM exercise_attempts
        WHERE attempted_at >= date('now', '-30 days')
        GROUP BY date(attempted_at)
        ORDER BY date ASC
      `)
      .all()

    const overallStats = db
      .prepare(`
        SELECT
          COUNT(*) AS total_attempts,
          COALESCE(SUM(was_correct), 0) AS correct_attempts,
          COALESCE(SUM(time_taken_secs), 0) AS total_time_secs,
          ROUND(COALESCE(AVG(was_correct), 0) * 100, 1) AS avg_accuracy
        FROM exercise_attempts
      `)
      .get()

    res.status(200).json({
      user_stats: getUserStats(),
      tracks_summary: getTracksSummary(),
      weak_spots: weakSpots,
      recent_activity: recentActivity,
      due_flashcards_count: dueFlashcardsCount,
      exercise_breakdown: exerciseBreakdown,
      daily_activity: dailyActivity,
      overall_stats: overallStats
    })
  } catch (err) {
    next(err)
  }
})

router.get('/progress/stats', (req, res, next) => {
  try {
    res.status(200).json(getUserStats())
  } catch (err) {
    next(err)
  }
})

router.patch('/progress/stats', (req, res, next) => {
  try {
    const updates = allowedStatsUpdates.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    )

    if (updates.length > 0) {
      const assignments = updates.map((field) => `${field} = @${field}`).join(', ')
      const params = {
        id: 1,
      }

      for (const field of updates) {
        params[field] = req.body[field]
      }

      db.prepare(`UPDATE user_stats SET ${assignments} WHERE id = @id`).run(params)
    }

    res.status(200).json(getUserStats())
  } catch (err) {
    next(err)
  }
})

router.get('/progress/attempted-questions/:courseSlug/:exerciseType', (req, res, next) => {
  try {
    const { courseSlug, exerciseType } = req.params;
    const course = db.prepare('SELECT id FROM courses WHERE slug = ?').get(courseSlug);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    
    const attempts = db.prepare(`
      SELECT DISTINCT question_id 
      FROM exercise_attempts 
      WHERE course_id = ? AND exercise_type = ? AND question_id IS NOT NULL
    `).all(course.id, exerciseType);
    
    res.json(attempts.map(a => a.question_id));
  } catch (err) {
    next(err);
  }
});

function updateStreak() {
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get()
  if (!stats) return

  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`

  let currentStreak = stats.current_streak || 0
  let longestStreak = stats.longest_streak || 0
  const lastActive = stats.last_active_date

  if (!lastActive) {
    currentStreak = 1
  } else if (lastActive === today) {
    // Already active today, streak remains same
  } else {
    // Check if yesterday
    const lastActiveDate = new Date(lastActive)
    const todayDate = new Date(today)
    const diffTime = Math.abs(todayDate - lastActiveDate)
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      currentStreak += 1
    } else {
      currentStreak = 1
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }

  db.prepare(`
    UPDATE user_stats 
    SET current_streak = ?, longest_streak = ?, last_active_date = ? 
    WHERE id = 1
  `).run(currentStreak, longestStreak, today)
}

router.post('/progress/attempt', (req, res, next) => {
  try {
    const { exercise_type, course_id, question_id, concept_id, score, time_taken_secs, was_correct } = req.body

    const result = db
      .prepare(`
        INSERT INTO exercise_attempts (
          exercise_type,
          course_id,
          question_id,
          concept_id,
          score,
          time_taken_secs,
          was_correct
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        exercise_type,
        course_id,
        question_id ?? null,
        concept_id ?? null,
        score ?? null,
        time_taken_secs ?? null,
        was_correct ? 1 : 0,
      )

    const attempt = db.prepare('SELECT * FROM exercise_attempts WHERE id = ?').get(result.lastInsertRowid)
    const mastery = recalculateMastery(course_id)
    updateStreak()

    res.status(200).json({
      attempt,
      mastery,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/progress/exercise-stats/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const course = db.prepare('SELECT id FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const rows = db.prepare(`
      SELECT 
        exercise_type,
        COUNT(*) as total_attempted,
        SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) as total_correct,
        SUM(CASE WHEN was_correct = 0 OR was_correct IS NULL THEN 1 ELSE 0 END) as total_wrong
      FROM exercise_attempts
      WHERE course_id = ?
      GROUP BY exercise_type
    `).all(course.id)

    const stats = {
      mcq: { attempted: 0, correct: 0, wrong: 0 },
      flashcard: { attempted: 0, correct: 0, wrong: 0 },
      ftb: { attempted: 0, correct: 0, wrong: 0 },
      matching: { attempted: 0, correct: 0, wrong: 0 },
      boss_battle: { attempted: 0, correct: 0, wrong: 0 },
      dataset: { attempted: 0, correct: 0, wrong: 0 }
    }

    const typeMapping = {
      quiz: 'mcq',
      flashcard: 'flashcard',
      fillblank: 'ftb',
      matching: 'matching',
      bossbattle: 'boss_battle',
      dataset: 'dataset'
    }

    for (const row of rows) {
      const key = typeMapping[row.exercise_type]
      if (key && stats[key]) {
        stats[key].attempted = row.total_attempted
        stats[key].correct = row.total_correct
        stats[key].wrong = row.total_wrong
      }
    }

    res.json(stats)
  } catch (err) {
    next(err)
  }
})

export default router

