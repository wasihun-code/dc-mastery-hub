import os
import re

progress_path = "routes/progress.js"
with open(progress_path, "r") as f:
    content = f.read()

# 1. Fix getTracksSummary ROUND(double, int)
content = content.replace("ROUND(AVG(COALESCE(ms.overall_mastery, 0)), 1)", "ROUND(CAST(AVG(COALESCE(ms.overall_mastery, 0)) AS NUMERIC), 1)")

# 2. Fix weakSpots integer = text
content = content.replace("con.id = COALESCE(qq.concept_id, fc.concept_id)", "CAST(con.id AS TEXT) = COALESCE(qq.concept_id, fc.concept_id)")

# 3. Fix ROUND(CAST(... AS REAL), 3) to NUMERIC
content = content.replace("ROUND(CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3)", "ROUND(CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS NUMERIC) / COUNT(*), 3)")
content = content.replace("ROUND(CAST(SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3)", "ROUND(CAST(SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) AS NUMERIC) / COUNT(*), 3)")

# 4. Fix Javascript was_correct boolean comparisons
content = content.replace("was_correct === 1", "was_correct === true")
content = content.replace("was_correct === 0", "was_correct === false")
content = content.replace("is_deleted === 1", "is_deleted === true")
content = content.replace("is_deleted === 0", "is_deleted === false")

with open(progress_path, "w") as f:
    f.write(content)

print("Done fixing final 500s")
