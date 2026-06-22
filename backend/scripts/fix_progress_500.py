import os
import re

progress_path = "routes/progress.js"
with open(progress_path, "r") as f:
    content = f.read()

# Fix getTracksSummary
content = content.replace("tracks_summary: getTracksSummary(userId),", "tracks_summary: await getTracksSummary(userId),")

# Fix dueFlashcardsCount
content = content.replace("const dueFlashcardsCount = await db\n    .prepare(`", "const dueFlashcardsCount = parseInt((await db\n    .prepare(`")
content = content.replace(".get(userId).count", ".get(userId)).count || 0)")

# Fix dailyActivity date stuff
content = content.replace("DATE(created_at)", "CAST(created_at AS DATE)")
content = content.replace("DATE(CURRENT_DATE, '-14 days')", "CURRENT_DATE - INTERVAL '14 days'")
content = content.replace("})\n\n    res.status(200)", "})()\n\n    res.status(200)")

# Fix INSERT OR IGNORE
content = content.replace("INSERT OR IGNORE INTO deleted_questions (user_id, course_slug, exercise_type, question_id)", "INSERT INTO deleted_questions (user_id, course_slug, exercise_type, question_id)")
content = content.replace("VALUES (?, ?, ?, ?)')\n      .run(userId, course.id, exerciseType, questionId)", "VALUES (?, ?, ?, ?) ON CONFLICT (user_id, exercise_type, question_id) DO NOTHING')\n      .run(userId, course.id, exerciseType, questionId)")

# Fix PATCH stats
patch_stats = r"const assignments = updates\.map\(\(field\) => `\$\{field\} = @\$\{field\}`\)\.join\(', '\)\n\s*const params = \{\n\s*user_id: userId,\n\s*\}\n\n\s*for \(const field of updates\) \{\n\s*params\[field\] = req\.body\[field\]\n\s*\}\n\n\s*await db\.prepare\(`UPDATE user_stats SET \$\{assignments\} WHERE user_id = @user_id`\)\.run\(params\)"

new_patch_stats = """const assignments = updates.map((field) => `${field} = ?`).join(', ')
      const paramsList = []
      for (const field of updates) {
        paramsList.push(req.body[field])
      }
      paramsList.push(userId)
      await db.prepare(`UPDATE user_stats SET ${assignments} WHERE user_id = ?`).run(...paramsList)"""

content = re.sub(patch_stats, new_patch_stats, content)

with open(progress_path, "w") as f:
    f.write(content)

test_path = "__tests__/progress.test.js"
with open(test_path, "r") as f:
    test_content = f.read()

test_content = re.sub(r"let count = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM exercise_attempts WHERE user_id = \?'\)\n\s*\.get\(testData\.studentUser\.id\)\.count",
                      "let count = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?').get(testData.studentUser.id)).count)", test_content)
test_content = re.sub(r"count = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM exercise_attempts WHERE user_id = \?'\)\n\s*\.get\(testData\.studentUser\.id\)\.count",
                      "count = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?').get(testData.studentUser.id)).count)", test_content)

test_content = re.sub(r"let attemptsCount = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM exercise_attempts WHERE user_id = \?'\)\n\s*\.get\(testData\.studentUser\.id\)\.count",
                      "let attemptsCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?').get(testData.studentUser.id)).count)", test_content)
test_content = re.sub(r"attemptsCount = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM exercise_attempts WHERE user_id = \?'\)\n\s*\.get\(testData\.studentUser\.id\)\.count",
                      "attemptsCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM exercise_attempts WHERE user_id = ?').get(testData.studentUser.id)).count)", test_content)

test_content = test_content.replace("expect(res.body.attempt.was_correct).toBe(1)", "expect(res.body.attempt.was_correct).toBe(true)")
test_content = test_content.replace("expect(res.body.attempt.was_correct).toBe(0)", "expect(res.body.attempt.was_correct).toBe(false)")

with open(test_path, "w") as f:
    f.write(test_content)

# Also fix SUM(was_correct) in progress.js
with open(progress_path, "r") as f:
    content = f.read()

content = content.replace("COALESCE(SUM(was_correct), 0) AS correct_attempts,", "COALESCE(SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END), 0) AS correct_attempts,")
content = content.replace("ROUND(COALESCE(AVG(was_correct), 0) * 100, 1) AS avg_accuracy", "ROUND(COALESCE(AVG(CASE WHEN was_correct = true THEN 1 ELSE 0 END), 0) * 100, 1) AS avg_accuracy")
content = content.replace("SUM(ea.was_correct)", "SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END)")

with open(progress_path, "w") as f:
    f.write(content)


print("Done fixing 500s")
