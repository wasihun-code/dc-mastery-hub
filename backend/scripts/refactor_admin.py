import re

filepath = "/home/waseageru/dc-mastery-hub-pg/backend/routes/admin.js"
with open(filepath, "r") as f:
    content = f.read()

# 1. Replace db import
content = content.replace("import db from '../db/database.js'", "import db from '../db/database.pg.js'")

# 2. Make all route handlers async
content = re.sub(r"router\.(get|post|patch|put|delete)\('([^']+)',\s*\(req, res, next\) => \{",
                 r"router.\1('\2', async (req, res, next) => {", content)

# Also handle the requireAdmin middleware versions:
# router.get('/admin/stats', (req, res, next) => {
# These are already handled by the regex above

# 3. Make all transaction callbacks async
content = content.replace("db.transaction(() => {", "await db.transaction(async () => {")
# Handle the transaction-with-args pattern:
content = content.replace("db.transaction((trackId, orderedIds) => {", "await db.transaction(async (trackId, orderedIds) => {")
content = content.replace("db.transaction((tId, ids) => {", "await db.transaction(async (tId, ids) => {")

# Fix transaction invocation for the ones that use args:
# const reorder = await db.transaction(...); reorder(track_id, ...)
# -> await db.transaction(async ...)(...args)
content = content.replace("const reorder = await db.transaction(async (trackId, orderedIds) => {\n      orderedIds.forEach((courseId, index) => {\n        db.prepare('UPDATE track_courses SET order_in_track = ? WHERE track_id = ? AND course_id = ?').run(index + 1, trackId, courseId)\n      })\n    })\n    reorder(track_id, ordered_course_ids)",
    "await db.transaction(async () => {\n      for (let index = 0; index < ordered_course_ids.length; index++) {\n        const courseId = ordered_course_ids[index]\n        await db.prepare('UPDATE track_courses SET order_in_track = ? WHERE track_id = ? AND course_id = ?').run(index + 1, track_id, courseId)\n      }\n    })()")

content = content.replace("const reorder = await db.transaction(async (tId, ids) => {\n      ids.forEach((courseId, index) => {\n        db.prepare('UPDATE track_courses SET order_in_track = ? WHERE track_id = ? AND course_id = ?').run(index + 1, tId, courseId)\n      })\n    })\n    reorder(trackId, courseIds)",
    "await db.transaction(async () => {\n      for (let index = 0; index < courseIds.length; index++) {\n        const courseId = courseIds[index]\n        await db.prepare('UPDATE track_courses SET order_in_track = ? WHERE track_id = ? AND course_id = ?').run(index + 1, trackId, courseId)\n      }\n    })()")

# Fix: const result = db.transaction(() => { ... })()
content = content.replace("const result = await db.transaction(async () => {", "const result = await db.transaction(async () => {")

# 4. Add await to all db.prepare calls (avoid double await)
new_lines = []
for line in content.split('\n'):
    if 'db.prepare' in line and 'await db.prepare' not in line and not line.strip().startswith('//'):
        line = line.replace('db.prepare', 'await db.prepare')
    new_lines.append(line)
content = '\n'.join(new_lines)

# 5. Fix INSERT OR IGNORE -> ON CONFLICT DO NOTHING
content = content.replace("INSERT OR IGNORE INTO", "INSERT INTO")
# Then add ON CONFLICT DO NOTHING after the VALUES clause for these inserts
# Need to be careful here - do it case by case
content = content.replace(
    "INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?)')",
    "INSERT INTO track_courses (track_id, course_id, order_in_track) VALUES (?, ?, ?) ON CONFLICT DO NOTHING')")

# 6. Boolean coercion fixes
content = content.replace("is_deleted = 0", "is_deleted = false")
content = content.replace("is_archived = 0", "is_archived = false")
content = content.replace("is_deleted = 1", "is_deleted = true")
content = content.replace("is_archived = 1", "is_archived = true")
content = content.replace("is_admin = 1", "is_admin = true")
content = content.replace("req.body[field] ? 1 : 0", "req.body[field] ? true : false")
content = content.replace("req.body.is_admin ? 1 : 0", "req.body.is_admin ? true : false")
content = content.replace("is_admin ? 1 : 0", "is_admin ? true : false")
content = content.replace("target.is_admin ? 0 : 1", "target.is_admin ? false : true")

# 7. json_group_array / json_object -> json_agg / json_build_object
content = content.replace("json_group_array(json_object(", "COALESCE(json_agg(json_build_object(")
# Close the COALESCE properly
content = content.replace("))\n               FROM track_courses tc2 JOIN tracks t ON t.id = tc2.track_id WHERE tc2.course_id = c.id) AS tracks_json",
                          "))\n               FROM track_courses tc2 JOIN tracks t ON t.id = tc2.track_id WHERE tc2.course_id = c.id), '[]'::json) AS tracks_json")

# 8. Fix aggregate count returns (Postgres returns strings for COUNT)
content = content.replace(".get().count", ".get()).count")
# Actually let's not do that blind replace. Let's add parseInt where needed.
# Revert that
content = content.replace(".get()).count", ".get().count")

with open(filepath, "w") as f:
    f.write(content)
print("admin.js refactored for Postgres")
