import re
import sys

filepath = "/home/waseageru/dc-mastery-hub/backend/routes/progress.js"
with open(filepath, "r") as f:
    content = f.read()

# Replace any 'db.prepare' that isn't preceded by 'await '
new_content = re.sub(r'(?<!await\s)db\.prepare', r'await db.prepare', content)

with open(filepath, "w") as f:
    f.write(new_content)

print("db.prepare awaits fixed!")
