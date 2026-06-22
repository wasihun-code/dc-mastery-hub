import db from '../../db/database.pg.js'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

export async function setupTestEnvironment() {
  await db.exec(`
    TRUNCATE TABLE 
      spaced_repetition_queue, exercise_attempts, mastery_scores, user_stats, 
      user_flashcard_progress, user_courses, user_tracks, deleted_questions, 
      quiz_questions, flashcards, concepts, track_courses, courses, tracks, 
      sessions, users 
    RESTART IDENTITY CASCADE;
  `)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-'))
  return { tmpDir }
}

export async function seedTestData() {
  const { salt: adminSalt, hash: adminHash } = hashPassword('admin123')
  const { salt: studentSalt, hash: studentHash } = hashPassword('student123')

  const users = await db.prepare(`INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, TRUE), (?, ?, ?, FALSE) RETURNING *`).all('admin@test.com', adminHash, adminSalt, 'student@test.com', studentHash, studentSalt)
  const adminUser = users.find(u => u.username === 'admin@test.com')
  const studentUser = users.find(u => u.username === 'student@test.com')

  const adminSession = crypto.randomBytes(32).toString('hex')
  const studentSession = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?), (?, ?, ?) RETURNING *').all(adminSession, adminUser.id, expiresAt, studentSession, studentUser.id, expiresAt)

  const tracksList = await db.prepare('INSERT INTO tracks (slug, name, language, color) VALUES (?, ?, ?, ?), (?, ?, ?, ?) RETURNING *').all('data-science', 'Data Science', 'Python', '#03ef62', 'sql-mastery', 'SQL Mastery', 'SQL', '#3b82f6')
  const track1 = tracksList.find(t => t.slug === 'data-science')
  const track2 = tracksList.find(t => t.slug === 'sql-mastery')

  const coursesList = await db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?) RETURNING *').all('python-basics', 'Python Basics', 'Easy', 'Not Started', 'pandas-fundamentals', 'Pandas Fundamentals', 'Medium', 'In Progress', 'advanced-sql', 'Advanced SQL', 'Hard', 'Completed')
  const course1 = coursesList.find(c => c.slug === 'python-basics')
  const course2 = coursesList.find(c => c.slug === 'pandas-fundamentals')
  const course3 = coursesList.find(c => c.slug === 'advanced-sql')

  await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?) RETURNING *').all(track1.id, course1.id, 1, track1.id, course2.id, 2, track2.id, course3.id, 1)

  await db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?) RETURNING *').all(studentUser.id, course1.id, 'Not Started', 'No', studentUser.id, course2.id, 'In Progress', 'No', studentUser.id, course3.id, 'Completed', 'Yes')

  const conceptsList = await db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?) RETURNING *').all(course1.id, 'Variables', 'Storage for data', course1.id, 'Loops', 'Iterative structures', course2.id, 'DataFrames', '2D tabular data')
  const conceptVars = conceptsList.find(c => c.name === 'Variables')
  const conceptLoops = conceptsList.find(c => c.name === 'Loops')

  await db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?), (?, ?, ?, ?) RETURNING *').all(course1.id, conceptVars.id, 'What is a variable?', 'A storage location', course1.id, conceptLoops.id, 'What is a loop?', 'Iterative structure')

  await db.prepare('INSERT INTO quiz_questions (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *').all(course1.id, conceptVars.id, 'What type is x = 5?', 'int', 'str', 'float', 'list', 'A', course1.id, conceptLoops.id, 'Which keyword starts a loop?', 'if', 'for', 'def', 'import', 'B')

  await db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?) RETURNING *').all(adminUser.id, 0, 'Beginner', 0, 0, null, studentUser.id, 150, 'Intermediate', 3, 5, new Date().toISOString().split('T')[0])

  return {
    adminSession: `session_id=${adminSession}`,
    studentSession: `session_id=${studentSession}`,
    adminUser, studentUser,
    courses: { course1, course2, course3 },
    tracks: { track1, track2 }
  }
}

export async function cleanupTestEnvironment() {
  await db.exec(`
    TRUNCATE TABLE 
      spaced_repetition_queue, exercise_attempts, mastery_scores, user_stats, 
      user_flashcard_progress, user_courses, user_tracks, deleted_questions, 
      quiz_questions, flashcards, concepts, track_courses, courses, tracks, 
      sessions, users 
    CASCADE;
  `)
  if (db.end) await db.end()
}
