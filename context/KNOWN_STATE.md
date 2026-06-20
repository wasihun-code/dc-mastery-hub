# Known State

**Last updated**: 2026-06-20 17:28

If this file is more than 2 weeks old, verify key claims against actual code
before trusting them for anything load-bearing.

## Test Coverage

| Layer | Tests | Files | Command |
|---|---|---|---|
| Frontend (Vitest) | 297 passing | 19 | `cd frontend && npm test` |
| Backend (Jest) | 288 passing | 15 | `cd backend && npm test` |

## Recently Completed (newest first)

1. Exercise Hub card redesign — Replaced flat 2x2 stat grid cards with a structured template: per-type accent stripe, 7px StatusDot (replacing bordered pills), SegmentedBar (proportional green/red/muted progress), compact single-line stats, right-aligned min-h-[44px] buttons, monospace Dataset Challenge numbers, Boss Battle red accent preserved, Incorrect Review locked/unlocked both integrated into same template. All 297 frontend tests pass.
2. EditQuestionModal FTB fix — `code_template` with `_____` placeholders now transformed to `[[0]]`/`[[1]]` markers on init (same transform as backend); `blanksToText`/`textToBlanks` now use `answer_alternatives` from ftb.json (with fallback to `distractors`); save converts `[[N]]` back to `_____` for storage; FTB editing sections redesigned with card-based layout, contextual icons, and muted helper text.
3. CRITICAL BUG FIX: Dataset challenge submissions were always accepted as correct — `validation_rules` in challenge.json only checked `True` and `runDatasetChallenge` never compared user output against `expected_output`. Fixed in `routes/content.js` (`/submit-challenge`): now extracts actual user stdout from sandbox, strips validation JSON, and compares against `expected_output` field from challenge.json. Also hardened `codeSandbox.js` to set `success = total > 0 && passed === total` preventing empty validation rules from passing.
4. Pre-Stage 3 Hardening: Test DB cleaned, multi-row wrapper guard added, full boolean bug inventory recorded.
5. Postgres migration Stage 3 complete: `courses.js` fully converted to Postgres; coexistence with remaining SQLite routes verified.
6. Postgres migration Stage 2 (and Verification) complete: Schema translated, wrapper behavior verified, test strategy chosen.
- **Recent changes**: 
  - [Stage 1] Confirmed Neon DB creation and tested connection via pg wrapper.
  - [Stage 2] Built unified SQL wrapper (database.pg.js) with integer-boolean coercion for legacy app.
  - [Stage 2.5] Audited frontend for 1/0 integer boolean assumptions across all components and fixed them to use true/false natively. 
  - [Stage 2.6] Replaced global fetch override with scoped API-client normalization; verified and fixed backend write-path boolean coercion gaps.
2. Code block text color fix — Added `--code-text` CSS var at `:root` level,
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
11. Deployed to Render — live at https://dc-mastery-hub.onrender.com, required 2 attempts,
    fixed Express 5 SPA fallback route (PathError) and `better-sqlite3` build errors (`.dockerignore`).

## Known Issues / Feature Gaps

- Generated challenges (from `challengeGenerator.js`) have no `expected_output` field and use `expected_output_code` instead. The `/submit-challenge` route only checks `expected_output`. Generated challenges also can't be submitted because `/submit-challenge` requires `challenge.json` on disk with no fallback to the generator.
- Challenge `validation_rules` in all challenge.json files still use `[{"check": "True"}]` — submission correctness now relies on `expected_output` comparison in the route handler.
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
