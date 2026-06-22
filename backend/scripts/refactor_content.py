import re
import os

filepath = "/home/waseageru/dc-mastery-hub/backend/routes/content.js"
with open(filepath, "r") as f:
    content = f.read()

# 1. Update import
content = content.replace("import db from '../db/database.js'", "import db from '../db/database.pg.js'")

# 2. Make router handlers async
content = re.sub(r'(router\.(?:get|post|put|delete|patch)\([^\,]+,\s*)(\([^)]+\)\s*=>\s*\{)', r'\1async \2', content)

# 3. Add await to db.prepare...get/all/run
# It's tricky to use regex for nested parentheses, but let's try a safe approach
# We will find "db.prepare(" and track the parentheses to the end of .get()/.all()/.run()
# Then we wrap it in (await ...) if it's followed by .map, else just await ...

def process_db_prepare(text):
    # This is a bit complex for pure regex. Let's do it manually.
    idx = 0
    while True:
        idx = text.find("db.prepare", idx)
        if idx == -1:
            break
        # Find the end of db.prepare(...)
        paren_count = 0
        in_string = False
        string_char = ''
        i = idx + len("db.prepare")
        while i < len(text):
            c = text[i]
            if c in ("'", '"', '`') and text[i-1] != '\\':
                if not in_string:
                    in_string = True
                    string_char = c
                elif string_char == c:
                    in_string = False
            elif not in_string:
                if c == '(':
                    paren_count += 1
                elif c == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        break
            i += 1
        
        # Now we are at the closing ')' of db.prepare(...)
        # Next should be .get, .all, or .run
        match = re.match(r'\.(get|all|run)\s*\(', text[i+1:])
        if not match:
            idx = i + 1
            continue
            
        method = match.group(1)
        i = i + 1 + len(method) + 1 # At the '(' of .get(
        
        paren_count = 1
        in_string = False
        while i < len(text) and paren_count > 0:
            c = text[i]
            if c in ("'", '"', '`') and text[i-1] != '\\':
                if not in_string:
                    in_string = True
                    string_char = c
                elif string_char == c:
                    in_string = False
            elif not in_string:
                if c == '(':
                    paren_count += 1
                elif c == ')':
                    paren_count -= 1
            i += 1
            
        end_idx = i # This is right after the closing ')' of .get(...)
        
        # Check if there is .map right after
        is_chained = text[end_idx:end_idx+4] == '.map'
        
        db_call = text[idx:end_idx]
        if is_chained:
            replacement = f"(await {db_call})"
        else:
            replacement = f"await {db_call}"
            
        text = text[:idx] + replacement + text[end_idx:]
        idx += len(replacement)
    return text

content = process_db_prepare(content)

# 4. Fix boolean coercion for dataset challenges
content = content.replace("was_correct = 1 AND question_id IS NOT NULL", "was_correct = true AND question_id IS NOT NULL")

with open(filepath, "w") as f:
    f.write(content)

print("Done content.js")
