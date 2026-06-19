# DC Mastery Hub — Architecture

## What It Is

A single-user (personal) exam-prep tool for DataCamp certification tracks. The user
tracks progress across Python/SQL courses, runs multiple exercise types (MCQ quizzes,
Fill-in-the-Blank, Flashcards with SM-2 spaced repetition, Matching, Boss Battle
gauntlets, Dataset coding challenges), and manages course content (trash/archive/copy).
Built for one primary user + occasional admin login — no multi-tenant isolation.

## Tech Stack

| Layer | Technology | Version | Key Constraint |
|---|---|---|---|
| Frontend framework | React | 18 | Functional components + hooks only |
| Bundler | Vite | 5+ | Proxies `/api/*` → `localhost:3001` |
| Styling | Tailwind CSS | 3 (JIT) | All colors via CSS vars only, no hex hardcodes |
| Icons | lucide-react | — | Only icon library, no alternatives |
| Charts | Recharts | — | Dashboard only |
| Routing | React Router | 6 | Hash-free, `<BrowserRouter>` |
| Backend | Express.js | 4+ | ESM modules (`import`/`export`) |
| Database | better-sqlite3 | — | **SYNCHRONOUS ONLY** — no async/await on DB |
| Auth | Cookie-based sessions | — | `session_id` cookie, HttpOnly, SameSite=Lax, 30-day expiry |
| Code sandbox | Python subprocess | 3.14 | Runs in `project/venv/`, 15s timeout |
| DB migrations | Inline in `schema.js` | — | `ALTER TABLE ADD COLUMN` wrapped in try/catch |
| Testing (FE) | Vitest | — | 276 tests, 17 files |
| Testing (BE) | Jest | — | `--experimental-vm-modules`, 288 tests, 15 suites |

## Directory Tree

```
dc-mastery-hub/
├── backend/                   Express server (port 3001)
│   ├── __tests__/             Jest test suites (288 tests)
│   ├── data/                  SQLite DB files
│   ├── db/                    Database connection, schema init, seed, JSON importer
│   ├── middleware/            Auth middleware (requireAdmin)
│   ├── routes/                All API route handlers (8 files)
│   └── services/              Content scanner, PDF parser, challenge generator, code sandbox
├── content/                   On-disk course content
│   └── tracks/                Per-track folders (7 tracks)
│       └── [track-slug]/      Track metadata + course folders
│           └── [course-slug]/ PDF slides, exercises/, datasets/
├── context/                   Context files for AI agents (this directory)
├── data/                      Old single-user DB folder (legacy)
├── db/                        Old single-user DB (legacy)
├── frontend/                  React SPA (port 5173)
│   ├── src/
│   │   ├── __tests__/         Vitest test suites (276 tests)
│   │   ├── components/        Reusable UI components (12 files)
│   │   │   └── admin/         Admin panel sub-components (4 files)
│   │   ├── exercises/         Exercise-type components (7 files)
│   │   ├── pages/             Page-level route components (13 files)
│   │   ├── services/          API service modules (feedbackService, settingsService)
│   │   └── utils/             Shared utilities (renderWithCode)
│   └── ...config files
├── project/                   Python venv + challenge verification
├── scripts/                   Utility scripts
└── venv/                      Python venv for code sandbox
```

## Request Lifecycles

### Standard page load
```
Browser ──GET /──→ Vite dev server (5173)
  └── serves index.html + React app
  └── API calls via fetch("/api/...") ──proxied──→ Express (3001)
    └── db.prepare(...).all/get/run() ──→ better-sqlite3 ──→ SQLite file
```

### Dataset Challenge code execution
```
Browser ──POST /api/run-code──→ Express (3001)
  └── load challenge.json, resolve course folder
  └── runDatasetChallenge(code, pre_loaded_data, validation_rules, datasets/)
  └── spawn Python subprocess in project/venv (15s timeout)
    └── inject pre_loaded_data, datasets via symlinks
    └── capture stdout/stderr, validate against rules
  └── return { passed, results, stdout, stderr }
  └── on submit: save exercise_attempt, recalculate mastery
```

## Hard Rules (Never Violate)

1. **Synchronous SQLite** — `better-sqlite3` is fully sync. No `async`/`await` or
   Promises for DB queries. Use `.get()`, `.all()`, `.run()` synchronously.

2. **CSS variables only** — No hardcoded hex values for colors. Use `--bg-primary`,
   `--bg-card`, `--text-primary`, `--text-muted`, `--accent-green`, `--accent-red`,
   `--accent-yellow`, `--accent-blue`, `--border`, `--code-text`.

3. **Code blocks use fixed colors** — Code blocks (`bg-[#0d1117]`) must use
   `color: var(--code-text)` or `color: #e6edf3`. They must NOT inherit
   `--text-primary` (which flips dark in light mode). This applies to FillBlank,
   EditQuestionModal, CodeBlock component, DatasetChallenge console, etc.

4. **No new npm packages** — Do not add packages without explicit request.
   Only lucide-react (icons), recharts (charts), tailwind (styling).

5. **Light theme inherits from `:root`** — `:root.light-theme` only overrides
   colors that differ; properties not set there inherit from `:root`. Code block
   colors (`--code-text`) are defined only in `:root` intentionally.

6. **`animate-in` must never wrap `position: fixed`** — CSS `transform` from
   animations on any ancestor breaks viewport-relative fixed positioning.

7. **No `async`/`await` in Express route handlers** — Use `try/catch` + `next(err)`.
   DB calls are synchronous so async is unnecessary.

8. **Relative API paths** — Frontend calls use `/api/...` (no absolute URLs).
   Vite proxies these to the backend.

9. **All route handlers wrapped in try/catch** — Every `router.get/post/etc` must
   delegate errors via `next(err)`.

10. **`window.matchMedia` must be guarded** — In jsdom tests, `matchMedia` is
    undefined; a mock is in `__tests__/setup.js`.

## Key Design Decisions

- Many-to-many tracks↔courses via `track_courses` junction table (migrated from
  legacy `courses.track_id`).
- User-specific data (`user_courses`, `user_tracks`, `user_flashcard_progress`,
  `mastery_scores`, `exercise_attempts`) is per-user; global data
  (`courses`, `tracks`, `concepts`, `quiz_questions`) is shared.
- Course content lives both on disk (`content/tracks/.../exercises/*.json`) and
  in the database (`quiz_questions`, `flashcards`, `concepts`). JSON importer
  seeds DB from disk on startup.
- SM-2 spaced repetition for flashcards; mastery score is weighted combination
  of 7 exercise categories.

## See Also

- `DATABASE_SCHEMA.md` — full table definitions (do NOT read schema.js directly)
- `API_ROUTES.md` — every backend endpoint
- `FRONTEND_MAP.md` — every page, component, exercise
- `KNOWN_STATE.md` — test coverage, recent work, known issues
