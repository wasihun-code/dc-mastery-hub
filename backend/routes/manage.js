import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.pg.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

// Helper: copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  if (!fs.existsSync(src)) return

  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// 1. Get Trash items
router.get('/manage/trash', async (req, res, next) => {
  try {
    const userId = req.user.id
    const tracks = await db.prepare(`
      SELECT t.* 
      FROM tracks t
      JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = ?
      WHERE ut.is_deleted = true
    `).all(userId)
    const courses = await db.prepare(`
      SELECT c.*,
             (
               SELECT COALESCE(
                 (SELECT json_agg(json_build_object(
                   'id', t.id,
                   'slug', t.slug,
                   'name', t.name,
                   'color', t.color,
                   'language', t.language
                 ))
                 FROM track_courses tc
                 JOIN tracks t ON t.id = tc.track_id
                 WHERE tc.course_id = c.id),
               '[]'::json)
             ) AS tracks_json
      FROM courses c 
      JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
      WHERE uc.is_deleted = true
    `).all(userId)
    for (const c of courses) {
      c.tracks = typeof c.tracks_json === 'string' ? JSON.parse(c.tracks_json) : (c.tracks_json || [])
      if (c.tracks.length > 0) {
        c.track_name = c.tracks[0].name
        c.track_color = c.tracks[0].color
      }
    }
    res.json({ tracks, courses })
  } catch (err) {
    next(err)
  }
})

// 2. Get Archived items
router.get('/manage/archived', async (req, res, next) => {
  try {
    const userId = req.user.id
    const tracks = await db.prepare(`
      SELECT t.* 
      FROM tracks t
      JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = ?
      WHERE ut.is_archived = true AND ut.is_deleted = false
    `).all(userId)
    const courses = await db.prepare(`
      SELECT c.id, c.slug, c.name, c.difficulty, c.has_pdf, c.has_glossary, c.created_at,
             COALESCE(uc.status, 'Not Started') AS status,
             COALESCE(uc.notes, c.notes) AS notes,
             COALESCE(uc.notes_taken, c.notes_taken, false) AS notes_taken,
             COALESCE(uc.reviewed, c.reviewed) AS reviewed,
             COALESCE(uc.is_deleted, false) AS is_deleted,
             COALESCE(uc.is_archived, false) AS is_archived,
             (
               SELECT COALESCE(
                 (SELECT json_agg(json_build_object(
                   'id', t.id,
                   'slug', t.slug,
                   'name', t.name,
                   'color', t.color,
                   'language', t.language
                 ))
                 FROM track_courses tc
                 JOIN tracks t ON t.id = tc.track_id
                 WHERE tc.course_id = c.id),
               '[]'::json)
             ) AS tracks_json
      FROM courses c 
      JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
      WHERE uc.is_archived = true AND uc.is_deleted = false
    `).all(userId)
    for (const c of courses) {
      c.tracks = typeof c.tracks_json === 'string' ? JSON.parse(c.tracks_json) : (c.tracks_json || [])
      if (c.tracks.length > 0) {
        c.track_name = c.tracks[0].name
        c.track_color = c.tracks[0].color
        c.track_slug = c.tracks[0].slug
        c.track_language = c.tracks[0].language
      }
    }
    res.json({ tracks, courses })
  } catch (err) {
    next(err)
  }
})

// 3. Add Track (Global - Admin Only)
router.post('/manage/track/add', async (req, res, next) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can create tracks.' })
    }

    const { name, slug, language, color, description } = req.body
    if (!name || !slug) {
      res.status(400).json({ error: 'Name and slug are required' })
      return
    }

    await db.prepare(`
      INSERT INTO tracks (name, slug, language, color, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, slug, language || 'Python', color || '#60a5fa', description || '')

    // Create folder structure on disk
    const trackFolder = path.join(DEFAULT_CONTENT_FOLDER, 'tracks', slug)
    fs.mkdirSync(trackFolder, { recursive: true })
    
    // Write track.json
    fs.writeFileSync(
      path.join(trackFolder, 'track.json'),
      JSON.stringify({ slug, name, language: language || 'Python' }, null, 2),
      'utf-8'
    )

    res.json({ success: true, message: `Track ${name} created successfully` })
  } catch (err) {
    next(err)
  }
})

// 4. Edit Track flags (User-specific)
router.post('/manage/track/update-flags', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { trackId, is_deleted, is_archived } = req.body
    if (!trackId) {
      return res.status(400).json({ error: 'trackId is required' })
    }
    
    await db.transaction(async () => {
      // Ensure user_track record exists
      const exists = await db.prepare('SELECT 1 FROM user_tracks WHERE user_id = ? AND track_id = ?').get(userId, trackId)
      if (!exists) {
        await db.prepare('INSERT INTO user_tracks (user_id, track_id) VALUES (?, ?)').run(userId, trackId)
      }

      if (is_deleted !== undefined) {
        await db.prepare('UPDATE user_tracks SET is_deleted = ? WHERE user_id = ? AND track_id = ?').run(is_deleted ? true : false, userId, trackId)
        
        // Propagate user deletion to all courses in track
        const courses = await db.prepare('SELECT course_id AS id FROM track_courses WHERE track_id = ?').all(trackId)
        for (const c of courses) {
          const cExists = await db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(userId, c.id)
          if (!cExists) {
            await db.prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)').run(userId, c.id)
          }
          await db.prepare('UPDATE user_courses SET is_deleted = ? WHERE user_id = ? AND course_id = ?').run(is_deleted ? true : false, userId, c.id)
        }
      }
      if (is_archived !== undefined) {
        await db.prepare('UPDATE user_tracks SET is_archived = ? WHERE user_id = ? AND track_id = ?').run(is_archived ? true : false, userId, trackId)
        
        // Propagate user archival to all courses in track
        const courses = await db.prepare('SELECT course_id AS id FROM track_courses WHERE track_id = ?').all(trackId)
        for (const c of courses) {
          const cExists = await db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(userId, c.id)
          if (!cExists) {
            await db.prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)').run(userId, c.id)
          }
          await db.prepare('UPDATE user_courses SET is_archived = ? WHERE user_id = ? AND course_id = ?').run(is_archived ? true : false, userId, c.id)
        }
      }
    })()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// 5. Add Course to track (Global - Admin Only)
router.post('/manage/course/add', async (req, res, next) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can create courses.' })
    }

    const { name, slug, trackId, difficulty } = req.body
    if (!name || !slug || !trackId) {
      res.status(400).json({ error: 'Name, slug, and trackId are required' })
      return
    }

    const track = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(trackId)
    if (!track) {
      res.status(404).json({ error: 'Track not found' })
      return
    }

    await db.transaction(async () => {
      // Find current max order in track
      const maxOrderResult = await db.prepare('SELECT MAX(order_in_track) AS max_order FROM track_courses WHERE track_id = ?').get(trackId)
      const nextOrder = (maxOrderResult?.max_order || 0) + 1

      let course = await db.prepare('SELECT id FROM courses WHERE slug = ?').get(slug)
      let courseId = course?.id
      if (!courseId) {
        const res = await db.prepare(`
          INSERT INTO courses (name, slug, difficulty, status)
          VALUES (?, ?, ?, 'Not Started')
        `).run(name, slug, difficulty || 'Unknown')
        courseId = res.lastInsertRowid
      }

      await db.prepare(`
        INSERT INTO track_courses (track_id, course_id, order_in_track)
        VALUES (?, ?, ?)
        ON CONFLICT DO NOTHING
      `).run(trackId, courseId, nextOrder)
      // Use exec for multi-row INSERT...SELECT (avoids RETURNING * multi-row error)
      const pgCourseId = courseId
      await db.prepare(`
        INSERT INTO mastery_scores (user_id, course_id) 
        SELECT id, ? FROM users 
        ON CONFLICT DO NOTHING
        RETURNING id
      `).all(pgCourseId)
    })()

    // Create folders on disk
    const courseFolder = path.join(DEFAULT_CONTENT_FOLDER, 'tracks', track.slug, slug)
    const datasetsFolder = path.join(courseFolder, 'datasets')
    fs.mkdirSync(courseFolder, { recursive: true })
    fs.mkdirSync(datasetsFolder, { recursive: true })

    res.json({ success: true, message: `Course ${name} created successfully` })
  } catch (err) {
    next(err)
  }
})

// 6. Update Course flags (User-specific)
router.post('/manage/course/update-flags', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { courseId, is_deleted, is_archived } = req.body
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' })
    }

    await db.transaction(async () => {
      // Ensure user_course record exists
      const exists = await db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(userId, courseId)
      if (!exists) {
        await db.prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)').run(userId, courseId)
      }

      if (is_deleted !== undefined) {
        await db.prepare('UPDATE user_courses SET is_deleted = ? WHERE user_id = ? AND course_id = ?').run(is_deleted ? true : false, userId, courseId)
      }
      if (is_archived !== undefined) {
        await db.prepare('UPDATE user_courses SET is_archived = ? WHERE user_id = ? AND course_id = ?').run(is_archived ? true : false, userId, courseId)
      }
    })()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// 7. Copy Course
async function copyCourseInternal(courseId, destTrackId) {
  const course = await db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId)
  if (!course) throw new Error('Course not found')

  const destTrack = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(destTrackId)
  if (!destTrack) throw new Error('Destination track not found')

  // In many-to-many relation, copying a course to a track links it
  await db.prepare(`
    INSERT INTO track_courses (track_id, course_id, order_in_track)
    VALUES (?, ?, (SELECT COALESCE(MAX(order_in_track), 0) + 1 FROM track_courses WHERE track_id = ?))
    ON CONFLICT DO NOTHING
  `).run(destTrackId, courseId, destTrackId)

  return courseId
}

router.post('/manage/course/copy', async (req, res, next) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can copy courses.' })
    }
    const { courseId, destTrackId } = req.body
    if (!courseId || !destTrackId) {
      res.status(400).json({ error: 'courseId and destTrackId are required' })
      return
    }

    const newId = await copyCourseInternal(Number(courseId), Number(destTrackId))
    res.json({ success: true, newCourseId: newId })
  } catch (err) {
    next(err)
  }
})

// 8. Bulk Actions for Courses (User-scoped flags, Admin-only Copy/Move)
router.post('/manage/courses/bulk-action', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { courseIds, action, destTrackId } = req.body
    if (!Array.isArray(courseIds) || courseIds.length === 0 || !action) {
      res.status(400).json({ error: 'courseIds and action are required' })
      return
    }

    await db.transaction(async () => {
      for (const id of courseIds) {
        const cId = Number(id)
        
        // Ensure user_courses record exists for flag updates
        const exists = await db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(userId, cId)
        if (!exists && !['copy', 'move'].includes(action)) {
          await db.prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)').run(userId, cId)
        }

        if (action === 'delete') {
          await db.prepare('UPDATE user_courses SET is_deleted = true WHERE user_id = ? AND course_id = ?').run(userId, cId)
        } else if (action === 'restore') {
          await db.prepare('UPDATE user_courses SET is_deleted = false WHERE user_id = ? AND course_id = ?').run(userId, cId)
        } else if (action === 'archive') {
          await db.prepare('UPDATE user_courses SET is_archived = true WHERE user_id = ? AND course_id = ?').run(userId, cId)
        } else if (action === 'unarchive') {
          await db.prepare('UPDATE user_courses SET is_archived = false WHERE user_id = ? AND course_id = ?').run(userId, cId)
        } else if (action === 'mark_reviewed') {
          await db.prepare("UPDATE user_courses SET reviewed = 'Yes' WHERE user_id = ? AND course_id = ?").run(userId, cId)
        } else if (action === 'mark_unreviewed') {
          await db.prepare("UPDATE user_courses SET reviewed = 'No' WHERE user_id = ? AND course_id = ?").run(userId, cId)
        } else if (action === 'copy') {
          if (!req.user.is_admin) throw new Error('Only administrators can copy courses.')
          if (!destTrackId) throw new Error('destTrackId is required for copy action')
          await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, 1) ON CONFLICT DO NOTHING').run(destTrackId, cId)
        } else if (action === 'move') {
          if (!req.user.is_admin) throw new Error('Only administrators can move courses.')
          if (!destTrackId) throw new Error('destTrackId is required for move action')
          await db.prepare('DELETE FROM track_courses WHERE course_id = ?').run(cId)
          await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, 1) ON CONFLICT DO NOTHING').run(destTrackId, cId)
        }
      }
    })()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// 9. Permanent Deletion from trash
router.post('/manage/trash/permanently-delete', async (req, res, next) => {
  try {
    const userId = req.user.id
    const isAdmin = req.user.is_admin
    const { type, id } = req.body
    if (!type || !id) {
      res.status(400).json({ error: 'type and id are required' })
      return
    }

    await db.transaction(async () => {
      if (!isAdmin) {
        // User-specific deletion: wipes their own attempts and course states
        if (type === 'course') {
          const courseId = Number(id)
          await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ? AND user_id = ?').run(courseId, userId)
          await db.prepare('DELETE FROM mastery_scores WHERE course_id = ? AND user_id = ?').run(courseId, userId)
          await db.prepare(`
            DELETE FROM spaced_repetition_queue 
            WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)
          `).run(userId, courseId)
          await db.prepare(`
            DELETE FROM user_flashcard_progress 
            WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)
          `).run(userId, courseId)
          await db.prepare('DELETE FROM user_courses WHERE user_id = ? AND course_id = ?').run(userId, courseId)
        } else if (type === 'track') {
          const trackId = Number(id)
          const courses = await db.prepare('SELECT course_id AS id FROM track_courses WHERE track_id = ?').all(trackId)
          const courseIds = courses.map(c => c.id)
          if (courseIds.length > 0) {
            const placeholders = courseIds.map(() => '?').join(',')
            await db.prepare(`DELETE FROM exercise_attempts WHERE user_id = ? AND course_id IN (${placeholders})`).run(userId, ...courseIds)
            await db.prepare(`DELETE FROM mastery_scores WHERE user_id = ? AND course_id IN (${placeholders})`).run(userId, ...courseIds)
            await db.prepare(`
              DELETE FROM user_flashcard_progress 
              WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id IN (${placeholders}))
            `).run(userId, ...courseIds)
            await db.prepare(`
              DELETE FROM spaced_repetition_queue 
              WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE course_id IN (${placeholders}))
            `).run(userId, ...courseIds)
            await db.prepare(`DELETE FROM user_courses WHERE user_id = ? AND course_id IN (${placeholders})`).run(userId, ...courseIds)
          }
          await db.prepare('DELETE FROM user_tracks WHERE user_id = ? AND track_id = ?').run(userId, trackId)
        }
      } else {
        // Superuser: Physical global deletion from DB and Disk
        if (type === 'course') {
          const courseId = Number(id)
          const course = await db.prepare('SELECT slug, (SELECT track_id FROM track_courses WHERE course_id = c.id LIMIT 1) AS track_id FROM courses c WHERE id = ?').get(courseId)
          
          if (course) {
            const track = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
            await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ?').run(courseId)
            await db.prepare('DELETE FROM mastery_scores WHERE course_id = ?').run(courseId)
            await db.prepare('DELETE FROM spaced_repetition_queue WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)
            await db.prepare('DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(courseId)
            await db.prepare('DELETE FROM track_courses WHERE course_id = ?').run(courseId)
            await db.prepare('DELETE FROM user_courses WHERE course_id = ?').run(courseId)
            await db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(courseId)
            await db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(courseId)
            await db.prepare('DELETE FROM concepts WHERE course_id = ?').run(courseId)
            await db.prepare('DELETE FROM courses WHERE id = ?').run(courseId)

            if (track) {
              const courseFolder = path.join(DEFAULT_CONTENT_FOLDER, 'tracks', track.slug, course.slug)
              if (fs.existsSync(courseFolder)) {
                fs.rmSync(courseFolder, { recursive: true, force: true })
              }
            }
          }
        } else if (type === 'track') {
          const trackId = Number(id)
          const track = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(trackId)
          
          if (track) {
            const courses = await db.prepare('SELECT c.id, c.slug FROM courses c JOIN track_courses tc ON tc.course_id = c.id WHERE tc.track_id = ?').all(trackId)
            for (const course of courses) {
              await db.prepare('DELETE FROM exercise_attempts WHERE course_id = ?').run(course.id)
              await db.prepare('DELETE FROM mastery_scores WHERE course_id = ?').run(course.id)
              await db.prepare('DELETE FROM spaced_repetition_queue WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(course.id)
              await db.prepare('DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(course.id)
              await db.prepare('DELETE FROM track_courses WHERE course_id = ?').run(course.id)
              await db.prepare('DELETE FROM user_courses WHERE course_id = ?').run(course.id)
              await db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(course.id)
              await db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(course.id)
              await db.prepare('DELETE FROM concepts WHERE course_id = ?').run(course.id)
              await db.prepare('DELETE FROM courses WHERE id = ?').run(course.id)
            }

            await db.prepare('DELETE FROM track_courses WHERE track_id = ?').run(trackId)
            await db.prepare('DELETE FROM user_tracks WHERE track_id = ?').run(trackId)
            await db.prepare('DELETE FROM tracks WHERE id = ?').run(trackId)

            const trackFolder = path.join(DEFAULT_CONTENT_FOLDER, 'tracks', track.slug)
            if (fs.existsSync(trackFolder)) {
              fs.rmSync(trackFolder, { recursive: true, force: true })
            }
          }
        }
      }
    })()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// 10. Upload material base64 (Global - Admin Only)
router.post('/manage/upload-material', async (req, res, next) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can upload learning materials.' })
    }

    const { courseId, fileType, fileName, fileContent } = req.body
    if (!courseId || !fileType || !fileName || !fileContent) {
      res.status(400).json({ error: 'courseId, fileType, fileName, and fileContent are required' })
      return
    }

    const validFileTypes = ['pdf', 'glossary', 'transcript', 'dataset']
    if (!validFileTypes.includes(fileType)) {
      res.status(400).json({ error: 'Invalid fileType' })
      return
    }

    const course = await db.prepare('SELECT *, (SELECT track_id FROM track_courses WHERE course_id = c.id LIMIT 1) AS track_id FROM courses c WHERE id = ?').get(courseId)
    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }

    const track = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) {
      res.status(404).json({ error: 'Track not found' })
      return
    }

    const courseFolder = path.join(DEFAULT_CONTENT_FOLDER, 'tracks', track.slug, course.slug)
    if (!fs.existsSync(courseFolder)) {
      fs.mkdirSync(courseFolder, { recursive: true })
    }

    const buffer = Buffer.from(fileContent, 'base64')
    let destPath = ''

    if (fileType === 'pdf') {
      destPath = path.join(courseFolder, `${course.slug}.pdf`)
      await db.prepare('UPDATE courses SET has_pdf = true WHERE id = ?').run(courseId)
    } else if (fileType === 'glossary') {
      destPath = path.join(courseFolder, `${course.slug}-glossary.pdf`)
      await db.prepare('UPDATE courses SET has_glossary = true WHERE id = ?').run(courseId)
    } else if (fileType === 'transcript') {
      destPath = path.join(courseFolder, `${course.slug}-transcript.txt`)
    } else if (fileType === 'dataset') {
      const datasetsFolder = path.join(courseFolder, 'datasets')
      if (!fs.existsSync(datasetsFolder)) {
        fs.mkdirSync(datasetsFolder, { recursive: true })
      }
      destPath = path.join(datasetsFolder, fileName)
    }

    fs.writeFileSync(destPath, buffer)
    res.json({ success: true, message: `File uploaded to ${path.basename(destPath)}` })
  } catch (err) {
    next(err)
  }
})

// 11. Update Course properties (difficulty, order, etc. - User-scoped status/notes/reviewed)
router.post('/manage/course/update-properties', async (req, res, next) => {
  try {
    const { courseId, status, difficulty, reviewed, notes_taken } = req.body
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' })
      return
    }

    const userId = req.user.id
    const fields = []
    const values = []

    if (status !== undefined) {
      fields.push('status = ?')
      values.push(status)
    }
    if (difficulty !== undefined) {
      fields.push('difficulty = ?')
      values.push(difficulty)
    }
    if (reviewed !== undefined) {
      fields.push('reviewed = ?')
      values.push(reviewed)
    }
    if (notes_taken !== undefined) {
      fields.push('notes_taken = ?')
      values.push(notes_taken ? true : false)
    }

    if (fields.length > 0) {
      // Ensure user_courses record exists
      const exists = await db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(userId, courseId)
      if (!exists) {
        await db.prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)').run(userId, courseId)
      }
      values.push(userId, Number(courseId))
      await db.prepare(`UPDATE user_courses SET ${fields.join(', ')} WHERE user_id = ? AND course_id = ?`).run(...values)
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
