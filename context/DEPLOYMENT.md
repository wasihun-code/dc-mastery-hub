# DC Mastery Hub — Operational Deployment

## Render Configuration

- **Live URL**: https://dc-mastery-hub.onrender.com
- **Service Name**: dc-mastery-hub
- **Deployment Strategy**: Docker Container via Render Web Service
- **Auto-Deploy**: Enabled via git push to the main branch.

## Environment Variables (Required)

Ensure the following are set in the Render Dashboard for the web service:
- `NODE_ENV`: `production`
- `HOST`: `0.0.0.0`
- `PORT`: `3001` (Injected automatically by Render, do not hardcode in production)
- `SESSION_SECRET`: A secure, randomly generated string.
- `PYTHON_PATH`: `python3`
- `DB_PATH`: `/var/data/mastery.db`

## Persistent Storage

Render's instances have ephemeral file systems. To persist the `better-sqlite3` database, you MUST attach a Render Persistent Disk mounted to `/var/data` (which matches the `DB_PATH` env var).

## Gotchas Discovered During Deployment

1. **Docker `node_modules` override issue**: 
   Since `better-sqlite3` compiles native C++ bindings for the specific Node.js and OS version, building the Docker container using `COPY . .` *without* a `.dockerignore` file causes the local `node_modules` directory to overwrite the container's freshly installed modules. This triggers a `NODE_MODULE_VERSION` compatibility error (`ERR_DLOPEN_FAILED`). Ensure `.dockerignore` includes `node_modules`.

2. **Python & Pip versions via Docker**: 
   Debian Bullseye (`node:20-bullseye`) ships with an older python `pip` version which occasionally fails with modern python wheels (e.g., `google-auth`). Upgrading the base image to `node:20-bookworm` (which bundles Python 3.11 and a modern pip version) solves this cleanly. Due to PEP 668 on Bookworm, the `--break-system-packages` flag is required when installing dependencies globally.

3. **Express 5.x Wildcard Routing (`PathError`)**: 
   Express 5 updated to `path-to-regexp` v8, where traditional SPA fallback wildcard routes like `app.get('*', ...)` or `app.get('(.*)', ...)` throw syntax errors. To route all non-API paths safely to `index.html` without triggering parsing errors, use a global `app.use((req, res, next) => ...)` middleware instead of string wildcard definitions.

4. **Global Auth Middleware overriding Static Assets**:
   If the authentication middleware catches requests without a specific path prefix, it will inadvertently block the frontend HTML assets and return a `401 Unauthorized` for `/`. Ensure the auth logic explicitly excludes or bypasses paths that do not start with `/api`.

## Render CLI Usage

To view deployments, check logs, or manually trigger deploys from the terminal:

```bash
# List all render services
render services

# View the status of previous and current deployments
render deploys list srv-d8r1c2ernols73epeofg

# Manually trigger a new deploy via CLI
render deploys create srv-d8r1c2ernols73epeofg --confirm

# Stream live server logs for debugging
render logs --resources srv-d8r1c2ernols73epeofg --tail
```

## Database Migration to Neon Postgres (in progress)
> [!CAUTION]
> **TODO (CRITICAL for STAGE 7):** Do NOT deploy to production until a SEPARATE database/project is created for testing. The current test suite runs against the same Neon DB and relies on `TRUNCATE TABLE`. If run against production credentials, it will DESTROY all user data.

- **Provider**: Neon (chosen over Render Postgres due to no free-tier expiration)
- **Confirmed free tier limits**:
  - Storage limit: 0.5 GB per project
  - Expiration policy: No fixed expiration/deletion timer (data is not deleted just for being idle)
  - Auto-suspend: Scales to zero after 5 minutes of inactivity (cold-start reconnect latency is expected and acceptable)
  - Connection limits: Up to 10,000 pooled connections
- **DATABASE_URL**: Stored in `backend/.env` (local) — NOT yet configured on Render (pending later stage)
- **Status**: Stage 2 of 8 complete (schema translated, Postgres DB wrapper built, test strategy implemented) — route conversion NOT yet started
- **IP Allowlisting**: Neon Free Tier does not support IP Allowlisting. Connections from Render will be inherently allowed by default without requiring outbound IP whitelisting.
- **Migration Notes (Stage 2)**:
  - **Boolean columns converted**: `users.is_admin`, `tracks.is_deleted`, `tracks.is_archived`, `courses.has_pdf`, `courses.has_glossary`, `courses.is_deleted`, `courses.is_archived`, `courses.notes_taken`, `user_tracks.is_deleted`, `user_tracks.is_archived`, `user_courses.is_deleted`, `user_courses.is_archived`, `user_courses.notes_taken`, `exercise_attempts.was_correct`. Queries using `= 1` or `= 0` must be updated in Stage 3+.
  - **.lastInsertRowid usages to watch**: `admin.js:82,491`, `auth.js:87`, `manage.js:234`, `progress.js:665`, `pdfParser.js:97`, `schema.js:50`, `jsonImporter.js:176`, and tests. Wrapper auto-appends `RETURNING id` to inserts if missing (Verified via live test script: handles existing `RETURNING` clauses properly). **Multi-row insert guard added**: If an `.run()` query returns multiple rows, the wrapper now explicitly `throw`s an error to prevent silent multi-row corruption.
  - **Test Database Strategy**: Option C (Same Neon DB, `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` on setup/teardown) was chosen because `docker` is not available for local Postgres and Neon free tier does not natively support isolated branching. Note: The `TRUNCATE` table list is hardcoded in `testEnv.pg.js` and needs manual updates if schema tables change.
  - **Test Environment Timing**: A single setup/teardown `TRUNCATE` cycle against Neon takes ~720ms.
  - **Current Database State**: All 16 tables are confirmed completely empty of production data.

### Integer-Where-Boolean Audit Checklist
The following locations assume `1` or `0` for boolean columns. In Stage 3+, **inputs** must be coerced to true/false for Postgres, and **outputs** must be coerced back to `1`/`0` so the frontend does not break (the frontend explicitly checks `=== 1` or sends `1`).

- [x] `backend/db/validate.js:37 | is_deleted | WHERE tc.track_id = ? AND c.is_deleted = 0`
- [x] `backend/db/validate.js:83 | is_deleted | WHERE c.slug = ? AND c.is_deleted = 0`
- [x] `backend/routes/progress.js:41 | is_deleted | LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0`
- [x] `backend/routes/progress.js:41 | is_archived | LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0`
- [x] `backend/routes/progress.js:44 | is_deleted | WHERE COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0`
- [x] `backend/routes/progress.js:44 | is_archived | WHERE COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0`
- [x] `backend/routes/progress.js:54 | was_correct | SELECT COALESCE(AVG(was_correct), 0) * 100 AS score`
- [x] `backend/routes/progress.js:263 | was_correct | const correct = typeAttempts.filter(a => a.was_correct === 1).length`
- [x] `backend/routes/progress.js:285 | was_correct | const correct = typeAttempts.filter(a => a.was_correct === 1).length`
- [x] `backend/routes/progress.js:344 | was_correct | dsAttempts.filter(a => a.was_correct === 1).map(a => String(a.question_id))`
- [x] `backend/routes/progress.js:358 | was_correct | WHERE user_id = ? AND course_id = ? AND was_correct = 0`
- [x] `backend/routes/progress.js:500 | was_correct | COALESCE(SUM(was_correct), 0) AS correct_attempts,`
- [x] `backend/routes/progress.js:502 | was_correct | ROUND(COALESCE(AVG(was_correct), 0) * 100, 1) AS avg_accuracy`
- [x] `backend/routes/progress.js:566 | was_correct | WHERE course_id = ? AND exercise_type = ? AND question_id IS NOT NULL AND was_correct = 1`
- [x] `backend/routes/progress.js:662 | was_correct | was_correct ? 1 : 0,`
- [x] `backend/routes/progress.js:890 | was_correct | if (a.question_id !== null && uniqueQuestionsMap[a.exercise_type] && a.was_correct === 1) {`
- [x] `backend/routes/progress.js:911 | was_correct | const correct = typeAttempts.filter(a => a.was_correct === 1).length`
- [x] `backend/routes/progress.js:1153 | was_correct | const correct = typeAttempts.filter(a => a.was_correct === 1).length`
- [x] `backend/routes/progress.js:1208 | was_correct | WHERE user_id = ? AND course_id = ? AND was_correct = 0`
- [x] `backend/routes/content.js:541 | was_correct | WHERE course_id = ? AND exercise_type = 'dataset' AND was_correct = 1 AND question_id IS NOT NULL`
- [x] `backend/routes/manage.js:36 | is_deleted | WHERE ut.is_deleted = 1`
- [x] `backend/routes/manage.js:54 | is_deleted | WHERE uc.is_deleted = 1`
- [x] `backend/routes/manage.js:77 | is_deleted | WHERE ut.is_archived = 1 AND ut.is_deleted = 0`
- [x] `backend/routes/manage.js:77 | is_archived | WHERE ut.is_archived = 1 AND ut.is_deleted = 0`
- [x] `backend/routes/manage.js:85 | is_deleted | COALESCE(uc.is_deleted, 0) AS is_deleted,`
- [x] `backend/routes/manage.js:86 | is_archived | COALESCE(uc.is_archived, 0) AS is_archived,`
- [x] `backend/routes/manage.js:101 | is_deleted | WHERE uc.is_archived = 1 AND uc.is_deleted = 0`
- [x] `backend/routes/manage.js:101 | is_archived | WHERE uc.is_archived = 1 AND uc.is_deleted = 0`
- [x] `backend/routes/manage.js:170 | is_deleted | db.prepare('UPDATE user_tracks SET is_deleted = ? WHERE user_id = ? AND track_id = ?').run(is_deleted ? 1 : 0, userId, trackId)`
- [x] `backend/routes/manage.js:179 | is_deleted | db.prepare('UPDATE user_courses SET is_deleted = ? WHERE user_id = ? AND course_id = ?').run(is_deleted ? 1 : 0, userId, c.id)`
- [x] `backend/routes/manage.js:183 | is_archived | db.prepare('UPDATE user_tracks SET is_archived = ? WHERE user_id = ? AND track_id = ?').run(is_archived ? 1 : 0, userId, trackId)`
- [x] `backend/routes/manage.js:192 | is_archived | db.prepare('UPDATE user_courses SET is_archived = ? WHERE user_id = ? AND course_id = ?').run(is_archived ? 1 : 0, userId, c.id)`
- [x] `backend/routes/manage.js:273 | is_deleted | db.prepare('UPDATE user_courses SET is_deleted = ? WHERE user_id = ? AND course_id = ?').run(is_deleted ? 1 : 0, userId, courseId)`
- [x] `backend/routes/manage.js:276 | is_archived | db.prepare('UPDATE user_courses SET is_archived = ? WHERE user_id = ? AND course_id = ?').run(is_archived ? 1 : 0, userId, courseId)`
- [x] `backend/routes/manage.js:342 | is_deleted | db.prepare('UPDATE user_courses SET is_deleted = 1 WHERE user_id = ? AND course_id = ?').run(userId, cId)`
- [x] `backend/routes/manage.js:344 | is_deleted | db.prepare('UPDATE user_courses SET is_deleted = 0 WHERE user_id = ? AND course_id = ?').run(userId, cId)`
- [x] `backend/routes/manage.js:346 | is_archived | db.prepare('UPDATE user_courses SET is_archived = 1 WHERE user_id = ? AND course_id = ?').run(userId, cId)`
- [x] `backend/routes/manage.js:348 | is_archived | db.prepare('UPDATE user_courses SET is_archived = 0 WHERE user_id = ? AND course_id = ?').run(userId, cId)`
- [x] `backend/routes/manage.js:518 | has_pdf | db.prepare('UPDATE courses SET has_pdf = 1 WHERE id = ?').run(courseId)`
- [x] `backend/routes/manage.js:521 | has_glossary | db.prepare('UPDATE courses SET has_glossary = 1 WHERE id = ?').run(courseId)`
- [x] `backend/routes/manage.js:569 | notes_taken | values.push(notes_taken ? 1 : 0)`
- [x] `backend/routes/courses.js:50 | is_deleted | COALESCE(uc.is_deleted, 0) AS is_deleted,`
- [x] `backend/routes/courses.js:51 | is_archived | COALESCE(uc.is_archived, 0) AS is_archived,`
- [x] `backend/routes/courses.js:122 | is_deleted | COALESCE(uc.is_deleted, 0) AS is_deleted,`
- [x] `backend/routes/courses.js:123 | is_archived | COALESCE(uc.is_archived, 0) AS is_archived,`
- [x] `backend/routes/courses.js:148 | is_deleted | WHERE COALESCE(uc.is_deleted, 0) = 0 AND COALESCE(uc.is_archived, 0) = 0`
- [x] `backend/routes/courses.js:148 | is_archived | WHERE COALESCE(uc.is_deleted, 0) = 0 AND COALESCE(uc.is_archived, 0) = 0`
- [x] `backend/routes/courses.js:488 | was_correct | WHERE user_id = ? AND course_id = ? AND was_correct = 0`
- [x] `backend/routes/tracks.js:19 | is_deleted | COALESCE(ut.is_deleted, 0) AS is_deleted,`
- [x] `backend/routes/tracks.js:20 | is_archived | COALESCE(ut.is_archived, 0) AS is_archived,`
- [x] `backend/routes/tracks.js:28 | is_deleted | LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0`
- [x] `backend/routes/tracks.js:28 | is_archived | LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0`
- [x] `backend/routes/tracks.js:31 | is_deleted | WHERE COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0`
- [x] `backend/routes/tracks.js:31 | is_archived | WHERE COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0`
- [x] `backend/routes/tracks.js:56 | is_deleted | COALESCE(ut.is_deleted, 0) AS is_deleted,`
- [x] `backend/routes/tracks.js:57 | is_archived | COALESCE(ut.is_archived, 0) AS is_archived,`
- [x] `backend/routes/tracks.js:65 | is_deleted | LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0`
- [x] `backend/routes/tracks.js:65 | is_archived | LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0 AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), 0) = 0`
- [x] `backend/routes/tracks.js:68 | is_deleted | WHERE t.slug = ? AND COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0`
- [x] `backend/routes/tracks.js:68 | is_archived | WHERE t.slug = ? AND COALESCE(ut.is_deleted, 0) = 0 AND COALESCE(ut.is_archived, 0) = 0`
- [x] `backend/routes/tracks.js:93 | is_deleted | COALESCE(uc.is_deleted, 0) AS is_deleted,`
- [x] `backend/routes/tracks.js:94 | is_archived | COALESCE(uc.is_archived, 0) AS is_archived,`
- [x] `backend/routes/tracks.js:105 | is_deleted | WHERE tc.track_id = ? AND COALESCE(uc.is_deleted, 0) = 0 AND COALESCE(uc.is_archived, 0) = 0`
- [x] `backend/routes/tracks.js:105 | is_archived | WHERE tc.track_id = ? AND COALESCE(uc.is_deleted, 0) = 0 AND COALESCE(uc.is_archived, 0) = 0`
- [x] `backend/routes/admin.js:45 | is_admin | const adminCount = db.prepare('SELECT COUNT(*) AS count FROM users WHERE is_admin = 1').get().count`
- [x] `backend/routes/admin.js:60 | is_deleted | (SELECT COUNT(*) FROM track_courses tc JOIN courses c ON c.id = tc.course_id WHERE tc.track_id = t.id AND c.is_deleted = 0 AND c.is_archived = 0) AS active_course_count`
- [x] `backend/routes/admin.js:60 | is_archived | (SELECT COUNT(*) FROM track_courses tc JOIN courses c ON c.id = tc.course_id WHERE tc.track_id = t.id AND c.is_deleted = 0 AND c.is_archived = 0) AS active_course_count`
- [x] `backend/routes/admin.js:119 | is_deleted | const hasCourses = db.prepare('SELECT COUNT(*) AS count FROM track_courses tc JOIN courses c ON c.id = tc.course_id WHERE tc.track_id = ? AND c.is_deleted = 0').get(trackId).count`
- [x] `backend/routes/admin.js:136 | is_archived | db.prepare('UPDATE tracks SET is_archived = 1 WHERE id = ?').run(trackId)`
- [x] `backend/routes/admin.js:147 | is_deleted | db.prepare('UPDATE tracks SET is_archived = 0, is_deleted = 0 WHERE id = ?').run(trackId)`
- [x] `backend/routes/admin.js:147 | is_archived | db.prepare('UPDATE tracks SET is_archived = 0, is_deleted = 0 WHERE id = ?').run(trackId)`
- [x] `backend/routes/admin.js:161 | is_deleted | if (status === 'deleted') { where += ' AND c.is_deleted = 1' }`
- [x] `backend/routes/admin.js:162 | is_archived | else if (status === 'archived') { where += ' AND c.is_archived = 1' }`
- [x] `backend/routes/admin.js:163 | is_deleted | else if (status === 'active') { where += ' AND c.is_deleted = 0 AND c.is_archived = 0' }`
- [x] `backend/routes/admin.js:163 | is_archived | else if (status === 'active') { where += ' AND c.is_deleted = 0 AND c.is_archived = 0' }`
- [x] `backend/routes/admin.js:471 | is_admin | if (req.body.is_admin !== undefined) { updates.push('is_admin = ?'); values.push(req.body.is_admin ? 1 : 0) }`
- [x] `backend/routes/admin.js:490 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, ?)').run(username.trim(), hash, salt, is_admin ? 1 : 0)`
- [x] `backend/routes/admin.js:494 | is_admin | res.json({ success: true, user: { id: userId, username: username.trim(), is_admin: is_admin ? 1 : 0 } })`
- [x] `backend/__tests__/admin.test.js:112 | is_admin | const adminUser = res.body.users.find(u => u.is_admin === 1)`
- [x] `backend/__tests__/admin.test.js:116 | is_admin | const studentUser = res.body.users.find(u => u.is_admin === 0)`
- [x] `backend/__tests__/admin.test.js:154 | is_admin | expect(res.body.is_admin).toBe(1)`
- [x] `backend/__tests__/admin.test.js:157 | is_admin | expect(user.is_admin).toBe(1)`
- [x] `backend/__tests__/auth.test.js:49 | is_admin | expect(res.body.user.is_admin).toBe(0)`
- [x] `backend/__tests__/auth.test.js:137 | is_admin | expect(res.body.user.is_admin).toBe(0)`
- [x] `backend/__tests__/contentScanner.test.js:53 | has_pdf | db.prepare('UPDATE courses SET has_pdf = 0, has_glossary = 0').run()`
- [x] `backend/__tests__/contentScanner.test.js:53 | has_glossary | db.prepare('UPDATE courses SET has_pdf = 0, has_glossary = 0').run()`
- [x] `backend/__tests__/contentScanner.test.js:102 | has_pdf | expect(course.has_pdf).toBe(1)`
- [x] `backend/__tests__/contentScanner.test.js:103 | has_glossary | expect(course.has_glossary).toBe(1)`
- [x] `backend/__tests__/contentScanner.test.js:118 | has_pdf | expect(course.has_pdf).toBe(1)`
- [x] `backend/__tests__/contentScanner.test.js:119 | has_glossary | expect(course.has_glossary).toBe(0)`
- [x] `backend/__tests__/contentScanner.test.js:134 | has_pdf | expect(course.has_pdf).toBe(0)`
- [x] `backend/__tests__/contentScanner.test.js:135 | has_glossary | expect(course.has_glossary).toBe(1)`
- [x] `backend/__tests__/manage.test.js:144 | is_deleted | expect(ut.is_deleted).toBe(1)`
- [x] `backend/__tests__/manage.test.js:145 | is_archived | expect(ut.is_archived).toBe(0)`
- [x] `backend/__tests__/manage.test.js:209 | is_archived | expect(uc.is_archived).toBe(1)`
- [x] `backend/__tests__/manage.test.js:283 | is_archived | expect(ut.is_archived).toBe(1)`
- [x] `backend/__tests__/manage.test.js:284 | is_deleted | expect(ut.is_deleted).toBe(0)`
- [x] `backend/__tests__/manage.test.js:300 | is_deleted | expect(ut.is_deleted).toBe(1)`
- [x] `backend/__tests__/manage.test.js:301 | is_archived | expect(ut.is_archived).toBe(1)`
- [x] `backend/__tests__/manage.test.js:317 | is_deleted | expect(uc.is_deleted).toBe(1)`
- [x] `backend/__tests__/manage.test.js:416 | is_deleted | expect(uc.is_deleted).toBe(0)`
- [x] `backend/__tests__/manage.test.js:440 | is_archived | expect(uc.is_archived).toBe(0)`
- [x] `backend/__tests__/manage.test.js:592 | is_deleted | expect(uc.is_deleted).toBe(1)`
- [x] `backend/__tests__/manage.test.js:593 | is_archived | expect(uc.is_archived).toBe(1)`
- [x] `backend/__tests__/manage.test.js:653 | has_pdf | expect(course.has_pdf).toBe(1)`
- [x] `backend/__tests__/manage.test.js:671 | has_glossary | expect(course.has_glossary).toBe(1)`
- [x] `backend/__tests__/schema.test.js:44 | is_admin | test('creates default admin user with is_admin=1', () => {`
- [x] `backend/__tests__/schema.test.js:47 | is_admin | expect(admin.is_admin).toBe(1)`
- [x] `backend/__tests__/schema.test.js:52 | is_admin | test('creates default wasihunageru user with is_admin=0', () => {`
- [x] `backend/__tests__/schema.test.js:55 | is_admin | expect(user.is_admin).toBe(0)`
- [x] `backend/__tests__/progress.test.js:93 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('nostats@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:148 | was_correct | expect(res.body.attempt.was_correct).toBe(1)`
- [x] `backend/__tests__/progress.test.js:168 | was_correct | expect(res.body.attempt.was_correct).toBe(0)`
- [x] `backend/__tests__/progress.test.js:308 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('dashnostats@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:514 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('noflashcards@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:557 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('dashboard-detail@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:620 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('zerostats@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:683 | was_correct | expect(res.body.attempt.was_correct).toBe(1)`
- [x] `backend/__tests__/progress.test.js:703 | was_correct | expect(res.body.attempt.was_correct).toBe(1)`
- [x] `backend/__tests__/progress.test.js:757 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('duecards-due@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:975 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('noweak@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:1010 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('noactivity@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:1033 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('allcomplete@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:1060 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('sm2second@test.com', hash, salt)`
- [x] `backend/__tests__/progress.test.js:1091 | is_admin | const result = db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, 0)').run('sm2reset@test.com', hash, salt)`
- [x] `frontend/src/components/CourseFilter.jsx:265 | is_archived | if (selectedArchive === 'active' && c.is_archived === 1) return false`
- [x] `frontend/src/components/CourseFilter.jsx:266 | is_archived | if (selectedArchive === 'archived' && c.is_archived !== 1) return false`
- [x] `frontend/src/components/CourseFilter.jsx:268 | is_archived | if (c.is_archived === 1) return false`
- [x] `frontend/src/components/CourseFilter.jsx:274 | notes_taken | const taken = c.notes_taken == 1`
- [x] `frontend/src/components/CourseFilter.jsx:327 | is_archived | if (archiveVal === 'active') return baseForArchive.filter((c) => c.is_archived !== 1).length`
- [x] `frontend/src/components/CourseFilter.jsx:328 | is_archived | if (archiveVal === 'archived') return baseForArchive.filter((c) => c.is_archived === 1).length`
- [x] `frontend/src/components/CourseFilter.jsx:334 | notes_taken | const notesTakenCount = baseForNotesTaken.filter(c => c.notes_taken == 1).length`
- [x] `frontend/src/components/CourseFilter.jsx:335 | notes_taken | const notesNotTakenCount = baseForNotesTaken.filter(c => c.notes_taken != 1).length`
- [x] `frontend/src/pages/ManageContent.jsx:355 | is_archived | if (courseFilterArchive === 'active') matchesArchive = course.is_archived !== 1`
- [x] `frontend/src/pages/ManageContent.jsx:356 | is_archived | else if (courseFilterArchive === 'archived') matchesArchive = course.is_archived === 1`
- [x] `frontend/src/pages/ManageContent.jsx:363 | notes_taken | const matchesNotesTaken = courseFilterNotesTaken === 'all' || (courseFilterNotesTaken === 'taken' && course.notes_taken == 1) || (courseFilterNotesTaken === 'not_taken' && course.notes_taken != 1)`
- [x] `frontend/src/pages/ManageContent.jsx:640 | has_pdf | {course.has_pdf === 1 && (`
- [x] `frontend/src/pages/ManageContent.jsx:862 | has_pdf | {course.has_pdf === 1 && <span className="text-[var(--accent-green)] px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--accent-green) 15%, transparent)' }}>Available</span>}`
- [x] `frontend/src/pages/ManageContent.jsx:871 | has_glossary | {course.has_glossary === 1 && <span className="text-[var(--accent-green)] px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--accent-green) 15%, transparent)' }}>Available</span>}`
- [x] `frontend/src/pages/WranglingSpeedrun.jsx:262 | was_correct | was_correct: isCorrect ? 1 : 0`
- [x] `frontend/src/pages/AdminPanel.jsx:1120 | is_admin | <input type="checkbox" checked={!!editData.is_admin} onChange={e => setEditData({ ...editData, is_admin: e.target.checked ? 1 : 0 })} className="cursor-pointer" />`
- [x] `frontend/src/pages/TrackTest.jsx:236 | was_correct | was_correct: isCorrect ? 1 : 0`
- [x] `frontend/src/pages/StudySession.jsx:207 | was_correct | was_correct: wasCorrect ? 1 : 0`
- [x] `frontend/src/pages/CourseDetail.jsx:533 | has_pdf | {course.has_pdf === 1 && (`
- [x] `frontend/src/pages/CourseDetail.jsx:538 | has_glossary | {course.has_glossary === 1 && (`
- [x] `frontend/src/pages/CourseDetail.jsx:625 | has_pdf | {course.has_pdf === 1 && (`
- [x] `frontend/src/pages/CourseDetail.jsx:633 | has_glossary | {course.has_glossary === 1 && (`
- [x] `frontend/src/pages/ManageCourseDetail.jsx:401 | is_archived | onClick={() => handleCourseAction('archive', course.is_archived === 1 ? false : true)}`
- [x] `frontend/src/pages/ManageCourseDetail.jsx:403 | is_archived | course.is_archived === 1`
- [x] `frontend/src/pages/ManageCourseDetail.jsx:408 | is_archived | {course.is_archived === 1 ? (`
- [x] `frontend/src/pages/Tracks.jsx:247 | notes_taken | const matchesNotesTaken = selectedNotesTaken === 'all' || (selectedNotesTaken === 'taken' && course.notes_taken == 1) || (selectedNotesTaken === 'not_taken' && course.notes_taken != 1)`
- [x] `frontend/src/exercises/IncorrectReview.jsx:300 | was_correct | was_correct: userAnswerCorrect ? 1 : 0`
- [x] `frontend/src/exercises/MatchingGame.jsx:376 | was_correct | was_correct: isCorrect ? 1 : 0`
- [x] `frontend/src/exercises/BossBattle.jsx:373 | was_correct | was_correct: isCorrect ? 1 : 0`
- [x] `frontend/src/exercises/DatasetChallenge.jsx:506 | was_correct | was_correct: data.passed ? 1 : 0,`
- [x] `frontend/src/exercises/Flashcards.jsx:222 | was_correct | was_correct: wasCorrect ? 1 : 0`
- [x] `frontend/src/exercises/Quiz.jsx:238 | was_correct | was_correct: finalCorrect ? 1 : 0`
- [x] `frontend/src/exercises/FillBlank.jsx:399 | was_correct | was_correct: allCorrect ? 1 : 0`
- [x] `frontend/src/__tests__/exercises/MatchingGame.test.jsx:198 | was_correct | expect(body.was_correct).toBe(1)`

### Boolean Normalization Bridge (Frontend)
- **Location**: `frontend/src/utils/apiInterceptor.js` (imported in `frontend/src/main.jsx`)
- **Status**: ACTIVE. No shared API client module existed in the app (100+ independent `fetch()` calls found). The interceptor remains global but was hardened:
  - Scoped explicitly to intercept only URLs matching `/api/`.
  - Recursively coerces exact 1/0 values to `true`/`false` ONLY for the 14 columns identified in the audit above.
  - Non-`/api/` URLs pass through completely untouched.
- **Removal Condition**: Remove this interceptor script and its import from `main.jsx` AFTER all backend routes (Stages 3-8) are converted to Postgres and guaranteed to return native boolean types. The interceptor is designed to self-report `console.warn`s once it encounters native booleans, signaling it is safe to remove. Note explicitly: building a real shared `apiClient.js` wrapper for all 100+ fetch call sites is a legitimate FUTURE improvement worth considering but is explicitly OUT OF SCOPE for the Postgres migration.
- **Backend Write-Path Gaps Verified & Fixed**: A rigorous verification of backend write-paths (INSERT/UPDATE) identified that while most routes used explicit `? 1 : 0` coercion, the dynamic update loops in `admin.js` and `courses.js` passed values directly.
  - **Fixes applied**:
    - `backend/routes/admin.js:100` (tracks: `is_deleted`, `is_archived`)
    - `backend/routes/courses.js:280` (user_courses: `notes_taken`, courses: `has_pdf`, `has_glossary`)
  - All gaps were patched to coerce inputs to integers so SQLite bindings remain stable until Stage 3+ removes integer-booleans entirely.

**Stage 3: Convert `courses.js` & Prove Pattern (COMPLETED)**
- Modify `backend/routes/courses.js` to use `database.pg.js` wrapper.
- Change `try/catch` handlers to properly `await` DB calls.
- Convert `db.prepare('...').get().count` (SQLite integer response) to `parseInt((await db.prepare('...').get()).count)` handling string responses from `COUNT(*)`.
- Convert `JSON.parse` logic because `json_agg` natively returns arrays instead of serialized JSON strings.
- Refactor `courses.test.js` to use `testEnv.pg.js` and point at Neon.
- **Timing Analysis**: `courses.test.js` slowed down from ~1s locally to ~37s. This is strictly due to sequential network round-trips during `seedTestData`'s numerous `.run()` statements against the live Neon instance. Since this only affects the test suite, we accepted the slowdown rather than redesign the idempotent seeding flow just for tests.
- **Coexistence Verified**: `courses.test.js` successfully runs against Postgres, while `tracks.test.js` successfully runs against the parallel local SQLite implementation.

**Stage 4: Convert Remaining Core Routes**

---

### PRE-STAGE 4 CHECKLIST: Postgres JSON & Aggregate Handling
The following locations require specific handling during Stage 4+ due to node-postgres driver behavior:
1. `COUNT()`, `SUM()`, `AVG()` return as **strings** (BigInt precision preservation) and must be parsed (`parseInt`/`parseFloat`).
2. SQLite `json_group_array(json_object(...))` must be translated to Postgres `json_agg(json_build_object(...))`.
3. Postgres `json_agg` returns a native JS array/object, unlike SQLite which returns a serialized JSON string. Existing `JSON.parse` calls on these outputs must be guarded with `typeof === 'string'`.

**`admin.js`**
- Lines 36-46: `COUNT(*)` aggregates (`userCount`, `trackCount`, etc.) — needs `parseInt`
- Line 44: `SUM(total_xp)` aggregate (`totalXp`) — needs `parseInt`
- Line 123: `COUNT(*)` aggregate (`hasCourses`) — needs `parseInt`
- Line 171: `json_group_array(json_object(...))` — needs `json_agg(json_build_object(...))`
- Line 173-174: `COUNT(*)` in subquery (`has_exercises`, `student_count`) — needs `parseInt` when mapped
- Line 175: `AVG(...)` in subquery (`mastery_avg`) — needs `parseFloat` when mapped
- Line 184: `JSON.parse(c.tracks_json)` — needs type check (Postgres native array)
- Lines 312-316: `COUNT(*)` aggregates — needs `parseInt`
- Lines 370-371: `COUNT(*)` aggregates — needs `parseInt`
- Line 382: `totalAttempts += ...count` — **critically** needs `parseInt` to avoid string concatenation
- Lines 454-455: `COUNT(*)` in subquery (`courses_started`, `courses_completed`) — needs `parseInt` when mapped
- Lines 577-583: `COUNT(*)` aggregates (`total_users`, etc.) — needs `parseInt`

**`auth.js`**
- Line 26: `COUNT(*)` aggregate (`userCount`) — needs `parseInt`

**`manage.js`**
- Lines 41, 88: `json_group_array(json_object(...))` — needs `json_agg(json_build_object(...))`
- Lines 57, 104: `JSON.parse(c.tracks_json)` — needs type check (Postgres native array)

**`progress.js`**
- Line 34: `COUNT(c.id)` (`course_count`) — needs `parseInt`
- Lines 35-36: `SUM(...)` (`completed_count`, `in_progress_count`) — needs `parseInt`
- Line 37: `AVG(...)` (`overall_mastery`) — needs `parseFloat`
- Line 54: `AVG(...)` (`score`) — needs `parseFloat`
- Lines 356, 365: `COUNT(DISTINCT ...)` (`totalQuestions.count`, `attemptedQuestions.count`) — needs `parseInt`
- Lines 426-427: `COUNT(*)` (`attempt_count`), `SUM(...)/COUNT(*)` (`correct_rate`) — needs `parseInt`/`parseFloat`
- Line 457: `COUNT(*)` (`totalRow.count`) — needs `parseInt`
- Lines 468-471: `COUNT(*)`, `SUM(...)`, `AVG(...)` — needs `parseInt`/`parseFloat`
- Lines 487-488: `SUM(...)` (`correct_attempts`, `total_time_secs`) — needs `parseInt`
- Lines 500-502: `SUM(...)`, `AVG(...)` — needs `parseInt`/`parseFloat`

**`tracks.js`**
- Lines 22-24: `SUM(...)`, `AVG(...)` — needs `parseInt`/`parseFloat`
- Lines 59-61: `SUM(...)`, `AVG(...)` — needs `parseInt`/`parseFloat`

**`content.js` & `manage-questions.js`**
- No structural JSON/aggregate query issues found. All `JSON.parse` usage is directly against filesystem data, which remains correct.
