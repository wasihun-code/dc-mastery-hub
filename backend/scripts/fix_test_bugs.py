import os
import re

test_file = "__tests__/progress.test.js"
with open(test_file, "r") as f:
    content = f.read()

# Replace INSERT without RETURNING that use lastInsertRowid
# First find all INSERTS into users that assign to `result`
pattern_insert = r"(const result = await db\.prepare\('INSERT INTO users \([^)]+\) VALUES \([^)]+\))('\)\.run\()"
content = re.sub(pattern_insert, r"\1 RETURNING id\2", content)

# Now replace .run with .all for these INSERTS so we get rows
pattern_run = r"(const result = await db\.prepare\('INSERT INTO users \([^)]+\) VALUES \([^)]+\) RETURNING id'\))\.run\("
content = re.sub(pattern_run, r"\1.all(", content)

# Replace result.lastInsertRowid with result[0].id
content = content.replace("result.lastInsertRowid", "result[0].id")

with open(test_file, "w") as f:
    f.write(content)

print("Fixed lastInsertRowid in progress.test.js")

# Now fix the parsing in progress.js
progress_file = "routes/progress.js"
with open(progress_file, "r") as f:
    content2 = f.read()

# Find overall_stats assignment
pattern_stats = r"overall_stats: overallStats \|\| \{"
replacement_stats = """overall_stats: overallStats ? {
        total_attempts: parseInt(overallStats.total_attempts || 0),
        correct_attempts: parseInt(overallStats.correct_attempts || 0),
        total_time_secs: parseInt(overallStats.total_time_secs || 0),
        avg_accuracy: parseFloat(overallStats.avg_accuracy || 0)
      } : {"""

content2 = content2.replace(pattern_stats, replacement_stats)

with open(progress_file, "w") as f:
    f.write(content2)

print("Fixed overall_stats parsing in progress.js")
