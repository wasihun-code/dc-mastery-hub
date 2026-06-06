import express from 'express'
import db from '../db/database.js'

const router = express.Router()

const trackSummarySelect = `
  SELECT
    t.*,
    COUNT(c.id) AS course_count,
    SUM(CASE WHEN c.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
    ROUND(COALESCE(AVG(ms.overall_mastery), 0), 1) AS overall_mastery
  FROM tracks t
  LEFT JOIN courses c ON c.track_id = t.id
  LEFT JOIN mastery_scores ms ON ms.course_id = c.id
`

router.get('/tracks', (req, res, next) => {
  try {
    const tracks = db
      .prepare(`
        ${trackSummarySelect}
        GROUP BY t.id
        ORDER BY t.id
      `)
      .all()

    res.status(200).json(tracks)
  } catch (err) {
    next(err)
  }
})

router.get('/tracks/:slug', (req, res, next) => {
  try {
    const track = db
      .prepare(`
        ${trackSummarySelect}
        WHERE t.slug = ?
        GROUP BY t.id
      `)
      .get(req.params.slug)

    if (!track) {
      res.status(404).json({ error: 'Track not found' })
      return
    }

    const courses = db
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
        WHERE c.track_id = ?
        ORDER BY c.order_in_track
      `)
      .all(track.id)

    res.status(200).json({
      ...track,
      courses,
    })
  } catch (err) {
    next(err)
  }
})

export default router
