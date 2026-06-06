# DC Mastery Hub

DC Mastery Hub is a personalized learning mastery system for DataCamp data science courses. It is designed to organize course slides and datasets, then later generate exercises, quizzes, and games for deep mastery of Python, SQL, pandas, statistics, machine learning, and data engineering.

## Tech Stack

- Frontend: React 18, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: none yet

## Installation

Install dependencies in each package:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

## How to Run

From the project root:

```bash
npm run dev
```

The frontend runs with Vite and proxies `/api` requests to the backend on `localhost:3001`.

## Folder Structure

- `backend/`: Express server and future backend routes/services.
- `frontend/`: React 18 + Vite app with the dark layout shell and route placeholders.
- `content/tracks/`: Future location for stored DataCamp course tracks and materials.
- `data/`: Future location for local app data.
- `.env.example`: Environment variable template.

## Step Status

Step 1 of multi-step build - layout only.
