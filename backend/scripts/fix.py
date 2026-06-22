import re

filepath = "/home/waseageru/dc-mastery-hub/backend/routes/content.js"
with open(filepath, "r") as f:
    content = f.read()

# Lines to fix:
replacements = [
    (r"const track = db.prepare\('SELECT slug FROM tracks WHERE id = \?'\)\.get\(course.track_id\);?", 
     r"const track = await db.prepare('SELECT slug FROM tracks WHERE id = ?').get(course.track_id);"),
    
    (r"const track = db.prepare\('SELECT slug, language FROM tracks WHERE id = \?'\)\.get\(course.track_id\)", 
     r"const track = await db.prepare('SELECT slug, language FROM tracks WHERE id = ?').get(course.track_id)"),

    (r"let dbQuestions = db.prepare\('SELECT \* FROM quiz_questions WHERE course_id = \?'\)\.all\(course.id\);",
     r"let dbQuestions = await db.prepare('SELECT * FROM quiz_questions WHERE course_id = ?').all(course.id);"),

    (r"let dbFlashcards = db.prepare\('SELECT \* FROM flashcards WHERE course_id = \?'\)\.all\(course.id\);",
     r"let dbFlashcards = await db.prepare('SELECT * FROM flashcards WHERE course_id = ?').all(course.id);"),

    (r"let dbConcepts = db.prepare\('SELECT id, name, definition FROM concepts WHERE course_id = \?'\)\.all\(course.id\);",
     r"let dbConcepts = await db.prepare('SELECT id, name, definition FROM concepts WHERE course_id = ?').all(course.id);"),

    (r"let dbConcepts = db.prepare\('SELECT id, name, definition, code_snippet FROM concepts WHERE course_id = \?' AND code_snippet IS NOT NULL'\)\.all\(course.id\);",
     r"let dbConcepts = await db.prepare('SELECT id, name, definition, code_snippet FROM concepts WHERE course_id = ? AND code_snippet IS NOT NULL').all(course.id);"),
     
    (r"let dbConcepts = db.prepare\('SELECT id, name, definition, code_snippet FROM concepts WHERE course_id = \? AND code_snippet IS NOT NULL'\)\.all\(course.id\);",
     r"let dbConcepts = await db.prepare('SELECT id, name, definition, code_snippet FROM concepts WHERE course_id = ? AND code_snippet IS NOT NULL').all(course.id);"),

    (r"const courses = db.prepare\('SELECT course_id AS id FROM track_courses WHERE track_id = \?'\)\.all\(track.id\)",
     r"const courses = await db.prepare('SELECT course_id AS id FROM track_courses WHERE track_id = ?').all(track.id)"),

    (r"\)\.all\(userId, courseSlug, exerciseType, exerciseType, exerciseType\)\.map\(row => String\(row\.question_id\)\);",
     r").all(userId, courseSlug, exerciseType, exerciseType, exerciseType);\n    const deletedQuestions = deletedQuestionsRows.map(row => String(row.question_id));"),

    (r"const deletedQuestions = db.prepare\(`",
     r"const deletedQuestionsRows = await db.prepare(`"),

    (r"\)\.all\(userId, courseSlug\)\.map\(row => String\(row\.question_id\)\);",
     r").all(userId, courseSlug);\n    const deletedQuestions = deletedQuestionsRows.map(row => String(row.question_id));"),

    (r"const solvedAttempts = db.prepare\(`",
     r"const solvedAttemptsRows = await db.prepare(`"),
     
    (r"\)\.all\(course.id\);\n    const solvedChallengeIds = solvedAttempts\.map",
     r").all(course.id);\n    const solvedChallengeIds = solvedAttemptsRows.map"),

    (r"const questions = db.prepare\(`",
     r"const questions = await db.prepare(`"),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open(filepath, "w") as f:
    f.write(content)
print("Fixed db.prepare calls")
