import Database from 'better-sqlite3'
import config from '../config.js'

const db = new Database(config.DB_PATH)

db.pragma('journal_mode = WAL')

export default db
