# Database Schema

Source: `backend/db/schema.js`. The schema is idempotent — `CREATE TABLE IF NOT EXISTS`
everywhere, migrations via `ALTER TABLE ADD COLUMN` wrapped in try/catch.

## Conventions

- `created_at` defaults to `datetime('now')` (SQLite UTC text).
- Soft deletes via `is_deleted` / `is_archived` flags (0/1 integer).
- Per-user tables (`user_courses`, `user_tracks`, etc.) use composite PKs.
- Foreign keys are defined but not enforced (SQLite pragma foreign_keys = off).

## Tables

### `users`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| username | TEXT | UNIQUE NOT NULL (email) |
| password_hash | TEXT | NOT NULL (PBKDF2 SHA-512) |
| salt | TEXT | NOT NULL (16-byte hex) |
| is_admin | INTEGER | DEFAULT 0 |
| created_at | TEXT | DEFAULT datetime('now') |

Default users: `admin@gmail.com` / `admin123` (is_admin=1),
`wasihunageru@gmail.com` / `waseageru` (is_admin=0).

### `sessions`
| Column | Type | Constraints |
|---|---|---|
| id | TEXT | PK (crypto random token) |
| user_id | INTEGER | NOT NULL REFERENCES users(id) |
| expires_at | TEXT | NOT NULL (30 days from creation) |

### `tracks`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| slug | TEXT | UNIQUE NOT NULL |
| name | TEXT | NOT NULL |
| description | TEXT | |
| language | TEXT | e.g. 'Python', 'SQL' |
| color | TEXT | hex code for UI |
| is_deleted | INTEGER | DEFAULT 0 |
| is_archived | INTEGER | DEFAULT 0 |
| created_at | TEXT | DEFAULT datetime('now') |

### `courses`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| slug | TEXT | NOT NULL |
| name | TEXT | NOT NULL (auto-capitalized from slug) |
| difficulty | TEXT | DEFAULT 'Unknown' |
| status | TEXT | DEFAULT 'Not Started' |
| notes | TEXT | |
| notes_taken | INTEGER | DEFAULT 0 |
| reviewed | TEXT | DEFAULT 'No' |
| has_pdf | INTEGER | DEFAULT 0 |
| has_glossary | INTEGER | DEFAULT 0 |
| is_deleted | INTEGER | DEFAULT 0 |
| is_archived | INTEGER | DEFAULT 0 |
| created_at | TEXT | DEFAULT datetime('now') |

**Note**: `courses` no longer has `track_id` or `order_in_track` — those moved
to `track_courses`. The many-to-many migration deduplicated courses by slug.

### `track_courses` (junction table)
| Column | Type | Constraints |
|---|---|---|
| track_id | INTEGER | NOT NULL REFERENCES tracks(id) |
| course_id | INTEGER | NOT NULL REFERENCES courses(id) |
| order_in_track | INTEGER | |
| PK | (track_id, course_id) | |

### `concepts`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| course_id | INTEGER | REFERENCES courses(id) |
| name | TEXT | NOT NULL |
| definition | TEXT | |
| code_snippet | TEXT | |
| source_page | INTEGER | |
| category | TEXT | |
| difficulty | INTEGER | DEFAULT 1 |
| created_at | TEXT | DEFAULT datetime('now') |

### `flashcards`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| concept_id | INTEGER | REFERENCES concepts(id) |
| course_id | INTEGER | REFERENCES courses(id) |
| front | TEXT | NOT NULL |
| back | TEXT | NOT NULL |
| next_review_date | TEXT | DEFAULT date('now') |
| interval_days | INTEGER | DEFAULT 1 |
| ease_factor | REAL | DEFAULT 2.5 |
| repetitions | INTEGER | DEFAULT 0 |

### `quiz_questions`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| course_id | INTEGER | REFERENCES courses(id) |
| concept_id | INTEGER | REFERENCES concepts(id) |
| question_text | TEXT | NOT NULL |
| option_a | TEXT | |
| option_b | TEXT | |
| option_c | TEXT | |
| option_d | TEXT | |
| correct_option | TEXT | |
| explanation | TEXT | |
| question_type | TEXT | e.g. 'scenario', 'comparison', 'code_analysis' |
| difficulty | INTEGER | DEFAULT 1 |

### `deleted_questions`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| user_id | INTEGER | NOT NULL REFERENCES users(id) |
| course_slug | TEXT | NOT NULL |
| exercise_type | TEXT | NOT NULL |
| question_id | TEXT | NOT NULL |
| created_at | TEXT | DEFAULT datetime('now') |
| UNIQUE | (user_id, exercise_type, question_id) | |

**Gotcha**: This is per-user deletion. Questions are NOT removed from JSON files
or DB — they're filtered out at query time via a NOT IN subquery.

### `user_tracks`
| Column | Type | Constraints |
|---|---|---|
| user_id | INTEGER | NOT NULL REFERENCES users(id) |
| track_id | INTEGER | NOT NULL REFERENCES tracks(id) |
| is_deleted | INTEGER | DEFAULT 0 |
| is_archived | INTEGER | DEFAULT 0 |
| PK | (user_id, track_id) | |

### `user_courses`
| Column | Type | Constraints |
|---|---|---|
| user_id | INTEGER | NOT NULL REFERENCES users(id) |
| course_id | INTEGER | NOT NULL REFERENCES courses(id) |
| status | TEXT | DEFAULT 'Not Started' |
| difficulty | TEXT | DEFAULT 'Unknown' |
| notes | TEXT | |
| notes_taken | INTEGER | DEFAULT 0 |
| reviewed | TEXT | DEFAULT 'No' |
| is_deleted | INTEGER | DEFAULT 0 |
| is_archived | INTEGER | DEFAULT 0 |
| PK | (user_id, course_id) | |

**Gotcha**: `status` values: 'Not Started', 'In Progress', 'Completed'.
`reviewed` values: 'Yes', 'No'.
When querying course display fields: `COALESCE(uc.field, c.field)` — user
overrides cascade down from the global course default.

### `user_flashcard_progress`
| Column | Type | Constraints |
|---|---|---|
| user_id | INTEGER | NOT NULL REFERENCES users(id) |
| flashcard_id | INTEGER | NOT NULL REFERENCES flashcards(id) |
| interval_days | INTEGER | DEFAULT 1 |
| ease_factor | REAL | DEFAULT 2.5 |
| repetitions | INTEGER | DEFAULT 0 |
| next_review_date | TEXT | DEFAULT date('now') |
| PK | (user_id, flashcard_id) | |

### `user_stats`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| user_id | INTEGER | UNIQUE REFERENCES users(id) |
| total_xp | INTEGER | DEFAULT 0 |
| level | TEXT | DEFAULT 'Beginner' |
| current_streak | INTEGER | DEFAULT 0 |
| longest_streak | INTEGER | DEFAULT 0 |
| last_active_date | TEXT | |
| badges_json | TEXT | DEFAULT '[]' |

### `mastery_scores`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| user_id | INTEGER | REFERENCES users(id) |
| course_id | INTEGER | REFERENCES courses(id) |
| flashcard_score | REAL | DEFAULT 0 |
| quiz_score | REAL | DEFAULT 0 |
| code_score | REAL | DEFAULT 0 |
| dataset_score | REAL | DEFAULT 0 |
| matching_score | REAL | DEFAULT 0 |
| boss_score | REAL | DEFAULT 0 |
| incorrect_score | REAL | DEFAULT 0 |
| overall_mastery | REAL | DEFAULT 0 |
| updated_at | TEXT | DEFAULT datetime('now') |
| UNIQUE | (user_id, course_id) | |

### `exercise_attempts`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| user_id | INTEGER | REFERENCES users(id) |
| course_id | INTEGER | REFERENCES courses(id) |
| exercise_type | TEXT | NOT NULL |
| question_id | TEXT | |
| concept_id | TEXT | |
| was_correct | INTEGER | 1/0 |
| score | REAL | |
| time_taken_secs | INTEGER | |
| attempted_at | TEXT | DEFAULT datetime('now') |

**Gotcha** — `exercise_type` values: `'quiz'`, `'flashcard'`, `'fillblank'`,
`'matching'`, `'bossbattle'`, `'dataset'`. The `'incorrect'` type does NOT exist
in this table — incorrect review pulls from existing attempts where `was_correct=0`.

`concept_id` is TEXT (not an INTEGER FK) because legacy JSON imports used string
IDs like `'concept_001'`.

### `spaced_repetition_queue`
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| user_id | INTEGER | NOT NULL REFERENCES users(id) |
| flashcard_id | INTEGER | NOT NULL REFERENCES flashcards(id) |
| due_date | TEXT | |
| priority | INTEGER | DEFAULT 1 |
| UNIQUE | (user_id, flashcard_id) | |

## SM-2 Algorithm (verified against `backend/routes/progress.js:668-718`)

Quality (q) mapping from `score`:
- >= 1.0 → q=5 (Perfect)
- >= 0.8 → q=4 (Hesitation)
- >= 0.5 → q=3 (Difficulty)
- < 0.5 → q=1 (Incorrect)

If q < 3: reset n=0, interval=1 day.
If q >= 3:
- n=0 → interval=1
- n=1 → interval=6
- n>1 → interval = round(prev_interval × EF)
- n += 1

EF update: `EF = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))`, min 1.3.
Stored in `user_flashcard_progress`.

## Mastery Score Weights (verified against `backend/routes/progress.js:374-383`)

| Category | Weight |
|---|---|
| Dataset Challenge | 30% |
| Fill in the Blank | 20% |
| MCQ (Quiz) | 15% |
| Boss Battle | 15% |
| Matching | 10% |
| Flashcards | 5% |
| Incorrect Review | 5% |

If a category has no exercises available for the course, its score defaults
to 100 (doesn't penalize). Per-concept mastery formula:
`correct / (correct + 0.5 × wrong)`. Overall = min(100, sum of weighted scores).
