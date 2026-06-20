import sys

with open('bugs.txt', 'r') as f:
    lines = f.readlines()

ignores = [
    'backend/db/schema.js',
    'backend/db/schema.pg.js',
    'backend/__tests__/helpers/testDb.js',
    'backend/__tests__/helpers/testEnv.js',
    'backend/__tests__/helpers/testEnv.pg.js',
    'frontend/__tests__'
]

filtered = []
for line in lines:
    line = line.strip()
    if not line:
        continue
    if any(line.startswith(ig) for ig in ignores):
        continue
    filtered.append('- [ ] `' + line + '`')

header = """
### Integer-Where-Boolean Audit Checklist
The following locations assume `1` or `0` for boolean columns. In Stage 3+, **inputs** must be coerced to true/false for Postgres, and **outputs** must be coerced back to `1`/`0` so the frontend does not break (the frontend explicitly checks `=== 1` or sends `1`).

"""

with open('/home/waseageru/dc-mastery-hub/context/DEPLOYMENT.md', 'a') as f:
    f.write(header)
    f.write('\n'.join(filtered))
    f.write('\n')

print("Checklist appended.")
