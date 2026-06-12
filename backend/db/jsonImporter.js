import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from './database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

export function importJsonExercises() {
  const rawContentFolder = process.env.CONTENT_FOLDER
  const contentFolder = rawContentFolder
    ? (path.isAbsolute(rawContentFolder) ? rawContentFolder : path.resolve(__dirname, '..', rawContentFolder))
    : DEFAULT_CONTENT_FOLDER
  
  try {
    const courses = db.prepare(`
      SELECT c.id, c.slug, t.slug AS track_slug 
      FROM courses c
      JOIN tracks t ON t.id = c.track_id
    `).all()

    let coursesImported = 0

    for (const course of courses) {
      const exercisesDir = path.join(contentFolder, 'tracks', course.track_slug, course.slug, 'exercises')
      
      if (!fs.existsSync(exercisesDir)) continue

      const mcqPath = path.join(exercisesDir, 'mcq.json')
      const fcPath = path.join(exercisesDir, 'flashcards.json')
      const ftbPath = path.join(exercisesDir, 'ftb.json')

      // Only import if we have the files
      if (!fs.existsSync(mcqPath) || !fs.existsSync(fcPath) || !fs.existsSync(ftbPath)) continue

      // Check if already in DB
      const currentConceptsCount = db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course.id).count
      if (currentConceptsCount > 0) {
        // Already seeded in DB, skip
        continue
      }

      console.log(`[JSON Importer] Seeding database from JSON exercises for: ${course.slug}`)

      try {
        const mcqData = JSON.parse(fs.readFileSync(mcqPath, 'utf-8'))
        const fcData = JSON.parse(fs.readFileSync(fcPath, 'utf-8'))
        const ftbData = JSON.parse(fs.readFileSync(ftbPath, 'utf-8'))

        const questions = Array.isArray(mcqData) ? mcqData : (mcqData.questions || [])
        const cards = Array.isArray(fcData) ? fcData : (fcData.cards || [])
        const exercises = Array.isArray(ftbData) ? ftbData : (ftbData.exercises || [])

        const matchingPath = path.join(exercisesDir, 'matching.json')
        let matchingPairs = []
        if (fs.existsSync(matchingPath)) {
          try {
            const matchingData = JSON.parse(fs.readFileSync(matchingPath, 'utf-8'))
            const rounds = Array.isArray(matchingData) ? matchingData : (matchingData.rounds || [])
            for (const round of rounds) {
              if (round.pairs) {
                matchingPairs.push(...round.pairs)
              }
            }
          } catch (e) {
            console.error(`[JSON Importer] Failed to parse matching.json for ${course.slug}:`, e)
          }
        }

        db.transaction(() => {
          // 1. Clear existing course data in proper dependency order
          db.prepare('DELETE FROM flashcards WHERE course_id = ?').run(course.id)
          db.prepare('DELETE FROM quiz_questions WHERE course_id = ?').run(course.id)
          db.prepare('DELETE FROM concepts WHERE course_id = ?').run(course.id)

          // 2. Resolve and insert concepts
          const insertConcept = db.prepare(`
            INSERT OR REPLACE INTO concepts 
              (id, course_id, name, definition, code_snippet, source_page, category, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          // Collect all unique concept IDs referenced across exercises, flashcards, quiz questions, and matching pairs
          const uniqueConceptIdStrs = new Set()
          const collectConceptId = (idStr) => {
            if (!idStr) return
            const id = parseInt(String(idStr).replace(/\D/g, ''), 10) || null
            if (id) uniqueConceptIdStrs.add(idStr)
          }

          for (const ex of exercises) collectConceptId(ex.concept_id || ex.id)
          for (const card of cards) collectConceptId(card.concept_id)
          for (const q of questions) collectConceptId(q.concept_id)
          for (const pair of matchingPairs) collectConceptId(pair.concept_id)

          const resolveConceptData = (conceptIdStr) => {
            let name = ''
            let definition = ''
            let codeSnippet = null
            let chapter = 1
            let difficulty = 1

            // Prioritize concise concept_name from cards, questions, exercises
            const cardMatch = cards.find(c => c.concept_id === conceptIdStr)
            const qMatch = questions.find(q => q.concept_id === conceptIdStr)
            const exMatch = exercises.find(ex => (ex.concept_id === conceptIdStr || ex.id === conceptIdStr))
            const pairMatch = matchingPairs.find(p => p.concept_id === conceptIdStr)

            // Resolve Name: try to use the most descriptive clean concept name
            if (cardMatch && cardMatch.concept_name) name = cardMatch.concept_name
            else if (qMatch && qMatch.concept_name) name = qMatch.concept_name
            else if (exMatch && exMatch.concept_name) name = exMatch.concept_name
            else if (exMatch && exMatch.title) name = exMatch.title
            else if (pairMatch && pairMatch.term && !pairMatch.term.includes('\n') && pairMatch.term.length < 50) name = pairMatch.term
            else if (pairMatch && pairMatch.term) name = pairMatch.term
            else name = `Concept ${conceptIdStr}`

            // Resolve Definition
            if (pairMatch && pairMatch.match) definition = pairMatch.match
            else if (cardMatch && cardMatch.explanation) definition = cardMatch.explanation
            else if (cardMatch && cardMatch.back) definition = cardMatch.back
            else if (qMatch && qMatch.explanation) definition = qMatch.explanation
            else if (exMatch && exMatch.explanation) definition = exMatch.explanation
            else if (exMatch && exMatch.task_description) definition = exMatch.task_description
            else definition = 'Concept description automatically generated.'

            // Resolve Code Snippet
            if (exMatch && exMatch.blanks && exMatch.blanks[0]) {
              codeSnippet = exMatch.blanks[0].answer
            } else if (exMatch && exMatch.code) {
              codeSnippet = exMatch.code
            }

            // Resolve Chapter/Source Page
            if (cardMatch && cardMatch.chapter) chapter = cardMatch.chapter
            else if (exMatch && exMatch.chapter) chapter = exMatch.chapter
            else if (qMatch && qMatch.chapter) chapter = qMatch.chapter

            // Resolve Difficulty
            const diffStr = (cardMatch && cardMatch.difficulty) || (exMatch && exMatch.difficulty) || (qMatch && qMatch.difficulty) || 'easy'
            difficulty = diffStr === 'hard' ? 3 : diffStr === 'medium' ? 2 : 1

            return { name, definition, codeSnippet, chapter, difficulty }
          }

          for (const conceptIdStr of uniqueConceptIdStrs) {
            const conceptId = parseInt(String(conceptIdStr).replace(/\D/g, ''), 10)
            const { name, definition, codeSnippet, chapter, difficulty } = resolveConceptData(conceptIdStr)

            insertConcept.run(
              conceptId,
              course.id,
              name.slice(0, 200),
              definition.slice(0, 500),
              codeSnippet ? codeSnippet.slice(0, 500) : null,
              chapter,
              'general',
              difficulty
            )
          }

          const getConceptId = (conceptIdStr) => {
            if (!conceptIdStr) return null
            return parseInt(String(conceptIdStr).replace(/\D/g, ''), 10) || null
          }

          // 3. Insert flashcards
          const insertFlashcard = db.prepare(`
            INSERT INTO flashcards
              (concept_id, course_id, front, back, next_review_date, interval_days, ease_factor, repetitions)
            VALUES (?, ?, ?, ?, date('now'), 1, 2.5, 0)
          `)

          for (const card of cards) {
            const conceptIdStr = card.concept_id
            const conceptId = getConceptId(conceptIdStr)
            if (conceptId) {
              insertFlashcard.run(
                conceptId,
                course.id,
                card.front.slice(0, 500),
                card.back.slice(0, 300)
              )
            }
          }

          // 4. Insert quiz questions
          const insertQuestion = db.prepare(`
            INSERT OR REPLACE INTO quiz_questions
              (id, course_id, concept_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, question_type, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const q of questions) {
            const qId = parseInt(String(q.id).replace(/\D/g, ''), 10) || null
            const conceptIdStr = q.concept_id
            const conceptId = getConceptId(conceptIdStr)
            
            if (qId && conceptId) {
              insertQuestion.run(
                qId,
                course.id,
                conceptId,
                q.question_text,
                q.options?.a || q.option_a || null,
                q.options?.b || q.option_b || null,
                q.options?.c || q.option_c || null,
                q.options?.d || q.option_d || null,
                q.correct_option,
                q.explanation || '',
                q.question_subtype || 'application',
                q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1
              )
            }
          }
        })()

        coursesImported++
        console.log(`[JSON Importer] Successfully seeded exercises for: ${course.slug}`)
      } catch (err) {
        console.error(`[JSON Importer] Failed to seed exercises for ${course.slug}:`, err)
      }
    }

    return { status: 'success', courses_imported: coursesImported }
  } catch (err) {
    console.error('[JSON Importer] Critical error during exercise import:', err)
    return { status: 'error', error: err.message }
  }
}
