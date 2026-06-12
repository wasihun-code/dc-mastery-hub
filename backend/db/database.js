import Database from 'better-sqlite3'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '..')

// Explicitly load .env from the backend directory before reading DB_PATH
dotenv.config({ path: path.resolve(backendDir, '.env') })

const rawDbPath = process.env.DB_PATH || './data/mastery.db'
const dbPath = path.isAbsolute(rawDbPath)
  ? rawDbPath
  : path.resolve(backendDir, rawDbPath)

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

export default db
