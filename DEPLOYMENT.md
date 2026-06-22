# Deployment

This branch represents the migration of the DC Mastery Hub backend from better-sqlite3 to pg (PostgreSQL).
The deployment and setup instructions below outline the necessary steps to set up this environment properly.

## Prerequisites
- Node.js v20+
- PostgreSQL v14+ (local or remote)
- A `.env` file at the root of `backend/` containing:
  - `DATABASE_URL` (e.g. `postgres://user:pass@localhost:5432/dc_mastery_hub`)

## Setting Up

1. **Install Dependencies**
   ```bash
   cd backend
   npm install pg pg-pool dotenv --save
   ```

2. **Configure Database**
   Make sure you have a running PostgreSQL database. Update the `DATABASE_URL` inside `backend/.env` to reflect your connection string.

3. **Initialize Schema & Seed**
   You can manually run the seed script to initialize schemas and default datasets.
   ```bash
   cd backend
   node db/seed.js
   ```

4. **Running the Application**
   ```bash
   npm run dev
   ```

## Development
- The core PostgreSQL driver exists in `db/database.pg.js`. It exposes a pseudo-synchronous `db.prepare(...).all()` API that returns Promises (unlike SQLite).
- Ensure that any `db.prepare().get()`, `db.prepare().all()`, and `db.prepare().run()` calls inside your Express controllers are `await`ed.
- For running the test suite:
  ```bash
  npm test
  ```
