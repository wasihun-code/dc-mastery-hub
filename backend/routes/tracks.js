import express from 'express'
import db from '../db/database.js'

const router = express.Router()

router.get('/tracks', (req, res, next) => {
  try {
    const userId = req.user.id
    const tracks = db
      .prepare(`
        SELECT
          t.id,
          t.slug,
          t.name,
          t.description,
          t.language,
          t.color,
          t.created_at,
          COALESCE(ut.is_deleted, 0) AS is_deleted,
          COALESCE(ut.is_archived, 0) AS is_archived,
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

    res.status(200).json(tracks)
  } catch (err) {
    next(err)
  }
})

router.get('/tracks/:slug', (req, res, next) => {
  try {
    const userId = req.user.id
    const track = db
      .prepare(`
        SELECT
          t.id,
          t.slug,
          t.name,
          t.description,
          t.language,
          t.color,
          t.created_at,
          COALESCE(ut.is_deleted, 0) AS is_deleted,
          COALESCE(ut.is_archived, 0) AS is_archived,
          COUNT(c.id) AS course_count,
          SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
          SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
          ROUND(COALESCE(AVG(ms.overall_mastery), 0), 1) AS overall_mastery
        FROM tracks t
        LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = ?
        LEFT JOIN courses c ON c.track_id = t.id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0
        LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
        LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
        WHERE t.slug = ? AND COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0
        GROUP BY t.id
      `)
      .get(userId, userId, userId, userId, userId, req.params.slug)

    if (!track) {
      res.status(404).json({ error: 'Track not found' })
      return
    }

    const courses = db
      .prepare(`
        SELECT
          c.id,
          c.slug,
          c.name,
          c.track_id,
          c.order_in_track,
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
          (SELECT COUNT(*) FROM quiz_questions WHERE course_id = c.id) AS quiz_question_count
        FROM courses c
        LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
        LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
        WHERE c.track_id = ? AND COALESCE(uc.is_deleted, 0) = 0 AND COALESCE(uc.is_archived, 0) = 0
        ORDER BY c.order_in_track
      `)
      .all(userId, userId, track.id)

    res.status(200).json({
      ...track,
      courses,
    })
  } catch (err) {
    next(err)
  }
})

export default router
