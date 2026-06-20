import os
import re

columns = [
    'is_admin', 'is_deleted', 'is_archived', 'has_pdf', 'has_glossary', 
    'notes_taken', 'was_correct'
]

# Patterns for SQL integer matches
sql_patterns = [
    r'=\s*0', r'=\s*1', r'!=\s*0', r'!=\s*1',
    r'COALESCE\([^,]+,\s*0\)',
    r'UPDATE\s+\w+\s+SET\s+[^=]+=\s*(?:0|1)',
    r'VALUES\s*\([^)]*(?:0|1)[^)]*\)',
    r'\?\s*1\s*:\s*0',
    r'===\s*1', r'===\s*0'
]

dirs = ['/home/waseageru/dc-mastery-hub/backend', '/home/waseageru/dc-mastery-hub/frontend']

def find_matches():
    for root_dir in dirs:
        for dirpath, _, filenames in os.walk(root_dir):
            if 'node_modules' in dirpath or '.git' in dirpath or 'dist' in dirpath:
                continue
            for f in filenames:
                if not f.endswith(('.js', '.jsx')):
                    continue
                path = os.path.join(dirpath, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        lines = file.readlines()
                except:
                    continue
                
                for i, line in enumerate(lines):
                    for col in columns:
                        if col in line:
                            # Heuristic: check if there's a 0 or 1 around it, or if it's a test check
                            # or just print the line so we can filter
                            # We just want a complete inventory of problematic integer assumptions
                            if any(re.search(p, line) for p in sql_patterns) or '.toBe(0)' in line or '.toBe(1)' in line or 'DEFAULT 0' in line:
                                rel_path = os.path.relpath(path, '/home/waseageru/dc-mastery-hub')
                                print(f"{rel_path}:{i+1} | {col} | {line.strip()}")
                
if __name__ == '__main__':
    find_matches()
