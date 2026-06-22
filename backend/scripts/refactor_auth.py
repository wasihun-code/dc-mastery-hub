import re

filepath = "/home/waseageru/dc-mastery-hub/backend/routes/auth.js"
with open(filepath, "r") as f:
    content = f.read()

replacements = [
    # 1. Update DB import
    (r"import db from '\.\./db/database\.js'", r"import db from '../db/database.pg.js'"),

    # 2. Add async to handlers
    (r"router\.get\('/session', \(req, res\) => \{", r"router.get('/session', async (req, res) => {"),
    (r"router\.post\('/register', \(req, res\) => \{", r"router.post('/register', async (req, res) => {"),
    (r"router\.post\('/login', \(req, res\) => \{", r"router.post('/login', async (req, res) => {"),
    (r"router\.post\('/logout', \(req, res\) => \{", r"router.post('/logout', async (req, res) => {"),

    # 3. Add await to db calls
    (r"const userCount = db\.prepare\('SELECT COUNT\(\*\) AS count FROM users'\)\.get\(\)\.count", 
     r"const userCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count)"),
     
    (r"const session = db\.prepare\('SELECT \* FROM sessions WHERE id = \?'\)\.get\(sessionId\)",
     r"const session = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)"),
     
    (r"db\.prepare\('DELETE FROM sessions WHERE id = \?'\)\.run\(sessionId\)",
     r"await db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)"),
     
    (r"const user = db\.prepare\('SELECT id, username, is_admin FROM users WHERE id = \?'\)\.get\(session\.user_id\)",
     r"const user = await db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(session.user_id)"),
     
    (r"const existing = db\.prepare\('SELECT id FROM users WHERE username = \?'\)\.get\(trimmedUsername\)",
     r"const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUsername)"),

    (r"const result = db\.prepare\(`\n\s*INSERT INTO users \(username, password_hash, salt\)\n\s*VALUES \(\?, \?, \?\)\n\s*`\)\.run\(trimmedUsername, hash, salt\)",
     r"const result = await db.prepare(`\n      INSERT INTO users (username, password_hash, salt)\n      VALUES (?, ?, ?)\n    `).run(trimmedUsername, hash, salt)"),

    (r"db\.prepare\(`\n\s*INSERT INTO sessions \(id, user_id, expires_at\)\n\s*VALUES \(\?, \?, \?\)\n\s*`\)\.run\(sessionId, userId, expiresAt\)",
     r"await db.prepare(`\n      INSERT INTO sessions (id, user_id, expires_at)\n      VALUES (?, ?, ?)\n    `).run(sessionId, userId, expiresAt)"),
     
    (r"const user = db\.prepare\('SELECT \* FROM users WHERE username = \?'\)\.get\(username\.trim\(\)\)",
     r"const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim())"),
     
    (r"db\.prepare\(`\n\s*INSERT INTO sessions \(id, user_id, expires_at\)\n\s*VALUES \(\?, \?, \?\)\n\s*`\)\.run\(sessionId, user\.id, expiresAt\)",
     r"await db.prepare(`\n      INSERT INTO sessions (id, user_id, expires_at)\n      VALUES (?, ?, ?)\n    `).run(sessionId, user.id, expiresAt)"),

    (r"db\.prepare\('DELETE FROM sessions WHERE id = \?'\)\.run\(match\[1\]\)",
     r"await db.prepare('DELETE FROM sessions WHERE id = ?').run(match[1])"),

    # 4. Handle boolean types
    (r"is_admin: 0", r"is_admin: false"),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open(filepath, "w") as f:
    f.write(content)
print("auth.js refactored")
