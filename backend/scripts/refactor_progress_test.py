import re
import sys

filepath = "/home/waseageru/dc-mastery-hub/backend/__tests__/progress.test.js"
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

# 6. Some arrays might need JSON stringify if they compare SQLite string vs pg array
content = content.replace("JSON.parse(c.tracks_json)", "(typeof c.tracks_json === 'string' ? JSON.parse(c.tracks_json) : c.tracks_json)")
content = content.replace("JSON.parse(res.body.course.tracks_json)", "res.body.course.tracks_json")

# Boolean coercions in tests! tests might check `is_deleted: 0` vs `is_deleted: false`
content = content.replace(": 0", ": false")
content = content.replace(": 1", ": true")
content = content.replace("=== 0", "=== false")
content = content.replace("=== 1", "=== true")
# We have to be careful with the blind 0 to false replace, so let's only do exact known matches.
# Undo the blind replace
content = content.replace(": false", ": 0").replace(": true", ": 1").replace("=== false", "=== 0").replace("=== true", "=== 1")

# Let's run tests first to see what fails.

with open(filepath, "w") as f:
    f.write(content)
print("progress.test.js refactored")
