# API Routes

All routes prefixed with `/api`. Auth: cookie-based session. Every route handler
wrapped in try/catch with `next(err)`.

## `auth.js` — Authentication (no auth required)
| Method | Path | Purpose | Auth | Body | Response |
|---|---|---|---|---|---|
| GET | /api/auth/session | Check if logged in | none | — | `{ authenticated, user?, code? }` |
| POST | /api/auth/register | Create account | none | `{ username, password }` | `{ success, user }` + Set-Cookie |
| POST | /api/auth/login | Log in | none | `{ username, password }` | `{ success, user }` + Set-Cookie |
| POST | /api/auth/logout | Clear session | none | — | `{ success }` + clear cookie |

## `tracks.js` — Track listing (auth required)
| Method | Path | Purpose | Auth | Response |
|---|---|---|---|---|
| GET | /api/tracks | All active tracks with course counts & mastery | user | `Track[]` |
| GET | /api/tracks/:slug | Single track with its courses array | user | `{ ...track, courses[] }` |

## `courses.js` — Course details (auth required)
| Method | Path | Purpose | Auth | Query/Body | Response |
|---|---|---|---|---|---|
| GET | /api/courses | All active courses | user | — | `Course[]` with mastery, tracks |
| GET | /api/courses/:slug | Single course + mastery + counts | user | — | Course with concept/flashcard/quiz counts |
| PATCH | /api/courses/:slug | Update course properties | user | `{ status?, notes?, notes_taken?, reviewed?, difficulty?, has_pdf?, has_glossary? }` | `{ status: 'ok' }` |
| GET | /api/courses/:slug/concepts | Concepts for a course | user | — | `Concept[]` |
| GET | /api/courses/:slug/flashcards/due | Due flashcards (shuffled) | user | — | `Flashcard[]` (from JSON or DB) |
| GET | /api/courses/:slug/quiz-questions | Random quiz questions | user | `?count=10&difficulty=&exclude_ids=` | `Question[]` |
| GET | /api/courses/:courseSlug/incorrect-review-status | Unlock status + incorrect count | user | — | `{ attemptRatio, isUnlocked, incorrectCount }` |

**Note**: `PATCH /api/courses/:slug` accepts both user-scoped fields (`status`,
`notes`, `notes_taken`, `reviewed`, `difficulty`) and global fields (`has_pdf`,
`has_glossary`). User-scoped writes to `user_courses`; global to `courses`.

## `progress.js` — User progress & stats (auth required)
| Method | Path | Purpose | Body/Params | Response |
|---|---|---|---|---|
| GET | /api/progress/dashboard | Dashboard aggregates | — | `{ user_stats, tracks_summary, weak_spots, recent_activity, due_flashcards_count, exercise_breakdown, daily_activity, overall_stats }` |
| GET | /api/progress/stats | User stats row | — | `user_stats` row |
| PATCH | /api/progress/stats | Update stats fields | `{ total_xp?, level?, ... }` | Updated stats row |
| GET | /api/progress/attempted-questions/:courseSlug/:exerciseType | Solved question IDs | — | `string[]` (question_ids) |
| POST | /api/progress/attempt | Record an attempt | `{ exercise_type, course_id, question_id?, concept_id?, score?, time_taken_secs?, was_correct }` | `{ attempt, mastery }` |
| GET | /api/progress/exercise-stats/:courseSlug | Per-type stats with available/session counts | — | `{ mcq, flashcard, ftb, matching, boss_battle, dataset }` |
| POST | /api/progress/reset | Reset progress by scope | `{ type: 'course'|'track'|'category'|'all'|'course_exercise_category'|'flashcards'|'attempts', targetId?, category? }` | `{ success }` |
| GET | /api/progress/course-concepts-mastery/:courseId | Per-concept mastery breakdown | — | `ConceptWithMastery[]` |
| GET | /api/progress/incorrect-questions/:courseSlug | Incorrect questions with details | — | `{ course_id, questions[] }` |
| GET | /api/progress/due-flashcards | All due flashcards across courses | — | `Flashcard[]` |
| POST | /api/progress/delete-question | Hide question from user | `{ courseSlug, exerciseType, questionId }` | `{ status: 'ok' }` |

**Gotcha**: `POST /api/progress/attempt` triggers SM-2 update (if flashcard),
mastery recalculation, and streak update — all synchronously in one request.

## `content.js` — Course content & code execution (auth required)
| Method | Path | Purpose | Body/Query | Response |
|---|---|---|---|---|
| GET | /api/exercises/:courseSlug/:exerciseType | Exercise data (JSON file or DB) | `?count=&shuffle=true` | `Item[]` (varies by type) |
| POST | /api/scan | Re-scan content folder for PDFs | — | Summary |
| GET | /api/extract-text/:courseSlug | Raw PDF text (for Gemini CLI) | — | `{ text?, error? }` |
| POST | /api/store/:courseSlug | Store AI-generated content | concepts + quiz questions | Result |
| GET | /api/track-test/:trackSlug | Random 20 MCQ across track | — | `Question[]` |
| GET | /api/pdf/:courseSlug | Serve PDF file | `?type=slides\|glossary` | application/pdf |
| GET | /api/datasets/:courseSlug | List dataset files | — | `{ name, extension, size_kb }[]` |
| GET | /api/challenges/:courseSlug | Unsolved challenges (or all if reattempt) | `?reattempt=true` | `Challenge[]` |
| POST | /api/run-code | Execute user code in sandbox | `{ solution_code/code, courseSlug, challengeId }` | `{ stdout, stderr, success, results }` |
| POST | /api/run-snippet | Run a code snippet | `{ code?, snippet, courseSlug, challengeId }` | Same as run-code |
| POST | /api/submit-challenge | Submit + validate challenge | `{ code, courseSlug, challengeId }` | `{ passed, results, feedback, score }` |

**Gotcha**: Exercise types served from JSON files OR fall back to DB:
- `mcq`/`bossbattle`: JSON → `quiz_questions` table
- `flashcards`: JSON → `flashcards` table
- `ftb`: JSON → auto-generated from `concepts.code_snippet`
- `matching`: JSON → auto-generated from `concepts`
- `challenge`: JSON only, no DB fallback

## `manage.js` — Course/track management (auth required)
| Method | Path | Purpose | Auth | Body | Response |
|---|---|---|---|---|---|
| GET | /api/manage/trash | Deleted tracks + courses | user | — | `{ tracks, courses }` |
| GET | /api/manage/archived | Archived items | user | — | `{ tracks, courses }` |
| POST | /api/manage/track/add | Create track | admin | `{ name, slug, language?, color? }` | `{ success }` |
| POST | /api/manage/track/update-flags | Trash/archive track | user | `{ trackId, is_deleted?, is_archived? }` | `{ success }` |
| POST | /api/manage/course/add | Create course | admin | `{ name, slug, trackId, difficulty? }` | `{ success }` |
| POST | /api/manage/course/update-flags | Trash/archive course | user | `{ courseId, is_deleted?, is_archived? }` | `{ success }` |
| POST | /api/manage/course/copy | Copy course to track | admin | `{ courseId, destTrackId }` | `{ success, newCourseId }` |
| POST | /api/manage/courses/bulk-action | Bulk delete/restore/archive/copy/move | user/admin | `{ courseIds[], action, destTrackId? }` | `{ success }` |
| POST | /api/manage/trash/permanently-delete | Wipe from trash | user/admin | `{ type, id }` | `{ success }` |
| POST | /api/manage/upload-material | Upload PDF/transcript/dataset | admin | `{ courseId, fileType, fileName, fileContent (base64) }` | `{ success }` |
| POST | /api/manage/course/update-properties | Status/notes_taken/reviewed | user | `{ courseId, status?, difficulty?, reviewed?, notes_taken? }` | `{ success }` |

## `manage-questions.js` — Direct JSON editing (auth required)
| Method | Path | Purpose | Body | Response |
|---|---|---|---|---|
| GET | /api/manage/courses/:courseSlug/questions | All questions from JSON files | — | `Item[]` (with `_exerciseType`) |
| POST | /api/manage/courses/:courseSlug/questions/save | Add/edit question in JSON | `{ exerciseType, questionData }` | `{ success, id }` |
| POST | /api/manage/courses/:courseSlug/questions/delete | Remove question from JSON | `{ exerciseType, questionId }` | `{ success }` |

**Gotcha**: This physically edits JSON files on disk (unlike
`POST /api/progress/delete-question` which only hides from the user).

## `admin.js` — Admin panel (auth: admin required)

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | /api/admin/stats | Dashboard counts | `{ users, tracks, courses, ... }` |
| GET | /api/admin/tracks | All tracks with courses | `{ tracks[] }` |
| POST | /api/admin/tracks | Create track | `{ success, track }` |
| PATCH | /api/admin/tracks/:id | Update track fields | `{ success }` |
| DELETE | /api/admin/tracks/:id | Delete track (must be empty) | `{ success }` |
| POST | /api/admin/tracks/:id/archive | Archive track | `{ success }` |
| POST | /api/admin/tracks/:id/restore | Restore track | `{ success }` |
| GET | /api/admin/courses | Courses with filters | `?track_id=&status=` |
| PUT | /api/admin/courses/:id | Update course fields | `{ success }` |
| DELETE | /api/admin/courses/:id | Cascade-delete course | `{ success, cascadeDeleted }` |
| POST | /api/admin/courses/:id/clear-exercises | Wipe all exercises | `{ success }` |
| POST | /api/admin/courses/reorder | Reorder courses in track | `{ track_id, ordered_course_ids[] }` |
| POST | /api/admin/courses/:id/move-track | Move course between tracks | `{ from_track_id, to_track_id }` |
| POST | /api/admin/courses/:id/add-to-track | Link to another track | `{ track_id }` |
| POST | /api/admin/courses/:id/remove-from-track | Unlink from track | `{ track_id }` |
| GET | /api/admin/courses/:id/exercises/summary | Exercise counts | `{ concepts, flashcards, quiz_questions, ... }` |
| POST | /api/admin/courses/:id/exercises/reimport | Re-import JSON → DB | `{ success }` |
| DELETE | /api/admin/courses/:id/exercises/type/:exerciseType | Clear specific exercise type | `{ success, deleted }` |
| GET | /api/admin/users | All users with stats | `{ users[] }` |
| PATCH | /api/admin/users/:id | Update username/admin | `{ success, user }` |
| POST | /api/admin/users | Create user | `{ success, user }` |
| DELETE | /api/admin/users/:id | Delete user (cascade) | `{ success }` |
| POST | /api/admin/users/:id/toggle-admin | Flip is_admin | `{ success, is_admin }` |
| POST | /api/admin/users/:id/reset-progress | Clear user progress | `{ success }` |
| GET | /api/admin/users/:id/progress | User's course progress | `{ user, courses[], stats }` |
| GET | /api/admin/system/stats | System-wide metrics | `{ total_*, db_size_mb, ... }` |
| GET | /api/admin/system/logs | Last 100 log lines | `{ logs[] }` |
| POST | /api/admin/system/reimport-all | Re-import all JSON → DB | `{ success, result }` |
| POST | /api/admin/tracks/reorder | Legacy reorder alias | `{ trackId, courseIds[] }` |
| GET | /api/admin/courses/:id/file-status | Which exercise files exist | `{ files{} }` |
| POST | /api/admin/system/verify-challenges | Read verification report | `{ success, report? }` |
| POST | /api/admin/exercises/reimport | Scan + import | `{ success }` |
| GET | /api/admin/system/config | Server config (safe fields) | `{ config{} }` |
| POST | /api/admin/reset/course/:id | Reset course progress | `{ confirm: true }` |
| POST | /api/admin/reset/track/:id | Reset track progress | `{ confirm: true }` |
| POST | /api/admin/reset/all | Reset all users | `{ confirm, admin_password }` |
| POST | /api/admin/reset/nuclear | Wipe everything | `{ username, password }` |
