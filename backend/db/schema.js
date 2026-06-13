import db from './database.js'
import crypto from 'crypto'

// Helper: Hash password using PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

export function initSchema() {
  // 1. Create essential user and session tables first
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
  `)

  // 2. Ensure columns exist on users
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`)
  } catch (e) {}

  // 3. Create the two requested users if they don't exist
  // User 1: admin@gmail.com / admin123 (super user)
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin@gmail.com')
  if (!adminExists) {
    const { salt, hash } = hashPassword('admin123')
    db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 1)').run('admin@gmail.com', hash, salt)
    console.log('Created super user admin@gmail.com')
  }

  // User 2: wasihunageru@gmail.com / waseageru
  const wasihunExists = db.prepare('SELECT id FROM users WHERE username = ?').get('wasihunageru@gmail.com')
  let wasihunUserId = wasihunExists ? wasihunExists.id : null
  if (!wasihunExists) {
    const { salt, hash } = hashPassword('waseageru')
    const res = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('wasihunageru@gmail.com', hash, salt)
    wasihunUserId = res.lastInsertRowid
    console.log('Created user wasihunageru@gmail.com')
  }

  // 4. Create remaining static & dynamic tables
  db.exec(`
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
      track_id INTEGER REFERENCES tracks(id),
      difficulty TEXT DEFAULT 'Unknown',
      order_in_track INTEGER,
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
  `)

  // 5. Run Database migrations to support multi-user state
  // Check if we need to migrate user_courses, user_tracks, and user_flashcard_progress
  db.transaction(() => {
    // If user_courses is empty but courses has notes/status, migrate wasihun's courses
    const userCoursesCount = db.prepare('SELECT COUNT(*) AS count FROM user_courses').get().count
    if (userCoursesCount === 0 && wasihunUserId) {
      db.prepare(`
        INSERT INTO user_courses (user_id, course_id, status, difficulty, notes, reviewed, is_deleted, is_archived)
        SELECT ?, id, status, difficulty, notes, reviewed, is_deleted, is_archived FROM courses
        WHERE status != 'Not Started' OR notes IS NOT NULL OR reviewed != 'No' OR is_deleted = 1 OR is_archived = 1
      `).run(wasihunUserId)
      console.log('Migrated courses progress to wasihunageru@gmail.com')
    }

    const userTracksCount = db.prepare('SELECT COUNT(*) AS count FROM user_tracks').get().count
    if (userTracksCount === 0 && wasihunUserId) {
      db.prepare(`
        INSERT INTO user_tracks (user_id, track_id, is_deleted, is_archived)
        SELECT ?, id, is_deleted, is_archived FROM tracks
        WHERE is_deleted = 1 OR is_archived = 1
      `).run(wasihunUserId)
      console.log('Migrated tracks states to wasihunageru@gmail.com')
    }

    const userFcCount = db.prepare('SELECT COUNT(*) AS count FROM user_flashcard_progress').get().count
    if (userFcCount === 0 && wasihunUserId) {
      db.prepare(`
        INSERT INTO user_flashcard_progress (user_id, flashcard_id, interval_days, ease_factor, repetitions, next_review_date)
        SELECT ?, id, interval_days, ease_factor, repetitions, next_review_date FROM flashcards
        WHERE repetitions > 0 OR interval_days > 1
      `).run(wasihunUserId)
      console.log('Migrated flashcards progress to wasihunageru@gmail.com')
    }

    // Migrate user_stats table
    let statsTableInfo = db.prepare("PRAGMA table_info(user_stats)").all()
    let hasUserIdInStats = statsTableInfo.some(col => col.name === 'user_id')
    if (!hasUserIdInStats) {
      console.log('Migrating user_stats table to support user_id...')
      db.exec(`ALTER TABLE user_stats RENAME TO old_user_stats`)
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE REFERENCES users(id),
          total_xp INTEGER DEFAULT 0,
          level TEXT DEFAULT 'Beginner',
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          last_active_date TEXT,
          badges_json TEXT DEFAULT '[]'
        )
      `)
      // Copy the existing stats (id = 1) to wasihun's user_stats
      const oldStats = db.prepare('SELECT * FROM old_user_stats WHERE id = 1').get()
      if (oldStats && wasihunUserId) {
        db.prepare(`
          INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date, badges_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(wasihunUserId, oldStats.total_xp, oldStats.level, oldStats.current_streak, oldStats.longest_streak, oldStats.last_active_date, oldStats.badges_json)
      }
      db.exec(`DROP TABLE old_user_stats`)
      console.log('user_stats table migrated successfully.')
    }

    // Ensure wasihun user has stats row if not exists
    if (wasihunUserId) {
      const hasStatsRow = db.prepare('SELECT 1 FROM user_stats WHERE user_id = ?').get(wasihunUserId)
      if (!hasStatsRow) {
        db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(wasihunUserId)
      }
    }
    // Also ensure admin has stats row
    const adminUserId = adminExists ? adminExists.id : db.prepare('SELECT id FROM users WHERE username = ?').get('admin@gmail.com').id
    const hasAdminStatsRow = db.prepare('SELECT 1 FROM user_stats WHERE user_id = ?').get(adminUserId)
    if (!hasAdminStatsRow) {
      db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(adminUserId)
    }

    // Migrate mastery_scores table
    let masteryTableInfo = db.prepare("PRAGMA table_info(mastery_scores)").all()
    let hasUserIdInMastery = masteryTableInfo.some(col => col.name === 'user_id')
    if (!hasUserIdInMastery) {
      console.log('Migrating mastery_scores table to support user_id...')
      db.exec(`ALTER TABLE mastery_scores RENAME TO old_mastery_scores`)
      db.exec(`
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
          overall_mastery REAL DEFAULT 0,
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(user_id, course_id)
        )
      `)
      // Copy and associate all scores with wasihun
      if (wasihunUserId) {
        db.prepare(`
          INSERT OR IGNORE INTO mastery_scores (user_id, course_id, flashcard_score, quiz_score, code_score, dataset_score, matching_score, boss_score, overall_mastery, updated_at)
          SELECT ?, course_id, flashcard_score, quiz_score, code_score, dataset_score, matching_score, boss_score, overall_mastery, updated_at
          FROM old_mastery_scores
        `).run(wasihunUserId)
      }
      db.exec(`DROP TABLE old_mastery_scores`)
      console.log('mastery_scores table migrated successfully.')
    }

    // Migrate exercise_attempts table
    let attemptsTableInfo = db.prepare("PRAGMA table_info(exercise_attempts)").all()
    let hasUserIdInAttempts = attemptsTableInfo.some(col => col.name === 'user_id')
    if (!hasUserIdInAttempts) {
      console.log('Migrating exercise_attempts table to support user_id...')
      db.exec(`ALTER TABLE exercise_attempts ADD COLUMN user_id INTEGER REFERENCES users(id) DEFAULT NULL`)
      if (wasihunUserId) {
        db.prepare(`UPDATE exercise_attempts SET user_id = ? WHERE user_id IS NULL`).run(wasihunUserId)
      }
      console.log('exercise_attempts table migrated successfully.')
    }

    // Migrate spaced_repetition_queue table
    let srqTableInfo = db.prepare("PRAGMA table_info(spaced_repetition_queue)").all()
    let hasUserIdInSrq = srqTableInfo.some(col => col.name === 'user_id')
    if (!hasUserIdInSrq) {
      console.log('Migrating spaced_repetition_queue table to support user_id...')
      db.exec(`ALTER TABLE spaced_repetition_queue RENAME TO old_spaced_repetition_queue`)
      db.exec(`
        CREATE TABLE IF NOT EXISTS spaced_repetition_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          flashcard_id INTEGER NOT NULL REFERENCES flashcards(id),
          due_date TEXT,
          priority INTEGER DEFAULT 1,
          UNIQUE(user_id, flashcard_id)
        )
      `)
      if (wasihunUserId) {
        db.prepare(`
          INSERT OR IGNORE INTO spaced_repetition_queue (user_id, flashcard_id, due_date, priority)
          SELECT ?, flashcard_id, due_date, priority
          FROM old_spaced_repetition_queue
        `).run(wasihunUserId)
      }
      db.exec(`DROP TABLE old_spaced_repetition_queue`)
      console.log('spaced_repetition_queue table migrated successfully.')
    }
  })()

  // Migration: Add has_glossary to courses if it doesn't exist
  try {
    db.exec(`ALTER TABLE courses ADD COLUMN has_glossary INTEGER DEFAULT 0`)
  } catch (e) {
    // column already exists, ignore
  }

  // Migration: Add concept_id to exercise_attempts if it doesn't exist
  try {
    db.exec(`ALTER TABLE exercise_attempts ADD COLUMN concept_id TEXT DEFAULT NULL`)
  } catch (e) {
    // column already exists, ignore
  }

  // Migration: Create track_courses if not exists and run data migration
  db.exec(`
    CREATE TABLE IF NOT EXISTS track_courses (
      track_id INTEGER NOT NULL REFERENCES tracks(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      order_in_track INTEGER,
      PRIMARY KEY (track_id, course_id)
    );
  `);

  try {
    const coursesColumns = db.prepare("PRAGMA table_info(courses)").all()
    const hasTrackIdInCourses = coursesColumns.some(col => col.name === 'track_id')
    
    if (hasTrackIdInCourses) {
      const trackCoursesCount = db.prepare('SELECT COUNT(*) AS count FROM track_courses').get().count
      if (trackCoursesCount === 0) {
        console.log('Migrating courses table to many-to-many track_courses relation...')
        db.transaction(() => {
          const allCourses = db.prepare('SELECT * FROM courses').all()
          const coursesBySlug = {}
          for (const c of allCourses) {
            if (!coursesBySlug[c.slug]) {
              coursesBySlug[c.slug] = []
            }
            coursesBySlug[c.slug].push(c)
          }

          for (const [slug, list] of Object.entries(coursesBySlug)) {
            const unifiedCourse = list[0]
            const unifiedId = unifiedCourse.id

            for (const c of list) {
              // Insert association into track_courses
              db.prepare(`
                INSERT OR IGNORE INTO track_courses (track_id, course_id, order_in_track)
                VALUES (?, ?, ?)
              `).run(c.track_id, unifiedId, c.order_in_track || 1)

              if (c.id !== unifiedId) {
                // Relink references
                db.prepare('UPDATE concepts SET course_id = ? WHERE course_id = ?').run(unifiedId, c.id)
                db.prepare('UPDATE flashcards SET course_id = ? WHERE course_id = ?').run(unifiedId, c.id)
                db.prepare('UPDATE quiz_questions SET course_id = ? WHERE course_id = ?').run(unifiedId, c.id)
                db.prepare('UPDATE exercise_attempts SET course_id = ? WHERE course_id = ?').run(unifiedId, c.id)
                db.prepare('DELETE FROM mastery_scores WHERE course_id = ?').run(c.id)

                // Merge user progress
                const duplicateUserCourses = db.prepare('SELECT * FROM user_courses WHERE course_id = ?').all(c.id)
                for (const duc of duplicateUserCourses) {
                  const uuc = db.prepare('SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?').get(duc.user_id, unifiedId)
                  if (!uuc) {
                    db.prepare(`
                      INSERT INTO user_courses (user_id, course_id, status, difficulty, notes, reviewed, is_deleted, is_archived)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(duc.user_id, unifiedId, duc.status, duc.difficulty, duc.notes, duc.reviewed, duc.is_deleted, duc.is_archived)
                  } else {
                    let mergedStatus = uuc.status
                    if (duc.status === 'Completed' || uuc.status === 'Completed') {
                      mergedStatus = 'Completed'
                    } else if (duc.status === 'In Progress' || uuc.status === 'In Progress') {
                      mergedStatus = 'In Progress'
                    }
                    let mergedReviewed = uuc.reviewed === 'Yes' || duc.reviewed === 'Yes' ? 'Yes' : 'No'
                    let mergedNotes = uuc.notes || duc.notes
                    let mergedDifficulty = uuc.difficulty !== 'Unknown' ? uuc.difficulty : duc.difficulty

                    db.prepare(`
                      UPDATE user_courses
                      SET status = ?, reviewed = ?, notes = ?, difficulty = ?
                      WHERE user_id = ? AND course_id = ?
                    `).run(mergedStatus, mergedReviewed, mergedNotes, mergedDifficulty, duc.user_id, unifiedId)
                  }
                }
                db.prepare('DELETE FROM user_courses WHERE course_id = ?').run(c.id)

                // Delete duplicate course
                db.prepare('DELETE FROM courses WHERE id = ?').run(c.id)
              }
            }
          }
        })()
        console.log('Database migrated successfully to support track_courses.')
      }
    }
  } catch (err) {
    console.error('Failed to run track_courses migration:', err)
  }
}
