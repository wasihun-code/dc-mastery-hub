# Known State

**Last updated**: 2026-06-22

If this file is more than 2 weeks old, verify key claims against actual code
before trusting them for anything load-bearing.

## Test Coverage

| Layer | Tests | Files | Command |
|---|---|---|---|
| Frontend (Vitest) | 276 passing | 17 | `cd frontend && npm test` |
| Backend (Jest) | 288 passing | 15 | `cd backend && npm test` |

## Recently Completed (newest first)

1. DB seed dump/restore workflow — New `backend/db/dumpSeed.js` + `npm run dump-seed`
   generates `backend/db/seed-data.sql` (SQLite `.dump` of all data). On deploy,
   `backend/index.js` restores from this file if present, skipping normal seed/init
   to preserve local data.
2. MCQ vertical layout + adaptive columns — Quiz.jsx changed from `exercise-layout`
   (two-column) to single-column vertical layout. Options grid adapts: `grid-cols-1`
   when any choice text > 40 chars (4 rows), `grid-cols-1 sm:grid-cols-2` when all
   short (2 rows).
3. MCQ option shuffle — Quiz.jsx options now shuffled per question via `shuffleCache`
   (useRef), preventing correct answer from always being choice A.
4. Preloaded vars dedup — DatasetChallenge.jsx: removed `generatePreLoadedComments`
   from both mobile and desktop script panels; vars only appear in the description
   panel card (`#preloaded-vars-card`).
5. ExerciseBottomControls margin — Increased `marginTop` 32px, `paddingBottom` 24px,
   added `marginBottom` 16px.
6. Mobile-responsive exercise sizing — FillBlank/MatchingGame/Quiz: reduced text
   sizes, padding, and min-heights on mobile via `text-xs sm:text-base`, `p-3 sm:p-5`,
   `min-h-[56px] sm:min-h-[76px]`, etc.
7. FillBlank word bank gap fix — `gap-2.5` → `gap-3` for tighter layout.
8. Code block text color fix — Added `--code-text` CSS var at `:root` level,
   applied to FillBlank.jsx and EditQuestionModal.jsx code containers (text was
   invisible in light theme).
2. CI workflow Node 18 → 22 — Node 18 is EOL; GitHub Actions runner deprecating
   Node 20 bundled in actions.
3. BossBattle.jsx `warningFiredRef` orphan fixed — Removed line in `resetQuestionState`
   that referenced deleted ref, causing 9 `ReferenceError` in tests.
4. ManageContent.jsx ResizeObserver deps fix — `[]` → `[loading, activeTab]` so
   observer re-attaches when courses container mounts.
5. ManageContent.jsx `isMobile ? 'hidden'` removed — Right panel always visible;
   280px threshold was too narrow.
6. ManageContent.jsx Notes Taken placement fixed — Removed Notes Taken from
   placeholder/true branch (outside IIFE scope), kept correctly-placed copy inside
   Course Properties card.
7. Notes Taken DB migration + filter — `notes_taken INTEGER DEFAULT 0` on courses
   and user_courses, seam Completed → 1. UI toggle in ManageContent + dropdown filter.
8. Light theme WCAG AA variables — Replaced `:root.light-theme` with independently
   defined WCAG AA-verified colors (4.5:1 minimum contrast).
9. Dashboard stat card responsive grid — `grid-cols-*` → `auto-fit minmax(160px, 1fr)`.
10. Boss Battle answer shuffle per question — `shuffledKeys` state randomized on
    each `currentIndex` change; correct track by letter, not position.

## Known Issues / Feature Gaps

- Dataset Challenge console output: Monaco editor keeps `'dc-dark'` theme
  unconditionally — no light theme variant for the editor itself (intentional
  — code editors conventionally dark).
- FillBlank.jsx `highlightPythonSyntax` fallback: uses simple regex-based
  highlighting (not a full syntax parser). Keywords may be missed in edge cases.
- `POST /api/progress/attempt` validates `course_id` but not `question_id`
  existence — malformed question IDs create orphaned records silently.
- No batch/export endpoint for user data.
- No CSRF protection on session cookie (mitigated by HttpOnly + SameSite=Lax).

## Feature Flags / In-Progress

| Flag/Area | Status | Notes |
|---|---|---|
| Light theme | Complete | All pages verified; code block fix done |
| Notes Taken | Complete | DB + UI + filter all in place |
| Boss Battle sounds | Complete | Standardized to Quiz audio patterns |
| CI Node version | Complete | Updated to 22 |
| SM-2 for flashcards | Stable | Core algorithm + per-user progress |
| Multiple exercise types | Stable | 7 types: quiz, fillblank, flashcard, matching, bossbattle, dataset, incorrect review |
