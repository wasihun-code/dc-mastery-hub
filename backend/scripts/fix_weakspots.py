import os
import re

progress_path = "routes/progress.js"
with open(progress_path, "r") as f:
    content = f.read()

# I will find the weakSpotsRows query block and replace it.
pattern = r"const weakSpotsRows = await db\s*\.prepare\(`\s*SELECT[\s\S]*?`\)\s*\.all\(\[userId\]\)"

replacement = """const weakSpotsRows = await db
      .prepare(`
        SELECT
          COALESCE(qq.concept_id, fc.concept_id) AS concept_id,
          con.name AS concept_name,
          crs.name AS course_name,
          COUNT(*) AS attempt_count,
          ROUND(CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS NUMERIC) / COUNT(*), 3) AS correct_rate
        FROM exercise_attempts ea
        LEFT JOIN quiz_questions qq ON ea.exercise_type IN ('quiz', 'bossbattle') AND CAST(qq.id AS TEXT) = ea.question_id
        LEFT JOIN flashcards fc ON ea.exercise_type = 'flashcard' AND CAST(fc.id AS TEXT) = ea.question_id
        JOIN concepts con ON con.id = COALESCE(qq.concept_id, fc.concept_id)
        JOIN courses crs ON crs.id = ea.course_id
        WHERE ea.user_id = $1 AND COALESCE(con.name, '') != ''
        GROUP BY COALESCE(qq.concept_id, fc.concept_id), con.name, crs.name
        HAVING COUNT(*) >= 3 AND CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS NUMERIC) / COUNT(*) < 0.7
        ORDER BY correct_rate ASC, attempt_count DESC
        LIMIT 5
      `)
      .all([userId])"""

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open(progress_path, "w") as f:
        f.write(content)
    print("Replaced weakSpotsRows")
else:
    print("Could not find weakSpotsRows pattern")
