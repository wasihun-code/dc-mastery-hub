# DC Mastery Hub — Context Index

Read these files before starting any non-trivial task:
1. `/context/ARCHITECTURE.md` — system design, tech stack, hard rules
2. `/context/DATABASE_SCHEMA.md` — full table definitions
3. `/context/API_ROUTES.md` — every backend endpoint
4. `/context/FRONTEND_MAP.md` — every page/component + shared components
5. `/context/KNOWN_STATE.md` — current coverage, recent work, open issues

For tasks touching ONLY one layer (e.g. "fix a CSS bug on the Settings page"),
you likely only need ARCHITECTURE.md (hard rules) + FRONTEND_MAP.md (find the
right file) + the actual file you're editing. You do not need DATABASE_SCHEMA.md
or API_ROUTES.md for pure frontend styling tasks — skip them.

For tasks touching the database or adding endpoints, read all 5 before writing code.

After completing ANY task that adds/removes/renames a route, table, column, page,
or shared component: update the relevant context file in the same session, as
part of finishing the task — not as a separate follow-up. Update KNOWN_STATE.md's
"recently completed" list and "last updated" date every time, regardless of what
else changed.
