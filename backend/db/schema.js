import db from './database.pg.js'
import crypto from 'crypto'

// Helper: Hash password using PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

export async function initSchema() {
  // 1. Create essential user and session tables first
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT false,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL
    );
  `)

  // 2. Ensure columns exist on users (ignore if already exists)
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false`)
  } catch (e) {}

  // 3. Create the two requested users if they don't exist
  // User 1: admin@gmail.com / admin123 (super user)
  const adminExists = await db.prepare('SELECT id FROM users WHERE username = ?').get('admin@gmail.com')
  if (!adminExists) {
    const { salt, hash } = hashPassword('admin123')
    await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, true) RETURNING id').run('admin@gmail.com', hash, salt)
    console.log('Created super user admin@gmail.com')
  }

  // User 2: wasihunageru@gmail.com / waseageru
  const wasihunExists = await db.prepare('SELECT id FROM users WHERE username = ?').get('wasihunageru@gmail.com')
  let wasihunUserId = wasihunExists ? wasihunExists.id : null
  if (!wasihunExists) {
    const { salt, hash } = hashPassword('waseageru')
    const res = await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, false) RETURNING id').run('wasihunageru@gmail.com', hash, salt)
    wasihunUserId = res.lastInsertRowid
    console.log('Created user wasihunageru@gmail.com')
  }

  // 4. Create remaining static & dynamic tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      language TEXT,
      color TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      difficulty TEXT DEFAULT 'Unknown',
      order_in_track INTEGER,
      status TEXT DEFAULT 'Not Started',
      notes TEXT,
      reviewed TEXT DEFAULT 'No',
      has_pdf INTEGER DEFAULT 0,
      has_glossary INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS track_courses (
      track_id INTEGER NOT NULL REFERENCES tracks(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      order_in_track INTEGER,
      PRIMARY KEY (track_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS concepts (
      id SERIAL PRIMARY KEY,
      course_id INTEGER REFERENCES courses(id),
      name TEXT NOT NULL,
      definition TEXT,
      code_snippet TEXT,
      source_page INTEGER,
      category TEXT,
      difficulty INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id SERIAL PRIMARY KEY,
      concept_id INTEGER REFERENCES concepts(id),
      course_id INTEGER REFERENCES courses(id),
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      next_review_date TEXT DEFAULT (CURRENT_DATE::TEXT),
      interval_days INTEGER DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      repetitions INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      course_slug TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      question_id TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(user_id, exercise_type, question_id)
    );
  `)
}
