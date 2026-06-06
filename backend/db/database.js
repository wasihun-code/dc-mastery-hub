import Database from 'better-sqlite3'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config()

const dbPath = process.env.DB_PATH || './data/mastery.db'

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

export default db
