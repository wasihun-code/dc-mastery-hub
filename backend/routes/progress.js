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

function getUserStats(userId) {
  return db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId)
}

function getTracksSummary(userId) {
  return db
    .prepare(`
      SELECT
        t.id,
        t.slug,
        t.name,
        t.color,
        t.language,
        COUNT(c.id) AS course_count,
        SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
        ROUND(COALESCE(AVG(ms.overall_mastery), 0), 1) AS overall_mastery
      FROM tracks t
      LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = ?
      LEFT JOIN courses c ON c.track_id = t.id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0
      LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
      WHERE COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0
      GROUP BY t.id
      ORDER BY t.id
    `)
    .all(userId, userId, userId, userId, userId)
}

function scoreForExerciseType(courseId, whereClause, userId) {
  const result = db
    .prepare(`
      SELECT COALESCE(AVG(was_correct), 0) * 100 AS score
      FROM exercise_attempts
      WHERE course_id = ? AND user_id = ? AND ${whereClause}
    `)
    .get(courseId, userId)

  return result.score ?? 0
}

export function recalculateMastery(courseId, userId) {
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

  // Step 2 — Get all exercise_attempts for this course for this user
  const attempts = db.prepare('SELECT * FROM exercise_attempts WHERE course_id = ? AND user_id = ?').all(courseId, userId)

  // Step 3 — Calculate per-concept mastery
  const conceptMastery = {}
  const conceptByType = {}

  for (const attempt of attempts) {
    if (!attempt.concept_id) continue
    let key = String(attempt.concept_id)
    if (/^\d+$/.test(key)) {
      key = `concept_${key.padStart(3, '0')}`
    }
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
    const solvedChallengeIds = new Set(
      dsAttempts.filter(a => a.was_correct === 1).map(a => String(a.question_id))
    )
    let totalChallenges = 0
    const challengePath = path.join(exercisesDir, 'challenge.json')
    if (fs.existsSync(challengePath)) {
      try {
        const d = JSON.parse(fs.readFileSync(challengePath, 'utf-8'))
        totalChallenges = (Array.isArray(d) ? d : (d.challenges || [])).length
      } catch (e) {}
    }
    if (totalChallenges === 0) {
      try {
        const challenges = getChallenges(course.slug)
        totalChallenges = (challenges || []).length
      } catch (e) {}
    }
    if (totalChallenges > 0) {
      datasetBonus = Math.min(0.05, (solvedChallengeIds.size / totalChallenges) * 0.05)
    } else {
      datasetBonus = 0.05
    }
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
    const solvedChallengeIds = new Set(
      dsAttempts.filter(a => a.was_correct === 1).map(a => String(a.question_id))
    )
    let totalChallenges = 0
    const challengePath = path.join(exercisesDir, 'challenge.json')
    if (fs.existsSync(challengePath)) {
      try {
        const d = JSON.parse(fs.readFileSync(challengePath, 'utf-8'))
        totalChallenges = (Array.isArray(d) ? d : (d.challenges || [])).length
      } catch (e) {}
    }
    if (totalChallenges === 0) {
      try {
        const challenges = getChallenges(course.slug)
        totalChallenges = (challenges || []).length
      } catch (e) {}
    }
    if (totalChallenges > 0) {
      datasetScore = (solvedChallengeIds.size / totalChallenges) * 100
    } else {
      datasetScore = 100
    }
  }

  const matchingScore = matchingBonus * 20 * 100
  const bossScore = getConceptDepthForType('bossbattle') * 100

  // Step 7 — Update mastery_scores table
  db.prepare(`
    INSERT INTO mastery_scores (
      user_id,
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, course_id) DO UPDATE SET
      flashcard_score = excluded.flashcard_score,
      quiz_score = excluded.quiz_score,
      code_score = excluded.code_score,
      dataset_score = excluded.dataset_score,
      matching_score = excluded.matching_score,
      boss_score = excluded.boss_score,
      overall_mastery = excluded.overall_mastery,
      updated_at = excluded.updated_at
  `).run(userId, courseId, flashcardScore, quizScore, codeScore, datasetScore, matchingScore, bossScore, overallMastery)

  return db.prepare('SELECT * FROM mastery_scores WHERE course_id = ? AND user_id = ?').get(courseId, userId)
}

router.get('/progress/dashboard', (req, res, next) => {
  try {
    const userId = req.user.id

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
        WHERE ea.user_id = ?
        GROUP BY COALESCE(qq.concept_id, fc.concept_id)
        HAVING COUNT(*) >= 1
        ORDER BY correct_rate ASC, attempt_count DESC
        LIMIT 10
      `)
      .all(userId)

    const recentActivity = db
      .prepare(`
        SELECT
          ea.*,
          c.name AS course_name,
          c.slug AS course_slug
        FROM exercise_attempts ea
        LEFT JOIN courses c ON c.id = ea.course_id
        WHERE ea.user_id = ?
        ORDER BY ea.attempted_at DESC
        LIMIT 10
      `)
      .all(userId)

    const dueFlashcardsCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM flashcards f
        LEFT JOIN user_flashcard_progress ufp ON ufp.flashcard_id = f.id AND ufp.user_id = ?
        WHERE COALESCE(ufp.next_review_date, date('now')) <= date('now')
      `)
      .get(userId).count

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
        WHERE user_id = ?
        GROUP BY exercise_type
      `)
      .all(userId)

    const dailyActivity = db
      .prepare(`
        SELECT
          date(attempted_at) AS date,
          COUNT(*) AS total_attempts,
          SUM(was_correct) AS correct_attempts,
          SUM(COALESCE(time_taken_secs, 0)) AS total_time_secs
        FROM exercise_attempts
        WHERE user_id = ? AND attempted_at >= date('now', '-30 days')
        GROUP BY date(attempted_at)
        ORDER BY date ASC
      `)
      .all(userId)

    const overallStats = db
      .prepare(`
        SELECT
          COUNT(*) AS total_attempts,
          COALESCE(SUM(was_correct), 0) AS correct_attempts,
          COALESCE(SUM(time_taken_secs), 0) AS total_time_secs,
          ROUND(COALESCE(AVG(was_correct), 0) * 100, 1) AS avg_accuracy
        FROM exercise_attempts
        WHERE user_id = ?
      `)
      .get(userId)

    res.status(200).json({
      user_stats: getUserStats(userId),
      tracks_summary: getTracksSummary(userId),
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
    res.status(200).json(getUserStats(req.user.id))
  } catch (err) {
    next(err)
  }
})

router.patch('/progress/stats', (req, res, next) => {
  try {
    const userId = req.user.id
    const updates = allowedStatsUpdates.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    )

    if (updates.length > 0) {
      const assignments = updates.map((field) => `${field} = @${field}`).join(', ')
      const params = {
        user_id: userId,
      }

      for (const field of updates) {
        params[field] = req.body[field]
      }

      db.prepare(`UPDATE user_stats SET ${assignments} WHERE user_id = @user_id`).run(params)
    }

    res.status(200).json(getUserStats(userId))
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

function updateStreak(userId) {
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId)
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
    WHERE user_id = ?
  `).run(currentStreak, longestStreak, today, userId)
}

router.post('/progress/attempt', (req, res, next) => {
  try {
    const userId = req.user.id
    const { exercise_type, course_id, question_id, concept_id, score, time_taken_secs, was_correct } = req.body

    const result = db
      .prepare(`
        INSERT INTO exercise_attempts (
          user_id,
          exercise_type,
          course_id,
          question_id,
          concept_id,
          score,
          time_taken_secs,
          was_correct
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        userId,
        exercise_type,
        course_id,
        question_id ?? null,
        concept_id ?? null,
        score ?? null,
        time_taken_secs ?? null,
        was_correct ? 1 : 0,
      )

    const attempt = db.prepare('SELECT * FROM exercise_attempts WHERE id = ?').get(result.lastInsertRowid)

    // SM-2 Spaced Repetition update for flashcards in DB
    if (exercise_type === 'flashcard' && question_id) {
      let card = db.prepare(`
        SELECT 
          f.id,
          COALESCE(ufp.repetitions, 0) AS repetitions,
          COALESCE(ufp.interval_days, 1) AS interval_days,
          COALESCE(ufp.ease_factor, 2.5) AS ease_factor
        FROM flashcards f
        LEFT JOIN user_flashcard_progress ufp ON ufp.flashcard_id = f.id AND ufp.user_id = ?
        WHERE f.id = ?
      `).get(userId, question_id)

      if (card) {
        let q = 3
        if (score >= 1.0) q = 5
        else if (score >= 0.8) q = 4
        else if (score >= 0.5) q = 3
        else q = 1

        let reps = card.repetitions
        let interval = card.interval_days
        let ease = card.ease_factor

        if (q < 3) {
          reps = 0
          interval = 1
        } else {
          if (reps === 0) {
            interval = 1
          } else if (reps === 1) {
            interval = 6
          } else {
            interval = Math.round(interval * ease)
          }
          reps += 1
        }

        ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        if (ease < 1.3) ease = 1.3

        db.prepare(`
          INSERT INTO user_flashcard_progress (user_id, flashcard_id, repetitions, interval_days, ease_factor, next_review_date)
          VALUES (?, ?, ?, ?, ?, date('now', '+' || ? || ' days'))
          ON CONFLICT(user_id, flashcard_id) DO UPDATE SET
            repetitions = excluded.repetitions,
            interval_days = excluded.interval_days,
            ease_factor = excluded.ease_factor,
            next_review_date = excluded.next_review_date
        `).run(userId, question_id, reps, interval, ease, interval)
      }
    }

    const mastery = recalculateMastery(course_id, userId)
    updateStreak(userId)

    res.status(200).json({
      attempt,
      mastery,
    })
  } catch (err) {
    next(err)
  }
})

function countSessions(attempts, thresholdMs = 15 * 60 * 1000) {
  if (attempts.length === 0) return 0
  let sessions = 1
  let prevTime = new Date(attempts[0].attempted_at).getTime()
  for (let i = 1; i < attempts.length; i++) {
    const currTime = new Date(attempts[i].attempted_at).getTime()
    if (currTime - prevTime > thresholdMs) {
      sessions++
    }
    prevTime = currTime
  }
  return sessions
}

router.get('/progress/exercise-stats/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const course = db.prepare(`
      SELECT c.id, c.slug, t.slug as track_slug 
      FROM courses c
      JOIN tracks t ON t.id = c.track_id
      WHERE c.slug = ?
    `).get(courseSlug)

    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) ? process.env.CONTENT_FOLDER : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER;
    const exercisesDir = path.join(contentFolder, 'tracks', course.track_slug, course.slug, 'exercises')

    // 1. MCQ questions available (prioritize mcq.json on disk)
    let mcqAvailable = 0
    const mcqPath = path.join(exercisesDir, 'mcq.json')
    if (fs.existsSync(mcqPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'))
        mcqAvailable = (Array.isArray(d) ? d : (d.questions || [])).length
      } catch (e) {}
    } else {
      mcqAvailable = db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course.id).count
    }

    // 2. Flashcards available (prioritize flashcards.json on disk)
    let flashcardAvailable = 0
    const flashcardPath = path.join(exercisesDir, 'flashcards.json')
    if (fs.existsSync(flashcardPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(flashcardPath, 'utf-8'))
        flashcardAvailable = (Array.isArray(d) ? d : (d.cards || [])).length
      } catch (e) {}
    } else {
      flashcardAvailable = db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(course.id).count
    }

    // 3. FTB (concepts) available (prioritize ftb.json on disk)
    let ftbAvailable = 0
    const ftbPath = path.join(exercisesDir, 'ftb.json')
    if (fs.existsSync(ftbPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(ftbPath, 'utf-8'))
        ftbAvailable = (Array.isArray(d) ? d : (d.exercises || [])).length
      } catch (e) {}
    } else {
      ftbAvailable = db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course.id).count
    }

    // 4. Matching available (prioritize matching.json on disk)
    let matchingAvailable = 0
    const matchingPath = path.join(exercisesDir, 'matching.json')
    if (fs.existsSync(matchingPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(matchingPath, 'utf-8'))
        const rounds = Array.isArray(d) ? d : (d.rounds || [])
        let pairCount = 0
        for (const r of rounds) {
          pairCount += Math.min(5, (r.pairs || []).length)
        }
        if (pairCount > 0) {
          matchingAvailable = pairCount
        }
      } catch (e) {}
    } else {
      const dbConceptsCount = db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course.id).count
      if (dbConceptsCount >= 5) {
        const numRounds = Math.min(Math.ceil(dbConceptsCount / 5), 5)
        matchingAvailable = numRounds * 5
      }
    }

    // 5. Boss battle available (prioritize bossbattle.json on disk)
    let bossAvailable = 0
    const bossPath = path.join(exercisesDir, 'bossbattle.json')
    if (fs.existsSync(bossPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(bossPath, 'utf-8'))
        bossAvailable = (Array.isArray(d) ? d : (d.questions || [])).length
      } catch (e) {}
    } else {
      bossAvailable = db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course.id).count
    }

    // 6. Dataset challenges available
    let datasetAvailable = 0
    const challengePath = path.join(exercisesDir, 'challenge.json')
    if (fs.existsSync(challengePath)) {
      try {
        const d = JSON.parse(fs.readFileSync(challengePath, 'utf-8'))
        datasetAvailable = (Array.isArray(d) ? d : (d.challenges || [])).length
      } catch (e) {}
    }
    if (datasetAvailable === 0) {
      try {
        const challenges = getChallenges(course.slug)
        datasetAvailable = (challenges || []).length
      } catch (e) {}
    }

    // Fetch all attempts for this course
    const attempts = db.prepare(`
      SELECT exercise_type, question_id, was_correct, attempted_at
      FROM exercise_attempts
      WHERE course_id = ? AND user_id = ?
      ORDER BY attempted_at ASC
    `).all(course.id, req.user.id)

    const stats = {
      mcq: { sessions: 0, attempted: 0, correct: 0, wrong: 0, available: mcqAvailable, unattempted: mcqAvailable },
      flashcard: { sessions: 0, attempted: 0, correct: 0, wrong: 0, available: flashcardAvailable, unattempted: flashcardAvailable },
      ftb: { sessions: 0, attempted: 0, correct: 0, wrong: 0, available: ftbAvailable, unattempted: ftbAvailable },
      matching: { sessions: 0, attempted: 0, correct: 0, wrong: 0, available: matchingAvailable, unattempted: matchingAvailable },
      boss_battle: { sessions: 0, attempted: 0, correct: 0, wrong: 0, available: bossAvailable, unattempted: bossAvailable },
      dataset: { sessions: 0, attempted: 0, correct: 0, wrong: 0, available: datasetAvailable, unattempted: datasetAvailable }
    }

    const uniqueQuestionsMap = {
      quiz: new Set(),
      flashcard: new Set(),
      fillblank: new Set(),
      matching: new Set(),
      bossbattle: new Set(),
      dataset: new Set()
    }

    const attemptsByType = {
      quiz: [],
      flashcard: [],
      fillblank: [],
      matching: [],
      bossbattle: [],
      dataset: []
    }

    for (const a of attempts) {
      if (attemptsByType[a.exercise_type]) {
        attemptsByType[a.exercise_type].push(a)
      }
      if (a.question_id !== null && uniqueQuestionsMap[a.exercise_type]) {
        uniqueQuestionsMap[a.exercise_type].add(String(a.question_id))
      }
    }

    const typeMapping = {
      quiz: 'mcq',
      flashcard: 'flashcard',
      fillblank: 'ftb',
      matching: 'matching',
      bossbattle: 'boss_battle',
      dataset: 'dataset'
    }

    for (const type of Object.keys(typeMapping)) {
      const key = typeMapping[type]
      const typeAttempts = attemptsByType[type] || []
      const uniqueSet = uniqueQuestionsMap[type] || new Set()
      
      let sessions = countSessions(typeAttempts)
      const attempted = typeAttempts.length
      const correct = typeAttempts.filter(a => a.was_correct === 1).length
      const wrong = attempted - correct

      if (key === 'matching') {
        sessions = attempted > 0 ? Math.max(1, Math.floor(correct / 5)) : 0
      } else if (key === 'dataset') {
        sessions = uniqueSet.size
      }

      if (stats[key]) {
        stats[key].sessions = sessions
        stats[key].attempted = attempted
        stats[key].correct = correct
        stats[key].wrong = wrong
        
        const availableCount = stats[key].available
        stats[key].unattempted = Math.max(0, availableCount - uniqueSet.size)
      }
    }

    res.json(stats)
  } catch (err) {
    next(err)
  }
})

router.post('/progress/reset', (req, res, next) => {
  try {
    const userId = req.user.id
    const { type, targetId } = req.body

    if (!['course', 'track', 'category', 'all'].includes(type)) {
      res.status(400).json({ error: 'Invalid reset type' })
      return
    }

    db.transaction(() => {
      if (type === 'course') {
        const courseId = Number(targetId)
        db.prepare('DELETE FROM exercise_attempts WHERE course_id = ? AND user_id = ?').run(courseId, userId)
        db.prepare('DELETE FROM mastery_scores WHERE course_id = ? AND user_id = ?').run(courseId, userId)
        
        // Reset user course state
        const hasCourse = db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(userId, courseId)
        if (hasCourse) {
          db.prepare("UPDATE user_courses SET status = 'Not Started', notes = NULL, reviewed = 'No', difficulty = 'Unknown' WHERE user_id = ? AND course_id = ?").run(userId, courseId)
        }
        
        db.prepare(`
          DELETE FROM user_flashcard_progress 
          WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)
        `).run(userId, courseId)
        db.prepare(`
          DELETE FROM spaced_repetition_queue 
          WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)
        `).run(userId, courseId)
      } else if (type === 'track') {
        const trackId = Number(targetId)
        const courses = db.prepare('SELECT id FROM courses WHERE track_id = ?').all(trackId)
        const courseIds = courses.map(c => c.id)
        if (courseIds.length > 0) {
          const placeholders = courseIds.map(() => '?').join(',')
          
          db.prepare(`DELETE FROM exercise_attempts WHERE user_id = ? AND course_id IN (${placeholders})`).run(userId, ...courseIds)
          db.prepare(`DELETE FROM mastery_scores WHERE user_id = ? AND course_id IN (${placeholders})`).run(userId, ...courseIds)
          
          for (const cid of courseIds) {
            db.prepare("UPDATE user_courses SET status = 'Not Started', notes = NULL, reviewed = 'No', difficulty = 'Unknown' WHERE user_id = ? AND course_id = ?").run(userId, cid)
          }

          db.prepare(`
            DELETE FROM user_flashcard_progress 
            WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id IN (${placeholders}))
          `).run(userId, ...courseIds)
          db.prepare(`
            DELETE FROM spaced_repetition_queue 
            WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id IN (${placeholders}))
          `).run(userId, ...courseIds)
        }
      } else if (type === 'category') {
        const category = String(targetId)
        const tracks = db.prepare('SELECT id FROM tracks WHERE LOWER(language) = LOWER(?)').all(category)
        const trackIds = tracks.map(t => t.id)
        if (trackIds.length > 0) {
          const trackPlaceholders = trackIds.map(() => '?').join(',')
          const courses = db.prepare(`SELECT id FROM courses WHERE track_id IN (${trackPlaceholders})`).all(...trackIds)
          const courseIds = courses.map(c => c.id)
          if (courseIds.length > 0) {
            const placeholders = courseIds.map(() => '?').join(',')
            
            db.prepare(`DELETE FROM exercise_attempts WHERE user_id = ? AND course_id IN (${placeholders})`).run(userId, ...courseIds)
            db.prepare(`DELETE FROM mastery_scores WHERE user_id = ? AND course_id IN (${placeholders})`).run(userId, ...courseIds)
            
            for (const cid of courseIds) {
              db.prepare("UPDATE user_courses SET status = 'Not Started', notes = NULL, reviewed = 'No', difficulty = 'Unknown' WHERE user_id = ? AND course_id = ?").run(userId, cid)
            }

            db.prepare(`
              DELETE FROM user_flashcard_progress 
              WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id IN (${placeholders}))
            `).run(userId, ...courseIds)
            db.prepare(`
              DELETE FROM spaced_repetition_queue 
              WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id IN (${placeholders}))
            `).run(userId, ...courseIds)
          }
        }
      } else if (type === 'all') {
        db.prepare('DELETE FROM exercise_attempts WHERE user_id = ?').run(userId)
        db.prepare('DELETE FROM mastery_scores WHERE user_id = ?').run(userId)
        db.prepare('DELETE FROM user_courses WHERE user_id = ?').run(userId)
        db.prepare('DELETE FROM user_tracks WHERE user_id = ?').run(userId)
        db.prepare('DELETE FROM user_flashcard_progress WHERE user_id = ?').run(userId)
        db.prepare('DELETE FROM spaced_repetition_queue WHERE user_id = ?').run(userId)
        
        db.prepare(`
          UPDATE user_stats 
          SET total_xp = 0, level = 'Beginner', current_streak = 0, longest_streak = 0, last_active_date = NULL, badges_json = '[]' 
          WHERE user_id = ?
        `).run(userId)
      }
    })()

    res.status(200).json({ success: true, message: `Successfully reset progress for type: ${type}` })
  } catch (err) {
    next(err)
  }
})

router.get('/progress/course-concepts-mastery/:courseId', (req, res, next) => {
  try {
    const courseId = Number(req.params.courseId)
    const concepts = db.prepare('SELECT id, name, definition, category, difficulty FROM concepts WHERE course_id = ?').all(courseId)
    const attempts = db.prepare('SELECT * FROM exercise_attempts WHERE course_id = ? AND user_id = ?').all(courseId, req.user.id)
    
    const attemptsByConceptAndType = {}
    for (const a of attempts) {
      if (!a.concept_id) continue
      let key = String(a.concept_id)
      if (/^\d+$/.test(key)) {
        key = `concept_${key.padStart(3, '0')}`
      }
      
      if (!attemptsByConceptAndType[key]) {
        attemptsByConceptAndType[key] = {}
      }
      if (!attemptsByConceptAndType[key][a.exercise_type]) {
        attemptsByConceptAndType[key][a.exercise_type] = []
      }
      attemptsByConceptAndType[key][a.exercise_type].push(a)
    }

    const conceptsWithMastery = concepts.map(c => {
      const key = `concept_${String(c.id).padStart(3, '0')}`
      const typesWithAttempts = attemptsByConceptAndType[key]
      
      let bestMastery = 0
      let totalAttempts = 0
      let totalCorrect = 0
      
      if (typesWithAttempts) {
        for (const type in typesWithAttempts) {
          const typeAttempts = typesWithAttempts[type]
          const correct = typeAttempts.filter(a => a.was_correct === 1).length
          const wrong = typeAttempts.length - correct
          totalAttempts += typeAttempts.length
          totalCorrect += correct
          
          let itemMastery = 0
          if (correct > 0) {
            itemMastery = correct / (correct + 0.5 * wrong)
          }
          if (itemMastery > bestMastery) {
            bestMastery = itemMastery
          }
        }
      }
      
      return {
        ...c,
        key,
        mastery: Math.round(bestMastery * 100),
        attempts: totalAttempts,
        correct: totalCorrect
      }
    })
    
    res.status(200).json(conceptsWithMastery)
  } catch (err) {
    next(err)
  }
})

router.get('/progress/due-flashcards', (req, res, next) => {
  try {
    const userId = req.user.id
    const dueCards = db.prepare(`
      SELECT f.*, c.name AS course_name, c.slug AS course_slug,
             COALESCE(ufp.next_review_date, date('now')) AS next_review_date
      FROM flashcards f
      JOIN courses c ON c.id = f.course_id
      LEFT JOIN user_flashcard_progress ufp ON ufp.flashcard_id = f.id AND ufp.user_id = ?
      WHERE COALESCE(ufp.next_review_date, date('now')) <= date('now')
      ORDER BY COALESCE(ufp.next_review_date, date('now')) ASC
    `).all(userId)
    res.status(200).json(dueCards)
  } catch (err) {
    next(err)
  }
})

export default router

