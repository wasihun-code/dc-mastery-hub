import re
import sys

filepath = "/home/waseageru/dc-mastery-hub/backend/__tests__/progress.test.js"
with open(filepath, "r") as f:
    content = f.read()

# Fix is_admin: 0
content = content.replace("is_admin) VALUES (?, ?, ?, 0)", "is_admin) VALUES (?, ?, ?, FALSE)")

# Fix INSERT OR IGNORE and date('now')
content = content.replace("INSERT OR IGNORE INTO spaced_repetition_queue (user_id, flashcard_id, due_date) VALUES (?, ?, date('now'))",
                          "INSERT INTO spaced_repetition_queue (user_id, flashcard_id, due_date) VALUES (?, ?, CURRENT_DATE) ON CONFLICT ON CONSTRAINT spaced_repetition_queue_user_id_flashcard_id_key DO NOTHING")
content = content.replace("INSERT OR IGNORE INTO user_flashcard_progress (user_id, flashcard_id, mastery_level) VALUES (?, ?, ?)",
                          "INSERT INTO user_flashcard_progress (user_id, flashcard_id, mastery_level) VALUES (?, ?, ?) ON CONFLICT ON CONSTRAINT user_flashcard_progress_user_id_flashcard_id_key DO NOTHING")

# But we don't know the constraint names. We can just use ON CONFLICT (user_id, flashcard_id) DO NOTHING
content = content.replace("ON CONFLICT ON CONSTRAINT spaced_repetition_queue_user_id_flashcard_id_key DO NOTHING", "ON CONFLICT (user_id, flashcard_id) DO NOTHING")
content = content.replace("ON CONFLICT ON CONSTRAINT user_flashcard_progress_user_id_flashcard_id_key DO NOTHING", "ON CONFLICT (user_id, flashcard_id) DO NOTHING")

with open(filepath, "w") as f:
    f.write(content)
print("progress.test.js fixes applied")
