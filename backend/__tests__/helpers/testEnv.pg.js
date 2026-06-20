import db from '../../db/database.pg.js'
import crypto from 'crypto'

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
  return {}
}

export async function seedTestData() {
  const { salt: adminSalt, hash: adminHash } = hashPassword('admin123')
  const { salt: studentSalt, hash: studentHash } = hashPassword('student123')

  await db.prepare(`INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, TRUE)`)
    .run('admin@test.com', adminHash, adminSalt)
  const adminUser = await db.prepare('SELECT id FROM users WHERE username = ?').get('admin@test.com')

  await db.prepare(`INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, FALSE)`)
    .run('student@test.com', studentHash, studentSalt)
  const studentUser = await db.prepare('SELECT id FROM users WHERE username = ?').get('student@test.com')

  const adminSession = crypto.randomBytes(32).toString('hex')
  const studentSession = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(adminSession, adminUser.id, expiresAt)
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(studentSession, studentUser.id, expiresAt)

  await db.prepare('INSERT INTO tracks (slug, name, language, color) VALUES (?, ?, ?, ?)').run('data-science', 'Data Science', 'Python', '#03ef62')
  await db.prepare('INSERT INTO tracks (slug, name, language, color) VALUES (?, ?, ?, ?)').run('sql-mastery', 'SQL Mastery', 'SQL', '#3b82f6')
  
  const track1 = await db.prepare('SELECT id FROM tracks WHERE slug = ?').get('data-science')
  const track2 = await db.prepare('SELECT id FROM tracks WHERE slug = ?').get('sql-mastery')

  await db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('python-basics', 'Python Basics', 'Easy', 'Not Started')
  await db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('pandas-fundamentals', 'Pandas Fundamentals', 'Medium', 'In Progress')
  await db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('advanced-sql', 'Advanced SQL', 'Hard', 'Completed')
  
  const coursesList = await db.prepare('SELECT id, slug FROM courses').all()
  const course1 = coursesList.find(c => c.slug === 'python-basics')
  const course2 = coursesList.find(c => c.slug === 'pandas-fundamentals')
  const course3 = coursesList.find(c => c.slug === 'advanced-sql')

  await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track1.id, course1.id, 1)
  await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track1.id, course2.id, 2)
  await db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track2.id, course3.id, 1)

  await db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course1.id, 'Not Started', 'No')
  await db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course2.id, 'In Progress', 'No')
  await db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course3.id, 'Completed', 'Yes')

  await db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course1.id, 'Variables', 'Storage for data')
  await db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course1.id, 'Loops', 'Iterative structures')
  await db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course2.id, 'DataFrames', '2D tabular data')

  await db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?)').run(course1.id, 1, 'What is a variable?', 'A storage location')
  await db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?)').run(course1.id, 2, 'What is a loop?', 'Iterative structure')

  await db.prepare('INSERT INTO quiz_questions (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(course1.id, 1, 'What type is x = 5?', 'int', 'str', 'float', 'list', 'A')
  await db.prepare('INSERT INTO quiz_questions (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(course1.id, 2, 'Which keyword starts a loop?', 'if', 'for', 'def', 'import', 'B')

  await db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(adminUser.id, 0, 'Beginner', 0, 0, null)
  await db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(studentUser.id, 150, 'Intermediate', 3, 5, new Date().toISOString().split('T')[0])

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
}
