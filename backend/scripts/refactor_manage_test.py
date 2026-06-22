import re
import sys

filepath = "/home/waseageru/dc-mastery-hub-pg/backend/__tests__/manage.test.js"
with open(filepath, "r") as f:
    content = f.read()

# 1. testEnv.pg.js and db import
content = content.replace("import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.js'", 
                          "import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'\nimport db from '../db/database.pg.js'")
content = content.replace("let db, testData, env, app", "let testData, env, app")

# Remove SQLite setup
sqlite_setup = """  const { initSchema } = await import('../db/schema.js')
  initSchema()

  const Database = (await import('better-sqlite3')).default
  db = new Database(env.dbPath)
  db.pragma('journal_mode = WAL')

  db.prepare('DELETE FROM user_stats').run()
  db.prepare('DELETE FROM sessions').run()
  db.prepare('DELETE FROM users').run()"""
content = content.replace(sqlite_setup, "")

# 2. Add timeout for beforeAll
content = content.replace("beforeAll(async () => {", "jest.setTimeout(60000);\nbeforeAll(async () => {")

# 3. getSessionUser to async
content = content.replace("function getSessionUser(req) {", "async function getSessionUser(req) {")
content = re.sub(r"const s = db\.prepare\('SELECT \* FROM sessions WHERE id = \?'\)\.get\((.*?)\)", r"const s = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(\1)", content)
content = re.sub(r"db\.prepare\('DELETE FROM sessions WHERE id = \?'\)\.run\((.*?)\)", r"await db.prepare('DELETE FROM sessions WHERE id = ?').run(\1)", content)
content = re.sub(r"return db\.prepare\('SELECT id, username, is_admin FROM users WHERE id = \?'\)\.get\((.*?)\)", r"return await db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(\1)", content)

# 4. middleware async
content = content.replace("const user = getSessionUser(req)", "const user = await getSessionUser(req)")
content = content.replace("app.use((req, res, next) => {\n    const user = await getSessionUser(req)", 
                          "app.use(async (req, res, next) => {\n    const user = await getSessionUser(req)")
content = content.replace("testData = seedTestData(db)", "testData = await seedTestData()")
content = content.replace("afterAll(() => {", "afterAll(async () => {")
content = content.replace("env = setupTestEnvironment()", "env = await setupTestEnvironment()")
content = content.replace("cleanupTestEnvironment(env.tmpDir)", "await cleanupTestEnvironment(env.tmpDir)")

# 5. db.prepare to await db.prepare inside tests
new_lines = []
for line in content.split('\n'):
    if 'db.prepare' in line and 'await db.prepare' not in line and not line.strip().startswith('//'):
        line = line.replace('db.prepare', 'await db.prepare')
    new_lines.append(line)
content = '\n'.join(new_lines)

# Boolean coercions in tests!
content = content.replace("expect(ut.is_deleted).toBe(1)", "expect(ut.is_deleted).toBe(true)")
content = content.replace("expect(ut.is_archived).toBe(0)", "expect(ut.is_archived).toBe(false)")
content = content.replace("expect(uc.is_archived).toBe(1)", "expect(uc.is_archived).toBe(true)")
content = content.replace("expect(ut.is_archived).toBe(1)", "expect(ut.is_archived).toBe(true)")
content = content.replace("expect(ut.is_deleted).toBe(0)", "expect(ut.is_deleted).toBe(false)")
content = content.replace("expect(uc.is_deleted).toBe(1)", "expect(uc.is_deleted).toBe(true)")
content = content.replace("expect(uc.is_deleted).toBe(0)", "expect(uc.is_deleted).toBe(false)")
content = content.replace("expect(uc.is_archived).toBe(0)", "expect(uc.is_archived).toBe(false)")
content = content.replace("expect(course.has_pdf).toBe(1)", "expect(course.has_pdf).toBe(true)")
content = content.replace("expect(course.has_glossary).toBe(1)", "expect(course.has_glossary).toBe(true)")

with open(filepath, "w") as f:
    f.write(content)
print("manage.test.js refactored")
