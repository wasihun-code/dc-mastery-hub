import re
import sys

filepath = "/home/waseageru/dc-mastery-hub/backend/routes/progress.js"
with open(filepath, "r") as f:
    content = f.read()

# Replace db import
content = content.replace("import db from '../db/database.js'", "import db from '../db/database.pg.js'")

# Make exported functions async
content = re.sub(r"export function (recalculateMastery|getCourseMastery|recordExerciseAttempt)\(", r"export async function \1(", content)

# Make router handlers async
content = re.sub(r"router\.(get|post|patch|delete)\('([^']+)',\s*\(req, res, next\) => \{", r"router.\1('\2', async (req, res, next) => {", content)
content = re.sub(r"router\.(get|post|patch|delete)\('([^']+)',\s*\(req, res\) => \{", r"router.\1('\2', async (req, res) => {", content)

# Helper functions that need to be async
content = re.sub(r"function getUserStats\(userId\) \{", r"async function getUserStats(userId) {", content)
content = re.sub(r"function getTracksSummary\(userId\) \{", r"async function getTracksSummary(userId) {", content)
content = re.sub(r"function getWeakSpots\(userId\) \{", r"async function getWeakSpots(userId) {", content)
content = re.sub(r"function getRecentActivity\(userId\) \{", r"async function getRecentActivity(userId) {", content)
content = re.sub(r"function getDueFlashcardsCount\(userId\) \{", r"async function getDueFlashcardsCount(userId) {", content)
content = re.sub(r"function getExerciseBreakdown\(userId\) \{", r"async function getExerciseBreakdown(userId) {", content)
content = re.sub(r"function getDailyActivity\(userId\) \{", r"async function getDailyActivity(userId) {", content)
content = re.sub(r"function scoreForExerciseType\(courseId, whereClause, userId\) \{", r"async function scoreForExerciseType(courseId, whereClause, userId) {", content)
content = re.sub(r"function updateStreak\(userId\) \{", r"async function updateStreak(userId) {", content)

# Add await to db.prepare calls (avoiding double await)
# Only add await if it's a method call or an assignment, avoid modifying strings etc.
new_lines = []
for line in content.split('\n'):
    if 'db.prepare' in line and 'await db.prepare' not in line and not line.strip().startswith('//'):
        line = line.replace('db.prepare', 'await db.prepare')
    new_lines.append(line)
content = '\n'.join(new_lines)

# Fix aggregate parsing issues based on checklist
# Line 34-37: courses_count, completed_count, in_progress_count, overall_mastery in getTracksSummary
content = re.sub(r"course_count: t\.course_count,", r"course_count: parseInt(t.course_count),", content)
content = re.sub(r"completed_count: t\.completed_count,", r"completed_count: parseInt(t.completed_count),", content)
content = re.sub(r"in_progress_count: t\.in_progress_count,", r"in_progress_count: parseInt(t.in_progress_count),", content)
content = re.sub(r"overall_mastery: Math\.round\(t\.overall_mastery \|\| 0\),", r"overall_mastery: Math.round(parseFloat(t.overall_mastery || 0)),", content)

# score in getCourseMastery
content = re.sub(r"const score = row \? Math\.round\(row\.score\) : 0", r"const score = row ? Math.round(parseFloat(row.score)) : 0", content)

# totalQuestions.count and attemptedQuestions.count
content = re.sub(r"totalQuestions\.count", r"parseInt(totalQuestions.count)", content)
content = re.sub(r"attemptedQuestions\.count", r"parseInt(attemptedQuestions.count)", content)

# attempt_count and correct_rate
content = re.sub(r"attempt_count: ws\.attempt_count", r"attempt_count: parseInt(ws.attempt_count)", content)
content = re.sub(r"correct_rate: Math\.round\(ws\.correct_rate \* 100\)", r"correct_rate: Math.round(parseFloat(ws.correct_rate) * 100)", content)

# totalRow.count
content = re.sub(r"const count = totalRow\.count", r"const count = parseInt(totalRow.count)", content)

# COUNT(*), SUM(...), AVG(...) in /progress/dashboard overall_stats
content = re.sub(r"total_attempts: overallStats\.total_attempts \|\| 0", r"total_attempts: parseInt(overallStats.total_attempts || 0)", content)
content = re.sub(r"correct_attempts: overallStats\.correct_attempts \|\| 0", r"correct_attempts: parseInt(overallStats.correct_attempts || 0)", content)
content = re.sub(r"total_time_secs: overallStats\.total_time_secs \|\| 0", r"total_time_secs: parseInt(overallStats.total_time_secs || 0)", content)
content = re.sub(r"avg_accuracy: overallStats\.avg_accuracy \|\| 0", r"avg_accuracy: parseFloat(overallStats.avg_accuracy || 0)", content)

# Fix GROUP BY ambiguity
content = content.replace("GROUP BY c.id\n    HAVING", "GROUP BY c.id, con.name, crs.name\n    HAVING")
content = content.replace("GROUP BY c.id HAVING", "GROUP BY c.id, con.name, crs.name HAVING")
content = content.replace("GROUP BY question_id", "GROUP BY question_id, course_id, concept_id")

# Fix Boolean Coercion
content = content.replace("is_deleted = 0", "is_deleted = false")
content = content.replace("is_archived = 0", "is_archived = false")
content = content.replace("is_deleted = 1", "is_deleted = true")
content = content.replace("is_archived = 1", "is_archived = true")
content = content.replace("was_correct = 0", "was_correct = false")
content = content.replace("was_correct = 1", "was_correct = true")
content = content.replace("was_correct ? 1 : 0", "was_correct ? true : false")

# Function awaits inside the handlers
# Be very specific to avoid replacing definitions!
content = re.sub(r"(?<!async function )(?<!export async function )getUserStats\(req\.user\.id\)", r"await getUserStats(req.user.id)", content)
content = re.sub(r"(?<!async function )(?<!export async function )getUserStats\(userId\)", r"await getUserStats(userId)", content)
content = re.sub(r"(?<!async function )(?<!export async function )getTracksSummary\(req\.user\.id\)", r"await getTracksSummary(req.user.id)", content)
content = re.sub(r"(?<!async function )(?<!export async function )getWeakSpots\(req\.user\.id\)", r"await getWeakSpots(req.user.id)", content)
content = re.sub(r"(?<!async function )(?<!export async function )getRecentActivity\(req\.user\.id\)", r"await getRecentActivity(req.user.id)", content)
content = re.sub(r"(?<!async function )(?<!export async function )getDueFlashcardsCount\(req\.user\.id\)", r"await getDueFlashcardsCount(req.user.id)", content)
content = re.sub(r"(?<!async function )(?<!export async function )getExerciseBreakdown\(req\.user\.id\)", r"await getExerciseBreakdown(req.user.id)", content)
content = re.sub(r"(?<!async function )(?<!export async function )getDailyActivity\(req\.user\.id\)", r"await getDailyActivity(req.user.id)", content)
content = re.sub(r"(?<!async function )(?<!function )scoreForExerciseType\(courseId,", r"await scoreForExerciseType(courseId,", content)
content = re.sub(r"(?<!async function )(?<!function )updateStreak\(userId\)", r"await updateStreak(userId)", content)

content = re.sub(r"(?<!async function )(?<!export async function )getCourseMastery\(courseId, userId\)", r"await getCourseMastery(courseId, userId)", content)
content = re.sub(r"(?<!async function )(?<!export async function )recalculateMastery\(courseId, userId\)", r"await recalculateMastery(courseId, userId)", content)
content = re.sub(r"(?<!async function )(?<!export async function )recordExerciseAttempt\(userId, courseId, conceptId, questionId, exerciseType, wasCorrect, timeSpentSecs\)", r"await recordExerciseAttempt(userId, courseId, conceptId, questionId, exerciseType, wasCorrect, timeSpentSecs)", content)
content = re.sub(r"(?<!async function )(?<!export async function )recordExerciseAttempt\(userId, courseId, null, null, exerciseType, wasCorrect, timeSpentSecs\)", r"await recordExerciseAttempt(userId, courseId, null, null, exerciseType, wasCorrect, timeSpentSecs)", content)

# Fix lastInsertRowid in recordExerciseAttempt
content = content.replace("VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n    `).run(", "VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *\n    `).get(")
content = content.replace("const attempt = await db.prepare('SELECT * FROM exercise_attempts WHERE id = ?').get(result.lastInsertRowid)", "const attempt = result")
content = content.replace("const attempt = db.prepare('SELECT * FROM exercise_attempts WHERE id = ?').get(result.lastInsertRowid)", "const attempt = result")

with open(filepath, "w") as f:
    f.write(content)
print("progress.js correctly refactored")
