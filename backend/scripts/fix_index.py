import re

filepath = "/home/waseageru/dc-mastery-hub/backend/index.js"
with open(filepath, "r") as f:
    content = f.read()

# 1. Add pgDb import
content = re.sub(
    r"import db from '\./db/database\.js'",
    "import db from './db/database.js'\nimport pgDb from './db/database.pg.js'",
    content
)

# 2. Make getSessionUser async and use pgDb
content = re.sub(
    r"function getSessionUser\(req\) \{",
    "async function getSessionUser(req) {",
    content
)
content = re.sub(
    r"const session = db\.prepare\('SELECT \* FROM sessions WHERE id = \?'\)\.get\(sessionId\)",
    "const session = await pgDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)",
    content
)
content = re.sub(
    r"db\.prepare\('DELETE FROM sessions WHERE id = \?'\)\.run\(sessionId\)",
    "await pgDb.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)",
    content
)
content = re.sub(
    r"const user = db\.prepare\('SELECT id, username, is_admin FROM users WHERE id = \?'\)\.get\(session\.user_id\)",
    "const user = await pgDb.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(session.user_id)",
    content
)

# 3. Make the app.use middleware async and use pgDb
content = re.sub(
    r"app\.use\(\(req, res, next\) => \{([^}]+)if \(\!req\.path\.startsWith",
    r"app.use(async (req, res, next) => {\1if (!req.path.startsWith",
    content
)
content = re.sub(
    r"const userCount = db\.prepare\('SELECT COUNT\(\*\) AS count FROM users'\)\.get\(\)\.count",
    "const userCount = parseInt((await pgDb.prepare('SELECT COUNT(*) AS count FROM users').get()).count)",
    content
)
content = re.sub(
    r"const user = getSessionUser\(req\)",
    "const user = await getSessionUser(req)",
    content
)

with open(filepath, "w") as f:
    f.write(content)
print("index.js fixed")
