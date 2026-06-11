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
  // 1. Get counts of available content in the course
  const course = db.prepare('SELECT id, slug, track_id FROM courses WHERE id = ?').get(courseId)
  if (!course) return null

  const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
  const trackSlug = track ? track.slug : ''

  let conceptCount = db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(courseId).count
  let flashcardCount = db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(courseId).count
  let quizQuestionCount = db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(courseId).count

  // Fallback to JSON counts if database is empty
  const contentFolder = process.env.CONTENT_FOLDER 
    ? (path.isAbsolute(process.env.CONTENT_FOLDER) ? process.env.CONTENT_FOLDER : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
    : DEFAULT_CONTENT_FOLDER;

  if (quizQuestionCount === 0) {
    const mcqPath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'mcq.json');
    if (fs.existsSync(mcqPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'));
        quizQuestionCount = (Array.isArray(data) ? data : (data.questions || [])).length;
      } catch (e) {}
    }
  }
  if (flashcardCount === 0) {
    const fcPath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'flashcards.json');
    if (fs.existsSync(fcPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(fcPath, 'utf-8'));
        flashcardCount = (Array.isArray(data) ? data : (data.cards || [])).length;
      } catch (e) {}
    }
  }
  if (conceptCount === 0) {
    const ftbPath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'ftb.json');
    if (fs.existsSync(ftbPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(ftbPath, 'utf-8'));
        conceptCount = (Array.isArray(data) ? data : (data.exercises || [])).length;
      } catch (e) {}
    }
  }

  // Get dataset challenges count
  let datasetChallengeCount = 0;
  try {
    const challengePath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'challenge.json');
    if (fs.existsSync(challengePath)) {
      const data = JSON.parse(fs.readFileSync(challengePath, 'utf-8'));
      const challenges = Array.isArray(data) ? data : (data.challenges || []);
      datasetChallengeCount = challenges.length;
    } else {
      const datasetChallenges = getChallenges(course.slug);
      datasetChallengeCount = datasetChallenges.length;
    }
  } catch (e) {
    console.error("Error getting dataset challenges:", e);
  }

  // Get lists of IDs from DB, or fallback to JSON files
  let flashcardIds = db.prepare('SELECT id FROM flashcards WHERE course_id = ?').all(courseId).map(fc => fc.id)
  if (flashcardIds.length === 0 && flashcardCount > 0) {
    const fcPath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'flashcards.json')
    if (fs.existsSync(fcPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(fcPath, 'utf-8'))
        const cards = Array.isArray(data) ? data : (data.cards || [])
        flashcardIds = cards.map(c => c.id)
      } catch (e) {}
    }
  }

  let quizIds = db.prepare('SELECT id FROM quiz_questions WHERE course_id = ?').all(courseId).map(q => q.id)
  if (quizIds.length === 0 && quizQuestionCount > 0) {
    const mcqPath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'mcq.json')
    if (fs.existsSync(mcqPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'))
        const questions = Array.isArray(data) ? data : (data.questions || [])
        quizIds = questions.map(q => q.id)
      } catch (e) {}
    }
  }

  let conceptIds = db.prepare('SELECT id FROM concepts WHERE course_id = ?').all(courseId).map(c => c.id)
  if (conceptIds.length === 0 && conceptCount > 0) {
    const ftbPath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'ftb.json')
    if (fs.existsSync(ftbPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(ftbPath, 'utf-8'))
        const exercises = Array.isArray(data) ? data : (data.exercises || [])
        conceptIds = exercises.map(ex => ex.id)
      } catch (e) {}
    }
  }

  let bossIds = db.prepare('SELECT id FROM quiz_questions WHERE course_id = ?').all(courseId).map(q => q.id)
  if (bossIds.length === 0 && quizQuestionCount > 0) {
    const bossPath = path.join(contentFolder, 'tracks', trackSlug, course.slug, 'exercises', 'bossbattle.json')
    if (fs.existsSync(bossPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(bossPath, 'utf-8'))
        const questions = Array.isArray(data) ? data : (data.questions || [])
        bossIds = questions.map(q => q.id)
      } catch (e) {}
    }
  }

  // 2. Fetch all attempts for this course
  const attempts = db.prepare('SELECT * FROM exercise_attempts WHERE course_id = ?').all(courseId)

  // Group attempts by type
  const attemptsByType = {}
  for (const att of attempts) {
    const type = att.exercise_type
    if (!attemptsByType[type]) {
      attemptsByType[type] = []
    }
    attemptsByType[type].push(att)
  }

  // Calculate Flashcards Score
  let flashcardScore = 0
  if (flashcardCount > 0) {
    const fcAtts = attemptsByType['flashcard'] || []
    let sumItemMastery = 0
    const attsByCard = {}
    for (const att of fcAtts) {
      if (att.question_id) {
        if (!attsByCard[att.question_id]) attsByCard[att.question_id] = []
        attsByCard[att.question_id].push(att)
      }
    }
    for (const fcId of flashcardIds) {
      const cardAtts = attsByCard[fcId] || []
      if (cardAtts.length > 0) {
        const correct = cardAtts.filter(a => a.was_correct === 1).length
        const wrong = cardAtts.length - correct
        if (correct > 0) {
          sumItemMastery += correct / (correct + 0.5 * wrong)
        }
      }
    }
    flashcardScore = (sumItemMastery / flashcardCount) * 100
  }

  // Calculate Quiz Score
  let quizScore = 0
  if (quizQuestionCount > 0) {
    const quizAtts = attemptsByType['quiz'] || []
    let sumQuizMastery = 0
    const attsByQuiz = {}
    for (const att of quizAtts) {
      if (att.question_id) {
        if (!attsByQuiz[att.question_id]) attsByQuiz[att.question_id] = []
        attsByQuiz[att.question_id].push(att)
      }
    }
    for (const qId of quizIds) {
      const qAtts = attsByQuiz[qId] || []
      if (qAtts.length > 0) {
        const correct = qAtts.filter(a => a.was_correct === 1).length
        const wrong = qAtts.length - correct
        if (correct > 0) {
          sumQuizMastery += correct / (correct + 0.5 * wrong)
        }
      }
    }
    quizScore = (sumQuizMastery / quizQuestionCount) * 100
  }

  // Calculate Fill-in-the-Blank Score (code_score)
  let codeScore = 0
  if (conceptCount > 0) {
    const ftbAtts = attemptsByType['fillblank'] || []
    let sumFtbMastery = 0
    const attsByFtb = {}
    for (const att of ftbAtts) {
      if (att.question_id) {
        if (!attsByFtb[att.question_id]) attsByFtb[att.question_id] = []
        attsByFtb[att.question_id].push(att)
      }
    }
    for (const cId of conceptIds) {
      const cAtts = attsByFtb[cId] || []
      if (cAtts.length > 0) {
        const correct = cAtts.filter(a => a.was_correct === 1).length
        const wrong = cAtts.length - correct
        if (correct > 0) {
          sumFtbMastery += correct / (correct + 0.5 * wrong)
        }
      }
    }
    codeScore = (sumFtbMastery / conceptCount) * 100
  }

  // Calculate Dataset Score
  let datasetScore = 0
  if (datasetChallengeCount > 0) {
    const dsAtts = attemptsByType['dataset'] || []
    let sumDsMastery = 0
    const attsByDs = {}
    for (const att of dsAtts) {
      const rawId = att.question_id
      const parsedId = rawId ? (parseInt(String(rawId).replace(/\D/g, ''), 10) || 1) : 1
      if (!attsByDs[parsedId]) attsByDs[parsedId] = []
      attsByDs[parsedId].push(att)
    }
    for (let i = 1; i <= datasetChallengeCount; i++) {
      const qAtts = attsByDs[i] || []
      if (qAtts.length > 0) {
        const correct = qAtts.filter(a => a.was_correct === 1).length
        const wrong = qAtts.length - correct
        if (correct > 0) {
          sumDsMastery += correct / (correct + 0.5 * wrong)
        }
      }
    }
    datasetScore = (sumDsMastery / datasetChallengeCount) * 100
  }

  // Calculate Matching Score (accuracy + speed)
  let matchingScore = 0
  const matchAtts = attemptsByType['matching'] || []
  if (conceptCount > 0 && matchAtts.length > 0) {
    let sumMatchingScore = 0
    for (const att of matchAtts) {
      const accuracy = att.score !== null ? att.score : 1.0
      const normAccuracy = accuracy > 1.0 ? accuracy / 100 : accuracy
      const time = att.time_taken_secs
      const speedFactor = time !== null ? Math.max(0, Math.min(1, (180 - time) / 120)) : 0.5
      sumMatchingScore += normAccuracy * (0.6 + 0.4 * speedFactor)
    }
    matchingScore = (sumMatchingScore / matchAtts.length) * 100
  }

  // Calculate Boss Battle Score (accuracy + speed)
  let bossScore = 0
  if (quizQuestionCount > 0) {
    const bossAtts = attemptsByType['bossbattle'] || []
    let sumBossMastery = 0
    const attsByBoss = {}
    for (const att of bossAtts) {
      if (att.question_id) {
        if (!attsByBoss[att.question_id]) attsByBoss[att.question_id] = []
        attsByBoss[att.question_id].push(att)
      }
    }
    for (const qId of bossIds) {
      const qAtts = attsByBoss[qId] || []
      if (qAtts.length > 0) {
        const correctAtts = qAtts.filter(a => a.was_correct === 1)
        const wrong = qAtts.length - correctAtts.length

        if (correctAtts.length > 0) {
          let speedFactorSum = 0
          let speedCount = 0
          for (const a of correctAtts) {
            if (a.time_taken_secs !== null) {
              const sf = Math.max(0, Math.min(1, (15 - a.time_taken_secs) / 11))
              speedFactorSum += sf
              speedCount++
            }
          }
          const avgSpeedFactor = speedCount > 0 ? (speedFactorSum / speedCount) : 0.5
          const weightedCorrect = correctAtts.length * (0.7 + 0.3 * avgSpeedFactor)
          sumBossMastery += weightedCorrect / (weightedCorrect + 0.5 * wrong)
        }
      }
    }
    bossScore = (sumBossMastery / quizQuestionCount) * 100
  }

  // 3. Compute weighted overall mastery based on availability
  // Weights: flashcard (0.15), quiz (0.20), code/fillblank (0.20), dataset (0.15), matching (0.15), boss (0.15)
  const weights = {
    flashcard: flashcardCount > 0 ? 0.15 : 0,
    quiz: quizQuestionCount > 0 ? 0.20 : 0,
    code: conceptCount > 0 ? 0.20 : 0,
    dataset: datasetChallengeCount > 0 ? 0.15 : 0,
    matching: conceptCount > 0 ? 0.15 : 0,
    boss: quizQuestionCount > 0 ? 0.15 : 0
  }

  const scores = {
    flashcard: flashcardScore,
    quiz: quizScore,
    code: codeScore,
    dataset: datasetScore,
    matching: matchingScore,
    boss: bossScore
  }

  let weightedSum = 0
  let totalWeight = 0
  for (const type in weights) {
    weightedSum += scores[type] * weights[type]
    totalWeight += weights[type]
  }

  const overallMastery = totalWeight > 0 ? (weightedSum / totalWeight) : 0

  // 4. Update the database
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
    const { exercise_type, course_id, question_id, score, time_taken_secs, was_correct } = req.body

    const result = db
      .prepare(`
        INSERT INTO exercise_attempts (
          exercise_type,
          course_id,
          question_id,
          score,
          time_taken_secs,
          was_correct
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        exercise_type,
        course_id,
        question_id ?? null,
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

export default router
