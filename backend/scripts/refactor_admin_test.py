import re

filepath = "/home/waseageru/dc-mastery-hub-pg/backend/__tests__/admin.test.js"
with open(filepath, "r") as f:
    content = f.read()

# 1. Update imports
content = content.replace("from './helpers/testEnv.js'", "from './helpers/testEnv.pg.js'")
content = content.replace("let db, testData, env, app", "import db from '../db/database.pg.js'\nlet testData, env, app")

# 2. Fix getSessionUser
content = content.replace("function getSessionUser(req) {", "async function getSessionUser(req) {")
content = content.replace("const s = db.prepare('SELECT", "const s = await db.prepare('SELECT")
content = content.replace("db.prepare('DELETE", "await db.prepare('DELETE")
content = content.replace("return db.prepare('SELECT", "return await db.prepare('SELECT")

# 3. Setup modifications
setup_old = """  const { initSchema } = await import('../db/schema.js')
  initSchema()

  const Database = (await import('better-sqlite3')).default
  db = new Database(env.dbPath)
  db.exec('PRAGMA foreign_keys = ON')

  testData = await seedTestData(db)"""

setup_new = """  testData = await seedTestData()
  jest.setTimeout(60000);"""
content = content.replace(setup_old, setup_new)

# 4. Teardown modifications
teardown_old = """afterAll(async () => {
  if (db) db.close()
  await cleanupTestEnvironment(env)
})"""
teardown_new = """afterAll(async () => {
  await cleanupTestEnvironment(env)
})"""
content = content.replace(teardown_old, teardown_new)

# 5. Add await to db.prepare calls
content = re.sub(r'(?<!await )db\.prepare', r'await db.prepare', content)

# 6. Boolean updates
content = content.replace("is_deleted: 1", "is_deleted: true")
content = content.replace("is_deleted: 0", "is_deleted: false")
content = content.replace("is_archived: 1", "is_archived: true")
content = content.replace("is_archived: 0", "is_archived: false")
content = content.replace("is_admin: 1", "is_admin: true")
content = content.replace("is_admin: 0", "is_admin: false")
content = content.replace("toBe(1)", "toBe(true)")
content = content.replace("toBe(0)", "toBe(false)")
content = content.replace("toHaveProperty('is_deleted', 1)", "toHaveProperty('is_deleted', true)")
content = content.replace("toHaveProperty('is_deleted', 0)", "toHaveProperty('is_deleted', false)")
content = content.replace("toHaveProperty('is_archived', 1)", "toHaveProperty('is_archived', true)")
content = content.replace("toHaveProperty('is_archived', 0)", "toHaveProperty('is_archived', false)")
content = content.replace("toHaveProperty('is_admin', 1)", "toHaveProperty('is_admin', true)")
content = content.replace("toHaveProperty('is_admin', 0)", "toHaveProperty('is_admin', false)")

with open(filepath, "w") as f:
    f.write(content)
print("admin.test.js refactored")
