# DC Mastery Hub

A full-stack learning application designed to help students master DataCamp data science courses through targeted exercises, flashcards, quizzes, and interactive Python/SQL dataset challenges.

![DC Mastery Hub Screenshot](placeholder.png)

## 🚀 Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide React
- **Backend:** Node.js, Express.js
- **Database:** SQLite (via `better-sqlite3` - synchronous API)
- **Challenge Execution:** Python 3.8+ (stateless subprocess sandboxing)

## 📋 Prerequisites

- **Node.js:** v18 or later
- **Python:** v3.8 or later
- **Python Packages:** `pandas`, `numpy` (install via `pip install pandas numpy`)

## 🛠️ Quick Start (Development)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/dc-mastery-hub.git
    cd dc-mastery-hub
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    cd frontend && npm install
    cd ../backend && npm install
    ```

3.  **Configure Environment:**
    Copy `backend/.env.example` to `backend/.env` and fill in the required values.

4.  **Run in development mode:**
    ```bash
    npm run dev
    ```

## 🏗️ Production Build

To prepare the application for production:

1.  **Build the frontend:**
    ```bash
    npm run build
    ```

2.  **Start the production server:**
    ```bash
    npm start
    ```

## 🔐 Environment Variables

The application uses the following environment variables (defined in `backend/.env`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the backend server will listen on. | `3001` |
| `NODE_ENV` | Set to `production` for live deployments. | `development` |
| `SESSION_SECRET` | Secret key for session signing (64+ chars recommended). | `change_me` |
| `DB_PATH` | Path to the SQLite database file. | `./db/mastery.db` |
| `CONTENT_PATH` | Root directory for course content and datasets. | `./content` |
| `PYTHON_PATH` | Path to the Python 3 executable. | `python3` |
| `CHALLENGE_TIMEOUT_MS` | Maximum execution time for Python challenges. | `15000` |
| `FRONTEND_URL` | The URL of the frontend (for CORS if needed). | `http://localhost:5173` |

## 📁 Folder Structure

```text
dc-mastery-hub/
├── backend/          # Express.js API, SQLite database, and Python sandbox
├── content/          # Course content, datasets, and generated exercises
├── frontend/         # React/Vite application
├── project/          # Tooling, migration scripts, and verification reports
└── README.md         # This file
```

## 🧪 Dataset Challenges

Dataset challenges utilize a **stateless architecture**. When a user submits a solution:
1.  The backend dynamically generates a temporary Python script.
2.  Data dependencies (CSVs, Pickle files, SQLite) are resolved from the `content/` folder.
3.  The student's code is appended and executed within a isolated subprocess.
4.  Results are verified against predefined validation rules and returned to the frontend.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
