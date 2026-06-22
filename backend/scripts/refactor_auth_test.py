import re

filepath = "/home/waseageru/dc-mastery-hub/backend/__tests__/auth.test.js"
with open(filepath, "r") as f:
    content = f.read()

replacements = [
    (r"import \{ setupTestEnvironment, seedTestData, cleanupTestEnvironment \} from '\./helpers/testEnv\.js'",
     r"import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'"),

    (r"env = setupTestEnvironment\(\)", r"env = await setupTestEnvironment()"),

    (r"const \{ initSchema \} = await import\('\.\./db/schema\.js'\)\n\s*initSchema\(\)", r"// initSchema is handled by testEnv.pg.js"),

    (r"const Database = \(await import\('better-sqlite3'\)\)\.default\n\s*db = new Database\(env\.dbPath\)\n\s*db\.pragma\('journal_mode = WAL'\)",
     r"db = (await import('../db/database.pg.js')).default"),

    (r"db\.prepare\('DELETE FROM user_stats'\)\.run\(\)\n\s*db\.prepare\('DELETE FROM sessions'\)\.run\(\)\n\s*db\.prepare\('DELETE FROM users'\)\.run\(\)",
     r"await db.prepare('DELETE FROM user_stats').run()\n  await db.prepare('DELETE FROM sessions').run()\n  await db.prepare('DELETE FROM users').run()"),

    (r"testData = seedTestData\(db\)", r"testData = await seedTestData(db)"),

    (r"expect\(res\.body\.user\.is_admin\)\.toBe\(0\)", r"expect(res.body.user.is_admin).toBe(false)"),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open(filepath, "w") as f:
    f.write(content)
print("auth.test.js refactored")
