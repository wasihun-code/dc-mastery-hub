import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import db from '../db/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

function getWrongOptions(currentConcept, allConcepts, count = 3) {
  const filtered = allConcepts.filter(c => c.id !== currentConcept.id);
  const shuffled = shuffle([...filtered]);
  const wrong = shuffled.slice(0, count).map(c => c.definition.slice(0, 150));
  
  while (wrong.length < count) {
    wrong.push(`Alternative concept definition ${wrong.length + 1}`);
  }
  return wrong;
}

function assignOptions(correctAnswer, wrongAnswers) {
  const options = [correctAnswer, ...wrongAnswers];
  const shuffledOptions = shuffle([...options]);
  
  const correctIndex = shuffledOptions.indexOf(correctAnswer);
  const correctLetter = ['a', 'b', 'c', 'd'][correctIndex];
  
  return {
    option_a: shuffledOptions[0],
    option_b: shuffledOptions[1],
    option_c: shuffledOptions[2],
    option_d: shuffledOptions[3],
    correct_option: correctLetter
  };
}

export function parseCourse(courseSlug) {
  // Step 1 - Look up course and track in DB
  const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(courseSlug)
  if (!course) throw new Error('Course not found')
  
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(course.track_id)

  // Step 2 - Build file paths
  // Use path relative to this file to find the content directory reliably
  const contentFolder = process.env.CONTENT_FOLDER 
    ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
        ? process.env.CONTENT_FOLDER 
        : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
    : path.resolve(__dirname, '../../content')
    
  const courseFolder = path.join(contentFolder, 'tracks', track.slug, courseSlug)
  const slidesPdf = path.join(courseFolder, courseSlug + '.pdf')
  const glossaryPdf = path.join(courseFolder, courseSlug + '-glossary.pdf')
  
  // Use absolute path for python executable to avoid sys.prefix warnings
  let pythonExe = process.env.PYTHON_EXECUTABLE || 'python3'
  if (pythonExe.startsWith('.')) {
    pythonExe = path.resolve(process.cwd(), pythonExe)
  }
  
  const scriptPath = path.resolve(__dirname, '../../scripts/extract_pdf.py')
  const apiKey = process.env.GEMINI_API_KEY

  // Step 3 - Validate
  if (!fs.existsSync(slidesPdf)) {
    throw new Error('slides PDF not found: ' + slidesPdf)
  }
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set in environment')
  }

  // Step 4 - Build and run command
  let cmd = `"${pythonExe}" "${scriptPath}" --slides "${slidesPdf}" --course-slug "${courseSlug}" --api-key "${apiKey}"`
  
  if (fs.existsSync(glossaryPdf)) {
    cmd += ` --glossary "${glossaryPdf}"`
  }
  
  console.log('[Parser] Running extraction for:', courseSlug)
  
  const output = execSync(cmd, {
    timeout: 180000,
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env }
  })
  
  const result = JSON.parse(output.toString())

  // Step 5 - Store concepts in DB
  db.prepare('DELETE FROM concepts WHERE course_id = ?').run(course.id)
  
  const insertConcept = db.prepare(`
    INSERT INTO concepts 
      (course_id, name, definition, code_snippet, source_page, category, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  
  const conceptIds = []
  for (const concept of result.concepts) {
    const r = insertConcept.run(
      course.id,
      concept.name.slice(0, 200),
      concept.definition.slice(0, 500),
      concept.code_snippet || null,
      concept.source_page || 0,
      concept.category || 'general',
      concept.difficulty || 1
    )
    conceptIds.push({ id: r.lastInsertRowid, ...concept })
  }

  // Step 6 - Generate flashcards
  db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(course.id)
  
  const insertFlashcard = db.prepare(`
    INSERT INTO flashcards
      (concept_id, course_id, front, back, next_review_date, interval_days, ease_factor, repetitions)
    VALUES (?, ?, ?, ?, date('now'), 1, 2.5, 0)
  `)
  
  let flashcardCount = 0
  for (const concept of conceptIds) {
    insertFlashcard.run(
      concept.id,
      course.id,
      concept.name.slice(0, 300),
      concept.definition.slice(0, 500)
    )
    flashcardCount++
    
    if (concept.code_snippet) {
      insertFlashcard.run(
        concept.id,
        course.id,
        ('What does this code do?\n' + concept.code_snippet).slice(0, 400),
        (concept.name + ': ' + concept.definition).slice(0, 500)
      )
      flashcardCount++
    }
  }

  // Step 7 - Generate quiz questions
  db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(course.id)
  
  const insertQuestion = db.prepare(`
    INSERT INTO quiz_questions
      (course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, question_type, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  let questionCount = 0
  for (const concept of conceptIds) {
    const wrongDefs = getWrongOptions(concept, conceptIds)
    
    // Type A: Definition question
    const optsA = assignOptions(
      concept.definition.slice(0, 150),
      wrongDefs
    )
    insertQuestion.run(
      course.id, concept.id,
      'What is ' + concept.name + '?',
      optsA.option_a, optsA.option_b, 
      optsA.option_c, optsA.option_d,
      optsA.correct_option,
      concept.definition,
      'conceptual',
      concept.difficulty
    )
    questionCount++
    
    // Type B: Code question (only if code_snippet exists)
    if (concept.code_snippet) {
      const wrongNames = getWrongOptions(concept, conceptIds)
        .map((_, i) => {
          const other = conceptIds.filter(c => c.id !== concept.id)[i]
          return other 
            ? (other.name + ': ' + other.definition).slice(0, 150)
            : 'None of the above'
        })
      
      const optsB = assignOptions(
        (concept.name + ': ' + concept.definition).slice(0, 150),
        wrongNames
      )
      insertQuestion.run(
        course.id, concept.id,
        ('What does this code do?\n' + concept.code_snippet).slice(0, 300),
        optsB.option_a, optsB.option_b,
        optsB.option_c, optsB.option_d,
        optsB.correct_option,
        concept.definition,
        'output_prediction',
        Math.min(concept.difficulty + 1, 3)
      )
      questionCount++
    }
  }

  // Step 8 - Return summary
  return {
    course_id: course.id,
    course_slug: courseSlug,
    concepts_extracted: conceptIds.length,
    flashcards_created: flashcardCount,
    quiz_questions_created: questionCount,
    extraction_stats: result.stats
  }
}
