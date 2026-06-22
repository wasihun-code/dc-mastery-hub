# Known State

## Migration Status
The application has been successfully migrated from SQLite to PostgreSQL. The primary database layer (`database.pg.js`) fully supports the queries, and the environment successfully initializes tables without SQLite-specific queries (PRAGMAs). Connection leaks during Jest testing have been resolved using a properly structured `pool.end()` and `afterAll()` cleanup.

## Test Suite Status
When running the full test suite (`npm test`), the following is the current standing:
- **Passed**: `challengeGenerator.test.js`, `manage.test.js`, `courses.test.js`, `manage-questions.test.js`, `tracks.test.js`, `sm2.test.js`
- **Failed**: 8 test suites are currently failing.

### Root Causes of Failing Tests
1. **Asynchronous Wrappers:** Many database methods that were previously synchronous in SQLite (e.g., `db.prepare().all()`, `db.prepare().get()`, `db.exec()`) are now strictly `async` and return Promises in PostgreSQL. Some parts of the codebase, like `routes/admin.js:696` (calling `importJsonExercises()`), are not yet `await`ing these functions, leading to unhandled promises breaking the test suites and endpoints.
2. **Data Model Updates (`track_id`):** The transition from a 1-to-many relationship (where `courses` had a `track_id`) to a many-to-many relationship (`track_courses`) is mostly complete. However, some queries (such as in `db/jsonImporter.js`, `routes/courses.js`, and `services/pdfParser.js`) still attempt to select or join on legacy schemas where `track_id` may be ambiguously referenced or missing. This causes PostgreSQL to throw `column "track_id" does not exist` errors.

## Next Action Items
- Update remaining legacy queries that select `track_id` directly from `courses` instead of joining `track_courses`.
- Find all occurrences of `importJsonExercises()`, `getChallenges()`, and similar database-heavy utility functions and ensure they are properly `await`ed in the Express route handlers.
- Verify `__tests__/admin.test.js` to ensure the `nuclear_reset` endpoint cleans up all tables properly.
