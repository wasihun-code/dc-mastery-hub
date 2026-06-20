import db from './database.pg.js'
import crypto from 'crypto'

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

export async function initSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `)

  // Ensure is_admin exists (migration equivalent)
  const usersCols = await db.prepare(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`).all()
  if (!usersCols.some(c => c.column_name === 'is_admin')) {
    await db.exec(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE`)
  }

  // Seed default users
  const adminExists = await db.prepare('SELECT id FROM users WHERE username = ?').get('admin@gmail.com')
  if (!adminExists) {
    const { salt, hash } = hashPassword('admin123')
    await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, TRUE)').run('admin@gmail.com', hash, salt)
    console.log('Created super user admin@gmail.com')
  }

  const wasihunExists = await db.prepare('SELECT id FROM users WHERE username = ?').get('wasihunageru@gmail.com')
  if (!wasihunExists) {
    const { salt, hash } = hashPassword('waseageru')
    await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, FALSE)').run('wasihunageru@gmail.com', hash, salt)
    console.log('Created user wasihunageru@gmail.com')
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      language TEXT,
      color TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_deleted BOOLEAN DEFAULT FALSE,
      is_archived BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      difficulty TEXT DEFAULT 'Unknown',
      status TEXT DEFAULT 'Not Started',
      notes TEXT,
      notes_taken BOOLEAN DEFAULT FALSE,
      reviewed TEXT DEFAULT 'No',
      has_pdf BOOLEAN DEFAULT FALSE,
      has_glossary BOOLEAN DEFAULT FALSE,
      is_deleted BOOLEAN DEFAULT FALSE,
      is_archived BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
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
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id SERIAL PRIMARY KEY,
      concept_id INTEGER REFERENCES concepts(id),
      course_id INTEGER REFERENCES courses(id),
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      next_review_date DATE DEFAULT CURRENT_DATE,
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, exercise_type, question_id)
    );

    CREATE TABLE IF NOT EXISTS user_tracks (
      user_id INTEGER NOT NULL REFERENCES users(id),
      track_id INTEGER NOT NULL REFERENCES tracks(id),
      is_deleted BOOLEAN DEFAULT FALSE,
      is_archived BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (user_id, track_id)
    );

    CREATE TABLE IF NOT EXISTS user_courses (
      user_id INTEGER NOT NULL REFERENCES users(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      status TEXT DEFAULT 'Not Started',
      difficulty TEXT DEFAULT 'Unknown',
      notes TEXT,
      notes_taken BOOLEAN DEFAULT FALSE,
      reviewed TEXT DEFAULT 'No',
      is_deleted BOOLEAN DEFAULT FALSE,
      is_archived BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS user_flashcard_progress (
      user_id INTEGER NOT NULL REFERENCES users(id),
      flashcard_id INTEGER NOT NULL REFERENCES flashcards(id),
      interval_days INTEGER DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      repetitions INTEGER DEFAULT 0,
      next_review_date DATE DEFAULT CURRENT_DATE,
      PRIMARY KEY (user_id, flashcard_id)
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id),
      total_xp INTEGER DEFAULT 0,
      level TEXT DEFAULT 'Beginner',
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      badges_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS mastery_scores (
      id SERIAL PRIMARY KEY,
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
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      course_id INTEGER REFERENCES courses(id),
      concept_id TEXT DEFAULT NULL,
      exercise_type TEXT NOT NULL,
      question_id TEXT,
      was_correct BOOLEAN,
      score REAL DEFAULT 0,
      time_taken_secs INTEGER DEFAULT NULL,
      attempted_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spaced_repetition_queue (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      flashcard_id INTEGER NOT NULL REFERENCES flashcards(id),
      due_date TEXT,
      priority INTEGER DEFAULT 1,
      UNIQUE(user_id, flashcard_id)
    );
  `)
}

// Script runner if executed directly
if (process.argv[1] && process.argv[1].endsWith('schema.pg.js')) {
  initSchema().then(() => {
    console.log('Postgres schema initialized.')
    process.exit(0)
  }).catch(e => {
    console.error('Failed to initialize Postgres schema:', e)
    process.exit(1)
  })
}
