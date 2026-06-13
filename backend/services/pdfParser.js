import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import db from '../db/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Runs the Python script to extract raw text from PDF files.
 */
export function extractRawText(courseSlug) {
  const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(courseSlug)
  if (!course) throw new Error('Course not found')
  
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(course.track_id)

  const contentFolder = process.env.CONTENT_FOLDER 
    ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
        ? process.env.CONTENT_FOLDER 
        : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
    : path.resolve(__dirname, '../../content')
    
  const courseFolder = path.join(contentFolder, 'tracks', track.slug, courseSlug)
  const slidesPdf = path.join(courseFolder, courseSlug + '.pdf')
  const glossaryPdf = path.join(courseFolder, courseSlug + '-glossary.pdf')
  
  let pythonExe = process.env.PYTHON_EXECUTABLE || 'python3'
  if (pythonExe.startsWith('.')) {
    pythonExe = path.resolve(process.cwd(), pythonExe)
  }
  
  const scriptPath = path.resolve(__dirname, '../../scripts/extract_pdf.py')

  if (!fs.existsSync(slidesPdf)) {
    throw new Error('slides PDF not found: ' + slidesPdf)
  }

  let cmd = `"${pythonExe}" "${scriptPath}" --slides "${slidesPdf}" --course-slug "${courseSlug}"`
  
  if (fs.existsSync(glossaryPdf)) {
    cmd += ` --glossary "${glossaryPdf}"`
  }
  
  console.log('[Parser] Extracting raw text for:', courseSlug)
  
  const output = execSync(cmd, {
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env }
  })
  
  return JSON.parse(output.toString())
}

/**
 * Stores concepts and quiz questions into the database.
 * Generates flashcards from concepts.
 */
export function storeExtractedContent(courseSlug, extractedData) {
  const course = db.prepare('SELECT id FROM courses WHERE slug = ?').get(courseSlug)
  if (!course) throw new Error('Course not found')

  const { concepts, quiz_questions } = extractedData

  // 1. Clear existing data in correct order (child tables first)
  db.prepare('DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(course.id)
  db.prepare('DELETE FROM spaced_repetition_queue WHERE flashcard_id IN (SELECT id FROM flashcards WHERE course_id = ?)').run(course.id)
  db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(course.id)
  db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(course.id)
  db.prepare('DELETE FROM concepts WHERE course_id = ?').run(course.id)

  // 2. Insert concepts and build map
  const insertConcept = db.prepare(`
    INSERT INTO concepts 
      (course_id, name, definition, code_snippet, source_page, category, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  
  const insertFlashcard = db.prepare(`
    INSERT INTO flashcards
      (concept_id, course_id, front, back, next_review_date, interval_days, ease_factor, repetitions)
    VALUES (?, ?, ?, ?, date('now'), 1, 2.5, 0)
  `)

  const conceptMap = new Map() // name.toLowerCase() -> id
  let flashcardCount = 0

  for (const concept of concepts) {
    const r = insertConcept.run(
      course.id,
      concept.name.slice(0, 200),
      concept.definition.slice(0, 500),
      concept.code_snippet || null,
      concept.source_page || 0,
      concept.category || 'general',
      concept.difficulty || 1
    )
    
    const conceptId = r.lastInsertRowid
    conceptMap.set(concept.name.toLowerCase(), conceptId)

    // 3. Generate flashcards - RECALL FOCUS
    insertFlashcard.run(
      conceptId,
      course.id,
      concept.definition.slice(0, 500),
      concept.name.slice(0, 300)
    )
    flashcardCount++
    
    if (concept.code_snippet) {
      insertFlashcard.run(
        conceptId,
        course.id,
        ('What concept does this code demonstrate?\n\n```python\n' + concept.code_snippet + '\n```').slice(0, 400),
        (concept.name + '\n' + concept.definition).slice(0, 500)
      )
      flashcardCount++
    }
  }

  // 4. Insert quiz questions with shuffled options
  const insertQuestion = db.prepare(`
    INSERT INTO quiz_questions
      (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, question_type, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let questionCount = 0
  for (let q of quiz_questions) {
    let conceptId = null
    if (q.concept_name) {
      const nameKey = q.concept_name.toLowerCase()
      // Try exact match or find first matching in the map
      if (conceptMap.has(nameKey)) {
        conceptId = conceptMap.get(nameKey)
      } else {
        // Partial match fallback
        for (const [name, id] of conceptMap.entries()) {
          if (name.includes(nameKey) || nameKey.includes(name)) {
            conceptId = id
            break
          }
        }
      }
    }

    // Fix 1A: Shuffle Options
    const positions = ['a', 'b', 'c', 'd']
    const correctText = q['option_' + q.correct_option]
    const allOptions = [q.option_a, q.option_b, q.option_c, q.option_d]

    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]]
    }

    const newCorrectIndex = allOptions.indexOf(correctText)
    const newCorrectOption = positions[newCorrectIndex]

    q.option_a = allOptions[0]
    q.option_b = allOptions[1]
    q.option_c = allOptions[2]
    q.option_d = allOptions[3]
    q.correct_option = newCorrectOption

    insertQuestion.run(
      course.id,
      conceptId,
      q.question_text,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option?.toLowerCase(),
      q.explanation,
      q.question_type || 'application',
      q.difficulty || 1
    )
    questionCount++
  }

  return {
    concepts_stored: concepts.length,
    flashcards_created: flashcardCount,
    quiz_questions_stored: questionCount
  }
}
