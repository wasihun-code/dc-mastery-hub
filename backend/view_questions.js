import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Find the DB (relative to backend/)
const dbPath = path.resolve(__dirname, 'data/mastery.db')

if (!fs.existsSync(dbPath)) {
  console.error(`Could not find mastery.db at ${dbPath}`)
  process.exit(1)
}

const db = new Database(dbPath)

function viewQuestions(courseSlug) {
  const course = db.prepare('SELECT id, name FROM courses WHERE slug = ?').get(courseSlug)
  
  if (!course) {
    console.error(`Course "${courseSlug}" not found in database.`)
    return
  }

  console.log(`\n=== QUESTIONS FOR: ${course.name} ===\n`)

  // 1. CONCEPTS
  const concepts = db.prepare('SELECT name, category, definition, code_snippet FROM concepts WHERE course_id = ?').all(course.id)
  console.log(`--- CONCEPTS (${concepts.length}) ---`)
  concepts.forEach((c, i) => {
    console.log(`${i + 1}. [${c.category.toUpperCase()}] ${c.name}`)
    console.log(`   Def: ${c.definition}`)
    if (c.code_snippet) console.log(`   Code: ${c.code_snippet}`)
    console.log('')
  })

  // 2. FLASHCARDS
  const flashcards = db.prepare('SELECT front, back FROM flashcards WHERE course_id = ?').all(course.id)
  console.log(`--- FLASHCARDS (${flashcards.length}) ---`)
  flashcards.forEach((f, i) => {
    console.log(`${i + 1}. FRONT: ${f.front.replace(/\n/g, ' ')}`)
    console.log(`   BACK: ${f.back}`)
    console.log('')
  })

  // 3. QUIZ QUESTIONS
  const quiz = db.prepare(`
    SELECT question_text, option_a, option_b, option_c, option_d, correct_option, explanation 
    FROM quiz_questions 
    WHERE course_id = ?
  `).all(course.id)
  console.log(`--- QUIZ QUESTIONS (${quiz.length}) ---`)
  quiz.forEach((q, i) => {
    console.log(`${i + 1}. ${q.question_text}`)
    console.log(`   A) ${q.option_a}`)
    console.log(`   B) ${q.option_b}`)
    console.log(`   C) ${q.option_c}`)
    console.log(`   D) ${q.option_d}`)
    console.log(`   CORRECT: ${q.correct_option.toUpperCase()}`)
    console.log(`   WHY: ${q.explanation}`)
    console.log('')
  })
}

const slug = process.argv[2] || 'introduction-to-python'
viewQuestions(slug)
