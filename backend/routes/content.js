import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'
import { scanContent } from '../services/contentScanner.js'
import { extractRawText, storeExtractedContent } from '../services/pdfParser.js'
import { runCode, runShellCommand } from '../services/codeSandbox.js'
import { getChallenges } from '../services/challengeGenerator.js'
import { recalculateMastery } from './progress.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

function getCourseFolder(contentFolder, courseSlug, trackSlug) {
  // First try the primary track slug
  const primaryPath = path.join(contentFolder, 'tracks', trackSlug, courseSlug)
  if (fs.existsSync(primaryPath)) {
    return primaryPath
  }
  // Search other track folders
  const tracksDir = path.join(contentFolder, 'tracks')
  if (fs.existsSync(tracksDir)) {
    const trackDirs = fs.readdirSync(tracksDir)
    for (const tDir of trackDirs) {
      const checkPath = path.join(tracksDir, tDir, courseSlug)
      if (fs.existsSync(checkPath)) {
        return checkPath
      }
    }
  }
  return primaryPath
}

const router = express.Router()

router.use((req, res, next) => {
  console.log(`[Content Router] ${req.method} ${req.path}`);
  next();
});

router.get('/exercises/:courseSlug/:exerciseType', (req, res, next) => {
  try {
    const { courseSlug, exerciseType } = req.params;
    const validTypes = ['mcq', 'flashcards', 'ftb', 'matching', 'bossbattle', 'challenge'];
    if (!validTypes.includes(exerciseType)) {
      return res.status(400).json({ error: "Invalid exercise type" });
    }

    const course = db.prepare('SELECT id, track_id FROM courses WHERE slug = ?').get(courseSlug);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id);
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
          ? process.env.CONTENT_FOLDER 
          : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER;

    const courseFolder = getCourseFolder(contentFolder, courseSlug, track.slug)
    const exercisePath = path.join(courseFolder, 'exercises', `${exerciseType}.json`);

    // Try serving from database first if data is present
    if (exerciseType === 'mcq') {
      const dbQuestions = db.prepare('SELECT * FROM quiz_questions WHERE course_id = ?').all(course.id);
      if (dbQuestions.length > 0) {
        let items = dbQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          explanation: q.explanation,
          question_type: q.question_type || 'application',
          difficulty: q.difficulty === 3 ? 'hard' : q.difficulty === 2 ? 'medium' : 'easy'
        }));
        if (req.query.count) {
          const count = parseInt(req.query.count, 10);
          if (!isNaN(count)) {
            items.sort(() => Math.random() - 0.5);
            items = items.slice(0, count);
          }
        }
        return res.json(items);
      }
    }

    if (exerciseType === 'flashcards') {
      const dbFlashcards = db.prepare('SELECT * FROM flashcards WHERE course_id = ?').all(course.id);
      if (dbFlashcards.length > 0) {
        let items = dbFlashcards.map(c => ({
          id: c.id,
          concept_id: c.concept_id,
          course_id: c.course_id,
          front: c.front,
          back: c.back,
          next_review_date: c.next_review_date,
          interval_days: c.interval_days,
          ease_factor: c.ease_factor,
          repetitions: c.repetitions
        }));
        if (req.query.shuffle === 'true') {
          items.sort(() => Math.random() - 0.5);
        }
        return res.json(items);
      }
    }

    if (exerciseType === 'matching') {
      // Prioritize matching.json file on disk. Fall back to database concepts only if file is missing.
      if (!fs.existsSync(exercisePath)) {
        const dbConcepts = db.prepare('SELECT id, name, definition FROM concepts WHERE course_id = ?').all(course.id);
        if (dbConcepts.length >= 5) {
          const rounds = [];
          const numRounds = Math.min(Math.ceil(dbConcepts.length / 5), 5);
          const shuffledConcepts = [...dbConcepts].sort(() => Math.random() - 0.5);
          for (let r = 0; r < numRounds; r++) {
            const pairs = [];
            for (let p = 0; p < 5; p++) {
              const concept = shuffledConcepts[(r * 5 + p) % shuffledConcepts.length];
              pairs.push({
                id: concept.id,
                term: concept.name,
                match: concept.definition
              });
            }
            rounds.push({
              id: r + 1,
              theme: `Round ${r + 1}: Core Concepts`,
              pairs: pairs
            });
          }
          return res.json(rounds);
        }
      }
    }

    if (exerciseType === 'bossbattle') {
      const dbQuestions = db.prepare('SELECT * FROM quiz_questions WHERE course_id = ?').all(course.id);
      if (dbQuestions.length > 0) {
        let items = dbQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          explanation: q.explanation,
          question_type: q.question_type || 'application',
          difficulty: q.difficulty === 3 ? 'hard' : q.difficulty === 2 ? 'medium' : 'easy'
        }));
        items.sort(() => Math.random() - 0.5);
        return res.json(items);
      }
    }

    if (exerciseType === 'ftb') {
      // Prioritize ftb.json file on disk. Fall back to database concepts only if file is missing.
      if (!fs.existsSync(exercisePath)) {
        const dbConcepts = db.prepare('SELECT id, name, definition, code_snippet FROM concepts WHERE course_id = ? AND code_snippet IS NOT NULL').all(course.id);
        if (dbConcepts.length > 0) {
          const items = dbConcepts.map((concept) => {
            const code = concept.code_snippet;
            let codeTemplate = code;
            let answer = "";
            const keywords = ['print', 'import', 'as', 'def', 'return', 'np', 'pd', 'plt', 'mean', 'sum', 'len', 'round', 'append'];
            for (const kw of keywords) {
              if (code.includes(kw)) {
                codeTemplate = code.replace(kw, '[[0]]');
                answer = kw;
                break;
              }
            }
            if (!answer) {
              const match = code.match(/\b([a-zA-Z_]{2,})\b/);
              if (match) {
                answer = match[1];
                codeTemplate = code.replace(answer, '[[0]]');
              } else {
                answer = "print";
                codeTemplate = "[[0]](" + code + ")";
              }
            }

            return {
              id: `fitb_db_${concept.id}`,
              concept_id: concept.id,
              concept_name: concept.name,
              difficulty: 'medium',
              description: `Complete the code snippet for: ${concept.name}.`,
              code: codeTemplate,
              answers: [answer],
              word_bank: [answer, 'type', 'len', 'help', 'import', 'def', 'return', 'pd', 'np'].slice(0, 5),
              explanation: `This code snippet implements: ${concept.name}. ${concept.definition}`
            };
          });
          return res.json(items);
        }
      }
    }

    if (!fs.existsSync(exercisePath)) {
      return res.status(404).json({ error: "No exercises found for this type" });
    }

    const fileData = fs.readFileSync(exercisePath, 'utf-8');
    const data = JSON.parse(fileData);
    let items = [];

    // Handle both raw arrays and wrapper objects
    if (Array.isArray(data)) {
      items = data;
    } else {
      if (exerciseType === 'mcq') items = data.questions || [];
      else if (exerciseType === 'flashcards') items = data.cards || [];
      else if (exerciseType === 'ftb') items = data.exercises || [];
      else if (exerciseType === 'matching') items = data.rounds || [];
      else if (exerciseType === 'bossbattle') items = data.questions || [];
      else if (exerciseType === 'challenge') items = data.challenges || [];
    }

    if (exerciseType === 'matching') {
      items = items.map(round => ({
        ...round,
        pairs: (round.pairs || []).slice(0, 5)
      }));
    }

    // Schema mapping for compatibility with frontend components
    if (exerciseType === 'mcq' || exerciseType === 'bossbattle') {
      items = items.map(q => ({
        ...q,
        option_a: q.options?.a,
        option_b: q.options?.b,
        option_c: q.options?.c,
        option_d: q.options?.d
      }));
    }

    if (exerciseType === 'ftb') {
      items = items.map(ex => {
        let code = ex.code_template || "";
        const answers = (ex.blanks || []).map(b => b.answer);
        
        // 1. First replace any numbered placeholders like ___1___, ___2___, etc.
        code = code.replace(/___(\d+)___/g, (match, numStr) => {
          const num = parseInt(numStr, 10);
          return `[[${num - 1}]]`;
        });

        // 2. Then replace any remaining simple blanks (like _____ or ____) sequentially
        let count = 0;
        const existingMatches = code.match(/\[\[(\d+)\]\]/g);
        if (existingMatches) {
          const indices = existingMatches.map(m => parseInt(m.match(/\d+/)[0], 10));
          count = Math.max(...indices) + 1;
        }

        while (code.match(/_{3,}/)) {
          code = code.replace(/_{3,}/, `[[${count}]]`);
          count++;
        }

        return {
          ...ex,
          description: ex.task_description || ex.description,
          code,
          answers
        };
      });
    }

    // Shuffle and count
    if (exerciseType === 'mcq' && req.query.count) {
      const count = parseInt(req.query.count, 10);
      if (!isNaN(count)) {
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        items = items.slice(0, count);
      }
    }

    if (exerciseType === 'flashcards' && req.query.shuffle === 'true') {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    }

    res.json(items);
  } catch (err) {
    next(err);
  }
});
router.post('/scan', (req, res, next) => {
  try {
    const summary = scanContent()
    res.status(200).json(summary)
  } catch (err) {
    next(err)
  }
})

/**
 * Returns raw text extracted from the course PDF.
 * Called by Gemini CLI subagent.
 */
router.get('/extract-text/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const data = extractRawText(courseSlug)
    res.json(data)
  } catch (err) {
    next(err)
  }
})

/**
 * Stores concepts and quiz questions generated by the AI.
 * Called by Gemini CLI subagent.
 */
router.post('/store/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const result = storeExtractedContent(courseSlug, req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * Deprecated endpoint. Direct parsing removed.
 */
router.post('/parse/:courseSlug', (req, res) => {
  res.status(410).json({ 
    error: "Direct parsing removed. Use Gemini CLI extract-course command instead." 
  })
})

router.get('/pdf/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const type = req.query.type || 'slides'
    
    const course = db.prepare('SELECT id, track_id, has_pdf, has_glossary FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    if (type === 'slides' && !course.has_pdf) return res.status(404).json({ error: 'Slides PDF not found' })
    if (type === 'glossary' && !course.has_glossary) return res.status(404).json({ error: 'Glossary PDF not found' })

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) return res.status(404).json({ error: 'Track not found' })

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
          ? process.env.CONTENT_FOLDER 
          : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER
      
    const fileName = type === 'slides' ? `${courseSlug}.pdf` : `${courseSlug}-glossary.pdf`
    const courseFolder = getCourseFolder(contentFolder, courseSlug, track.slug)
    const absolutePath = path.join(courseFolder, fileName)

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found on disk' })
    }

    res.contentType('application/pdf')
    res.sendFile(absolutePath)
  } catch (err) {
    next(err)
  }
})

router.get('/datasets/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    const course = db.prepare('SELECT track_id FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) return res.status(404).json({ error: 'Track not found' })

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
          ? process.env.CONTENT_FOLDER 
          : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER

    const courseFolder = getCourseFolder(contentFolder, courseSlug, track.slug)
    const datasetsPath = path.join(courseFolder, 'datasets')

    if (!fs.existsSync(datasetsPath) || !fs.statSync(datasetsPath).isDirectory()) {
      return res.status(200).json([])
    }

    const files = fs.readdirSync(datasetsPath)
    const validExtensions = ['.csv', '.sql', '.pkl', '.p', '.json', '.xlsx']
    
    const datasets = files
      .filter(file => !file.startsWith('.') && validExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => {
        const stats = fs.statSync(path.join(datasetsPath, file))
        return {
          name: file,
          extension: path.extname(file),
          size_kb: Math.round(stats.size / 1024)
        }
      })

    res.status(200).json(datasets)
  } catch (err) {
    next(err)
  }
})

router.get('/challenges/:courseSlug', (req, res, next) => {
  try {
    const { courseSlug } = req.params
    
    const course = db.prepare('SELECT id, track_id FROM courses WHERE slug = ?').get(courseSlug);
    if (!course) return res.status(404).json({ error: 'Course not found' })

    let challenges = [];
    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id);
    if (track) {
      const contentFolder = process.env.CONTENT_FOLDER 
        ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
            ? process.env.CONTENT_FOLDER 
            : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
        : DEFAULT_CONTENT_FOLDER;

      const courseFolder = getCourseFolder(contentFolder, courseSlug, track.slug)
      const exercisePath = path.join(courseFolder, 'exercises', 'challenge.json');

      if (fs.existsSync(exercisePath)) {
        const fileData = fs.readFileSync(exercisePath, 'utf-8');
        const data = JSON.parse(fileData);
        challenges = Array.isArray(data) ? data : (data.challenges || []);
      }
    }

    if (challenges.length === 0) {
      challenges = getChallenges(courseSlug);
    }

    if (!challenges || challenges.length === 0) {
      return res.status(404).json({ error: 'No datasets available for this course' })
    }

    // Fetch solved challenge IDs for this course
    const solvedAttempts = db.prepare(`
      SELECT DISTINCT question_id
      FROM exercise_attempts
      WHERE course_id = ? AND exercise_type = 'dataset' AND was_correct = 1 AND question_id IS NOT NULL
    `).all(course.id);
    const solvedIds = new Set(solvedAttempts.map(a => a.question_id));

    // Filter challenges to find those not yet solved
    const unsolvedChallenges = challenges.filter(c => {
      if (solvedIds.has(c.id) || solvedIds.has(String(c.id))) return false;
      
      let qId = null;
      if (c.id && typeof c.id === 'string') {
        const match = c.id.match(/\d+/);
        if (match) {
          qId = parseInt(match[0], 10);
        }
      }
      return qId === null || (!solvedIds.has(qId) && !solvedIds.has(String(qId)));
    });

    const isReattempt = req.query.reattempt === 'true';

    // Return unsolved challenges, or fall back to ALL challenges if all have been solved or user requested reattempt
    if (unsolvedChallenges.length > 0 && !isReattempt) {
      res.json(unsolvedChallenges);
    } else {
      res.json(challenges);
    }
  } catch (err) {
    next(err)
  }
})

router.post('/run-code', (req, res, next) => {
  try {
    const { code, courseSlug, datasetFile } = req.body
    
    const course = db.prepare('SELECT track_id FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) return res.status(404).json({ error: 'Track not found' })

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
          ? process.env.CONTENT_FOLDER 
          : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER

    const courseFolder = getCourseFolder(contentFolder, courseSlug, track.slug)
    const datasetPath = path.join(courseFolder, 'datasets', datasetFile)
    
    if (!fs.existsSync(datasetPath)) {
      return res.status(404).json({ error: 'Dataset file not found' })
    }

    const result = runCode(code, [datasetPath])
    
    if (result.error && result.error.includes('ETIMEDOUT')) {
      result.error = "Code timed out after 10 seconds. Check for infinite loops."
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/run-shell', (req, res, next) => {
  try {
    const { courseSlug, datasetFile, history, command } = req.body
    
    const course = db.prepare('SELECT track_id FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) return res.status(404).json({ error: 'Track not found' })

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
          ? process.env.CONTENT_FOLDER 
          : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER

    const courseFolder = getCourseFolder(contentFolder, courseSlug, track.slug)
    const datasetPath = path.join(courseFolder, 'datasets', datasetFile)
    
    if (!fs.existsSync(datasetPath)) {
      return res.status(404).json({ error: 'Dataset file not found' })
    }

    const historyCode = (history || []).join('\n')
    const result = runShellCommand(historyCode, command, [datasetPath])
    
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/submit-challenge', (req, res, next) => {
  try {
    const { code, courseSlug, challengeId, datasetFile, expectedOutputCode, solutionCode, solution_code } = req.body
    const expectedCode = expectedOutputCode || solutionCode || solution_code
    console.log(`[submit-challenge] Request received for ${courseSlug} - ${datasetFile}`)
    
    const course = db.prepare('SELECT id, track_id FROM courses WHERE slug = ?').get(courseSlug)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const track = db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id)
    if (!track) return res.status(404).json({ error: 'Track not found' })

    const contentFolder = process.env.CONTENT_FOLDER 
      ? (path.isAbsolute(process.env.CONTENT_FOLDER) 
          ? process.env.CONTENT_FOLDER 
          : path.resolve(__dirname, '../', process.env.CONTENT_FOLDER))
      : DEFAULT_CONTENT_FOLDER

    const courseFolder = getCourseFolder(contentFolder, courseSlug, track.slug)
    const datasetPath = path.join(courseFolder, 'datasets', datasetFile)
    console.log(`[submit-challenge] datasetPath: ${datasetPath}`)
    
    if (!fs.existsSync(datasetPath)) {
      console.log(`[submit-challenge] datasetPath does NOT exist!`)
      return res.status(404).json({ error: 'Dataset file not found' })
    }

    console.log(`[submit-challenge] Running user code...`)
    const userResult = runCode(code, [datasetPath])
    console.log(`[submit-challenge] User result:`, userResult)
    
    console.log(`[submit-challenge] Running expected code...`)
    const expectedResult = runCode(expectedCode, [datasetPath])
    console.log(`[submit-challenge] Expected result:`, expectedResult)
    
    if (!expectedResult.success) {
      return res.status(500).json({ error: 'Expected solution failed to run: ' + expectedResult.error })
    }

    if (!userResult.success) {
      return res.status(400).json({ error: userResult.error })
    }

    function normalizeOutput(output) {
      return output
        .trim()
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => line !== 'None')
        .filter(line => line !== '')
        .join('\n')
    }

    const passed = normalizeOutput(userResult.output) === normalizeOutput(expectedResult.output)
    const score = passed ? 100 : 0
    
    let qId = null
    if (challengeId && typeof challengeId === 'string') {
      const match = challengeId.match(/\d+/)
      if (match) {
        qId = parseInt(match[0], 10)
      }
    }

    // Attempt will be recorded by frontend calling /api/progress/attempt
    res.json({
      passed,
      score,
      user_output: normalizeOutput(userResult.output),
      expected_output: normalizeOutput(expectedResult.output),
      feedback: passed 
        ? 'Correct! Your output matches perfectly.'
        : 'Not quite. Compare your output with the expected output below.'
    })
  } catch (err) {
    next(err)
  }
})

export default router
