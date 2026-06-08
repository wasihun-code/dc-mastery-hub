# DC Mastery Hub — Project Context

## What This Project Is
A full-stack web app that helps the user master DataCamp 
data science courses through exercises, flashcards, quizzes, 
and games. The user is a student taking multiple DataCamp 
tracks focused exclusively on data science (Python, SQL, 
pandas, statistics, machine learning, data engineering).

## Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS (port 5173)
- Backend: Node.js + Express.js (port 3001)
- Database: SQLite via better-sqlite3 (SYNCHRONOUS API ONLY)
- Icons: lucide-react
- Charts: recharts
- Vite proxies /api/* to localhost:3001

## Critical Rules — Never Violate
- better-sqlite3 is SYNCHRONOUS — never use async/await 
  with DB calls. Use db.prepare().get(), .all(), .run()
- All backend route handlers must be wrapped in try/catch
- Use CSS variables for colors, never hardcode hex values
- CSS variables: --bg-primary, --bg-card, --bg-sidebar,
  --accent-green (#03ef62), --accent-red, --accent-yellow,
  --accent-blue, --text-primary, --text-muted, --border
- Frontend API calls use relative /api/... paths only
- No new npm packages without being explicitly asked

## Project Structure
dc-mastery-hub/
  backend/
    index.js          (Express entry, ESM modules)
    db/
      database.js     (single better-sqlite3 instance)
      schema.js       (initSchema + has_glossary migration)
      seed.js         (4 tracks, 41 courses, idempotent)
    routes/
      tracks.js       (GET /api/tracks, /api/tracks/:slug)
      courses.js      (GET|PATCH /api/courses/:slug + sub-routes)
      progress.js     (dashboard, stats, attempt recording)
      content.js      (scan, pdf serve, datasets, parse)
    services/
      contentScanner.js  (scans disk, updates has_pdf/has_glossary)
  frontend/src/
    App.jsx           (React Router, all routes)
    index.css         (CSS variables + Tailwind)
    components/
      Sidebar.jsx
      TopBar.jsx
      PdfViewer.jsx   (react-pdf viewer with zoom/pagination)
    pages/
      Dashboard.jsx   (WORKING — real data)
      Tracks.jsx      (WORKING — real data)
      TrackDetail.jsx (WORKING — real data)
      CourseDetail.jsx (WORKING — PDF viewer, quick actions)
      StudySession.jsx (placeholder)
      MasteryMap.jsx   (placeholder)
      TrackTest.jsx    (placeholder)
      Settings.jsx     (placeholder)
    exercises/        (all placeholders — built last)
  content/tracks/
    [track-slug]/
      track.json
      [course-slug]/
        [course-slug].pdf        (slides)
        [course-slug]-glossary.pdf (optional)
        datasets/               (csv, pkl, sql, p files)
  scripts/           (Python utility scripts)
  agents/            (Gemini CLI custom subagent definitions)

## Database Tables
tracks, courses, concepts, flashcards, quiz_questions,
exercise_attempts, mastery_scores, user_stats,
spaced_repetition_queue

## Courses With PDFs Available
has_pdf=1: introduction-to-python, intermediate-python,
  data-manipulation-with-pandas, joining-data-with-pandas,
  introduction-to-sql, intermediate-sql, joining-data-in-sql

has_glossary=1: introduction-to-python, intermediate-python,
  data-manipulation-with-pandas, introduction-to-sql,
  intermediate-sql, joining-data-in-sql

## Mastery Scoring Formula
overall = (flashcard*0.20) + (quiz*0.30) + 
          (code*0.30) + (dataset*0.20)
Tiers: 0-39 Beginner, 40-69 Learning, 
       70-89 Proficient, 90-100 Mastered

## Content Extraction Workflow
To extract concepts and generate exercises for a course:
1. Make sure the backend is running (npm run dev)
2. Say: "extract [course-slug]" or 
   "@course-extractor extract [course-slug]"
3. The course-extractor subagent will:
   - Fetch raw text via GET /api/content/extract-text/[slug]
   - Extract concepts from the text
   - Generate application-style quiz questions
   - Store everything via POST /api/content/store/[slug]
4. Refresh the course page to see new content

Available for extraction (has_pdf=1):
  - introduction-to-python
  - intermediate-python
  - data-manipulation-with-pandas
  - joining-data-with-pandas
  - introduction-to-sql
  - intermediate-sql
  - joining-data-in-sql

## Step Progress
Step 1: Folder structure + layout shell ✅
Step 2: Database schema + seeding ✅
Step 3: Backend API routes ✅
Step 4: Content folders + Tracks/Dashboard pages ✅
Step 5: TrackDetail page ✅
Step 6: CourseDetail page ✅
Step 7: Content scanner + PDF viewer ✅
Step 8: PDF parsing + concept extraction (IN PROGRESS)
Step 9+: Exercise implementations (not started)
