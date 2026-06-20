# Frontend Map
**Status**: Boolean usage for 14 specified fields has been verified and fully resolved to `true`/`false`. `WranglingSpeedrun.jsx` and `TrackTest.jsx` are already correctly documented below.

## Pages (`frontend/src/pages/`)

| File | Purpose | Key State | Key API Calls |
|---|---|---|---|
| `Tracks.jsx` | Track listing with mastery rings, filter by language | `tracks`, `filter`, `canFitSideBySide` (ResizeObserver, 920px threshold) | GET `/api/tracks` |
| `TrackDetail.jsx` | Single track with its courses, progress bars | `track`, `courses` | GET `/api/tracks/:slug` |
| `TrackTest.jsx` | 20-question random MCQ across a whole track | `questions`, `currentIndex`, `score` | GET `/api/track-test/:trackSlug` |
| `CourseDetail.jsx` | Course overview with PDF viewer + exercise links | `course`, `mastery` breakdown | GET `/api/courses/:slug`, GET `/api/progress/exercise-stats/:courseSlug` |
| `Dashboard.jsx` | Aggregated stats, charts, weak spots, activity | all dashboard data | GET `/api/progress/dashboard` |
| `ManageContent.jsx` | Course management: trash, archive, custom courses | `activeTab`, `canFitSideBySide`, `loading` | GET `/api/manage/trash`, `/api/manage/archived`, GET/POST `/api/courses` |
| `ManageCourseDetail.jsx` | Single course manage view (edit properties) | `course`, `courses` | GET `/api/courses/:slug`, POST `/api/manage/course/update-properties` |
| `MasteryMap.jsx` | Visual per-concept mastery heatmap | `concepts` | GET `/api/progress/course-concepts-mastery/:courseId` |
| `StudySession.jsx` | Spaced-repetition flashcard review | `cards`, `currentIndex`, `rate` | GET `/api/courses/:slug/flashcards/due`, POST `/api/progress/attempt` |
| `Settings.jsx` | Theme toggle, audio settings, progress reset | `theme`, `volume`, `muted` | GET/PATCH `/api/progress/stats`, theme stored in settingsService |
| `AdminPanel.jsx` | Full admin: users, tracks, courses, reset, system | `activeTab`, `users`, `tracks`, `courses` | Multiple `/api/admin/*` endpoints |
| `CapstoneBattleSelection.jsx` | Capstone track doorways (4 panels) | static | none |
| `WranglingSpeedrun.jsx` | Boss-battle-style speedrun across entire track | `battleState`, `currentQuestion` | GET `/api/challenges/:courseSlug` (for boss data amalgamation) |

## Exercises (`frontend/src/exercises/`)

| File | Purpose | Key State | Key API Calls |
|---|---|---|---|
| `Quiz.jsx` | MCQ with option feedback, keyboard shortcuts (1-4) | `currentIndex`, `selectedOption`, `revealed` | GET `/api/courses/:slug/quiz-questions`, POST `/api/progress/attempt` |
| `FillBlank.jsx` | Code completion with blank slots, responsive layout | `blanks`, `isWide` (matchMedia 1024px) | GET `/api/exercises/:slug/ftb`, POST `/api/progress/attempt` |
| `Flashcards.jsx` | SM-2 flashcard review with rate buttons | `cards`, `currentIndex`, `flipped` | GET `/api/exercises/:slug/flashcards`, POST `/api/progress/attempt` |
| `MatchingGame.jsx` | Drag-to-match term↔definition rounds | `rounds`, `currentRound`, `score` | GET `/api/exercises/:slug/matching`, POST `/api/progress/attempt` |
| `BossBattle.jsx` | Gauntlet of MCQ with HP bar, answer shuffle per question | `currentIndex`, `shuffledKeys`, `hp` | GET `/api/exercises/:slug/bossbattle`, POST `/api/progress/attempt` |
| `DatasetChallenge.jsx` | Code editor (Monaco) + dataset challenge with validation | `challenges`, `code`, `result`, `passed` | GET `/api/challenges/:courseSlug`, POST `/api/submit-challenge`, POST `/api/run-code` |
| `IncorrectReview.jsx` | Re-attempt previously wrong questions | `questions`, `currentIndex` | GET `/api/progress/incorrect-questions/:courseSlug`, POST `/api/progress/attempt` |

## Shared Components (`frontend/src/components/`)

| File | Props | Purpose |
|---|---|---|
| `CodeBlock.jsx` | `{ code, language?, inline? }` | Renders syntax-highlighted code with `bg-[#0d1117]` + `color: #e6edf3` |
| `ExerciseTimer.jsx` | `{ duration, onExpire, paused?, onTick? }` | Countdown timer with expire callback, audio on expiry |
| `MasteryRing.jsx` | `{ score: number, size?: number, strokeWidth?: number }` | SVG circular progress ring (green for 100%, yellow/orange/red otherwise) |
| `Sidebar.jsx` | — (internal state via React Router) | Navigation sidebar with links to Tracks, Dashboard, Manage, Settings |
| `TopBar.jsx` | — (internal state via React Router) | Top bar with theme toggle, audio controls, user menu |
| `PdfViewer.jsx` | `{ courseSlug, type?: 'slides'\|'glossary' }` | Embedded PDF viewer with page navigation |
| `CourseFilter.jsx` | `{ courses, compact?, onFilterChange, notesTakenOptions }` | Filter/sort controls (status, difficulty, notes taken, search) |
| `QuestionManager.jsx` | `{ courseSlug, exerciseType }` | List/add/edit/delete questions for a specific exercise type |
| `EditQuestionModal.jsx` | `{ courseSlug, exerciseType, questionData, onClose, onSave }` | Modal form for editing MCQ/FillBlank/Flashcard/Challenge questions. FTB: transforms `_____` → `[[N]]` markers on init, converts back on save. |
| `ErrorBoundary.jsx` | `{ children }` | Catches render errors, shows fallback |
| `Login.jsx` | — | Login form |
| `Signup.jsx` | — | Registration form |
| `AdminRoute.jsx` | `{ children }` | Route guard: redirects non-admin users |

### Admin sub-components (`frontend/src/components/admin/`)

| File | Props | Purpose |
|---|---|---|
| `AdminTable.jsx` | `{ columns[], data[], onEdit?, onDelete?, keyField }` | Generic sortable data table with actions |
| `ConfirmModal.jsx` | `{ isOpen, title, message, onConfirm, onCancel }` | Confirmation dialog |
| `DangerZone.jsx` | `{ onAction, actionLabel, description }` | Destructive action button with confirmation |
| `StatusBadge.jsx` | `{ status: string }` | Colored badge (success/warning/error/neutral) |

## Services (`frontend/src/services/`)

| File | Purpose |
|---|---|
| `feedbackService.js` | Web Audio API synth — plays correct/wrong/success/expire tones. All sounds < 500ms. Respects mute toggle + volume slider. |
| `settingsService.js` | Persists theme + audio settings to localStorage (`dc-settings` key) + syncs to DB via PATCH. |

## Utils (`frontend/src/utils/`)

| File | Purpose |
|---|---|
| `renderWithCode.jsx` | Renders text with embedded `<CodeBlock>` for `{code}` markers in question text |
| `apiInterceptor.js` | Scoped `fetch` interceptor for `/api/` routes. Recursively coerces legacy 1/0 to `true`/`false` for 14 specific boolean columns. Includes self-reporting removal warnings. |

## Notable Patterns

- **ResizeObserver for layout**: `Tracks.jsx` and `ManageContent.jsx` use
  ResizeObserver with a `canFitSideBySide` threshold of 920px container width.
  `ManageContent.jsx` deps: `[loading, activeTab]` (NOT `[]` — ref is null on mount).
- **matchMedia for responsive**: `FillBlank.jsx` and some pages use
  `window.matchMedia('(min-width: 1024px)')` to detect wide layout.
- **CSS variables for theming**: `:root` (dark) + `:root.light-theme` (light).
  Code blocks use fixed `--code-text` defined only in `:root` (intentional).
- **No async DB**: API routes are synchronous; all route handlers use `try/catch` + `next(err)`.
- **Audio**: `feedbackService.js` creates oscillator tones on the fly. No audio files.
  `playTone(freq, duration, type)`, sequences via `playSequence()`.
