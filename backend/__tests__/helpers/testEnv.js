import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

// Call in beforeAll() of each test file.
// Sets process.env.DB_PATH to a temp file, seeds data, returns context.
export function setupTestEnvironment() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-test-'))
  const dbPath = path.join(tmpDir, 'test.db')
  process.env.DB_PATH = dbPath
  return { dbPath, tmpDir }
}

// Seed the in-memory tables after schema init
export function seedTestData(db) {
  const adminSalt = crypto.randomBytes(16).toString('hex')
  const studentSalt = crypto.randomBytes(16).toString('hex')

  db.prepare(`INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 1)`)
    .run('admin@test.com', hashPassword('admin123', adminSalt), adminSalt)
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin@test.com')

  db.prepare(`INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)`)
    .run('student@test.com', hashPassword('student123', studentSalt), studentSalt)
  const studentUser = db.prepare('SELECT id FROM users WHERE username = ?').get('student@test.com')

  const adminSession = crypto.randomBytes(32).toString('hex')
  const studentSession = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(adminSession, adminUser.id, expiresAt)
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(studentSession, studentUser.id, expiresAt)

  db.prepare('INSERT INTO tracks (slug, name, language, color) VALUES (?, ?, ?, ?)').run('data-science', 'Data Science', 'Python', '#03ef62')
  db.prepare('INSERT INTO tracks (slug, name, language, color) VALUES (?, ?, ?, ?)').run('sql-mastery', 'SQL Mastery', 'SQL', '#3b82f6')
  const track1 = db.prepare('SELECT id FROM tracks WHERE slug = ?').get('data-science')
  const track2 = db.prepare('SELECT id FROM tracks WHERE slug = ?').get('sql-mastery')

  db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('python-basics', 'Python Basics', 'Easy', 'Not Started')
  db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('pandas-fundamentals', 'Pandas Fundamentals', 'Medium', 'In Progress')
  db.prepare('INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)').run('advanced-sql', 'Advanced SQL', 'Hard', 'Completed')
  const courses = db.prepare('SELECT id, slug FROM courses').all()
  const course1 = courses.find(c => c.slug === 'python-basics')
  const course2 = courses.find(c => c.slug === 'pandas-fundamentals')
  const course3 = courses.find(c => c.slug === 'advanced-sql')

  db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track1.id, course1.id, 1)
  db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track1.id, course2.id, 2)
  db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track2.id, course3.id, 1)

  db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course1.id, 'Not Started', 'No')
  db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course2.id, 'In Progress', 'No')
  db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course3.id, 'Completed', 'Yes')

  db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course1.id, 'Variables', 'Storage for data')
  db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course1.id, 'Loops', 'Iterative structures')
  db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course2.id, 'DataFrames', '2D tabular data')

  db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?)').run(course1.id, 1, 'What is a variable?', 'A storage location')
  db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?)').run(course1.id, 2, 'What is a loop?', 'Iterative structure')

  db.prepare('INSERT INTO quiz_questions (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(course1.id, 1, 'What type is x = 5?', 'int', 'str', 'float', 'list', 'A')
  db.prepare('INSERT INTO quiz_questions (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(course1.id, 2, 'Which keyword starts a loop?', 'if', 'for', 'def', 'import', 'B')

  db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(adminUser.id, 0, 'Beginner', 0, 0, null)
  db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(studentUser.id, 150, 'Intermediate', 3, 5, new Date().toISOString().split('T')[0])

  return {
    adminSession: `session_id=${adminSession}`,
    studentSession: `session_id=${studentSession}`,
    adminUser, studentUser,
    courses: { course1, course2, course3 },
    tracks: { track1, track2 }
  }
}

// Clean up temp files — call in afterAll()
export function cleanupTestEnvironment(tmpDir) {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (e) {}
  delete process.env.DB_PATH
}
