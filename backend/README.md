# Backend API Documentation

The DC Mastery Hub backend is built using Node.js and Express. It serves as the bridge between the React frontend, the SQLite database, and the Python challenge execution environment.

## 🔑 Authentication (`/api/auth`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/register` | Register a new user with a username and password. |
| `POST` | `/login` | Authenticate and establish a session. |
| `POST` | `/logout` | Terminate the current user session. |
| `GET` | `/session` | Retrieve details about the current active session. |

## 📚 Tracks & Courses (`/api/tracks`, `/api/courses`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/tracks` | List all available learning tracks. |
| `GET` | `/tracks/:slug` | Retrieve details for a specific track. |
| `GET` | `/courses` | List all courses. |
| `GET` | `/courses/:slug` | Retrieve details for a specific course. |
| `GET` | `/courses/:slug/concepts` | List extracted concepts for a course. |
| `GET` | `/courses/:slug/flashcards/due` | Get flashcards pending review for a course. |
| `PATCH` | `/courses/:slug` | Update course status, notes, or difficulty. |

## 📈 Progress & Analytics (`/api/progress`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard` | Aggregate summary of student progress. |
| `POST` | `/attempt` | Record a result for an exercise or challenge. |
| `GET` | `/exercise-stats/:slug` | Retrieve performance metrics for a course. |
| `GET` | `/incorrect-questions/:slug` | Retrieve the queue of incorrectly answered items. |

## 🛠️ Content & Management (`/api/manage`, `/api/content`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/manage/courses/:slug/questions/save` | Create or update an exercise question. |
| `POST` | `/manage/courses/:slug/questions/delete` | Remove a question from the curriculum. |
| `POST` | `/content/submit-challenge` | Submit a Python solution for validation. |
| `GET` | `/content/pdf/:slug` | Serve lecture slide PDFs. |

## 🗄️ Database Schema

The SQLite database (`mastery.db`) consists of several core tables:
- **`users` / `sessions`**: User accounts and active session management.
- **`tracks` / `courses`**: Primary metadata for the curriculum.
- **`concepts`**: Atomic learning units extracted from course materials.
- **`flashcards` / `quiz_questions`**: Educational content for practice.
- **`exercise_attempts`**: Audit log of student performance.
- **`mastery_scores`**: Live calculated mastery levels per course.

## 🐍 Python Sandbox Architecture

The backend executes students' code using a **stateless** approach:
1.  **Isolation:** A new subprocess is spawned for every submission.
2.  **Codegen:** The sandbox dynamically constructs a Python environment by serializing the `pre_loaded_data` JSON into standard assignment statements.
3.  **Validation:** Rules are evaluated using `bool()` expressions inside a `try...except` block, ensuring no single error crashes the evaluation cycle.
4.  **Parsing:** Results are passed back via a special stdout prefix (`__DC_RESULTS__`) to distinguish system logs from user output.

## 🚀 Migrations & Seeding

Migrations and initial data seeding happen automatically on server startup via `backend/db/schema.js` and `backend/db/seed.js`. The server also performs a filesystem scan of the `content/` folder to ensure all exercises are synchronized.
