import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputPath = path.resolve(__dirname, 'seed-data.sql')

// Load config to find DB path
const configPath = path.resolve(__dirname, '..', 'config.js')
const { default: config } = await import(configPath)

if (!fs.existsSync(config.DB_PATH)) {
  console.error(`Database not found at ${config.DB_PATH}`)
  process.exit(1)
}

console.log(`Dumping database from ${config.DB_PATH}...`)

try {
  const dump = execSync(`sqlite3 "${config.DB_PATH}" .dump`, { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 })
  fs.writeFileSync(outputPath, dump, 'utf-8')
  const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1)
  console.log(`Seed dump written to ${outputPath} (${sizeKb} KB)`)
} catch (err) {
  console.error('Failed to dump database:', err.message)
  process.exit(1)
}
