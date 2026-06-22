import { jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'

function createExerciseFile(courseFolder, fileName, data) {
  const exercisesDir = path.join(courseFolder, 'exercises')
  fs.mkdirSync(exercisesDir, { recursive: true })
  fs.writeFileSync(path.join(exercisesDir, fileName), JSON.stringify(data), 'utf-8')
}

let env, contentDir, db, importJsonExercises

beforeAll(async () => {
  env = await setupTestEnvironment()
  contentDir = path.join(env.tmpDir, 'content')
  process.env.CONTENT_PATH = contentDir

  jest.resetModules()

  const { initSchema } = await import('../db/schema.js')
  await initSchema()

  const pgDb = (await import('../db/database.pg.js')).default
  db = pgDb

  await db.prepare('DELETE FROM user_stats').run()
  await db.prepare('DELETE FROM sessions').run()
  await db.prepare('DELETE FROM users').run()
  await seedTestData(db)

  const mod = await import('../db/jsonImporter.js')
  importJsonExercises = mod.importJsonExercises
})

afterAll(async () => {
  await cleanupTestEnvironment(env.tmpDir)
  if (typeof db !== 'undefined' && db && db.end) await db.end();
})

afterEach(async () => {
  // Clean imported data from previous tests
  const course3 = await db.prepare("SELECT id FROM courses WHERE slug = 'advanced-sql'").get()
  if (course3) {
    await db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(course3.id)
    await db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(course3.id)
    await db.prepare('DELETE FROM concepts WHERE course_id = ?').run(course3.id)
  }
  // Remove all content files so each test starts clean
  if (fs.existsSync(contentDir)) {
    fs.rmSync(contentDir, { recursive: true, force: true })
  }
})

describe('importJsonExercises', () => {
  test('returns success with courses_imported when exercises are imported', async () => {
    const courseFolder = path.join(contentDir, 'tracks', 'sql-mastery', 'advanced-sql')
    createExerciseFile(courseFolder, 'mcq.json', {
      questions: [
        {
          id: 301,
          question_text: 'What is a window function?',
          options: { a: 'Aggregate', b: 'Rank', c: 'Partition', d: 'Join' },
          correct_option: 'C',
          concept_id: 'concept_003',
          difficulty: 'medium'
        },
        {
          id: 302,
          question_text: 'What is a CTE?',
          options: { a: 'Table', b: 'Query', c: 'Temp result', d: 'Index' },
          correct_option: 'C',
          concept_id: 'concept_004',
          difficulty: 'easy'
        }
      ]
    })
    createExerciseFile(courseFolder, 'flashcards.json', {
      cards: [
        {
          id: 301,
          front: 'What is a window function?',
          back: 'A function that operates on a partition',
          concept_id: 'concept_003',
          concept_name: 'Window Functions',
          difficulty: 'medium'
        },
        {
          id: 302,
          front: 'What is a CTE?',
          back: 'A temporary named result set',
          concept_id: 'concept_004',
          concept_name: 'CTE',
          difficulty: 'easy'
        }
      ]
    })
    createExerciseFile(courseFolder, 'ftb.json', {
      exercises: [
        {
          id: 301,
          concept_id: 'concept_003',
          concept_name: 'Window Functions',
          task_description: 'Complete the window function',
          blanks: [{ answer: 'OVER' }]
        },
        {
          id: 302,
          concept_id: 'concept_004',
          concept_name: 'CTE',
          task_description: 'Complete the CTE syntax',
          blanks: [{ answer: 'WITH' }]
        }
      ]
    })

    const result = importJsonExercises()
    expect(result.status).toBe('success')
    expect(result.courses_imported).toBe(1)
  })

  test('returns courses_imported: 0 when no content folder exists', async () => {
    const result = importJsonExercises()
    expect(result.status).toBe('success')
    expect(result.courses_imported).toBe(0)
  })

  test('creates concepts, flashcards, and quiz_questions in DB', async () => {
    const courseFolder = path.join(contentDir, 'tracks', 'sql-mastery', 'advanced-sql')
    createExerciseFile(courseFolder, 'mcq.json', {
      questions: [
        {
          id: 301,
          question_text: 'What is a window function?',
          options: { a: 'Aggregate', b: 'Rank', c: 'Partition', d: 'Join' },
          correct_option: 'C',
          concept_id: 'concept_003',
          difficulty: 'medium'
        },
        {
          id: 302,
          question_text: 'What is a CTE?',
          options: { a: 'Table', b: 'Query', c: 'Temp result', d: 'Index' },
          correct_option: 'C',
          concept_id: 'concept_004',
          difficulty: 'easy'
        }
      ]
    })
    createExerciseFile(courseFolder, 'flashcards.json', {
      cards: [
        {
          id: 301,
          front: 'What is a window function?',
          back: 'A function that operates on a partition',
          concept_id: 'concept_003',
          concept_name: 'Window Functions',
          difficulty: 'medium'
        },
        {
          id: 302,
          front: 'What is a CTE?',
          back: 'A temporary named result set',
          concept_id: 'concept_004',
          concept_name: 'CTE',
          difficulty: 'easy'
        }
      ]
    })
    createExerciseFile(courseFolder, 'ftb.json', {
      exercises: [
        {
          id: 301,
          concept_id: 'concept_003',
          concept_name: 'Window Functions',
          task_description: 'Complete the window function',
          blanks: [{ answer: 'OVER' }]
        },
        {
          id: 302,
          concept_id: 'concept_004',
          concept_name: 'CTE',
          task_description: 'Complete the CTE syntax',
          blanks: [{ answer: 'WITH' }]
        }
      ]
    })

    importJsonExercises()

    const course3 = await db.prepare("SELECT id FROM courses WHERE slug = 'advanced-sql'").get()
    expect(course3).toBeTruthy()

    const concepts = await db.prepare('SELECT * FROM concepts WHERE course_id = ?').all(course3.id)
    expect(concepts.length).toBe(2)
    const conceptNames = concepts.map(c => c.name)
    expect(conceptNames).toContain('Window Functions')
    expect(conceptNames).toContain('CTE')

    const flashcards = await db.prepare('SELECT * FROM flashcards WHERE course_id = ?').all(course3.id)
    expect(flashcards.length).toBe(2)
    expect(flashcards[0].front).toBeTruthy()
    expect(flashcards[0].back).toBeTruthy()

    const quizQuestions = await db.prepare('SELECT * FROM quiz_questions WHERE course_id = ?').all(course3.id)
    expect(quizQuestions.length).toBe(2)
    expect(quizQuestions[0].question_text).toBeTruthy()
    expect(quizQuestions[0].option_a).toBeTruthy()
  })

  test('skips courses that already have concepts (already seeded)', async () => {
    const courseFolder = path.join(contentDir, 'tracks', 'data-science', 'python-basics')
    createExerciseFile(courseFolder, 'mcq.json', {
      questions: [
        {
          id: 401,
          question_text: 'What is variable assignment?',
          options: { a: '=', b: '==', c: ':=', d: '->' },
          correct_option: 'A',
          concept_id: 'concept_005'
        }
      ]
    })
    createExerciseFile(courseFolder, 'flashcards.json', {
      cards: [
        {
          id: 401,
          front: 'What is a variable?',
          back: 'A storage location for data',
          concept_id: 'concept_005'
        }
      ]
    })
    createExerciseFile(courseFolder, 'ftb.json', {
      exercises: [
        {
          id: 401,
          concept_id: 'concept_005',
          task_description: 'Fill in the variable assignment'
        }
      ]
    })

    const result = importJsonExercises()
    expect(result.status).toBe('success')
    expect(result.courses_imported).toBe(0)
  })

  test('imports matching.json pairs as concepts', async () => {
    const courseFolder = path.join(contentDir, 'tracks', 'sql-mastery', 'advanced-sql')
    createExerciseFile(courseFolder, 'mcq.json', {
      questions: [{
        id: 301,
        question_text: 'What is SQL?',
        options: { a: 'Language', b: 'DB', c: 'Query', d: 'Table' },
        correct_option: 'A',
        concept_id: 'concept_003',
        difficulty: 'easy'
      }]
    })
    createExerciseFile(courseFolder, 'flashcards.json', {
      cards: [{
        id: 301,
        front: 'What is SQL?',
        back: 'A query language',
        concept_id: 'concept_003',
        concept_name: 'SQL Basics',
        difficulty: 'easy'
      }]
    })
    createExerciseFile(courseFolder, 'ftb.json', {
      exercises: [{
        id: 301,
        concept_id: 'concept_003',
        concept_name: 'SQL Basics',
        task_description: 'Complete the SQL'
      }]
    })
    createExerciseFile(courseFolder, 'matching.json', {
      rounds: [{
        pairs: [
          {
            concept_id: 'concept_005',
            term: 'JOIN',
            match: 'Combines rows from two tables'
          }
        ]
      }]
    })

    const result = importJsonExercises()
    expect(result.status).toBe('success')
    expect(result.courses_imported).toBe(1)

    const course3 = await db.prepare("SELECT id FROM courses WHERE slug = 'advanced-sql'").get()
    const concepts = await db.prepare('SELECT name FROM concepts WHERE course_id = ?').all(course3.id)
    const conceptNames = concepts.map(c => c.name)
    expect(conceptNames).toContain('SQL Basics')
    expect(conceptNames).toContain('JOIN')
  })

  test('handles malformed mcq.json gracefully', async () => {
    const courseFolder = path.join(contentDir, 'tracks', 'sql-mastery', 'advanced-sql')
    const exercisesDir = path.join(courseFolder, 'exercises')
    fs.mkdirSync(exercisesDir, { recursive: true })
    fs.writeFileSync(path.join(exercisesDir, 'mcq.json'), 'not valid json {{{', 'utf-8')
    fs.writeFileSync(path.join(exercisesDir, 'flashcards.json'), JSON.stringify({ cards: [] }), 'utf-8')
    fs.writeFileSync(path.join(exercisesDir, 'ftb.json'), JSON.stringify({ exercises: [] }), 'utf-8')

    const result = importJsonExercises()
    expect(result.status).toBe('success')
    expect(result.courses_imported).toBe(0)
  })

  test('handles exercises with no concept_ids', async () => {
    const courseFolder = path.join(contentDir, 'tracks', 'sql-mastery', 'advanced-sql')
    createExerciseFile(courseFolder, 'mcq.json', {
      questions: [{
        id: 301,
        question_text: 'Test question?',
        options: { a: 'A', b: 'B', c: 'C', d: 'D' },
        correct_option: 'A'
      }]
    })
    createExerciseFile(courseFolder, 'flashcards.json', {
      cards: [{
        id: 301,
        front: 'Test front',
        back: 'Test back'
      }]
    })
    createExerciseFile(courseFolder, 'ftb.json', {
      exercises: [{
        task_description: 'Test task'
      }]
    })

    const result = importJsonExercises()
    expect(result.status).toBe('success')
    expect(result.courses_imported).toBe(1)

    const course3 = await db.prepare("SELECT id FROM courses WHERE slug = 'advanced-sql'").get()
    const concepts = await db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course3.id)
    expect(concepts.count).toBe(0)
    const flashcards = await db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(course3.id)
    expect(flashcards.count).toBe(0)
    const quizQuestions = await db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course3.id)
    expect(quizQuestions.count).toBe(0)
  })
})
