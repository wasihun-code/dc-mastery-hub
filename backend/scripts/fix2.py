import re
import sys

filepath = "/home/waseageru/dc-mastery-hub/backend/__tests__/progress.test.js"
with open(filepath, "r") as f:
    content = f.read()

# Fix is_admin: 0
content = content.replace("is_admin) VALUES (?, ?, ?, 0)", "is_admin) VALUES (?, ?, ?, FALSE)")

# Fix INSERT OR IGNORE and date('now')
content = content.replace("INSERT OR IGNORE INTO spaced_repetition_queue (user_id, flashcard_id, due_date) VALUES (?, ?, date('now'))",
                          "INSERT INTO spaced_repetition_queue (user_id, flashcard_id, due_date) VALUES (?, ?, CURRENT_DATE) ON CONFLICT DO NOTHING")
content = content.replace("INSERT OR IGNORE INTO user_flashcard_progress (user_id, flashcard_id, mastery_level) VALUES (?, ?, ?)",
                          "INSERT INTO user_flashcard_progress (user_id, flashcard_id, mastery_level) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")

with open(filepath, "w") as f:
    f.write(content)
print("progress.test.js fixes applied")

filepath_js = "/home/waseageru/dc-mastery-hub/backend/routes/progress.js"
with open(filepath_js, "r") as f:
    content_js = f.read()

content_js = content_js.replace("router.get('/progress/attempted-questions/:courseSlug/:exerciseType', (req, res, next) => {", 
                                "router.get('/progress/attempted-questions/:courseSlug/:exerciseType', async (req, res, next) => {")

content_js = content_js.replace("router.get('/progress/exercise-stats/:courseSlug', (req, res, next) => {",
                                "router.get('/progress/exercise-stats/:courseSlug', async (req, res, next) => {")

content_js = content_js.replace("router.post('/progress/reset', (req, res, next) => {",
                                "router.post('/progress/reset', async (req, res, next) => {")

content_js = content_js.replace("router.post('/progress/attempt', (req, res, next) => {",
                                "router.post('/progress/attempt', async (req, res, next) => {")

with open(filepath_js, "w") as f:
    f.write(content_js)
print("progress.js missing async handlers fixed")

