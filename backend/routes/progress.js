import express from 'express'
import db from '../db/database.js'

const router = express.Router()
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

function recalculateMastery(courseId) {
  const flashcardScore = scoreForExerciseType(courseId, "exercise_type = 'flashcard'")
  const quizScore = scoreForExerciseType(courseId, "exercise_type = 'quiz'")
  const codeScore = scoreForExerciseType(courseId, "exercise_type IN ('fillblank', 'dataset')")
  const datasetScore = scoreForExerciseType(courseId, "exercise_type = 'dataset'")
  const overallMastery =
    flashcardScore * 0.2 + quizScore * 0.3 + codeScore * 0.3 + datasetScore * 0.2

  db.prepare(`
    INSERT INTO mastery_scores (
      course_id,
      flashcard_score,
      quiz_score,
      code_score,
      dataset_score,
      overall_mastery,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(course_id) DO UPDATE SET
      flashcard_score = excluded.flashcard_score,
      quiz_score = excluded.quiz_score,
      code_score = excluded.code_score,
      dataset_score = excluded.dataset_score,
      overall_mastery = excluded.overall_mastery,
      updated_at = excluded.updated_at
  `).run(courseId, flashcardScore, quizScore, codeScore, datasetScore, overallMastery)

  return db.prepare('SELECT * FROM mastery_scores WHERE course_id = ?').get(courseId)
}

router.get('/progress/dashboard', (req, res, next) => {
  try {
    const weakSpots = db
      .prepare(`
        SELECT
          qq.concept_id,
          con.name AS concept_name,
          crs.name AS course_name,
          COUNT(*) AS attempt_count,
          ROUND(CAST(SUM(ea.was_correct) AS REAL) / COUNT(*), 3) AS correct_rate
        FROM exercise_attempts ea
        JOIN quiz_questions qq ON qq.id = ea.question_id
        JOIN concepts con ON con.id = qq.concept_id
        JOIN courses crs ON crs.id = ea.course_id
        WHERE qq.concept_id IS NOT NULL
        GROUP BY qq.concept_id
        HAVING COUNT(*) >= 3
        ORDER BY correct_rate ASC
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

    res.status(200).json({
      user_stats: getUserStats(),
      tracks_summary: getTracksSummary(),
      weak_spots: weakSpots,
      recent_activity: recentActivity,
      due_flashcards_count: dueFlashcardsCount,
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

    res.status(200).json({
      attempt,
      mastery,
    })
  } catch (err) {
    next(err)
  }
})

export default router
