import db from './database.js'

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      language TEXT,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      track_id INTEGER REFERENCES tracks(id),
      difficulty TEXT DEFAULT 'Unknown',
      order_in_track INTEGER,
      status TEXT DEFAULT 'Not Started',
      notes TEXT,
      reviewed TEXT DEFAULT 'No',
      has_pdf INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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

    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_type TEXT NOT NULL,
      course_id INTEGER REFERENCES courses(id),
      question_id INTEGER,
      score REAL,
      time_taken_secs INTEGER,
      was_correct INTEGER DEFAULT 0,
      attempted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mastery_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER UNIQUE REFERENCES courses(id),
      flashcard_score REAL DEFAULT 0,
      quiz_score REAL DEFAULT 0,
      code_score REAL DEFAULT 0,
      dataset_score REAL DEFAULT 0,
      overall_mastery REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_xp INTEGER DEFAULT 0,
      level TEXT DEFAULT 'Beginner',
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      badges_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS spaced_repetition_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flashcard_id INTEGER REFERENCES flashcards(id),
      due_date TEXT,
      priority INTEGER DEFAULT 1
    );
  `)

  // Migration: Add has_glossary to courses if it doesn't exist
  try {
    db.exec(`ALTER TABLE courses ADD COLUMN has_glossary INTEGER DEFAULT 0`)
  } catch (e) {
    // column already exists, ignore
  }
}
