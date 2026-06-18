import Database from 'better-sqlite3'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

// Create an in-memory SQLite database with all tables and seed data
export function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')

  // Run schema (all CREATE TABLE IF NOT EXISTS statements)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      language TEXT,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      difficulty TEXT DEFAULT 'Unknown',
      status TEXT DEFAULT 'Not Started',
      notes TEXT,
      reviewed TEXT DEFAULT 'No',
      has_pdf INTEGER DEFAULT 0,
      has_glossary INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS track_courses (
      track_id INTEGER NOT NULL REFERENCES tracks(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      order_in_track INTEGER,
      PRIMARY KEY (track_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id),
      name TEXT NOT NULL,
      definition TEXT,
      code_snippet TEXT,
      source_page INTEGER,
      category TEXT,
      difficulty INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concept_id INTEGER REFERENCES concepts(id),
      course_id INTEGER REFERENCES courses(id),
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      next_review_date TEXT DEFAULT (date('now')),
      interval_days INTEGER DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      repetitions INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id),
      concept_id INTEGER REFERENCES concepts(id),
      question_text TEXT NOT NULL,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct_option TEXT,
      explanation TEXT,
      question_type TEXT,
      difficulty INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS deleted_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      course_slug TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      question_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, exercise_type, question_id)
    );

    CREATE TABLE IF NOT EXISTS user_tracks (
      user_id INTEGER NOT NULL REFERENCES users(id),
      track_id INTEGER NOT NULL REFERENCES tracks(id),
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, track_id)
    );

    CREATE TABLE IF NOT EXISTS user_courses (
      user_id INTEGER NOT NULL REFERENCES users(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      status TEXT DEFAULT 'Not Started',
      difficulty TEXT DEFAULT 'Unknown',
      notes TEXT,
      reviewed TEXT DEFAULT 'No',
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS user_flashcard_progress (
      user_id INTEGER NOT NULL REFERENCES users(id),
      flashcard_id INTEGER NOT NULL REFERENCES flashcards(id),
      interval_days INTEGER DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      repetitions INTEGER DEFAULT 0,
      next_review_date TEXT DEFAULT (date('now')),
      PRIMARY KEY (user_id, flashcard_id)
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      total_xp INTEGER DEFAULT 0,
      level TEXT DEFAULT 'Beginner',
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      badges_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS mastery_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      course_id INTEGER REFERENCES courses(id),
      flashcard_score REAL DEFAULT 0,
      quiz_score REAL DEFAULT 0,
      code_score REAL DEFAULT 0,
      dataset_score REAL DEFAULT 0,
      matching_score REAL DEFAULT 0,
      boss_score REAL DEFAULT 0,
      incorrect_score REAL DEFAULT 0,
      overall_mastery REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      course_id INTEGER REFERENCES courses(id),
      concept_id TEXT DEFAULT NULL,
      exercise_type TEXT NOT NULL,
      question_id TEXT,
      was_correct INTEGER,
      score REAL DEFAULT 0,
      time_taken_secs INTEGER DEFAULT NULL,
      attempted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS spaced_repetition_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      flashcard_id INTEGER NOT NULL REFERENCES flashcards(id),
      due_date TEXT,
      priority INTEGER DEFAULT 1,
      UNIQUE(user_id, flashcard_id)
    );
  `)

  // Seed: 1 admin user, 1 student user
  const adminHash = hashPassword('admin123')
  const studentHash = hashPassword('student123')

  db.prepare(`INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 1)`)
    .run('admin@test.com', adminHash.hash, adminHash.salt)
  db.prepare(`INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)`)
    .run('student@test.com', studentHash.hash, studentHash.salt)

  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin@test.com')
  const studentUser = db.prepare('SELECT id FROM users WHERE username = ?').get('student@test.com')

  // Create sessions
  const adminSessionId = crypto.randomBytes(32).toString('hex')
  const studentSessionId = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(adminSessionId, adminUser.id, expiresAt)
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(studentSessionId, studentUser.id, expiresAt)

  // Seed: 2 tracks
  db.prepare(`INSERT INTO tracks (slug, name, language, color) VALUES (?, ?, ?, ?)`).run(
    'data-science', 'Data Science', 'Python', '#03ef62'
  )
  db.prepare(`INSERT INTO tracks (slug, name, language, color) VALUES (?, ?, ?, ?)`).run(
    'sql-mastery', 'SQL Mastery', 'SQL', '#3b82f6'
  )
  const track1 = db.prepare('SELECT id FROM tracks WHERE slug = ?').get('data-science')
  const track2 = db.prepare('SELECT id FROM tracks WHERE slug = ?').get('sql-mastery')

  // Seed: 3 courses
  db.prepare(`INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)`).run(
    'python-basics', 'Python Basics', 'Easy', 'Not Started'
  )
  db.prepare(`INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)`).run(
    'pandas-fundamentals', 'Pandas Fundamentals', 'Medium', 'In Progress'
  )
  db.prepare(`INSERT INTO courses (slug, name, difficulty, status) VALUES (?, ?, ?, ?)`).run(
    'advanced-sql', 'Advanced SQL', 'Hard', 'Completed'
  )

  const courses = db.prepare('SELECT id, slug FROM courses').all()
  const course1 = courses.find(c => c.slug === 'python-basics')
  const course2 = courses.find(c => c.slug === 'pandas-fundamentals')
  const course3 = courses.find(c => c.slug === 'advanced-sql')

  // Link courses to tracks
  db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track1.id, course1.id, 1)
  db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track1.id, course2.id, 2)
  db.prepare('INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)').run(track2.id, course3.id, 1)

  // Seed: user_courses for student
  db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course1.id, 'Not Started', 'No')
  db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course2.id, 'In Progress', 'No')
  db.prepare('INSERT INTO user_courses (user_id, course_id, status, reviewed) VALUES (?, ?, ?, ?)').run(studentUser.id, course3.id, 'Completed', 'Yes')

  // Seed: concepts
  db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course1.id, 'Variables', 'Storage locations for data')
  db.prepare('INSERT INTO concepts (course_id, name, definition) VALUES (?, ?, ?)').run(course1.id, 'Loops', 'Iterative control structures')

  // Seed: flashcards
  db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?)').run(course1.id, 1, 'What is a variable?', 'A storage location')
  db.prepare('INSERT INTO flashcards (course_id, concept_id, front, back) VALUES (?, ?, ?, ?)').run(course1.id, 2, 'What is a loop?', 'Iterative structure')

  // Seed: quiz_questions
  db.prepare(`INSERT INTO quiz_questions (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(course1.id, 1, 'What type is `x = 5`?', 'int', 'str', 'float', 'list', 'A')
  db.prepare(`INSERT INTO quiz_questions (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(course1.id, 2, 'Which keyword starts a loop?', 'if', 'for', 'def', 'import', 'B')

  // Seed: user_stats for both users
  db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(adminUser.id, 0, 'Beginner', 0, 0, null)
  db.prepare('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(studentUser.id, 150, 'Intermediate', 3, 5, new Date().toISOString().split('T')[0])

  return {
    db,
    adminToken: adminSessionId,
    studentToken: studentSessionId,
    adminUser,
    studentUser,
    courses,
    track1,
    track2,
    cleanup: () => { db.close() }
  }
}
