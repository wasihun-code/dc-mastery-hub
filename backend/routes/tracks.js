import express from 'express'
import db from '../db/database.pg.js'

const router = express.Router()

router.get('/tracks', async (req, res, next) => {
  try {
    const userId = req.user.id
    const tracks = await db
      .prepare(`
        SELECT
          t.id,
          t.slug,
          t.name,
          t.description,
          t.language,
          t.color,
          t.created_at,
          COALESCE(ut.is_deleted, false) AS is_deleted,
          COALESCE(ut.is_archived, false) AS is_archived,
          COUNT(c.id) AS course_count,
          SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
          SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
          ROUND(CAST(AVG(COALESCE(ms.overall_mastery, 0)) AS numeric), 1) AS overall_mastery
        FROM tracks t
        LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = ?
        LEFT JOIN track_courses tc ON tc.track_id = t.id
        LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), false) = false AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), false) = false
        LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
        LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
        WHERE COALESCE(ut.is_deleted, false) = false AND COALESCE(ut.is_archived, false) = false
        GROUP BY t.id, ut.is_deleted, ut.is_archived
        ORDER BY t.id
      `)
      .all(userId, userId, userId, userId, userId)

    res.status(200).json(tracks.map(t => ({
      ...t,
      course_count: parseInt(t.course_count || 0, 10),
      completed_count: parseInt(t.completed_count || 0, 10),
      in_progress_count: parseInt(t.in_progress_count || 0, 10),
      overall_mastery: parseFloat(t.overall_mastery || 0)
    })))
  } catch (err) {
    next(err)
  }
})

router.get('/tracks/:slug', async (req, res, next) => {
  try {
    const userId = req.user.id
    const track = await db
      .prepare(`
        SELECT
          t.id,
          t.slug,
          t.name,
          t.description,
          t.language,
          t.color,
          t.created_at,
          COALESCE(ut.is_deleted, false) AS is_deleted,
          COALESCE(ut.is_archived, false) AS is_archived,
          COUNT(c.id) AS course_count,
          SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
          SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
          ROUND(CAST(AVG(COALESCE(ms.overall_mastery, 0)) AS numeric), 1) AS overall_mastery
        FROM tracks t
        LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = ?
        LEFT JOIN track_courses tc ON tc.track_id = t.id
        LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), false) = false AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), false) = false
        LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
        LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
        WHERE t.slug = ? AND COALESCE(ut.is_deleted, false) = false AND COALESCE(ut.is_archived, false) = false
        GROUP BY t.id, ut.is_deleted, ut.is_archived
      `)
      .get(userId, userId, userId, userId, userId, req.params.slug)

    if (!track) {
      res.status(404).json({ error: 'Track not found' })
      return
    }

    track.course_count = parseInt(track.course_count || 0, 10)
    track.completed_count = parseInt(track.completed_count || 0, 10)
    track.in_progress_count = parseInt(track.in_progress_count || 0, 10)
    track.overall_mastery = parseFloat(track.overall_mastery || 0)

    const coursesRes = await db
      .prepare(`
        SELECT
          c.id,
          c.slug,
          c.name,
          tc.track_id,
          tc.order_in_track,
          c.has_pdf,
          c.has_glossary,
          c.created_at,
          COALESCE(uc.status, 'Not Started') AS status,
          COALESCE(uc.difficulty, c.difficulty) AS difficulty,
          COALESCE(uc.notes, c.notes) AS notes,
          COALESCE(uc.reviewed, c.reviewed) AS reviewed,
          COALESCE(uc.is_deleted, false) AS is_deleted,
          COALESCE(uc.is_archived, false) AS is_archived,
          ms.overall_mastery,
          ms.flashcard_score,
          ms.quiz_score,
          ms.code_score,
          ms.dataset_score,
          (SELECT COUNT(*) FROM quiz_questions WHERE course_id = c.id) AS quiz_question_count
        FROM courses c
        JOIN track_courses tc ON tc.course_id = c.id
        LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
        LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
        WHERE tc.track_id = ? AND COALESCE(uc.is_deleted, false) = false AND COALESCE(uc.is_archived, false) = false
        ORDER BY tc.order_in_track
      `)
      .all(userId, userId, track.id)

    const courses = coursesRes.map(c => ({
      ...c,
      quiz_question_count: parseInt(c.quiz_question_count || 0, 10)
    }))

    res.status(200).json({
      ...track,
      courses,
    })
  } catch (err) {
    next(err)
  }
})

export default router

