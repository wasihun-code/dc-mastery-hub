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
      slug TEXT NOT NULL,
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
      matching_score REAL DEFAULT 0,
      boss_score REAL DEFAULT 0,
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

    CREATE TRIGGER IF NOT EXISTS sync_course_updates
    AFTER UPDATE OF status, difficulty, notes, reviewed, has_pdf, has_glossary, is_deleted, is_archived ON courses
    FOR EACH ROW
    BEGIN
      UPDATE courses
      SET status = NEW.status,
          difficulty = NEW.difficulty,
          notes = NEW.notes,
          reviewed = NEW.reviewed,
          has_pdf = NEW.has_pdf,
          has_glossary = NEW.has_glossary,
          is_deleted = NEW.is_deleted,
          is_archived = NEW.is_archived
      WHERE slug = NEW.slug AND id != NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS sync_mastery_updates
    AFTER UPDATE ON mastery_scores
    FOR EACH ROW
    BEGIN
      UPDATE mastery_scores
      SET flashcard_score = NEW.flashcard_score,
          quiz_score = NEW.quiz_score,
          code_score = NEW.code_score,
          dataset_score = NEW.dataset_score,
          matching_score = NEW.matching_score,
          boss_score = NEW.boss_score,
          overall_mastery = NEW.overall_mastery
      WHERE course_id IN (
        SELECT id FROM courses WHERE slug = (
          SELECT slug FROM courses WHERE id = NEW.course_id
        )
      ) AND course_id != NEW.course_id;
    END;
  `)

  // Migration: Add has_glossary to courses if it doesn't exist
  try {
    db.exec(`ALTER TABLE courses ADD COLUMN has_glossary INTEGER DEFAULT 0`)
  } catch (e) {
    // column already exists, ignore
  }

  // Migration: Add matching_score and boss_score to mastery_scores if they don't exist
  try {
    db.exec(`ALTER TABLE mastery_scores ADD COLUMN matching_score REAL DEFAULT 0`)
  } catch (e) {
    // column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE mastery_scores ADD COLUMN boss_score REAL DEFAULT 0`)
  } catch (e) {
    // column already exists, ignore
  }

  // Migration: Add concept_id to exercise_attempts if it doesn't exist
  try {
    db.exec(`ALTER TABLE exercise_attempts ADD COLUMN concept_id TEXT DEFAULT NULL`)
  } catch (e) {
    // column already exists, ignore
  }

  // Migration: Add is_deleted and is_archived to tracks and courses
  try {
    db.exec(`ALTER TABLE tracks ADD COLUMN is_deleted INTEGER DEFAULT 0`)
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE tracks ADD COLUMN is_archived INTEGER DEFAULT 0`)
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE courses ADD COLUMN is_deleted INTEGER DEFAULT 0`)
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE courses ADD COLUMN is_archived INTEGER DEFAULT 0`)
  } catch (e) {}
}

