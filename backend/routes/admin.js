import express from 'express'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.pg.js'
import config from '../config.js'
import requireAdmin from '../middleware/requireAdmin.js'
import { importJsonExercises } from '../db/jsonImporter.js'
import { scanContent } from '../services/contentScanner.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

router.use(requireAdmin)

function verifyPassword(password, salt, hash) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

const log = (action, extra = {}) => {
  console.log(`[ADMIN] action=${action} ${Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ')}`)
}

// ─── DASHBOARD ───

router.get('/admin/stats', async (req, res, next) => {
  try {
    const userCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count)
    const trackCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM tracks').get()).count)
    const courseCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM courses').get()).count)
    const conceptCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM concepts').get()).count)
    const flashcardCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM flashcards').get()).count)
    const quizCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM quiz_questions').get()).count)
    const attemptCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts').get()).count)
    const sessionCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM sessions').get()).count)
    const totalXp = parseInt((await db.prepare('SELECT COALESCE(SUM(total_xp), 0) AS total FROM user_stats').get()).total)
    const adminCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM users WHERE is_admin = true').get()).count)
    const masteryCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM mastery_scores').get()).count)

    log('view_stats', { users: userCount, tracks: trackCount, courses: courseCount })
    res.json({ users: userCount, admins: adminCount, tracks: trackCount, courses: courseCount, concepts: conceptCount, flashcards: flashcardCount, quiz_questions: quizCount, exercise_attempts: attemptCount, sessions: sessionCount, total_xp: totalXp, mastery_scores: masteryCount })
  } catch (err) { next(err) }
})

// ─── TRACKS ───

router.get('/admin/tracks', async (req, res, next) => {
  try {
    const tracks = await db.prepare(`
      SELECT t.*,
             (SELECT COUNT(*) FROM track_courses tc WHERE tc.track_id = t.id) AS course_count,
             (SELECT COUNT(*) FROM track_courses tc JOIN courses c ON c.id = tc.course_id WHERE tc.track_id = t.id AND c.is_deleted = false AND c.is_archived = false) AS active_course_count
      FROM tracks t ORDER BY t.id ASC
    `).all()
    for (const track of tracks) {
      track.course_count = parseInt(track.course_count || 0)
      track.active_course_count = parseInt(track.active_course_count || 0)
      track.courses = await db.prepare(`
        SELECT c.id, c.slug, c.name, c.difficulty, c.status, c.is_deleted, c.is_archived, tc.order_in_track
        FROM track_courses tc JOIN courses c ON c.id = tc.course_id
        WHERE tc.track_id = ? ORDER BY tc.order_in_track ASC
      `).all(track.id)
    }
    log('list_tracks', { count: tracks.length })
    res.json({ tracks })
  } catch (err) { next(err) }
})

router.post('/admin/tracks', async (req, res, next) => {
  try {
    const { name, slug, description, language, color } = req.body
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' })
    const existing = await db.prepare('SELECT id FROM tracks WHERE slug = ?').get(slug)
    if (existing) return res.status(409).json({ error: 'Slug already exists' })
    const result = await db.prepare('INSERT INTO tracks (name, slug, description, language, color) VALUES (?, ?, ?, ?, ?)').run(name, slug, description || '', language || 'Python', color || '#03ef62')
    const track = await db.prepare('SELECT * FROM tracks WHERE id = ?').get(result.lastInsertRowid)
    const trackFolder = path.join(config.CONTENT_PATH, 'tracks', slug)
    fs.mkdirSync(trackFolder, { recursive: true })
    fs.writeFileSync(path.join(trackFolder, 'track.json'), JSON.stringify({ slug, name, language: language || 'Python' }, null, 2), 'utf-8')
    log('create_track', { track_id: track.id, slug })
    res.json({ success: true, track })
  } catch (err) { next(err) }
})

router.patch('/admin/tracks/:id', async (req, res, next) => {
  try {
    const trackId = Number(req.params.id)
    const track = await db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId)
    if (!track) return res.status(404).json({ error: 'Track not found' })
    const allowed = ['name', 'description', 'color', 'language', 'is_archived', 'is_deleted']
    const updates = []
    const values = []
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`)
        if (field === 'is_archived' || field === 'is_deleted') {
          values.push(req.body[field] ? true : false)
        } else {
          values.push(req.body[field])
        }
      }
    }
    if (updates.length > 0) {
      values.push(trackId)
      await db.prepare(`UPDATE tracks SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }
    log('update_track', { track_id: trackId })
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.delete('/admin/tracks/:id', async (req, res, next) => {
  try {
    const trackId = Number(req.params.id)
    const track = await db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId)
    if (!track) return res.status(404).json({ error: 'Track not found' })
    const hasCourses = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM track_courses tc JOIN courses c ON c.id = tc.course_id WHERE tc.track_id = ? AND c.is_deleted = false').get(trackId)).count)
    if (hasCourses > 0) return res.status(409).json({ error: 'Remove all courses from track first' })
    await db.transaction(async () => {
      await db.prepare('DELETE FROM track_courses WHERE track_id = ?').run(trackId)
      await db.prepare('DELETE FROM user_tracks WHERE track_id = ?').run(trackId)
      await db.prepare('DELETE FROM tracks WHERE id = ?').run(trackId)
    })()
    log('delete_track', { track_id: trackId })
    res.json({ success: true, deleted: trackId })
  } catch (err) { next(err) }
})

router.post('/admin/tracks/:id/archive', async (req, res, next) => {
  try {
    const trackId = Number(req.params.id)
    const track = await db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId)
    if (!track) return res.status(404).json({ error: 'Track not found' })
    await db.prepare('UPDATE tracks SET is_archived = true WHERE id = ?').run(trackId)
    log('archive_track', { track_id: trackId })
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.post('/admin/tracks/:id/restore', async (req, res, next) => {
  try {
    const trackId = Number(req.params.id)
    const track = await db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId)
    if (!track) return res.status(404).json({ error: 'Track not found' })
    await db.prepare('UPDATE tracks SET is_archived = false, is_deleted = false WHERE id = ?').run(trackId)
    log('restore_track', { track_id: trackId })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─── COURSES ───

router.get('/admin/courses', async (req, res, next) => {
  try {
    const { track_id, status } = req.query
    let where = '1=1'
    const params = []
    if (track_id) { where += ' AND tc_j.track_id = ?'; params.push(Number(track_id)) }
    if (status === 'deleted') { where += ' AND c.is_deleted = true' }
    else if (status === 'archived') { where += ' AND c.is_archived = true' }
    else if (status === 'active') { where += ' AND c.is_deleted = false AND c.is_archived = false' }

    const courses = await db.prepare(`
      SELECT c.*,
             (SELECT COALESCE(
               (SELECT json_agg(json_build_object('id', t.id, 'slug', t.slug, 'name', t.name))
                FROM track_courses tc2 JOIN tracks t ON t.id = tc2.track_id WHERE tc2.course_id = c.id),
              '[]'::json)
             ) AS tracks_json,
             (SELECT COUNT(*) FROM concepts co WHERE co.course_id = c.id) AS has_exercises,
             (SELECT COUNT(*) FROM user_courses uc2 WHERE uc2.course_id = c.id) AS student_count,
             (SELECT COALESCE(AVG(ms.overall_mastery), 0) FROM mastery_scores ms WHERE ms.course_id = c.id) AS mastery_avg
      FROM courses c
      LEFT JOIN track_courses tc_j ON tc_j.course_id = c.id
      WHERE ${where}
      GROUP BY c.id
      ORDER BY c.id ASC
    `).all(...params)

    for (const c of courses) {
      c.tracks = typeof c.tracks_json === 'string' ? JSON.parse(c.tracks_json) : (c.tracks_json || [])
      delete c.tracks_json
      c.has_exercises = parseInt(c.has_exercises) > 0 ? 1 : 0
    }
    log('list_courses', { count: courses.length })
    res.json({ courses })
  } catch (err) { next(err) }
})

router.put('/admin/courses/:id', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const course = await db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId)
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const allowed = ['name', 'slug', 'difficulty', 'status', 'reviewed']
    const updates = []
    const values = []
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(req.body[field])
      }
    }
    if (updates.length > 0) {
      values.push(courseId)
      await db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }
    log('update_course', { course_id: courseId })
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.delete('/admin/courses/:id', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const course = await db.prepare('SELECT id, slug FROM courses WHERE id = ?').get(courseId)
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const result = await db.transaction(async () => {
      const attempts = (await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ?').run(courseId)).changes
      const mastery = (await db.prepare('DELETE FROM mastery_scores WHERE course_id = ?').run(courseId)).changes
      const uc = (await db.prepare('DELETE FROM user_courses WHERE course_id = ?').run(courseId)).changes
      const srq = (await db.prepare('DELETE FROM spaced_repetition_queue WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)).changes
      const ufp = (await db.prepare('DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)).changes
      const fc = (await db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(courseId)).changes
      const qq = (await db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(courseId)).changes
      const concepts = (await db.prepare('DELETE FROM concepts WHERE course_id = ?').run(courseId)).changes
      const tc = (await db.prepare('DELETE FROM track_courses WHERE course_id = ?').run(courseId)).changes
      await db.prepare('DELETE FROM courses WHERE id = ?').run(courseId)
      return { attempts, mastery, user_courses: uc, spaced_repetition: srq, user_flashcard_progress: ufp, flashcards: fc, quiz_questions: qq, concepts, track_courses: tc }
    })()
    log('delete_course', { course_id: courseId, by: req.user.id })
    res.json({ success: true, courseId, cascadeDeleted: result })
  } catch (err) { next(err) }
})

router.post('/admin/courses/:id/clear-exercises', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    await db.transaction(async () => {
      await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ?').run(courseId)
      await db.prepare('DELETE FROM mastery_scores WHERE course_id = ?').run(courseId)
      await db.prepare('DELETE FROM spaced_repetition_queue WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)
      await db.prepare('DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)
      await db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(courseId)
      await db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(courseId)
      await db.prepare('DELETE FROM concepts WHERE course_id = ?').run(courseId)
      await db.prepare(`UPDATE user_courses SET status = 'Not Started' WHERE course_id = ?`).run(courseId)
    })()
    log('clear_exercises', { course_id: courseId })
    res.json({ success: true, message: 'All exercises cleared for course' })
  } catch (err) { next(err) }
})

router.post('/admin/courses/reorder', async (req, res, next) => {
  try {
    const { track_id, ordered_course_ids } = req.body
    if (!track_id || !Array.isArray(ordered_course_ids)) return res.status(400).json({ error: 'track_id and ordered_course_ids array required' })
    await db.transaction(async () => {
      for (let index = 0; index < ordered_course_ids.length; index++) {
        const courseId = ordered_course_ids[index]
        await db.prepare('UPDATE track_courses SET order_in_track = ? WHERE track_id = ? AND course_id = ?').run(index + 1, track_id, courseId)
      }
    })()
    log('reorder_courses', { track_id })
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.post('/admin/courses/:id/move-track', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const { from_track_id, to_track_id, order_in_track } = req.body
    if (!from_track_id || !to_track_id) return res.status(400).json({ error: 'from_track_id and to_track_id required' })
    await db.prepare('UPDATE track_courses SET track_id = ?, order_in_track = ? WHERE track_id = ? AND course_id = ?').run(to_track_id, order_in_track || 1, from_track_id, courseId)
    log('move_track', { course_id: courseId, from_track: from_track_id, to_track: to_track_id })
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.post('/admin/courses/:id/add-to-track', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const { track_id, order_in_track } = req.body
    if (!track_id) return res.status(400).json({ error: 'track_id required' })
    await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').run(track_id, courseId, order_in_track || 1)
    log('add_course_to_track', { course_id: courseId, track_id })
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.post('/admin/courses/:id/remove-from-track', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const { track_id } = req.body
    if (!track_id) return res.status(400).json({ error: 'track_id required' })
    await db.prepare('DELETE FROM track_courses WHERE track_id = ? AND course_id = ?').run(track_id, courseId)
    log('remove_course_from_track', { course_id: courseId, track_id })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─── EXERCISES ───

router.get('/admin/courses/:id/exercises/summary', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const course = await db.prepare('SELECT c.*, (SELECT tc.track_id FROM track_courses tc WHERE tc.course_id = c.id LIMIT 1) AS track_id FROM courses c WHERE id = ?').get(courseId)
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const concepts = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(courseId)).count)
    const flashcards = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(courseId)).count)
    const quiz_questions = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(courseId)).count)
    const total_attempts = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE course_id = ?').get(courseId)).count)
    const unique_students = parseInt((await db.prepare('SELECT COUNT(DISTINCT user_id) AS count FROM exercise_attempts WHERE course_id = ?').get(courseId)).count)
    let has_ftb_file = false, has_matching_file = false, has_bossbattle_file = false, has_challenge_file = false
    if (course.track_id) {
      const track = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
      if (track) {
        const exPath = path.join(config.CONTENT_PATH, 'tracks', track.slug, course.slug, 'exercises')
        has_ftb_file = fs.existsSync(path.join(exPath, 'ftb.json'))
        has_matching_file = fs.existsSync(path.join(exPath, 'matching.json'))
        has_bossbattle_file = fs.existsSync(path.join(exPath, 'bossbattle.json'))
        has_challenge_file = fs.existsSync(path.join(exPath, 'challenge.json'))
      }
    }
    res.json({ concepts, flashcards, quiz_questions, has_ftb_file, has_matching_file, has_bossbattle_file, has_challenge_file, total_attempts, unique_students })
  } catch (err) { next(err) }
})

router.post('/admin/courses/:id/exercises/reimport', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const course = await db.prepare('SELECT slug FROM courses WHERE id = ?').get(courseId)
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const result = importJsonExercises()
    log('reimport_course_exercises', { course_id: courseId })
    res.json({ success: true, imported: result })
  } catch (err) { next(err) }
})

router.delete('/admin/courses/:id/exercises/type/:exerciseType', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const { exerciseType } = req.params
    let count = 0
    if (exerciseType === 'quiz') {
      count = (await db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(courseId)).changes
      await db.prepare("DELETE FROM exercise_attempts WHERE course_id = ? AND exercise_type = 'quiz'").run(courseId)
    } else if (exerciseType === 'flashcard') {
      count = (await db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(courseId)).changes
      await db.prepare('DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)
      await db.prepare('DELETE FROM spaced_repetition_queue WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)
      await db.prepare("DELETE FROM exercise_attempts WHERE course_id = ? AND exercise_type = 'flashcard'").run(courseId)
    } else {
      await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ? AND exercise_type = ?').run(courseId, exerciseType)
      count = 0
    }
    log('clear_exercise_type', { course_id: courseId, type: exerciseType, count })
    res.json({ success: true, deleted: { type: exerciseType, count } })
  } catch (err) { next(err) }
})

// ─── RESET STATS ───

router.get('/admin/courses/:id/reset-stats', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const studentCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM user_courses WHERE course_id = ?').get(courseId)).count)
    const attemptCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE course_id = ?').get(courseId)).count)
    res.json({ student_count: studentCount, attempt_count: attemptCount })
  } catch (err) { next(err) }
})

router.get('/admin/tracks/:id/reset-stats', async (req, res, next) => {
  try {
    const trackId = Number(req.params.id)
    const courses = await db.prepare('SELECT course_id AS id FROM track_courses WHERE track_id = ?').all(trackId)
    let totalAttempts = 0
    for (const c of courses) {
      totalAttempts += parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE course_id = ?').get(c.id)).count)
    }
    res.json({ course_count: courses.length, total_attempts: totalAttempts })
  } catch (err) { next(err) }
})

// ─── RESET ───

router.post('/admin/reset/course/:id', async (req, res, next) => {
  try {
    if (!req.body.confirm) return res.status(400).json({ error: 'confirm: true is required' })
    const courseId = Number(req.params.id)
    const result = await db.transaction(async () => {
      const attempts = (await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ?').run(courseId)).changes
      const mastery = (await db.prepare('DELETE FROM mastery_scores WHERE course_id = ?').run(courseId)).changes
      await db.prepare("UPDATE user_courses SET status = 'Not Started' WHERE course_id = ?").run(courseId)
      const srq = (await db.prepare('DELETE FROM spaced_repetition_queue WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)).changes
      const ufp = (await db.prepare('DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)).changes
      return { attempts, mastery_scores: mastery, queues: srq + ufp }
    })()
    log('reset_course_progress', { course_id: courseId })
    res.json({ success: true, reset: result })
  } catch (err) { next(err) }
})

router.post('/admin/reset/track/:id', async (req, res, next) => {
  try {
    if (!req.body.confirm) return res.status(400).json({ error: 'confirm: true is required' })
    const trackId = Number(req.params.id)
    const courses = await db.prepare('SELECT course_id AS id FROM track_courses WHERE track_id = ?').all(trackId)
    const perCourse = {}
    await db.transaction(async () => {
      for (const c of courses) {
        const attempts = (await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ?').run(c.id)).changes
        const mastery = (await db.prepare('DELETE FROM mastery_scores WHERE course_id = ?').run(c.id)).changes
        await db.prepare("UPDATE user_courses SET status = 'Not Started' WHERE course_id = ?").run(c.id)
        perCourse[c.id] = { attempts, mastery }
      }
    })()
    log('reset_track_progress', { track_id: trackId, courses: courses.length })
    res.json({ success: true, perCourse })
  } catch (err) { next(err) }
})

router.post('/admin/reset/all', async (req, res, next) => {
  try {
    const { confirm, admin_password } = req.body
    if (!confirm) return res.status(400).json({ error: 'confirm: true is required' })
    const adminUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    if (!admin_password || !verifyPassword(admin_password, adminUser.salt, adminUser.password_hash)) {
      return res.status(403).json({ error: 'Invalid admin password' })
    }
    await db.transaction(async () => {
      await db.prepare('DELETE FROM exercise_attempts').run()
      await db.prepare('DELETE FROM mastery_scores').run()
      await db.prepare('DELETE FROM user_flashcard_progress').run()
      await db.prepare('DELETE FROM spaced_repetition_queue').run()
      await db.prepare("UPDATE user_courses SET status = 'Not Started'").run()
      await db.prepare('UPDATE user_stats SET total_xp=0, level=\'Beginner\', current_streak=0, longest_streak=0, last_active_date=NULL').run()
    })()
    log('reset_all_progress', { by: req.user.id })
    res.json({ success: true, warning: 'All user progress has been reset' })
  } catch (err) { next(err) }
})

// ─── USERS ───

router.get('/admin/users', async (req, res, next) => {
  try {
    const users = await db.prepare(`
      SELECT u.id, u.username, u.is_admin, u.created_at,
             COALESCE(us.total_xp, 0) AS total_xp, us.level, us.current_streak,
             (SELECT COUNT(*) FROM user_courses uc WHERE uc.user_id = u.id AND uc.status != 'Not Started') AS courses_started,
             (SELECT COUNT(*) FROM user_courses uc WHERE uc.user_id = u.id AND uc.status = 'Completed') AS courses_completed,
             us.last_active_date
      FROM users u
      LEFT JOIN user_stats us ON us.user_id = u.id
      ORDER BY u.id ASC
    `).all()
    res.json({ users })
  } catch (err) { next(err) }
})

router.patch('/admin/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    const user = await db.prepare('SELECT id, is_admin FROM users WHERE id = ?').get(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (req.body.is_admin !== undefined && userId === req.user.id) {
      return res.status(403).json({ error: 'You cannot change your own admin status' })
    }
    const updates = []
    const values = []
    if (req.body.is_admin !== undefined) { updates.push('is_admin = ?'); values.push(req.body.is_admin ? true : false) }
    if (req.body.username !== undefined) { updates.push('username = ?'); values.push(req.body.username) }
    if (updates.length > 0) {
      values.push(userId)
      await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }
    const updated = await db.prepare('SELECT id, username, is_admin, created_at FROM users WHERE id = ?').get(userId)
    log('update_user', { user_id: userId })
    res.json({ success: true, user: updated })
  } catch (err) { next(err) }
})

router.post('/admin/users', async (req, res, next) => {
  try {
    const { username, password, is_admin } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' })
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())
    if (existing) return res.status(409).json({ error: 'Username already exists' })
    const { salt, hash } = hashPassword(password)
    const result = await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, ?)').run(username.trim(), hash, salt, is_admin ? true : false)
    const userId = result.lastInsertRowid
    await db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(userId)
    log('create_user', { user_id: userId })
    res.json({ success: true, user: { id: userId, username: username.trim(), is_admin: is_admin ? true : false } })
  } catch (err) { next(err) }
})

router.delete('/admin/users/:id', async (req, res, next) => {
  try {
    const targetId = Number(req.params.id)
    if (targetId === req.user.id) return res.status(403).json({ error: 'You cannot delete your own account' })
    const target = await db.prepare('SELECT id FROM users WHERE id = ?').get(targetId)
    if (!target) return res.status(404).json({ error: 'User not found' })
    await db.transaction(async () => {
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM user_tracks WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM user_courses WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM user_flashcard_progress WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM spaced_repetition_queue WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM exercise_attempts WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM mastery_scores WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM user_stats WHERE user_id = ?').run(targetId)
      await db.prepare('DELETE FROM users WHERE id = ?').run(targetId)
    })()
    log('delete_user', { user_id: targetId })
    res.json({ success: true, message: `User ${targetId} deleted` })
  } catch (err) { next(err) }
})

router.post('/admin/users/:id/toggle-admin', async (req, res, next) => {
  try {
    const targetId = Number(req.params.id)
    if (targetId === req.user.id) return res.status(403).json({ error: 'You cannot change your own admin status' })
    const target = await db.prepare('SELECT id, is_admin FROM users WHERE id = ?').get(targetId)
    if (!target) return res.status(404).json({ error: 'User not found' })
    const newStatus = target.is_admin ? false : true
    await db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newStatus, targetId)
    log('toggle_admin', { target_id: targetId, new_status: newStatus })
    res.json({ success: true, is_admin: newStatus })
  } catch (err) { next(err) }
})

router.post('/admin/users/:id/reset-progress', async (req, res, next) => {
  try {
    if (!req.body.confirm) return res.status(400).json({ error: 'confirm: true is required' })
    const userId = Number(req.params.id)
    await db.transaction(async () => {
      await db.prepare('DELETE FROM exercise_attempts WHERE user_id = ?').run(userId)
      await db.prepare('DELETE FROM mastery_scores WHERE user_id = ?').run(userId)
      await db.prepare('DELETE FROM user_flashcard_progress WHERE user_id = ?').run(userId)
      await db.prepare('DELETE FROM spaced_repetition_queue WHERE user_id = ?').run(userId)
      await db.prepare("UPDATE user_courses SET status = 'Not Started' WHERE user_id = ?").run(userId)
      await db.prepare('UPDATE user_stats SET total_xp=0, level=\'Beginner\', current_streak=0, longest_streak=0 WHERE user_id = ?').run(userId)
    })()
    log('reset_user_progress', { user_id: userId })
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.get('/admin/users/:id/progress', async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    const user = await db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    const courses = await db.prepare(`
      SELECT c.id, c.slug, c.name, c.difficulty, COALESCE(uc.status, 'Not Started') AS status,
             COALESCE(ms.overall_mastery, 0) AS overall_mastery, COALESCE(ms.flashcard_score, 0) AS flashcard_score,
             COALESCE(ms.quiz_score, 0) AS quiz_score, COALESCE(ms.code_score, 0) AS code_score,
             COALESCE(ms.dataset_score, 0) AS dataset_score, COALESCE(ms.boss_score, 0) AS boss_score,
             COALESCE(ms.incorrect_score, 0) AS incorrect_score
      FROM courses c LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ? ORDER BY c.id ASC
    `).all(userId, userId)
    const stats = await db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId)
    res.json({ user, courses, stats })
  } catch (err) { next(err) }
})

// ─── SYSTEM ───

router.get('/admin/system/stats', async (req, res, next) => {
  try {
    const total_users = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count)
    const total_courses = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM courses').get()).count)
    const total_tracks = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM tracks').get()).count)
    const total_attempts = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts').get()).count)
    const total_concepts = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM concepts').get()).count)
    const total_flashcards = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM flashcards').get()).count)
    const total_quiz_questions = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM quiz_questions').get()).count)
    let db_size_mb = 0
    try { db_size_mb = fs.statSync(config.DB_PATH).size / 1024 / 1024 } catch (e) {}
    let content_size_mb = 0
    try {
      const walkDir = (dir) => {
        let total = 0
        if (!fs.existsSync(dir)) return 0
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name)
          if (entry.isDirectory()) total += walkDir(p)
          else total += fs.statSync(p).size
        }
        return total
      }
      content_size_mb = walkDir(config.CONTENT_PATH) / 1024 / 1024
    } catch (e) {}
    let challenges_passing = 0
    const reportPath = path.join(__dirname, '../../project/challenge_verification_report.md')
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, 'utf-8')
      const passMatch = content.match(/(\d+)\s*passing/i)
      if (passMatch) challenges_passing = parseInt(passMatch[1])
    }
    const uptime_seconds = process.uptime()
    res.json({ total_users, total_courses, total_tracks, total_attempts, total_concepts, total_flashcards, total_quiz_questions, db_size_mb: Math.round(db_size_mb * 100) / 100, content_size_mb: Math.round(content_size_mb * 100) / 100, challenges_passing, uptime_seconds: Math.round(uptime_seconds) })
  } catch (err) { next(err) }
})

router.get('/admin/system/logs', async (req, res, next) => {
  try {
    const logPath = path.join(__dirname, '../app.log')
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8')
      const lines = content.split('\n').filter(Boolean).slice(-100)
      return res.json({ logs: lines })
    }
    res.json({ logs: [], message: 'No log file configured' })
  } catch (err) { next(err) }
})

router.post('/admin/system/reimport-all', async (req, res, next) => {
  try {
    const result = importJsonExercises()
    log('system_reimport_all')
    res.json({ success: true, result })
  } catch (err) { next(err) }
})

// ─── TRACKS REORDER ALIAS (frontend legacy call) ───

router.post('/admin/tracks/reorder', async (req, res, next) => {
  try {
    const { trackId, courseIds } = req.body
    if (!trackId || !Array.isArray(courseIds)) return res.status(400).json({ error: 'trackId and courseIds array required' })
    await db.transaction(async () => {
      for (let index = 0; index < courseIds.length; index++) {
        const courseId = courseIds[index]
        await db.prepare('UPDATE track_courses SET order_in_track = ? WHERE track_id = ? AND course_id = ?').run(index + 1, trackId, courseId)
      }
    })()
    log('reorder_courses_in_track', { track_id: trackId })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─── COURSE FILE STATUS ───

router.get('/admin/courses/:id/file-status', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id)
    const course = await db.prepare(`
      SELECT c.slug, (SELECT tc.track_id FROM track_courses tc WHERE tc.course_id = c.id LIMIT 1) AS track_id
      FROM courses c WHERE id = ?
    `).get(courseId)
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const files = {}
    if (course.track_id) {
      const track = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
      if (track) {
        const exPath = path.join(config.CONTENT_PATH, 'tracks', track.slug, course.slug, 'exercises')
        for (const fname of ['mcq.json', 'flashcards.json', 'ftb.json', 'matching.json', 'bossbattle.json', 'challenge.json']) {
          files[fname] = fs.existsSync(path.join(exPath, fname))
        }
      }
    }
    res.json({ files, exercisesPath: course.track_id ? `content/tracks/.../exercises` : null })
  } catch (err) { next(err) }
})

// ─── SYSTEM VERIFY CHALLENGES ───

router.post('/admin/system/verify-challenges', async (req, res, next) => {
  try {
    const reportPath = path.join(__dirname, '../../project/challenge_verification_report.md')
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, 'utf-8')
      return res.json({ success: true, report: content })
    }
    res.json({ success: false, message: 'No challenge verification report found. Run verify_challenges.js first.' })
  } catch (err) { next(err) }
})

// ─── LEGACY ───

router.post('/admin/exercises/reimport', async (req, res, next) => {
  try {
    const scanResult = scanContent()
    const importResult = importJsonExercises()
    log('reimport_exercises')
    res.json({ success: true, scan: scanResult, import: importResult })
  } catch (err) { next(err) }
})

router.get('/admin/system/config', async (req, res, next) => {
  try {
    const safeConfig = { PORT: config.PORT, HOST: config.HOST, NODE_ENV: config.NODE_ENV, DB_PATH: config.DB_PATH, CONTENT_PATH: config.CONTENT_PATH, FRONTEND_URL: config.FRONTEND_URL, CHALLENGE_TIMEOUT_MS: config.CHALLENGE_TIMEOUT_MS, PYTHON_PATH: config.PYTHON_PATH }
    res.json({ config: safeConfig })
  } catch (err) { next(err) }
})

router.post('/admin/reset/nuclear', async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required for nuclear reset' })
    const adminUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    if (!adminUser || adminUser.username !== username || !verifyPassword(password, adminUser.salt, adminUser.password_hash)) {
      return res.status(403).json({ error: 'Invalid credentials' })
    }
    await db.transaction(async () => {
      await db.prepare('DELETE FROM exercise_attempts').run()
      await db.prepare('DELETE FROM mastery_scores').run()
      await db.prepare('DELETE FROM spaced_repetition_queue').run()
      await db.prepare('DELETE FROM user_flashcard_progress').run()
      await db.prepare('DELETE FROM user_courses').run()
      await db.prepare('DELETE FROM user_tracks').run()
      await db.prepare('DELETE FROM user_stats').run()
      await db.prepare('DELETE FROM sessions').run()
      await db.prepare('DELETE FROM quiz_questions').run()
      await db.prepare('DELETE FROM flashcards').run()
      await db.prepare('DELETE FROM concepts').run()
      await db.prepare('DELETE FROM track_courses').run()
      await db.prepare('DELETE FROM courses').run()
      await db.prepare('DELETE FROM tracks').run()
      await db.prepare('DELETE FROM deleted_questions').run()
    })()
    log('nuclear_reset', { by: req.user.id })
    res.json({ success: true, message: 'Nuclear reset complete. All user data and content wiped.' })
  } catch (err) { next(err) }
})

export default router
