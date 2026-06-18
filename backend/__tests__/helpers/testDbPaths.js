import path from 'path'
import fs from 'fs'
import os from 'os'

// Create a temporary SQLite database by setting DB_PATH to a temp file
// and seeding it with test data. Returns paths so callers can clean up.
export function createTestDbPaths() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-test-'))
  const dbPath = path.join(tmpDir, 'test.db')
  return { tmpDir, dbPath }
}

// Clean up temp files
export function cleanupTestDb(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch (e) {
    // ignore
  }
}
