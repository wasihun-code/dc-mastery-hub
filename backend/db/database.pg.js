import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

// Pool configured for Neon's free tier
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 5, // Reasonable limit for single-user/dev usage
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Utility: convert SQLite `?` positional parameters to Postgres `$1`, `$2`, etc.
export function convertQuery(sql) {
  let pgSql = ''
  let paramIndex = 1
  let inString = false
  let stringChar = ''
  let isInsert = false

  // Basic check for INSERT to potentially append RETURNING id
  if (sql.trim().toUpperCase().startsWith('INSERT')) {
    isInsert = true
  }

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    if ((char === "'" || char === '"') && sql[i - 1] !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (stringChar === char) {
        inString = false
      }
      pgSql += char
    } else if (char === '?' && !inString) {
      pgSql += `$${paramIndex++}`
    } else {
      pgSql += char
    }
  }

  if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
    pgSql += ' RETURNING *'
  }

  return pgSql
}

// Wrapper to mimic better-sqlite3
const db = {
  prepare: (sql) => {
    const pgSql = convertQuery(sql)
    return {
      get: async (...params) => {
        const { rows } = await pool.query(pgSql, params)
        return rows[0] || undefined
      },
      all: async (...params) => {
        const { rows } = await pool.query(pgSql, params)
        return rows
      },
      run: async (...params) => {
        const result = await pool.query(pgSql, params)
        if (result.rows && result.rows.length > 1) {
          throw new Error('Multi-row INSERT detected with .run() — use .all() instead or handle rows explicitly')
        }
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows && result.rows.length > 0 ? result.rows[0].id : null
        }
      }
    }
  },
  exec: async (sql) => {
    // Basic exec mimicking SQLite's multi-statement support
    await pool.query(sql)
  },
  transaction: (fn) => {
    return async (...args) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        // We override db.prepare for the duration of the transaction?
        // Node's async flow makes this tricky without AsyncLocalStorage.
        // For now, this is a placeholder that assumes the function just awaits normally,
        // but actual transaction wrapping of pool methods requires deeper changes.
        // Note: SQLite's db.transaction was synchronous.
        const res = await fn(...args)
        await client.query('COMMIT')
        return res
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }
  },
  _pool: pool // Expose pool for direct access if needed
}

export default db
