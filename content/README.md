# Content & Curriculum Architecture

This directory serves as the static storage for all curriculum data, including lecture slides, datasets, and generated exercises.

## 📁 Folder Structure

```text
content/
└── tracks/
    └── [track-slug]/
        ├── track.json             # Track metadata (name, color, courses)
        └── [course-slug]/
            ├── [course-slug].pdf  # Course lecture slides
            ├── datasets/          # CSV, SQLite, and Pickle files for practice
            └── exercises/         # JSON definitions for all practice types
                ├── mcq.json
                ├── ftb.json
                ├── challenge.json
                └── ...
```

## 📝 Challenge Schema (`challenge.json`)

Dataset challenges use the following format:

```json
{
  "id": "dc_001",
  "title": "Analyze Sales Growth",
  "context": "Use pandas to find the month-over-month growth...",
  "dataset_file": "sales.csv",
  "pre_loaded_data": {
    "df": { "type": "csv", "path": "sales.csv" }
  },
  "validation_rules": [
    {
      "check": "growth_rate > 0.05",
      "message": "The growth rate should be greater than 5%."
    }
  ],
  "solution_code": "..."
}
```

### 📦 Supported `pre_loaded_data` Types:
-   **`csv`**: Loads via `pd.read_csv`.
-   **`pickle`**: Loads via `pd.read_pickle`.
-   **`sqlite`**: Establishes a `sqlite3.connect()` instance.
-   **`dataframe`**: Injects an inline JSON object as a `pd.DataFrame`.
-   **`value`**: Injects raw scalars or list values directly into the namespace.

## ➕ Adding a New Course

1.  **Scaffold:** Create the folder structure: `content/tracks/[track-slug]/[course-slug]/`.
2.  **Resources:** Place the slide PDF and any required datasets in their respective folders.
3.  **Generate:** Use the admin interface or the `course-extractor` subagent to generate the initial exercise sets.
4.  **Verify:** Run `npm run verify-challenges` to ensure the generated code works correctly in the sandbox.
