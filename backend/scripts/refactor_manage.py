import re
import sys

filepath = "/home/waseageru/dc-mastery-hub-pg/backend/routes/manage.js"
with open(filepath, "r") as f:
    content = f.read()

# Replace db import
content = content.replace("import db from '../db/database.js'", "import db from '../db/database.pg.js'")

# Make exported functions / helper functions async
content = re.sub(r"function copyCourseInternal\(courseId, destTrackId\) \{", r"async function copyCourseInternal(courseId, destTrackId) {", content)

# Make router handlers async
content = re.sub(r"router\.(get|post|patch|delete)\('([^']+)',\s*\(req, res, next\) => \{", r"router.\1('\2', async (req, res, next) => {", content)

# Add await to db.prepare calls (avoiding double await)
new_lines = []
for line in content.split('\n'):
    if 'db.prepare' in line and 'await db.prepare' not in line and not line.strip().startswith('//'):
        line = line.replace('db.prepare', 'await db.prepare')
    new_lines.append(line)
content = '\n'.join(new_lines)

# Fix transaction wrapping
content = content.replace("await db.transaction(() => {", "await db.transaction(async () => {")

# Fix function call await
content = re.sub(r"const newId = copyCourseInternal\(Number\(courseId\), Number\(destTrackId\)\)", r"const newId = await copyCourseInternal(Number(courseId), Number(destTrackId))", content)

# Fix json_group_array and json_object for Postgres
content = content.replace("json_group_array", "COALESCE(json_agg")
content = content.replace("json_object(", "json_build_object(")
content = content.replace(")) AS tracks_json", "))), '[]'::json) AS tracks_json")

# Boolean Coercion Fixes
content = content.replace("is_deleted = 1", "is_deleted = true")
content = content.replace("is_deleted = 0", "is_deleted = false")
content = content.replace("is_archived = 1", "is_archived = true")
content = content.replace("is_archived = 0", "is_archived = false")
content = content.replace("is_deleted ? 1 : 0", "is_deleted ? true : false")
content = content.replace("is_archived ? 1 : 0", "is_archived ? true : false")
content = content.replace("notes_taken ? 1 : 0", "notes_taken ? true : false")

with open(filepath, "w") as f:
    f.write(content)
print("manage.js correctly refactored")
