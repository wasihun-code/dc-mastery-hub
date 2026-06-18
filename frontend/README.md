# Frontend Architecture

The DC Mastery Hub frontend is a modern React application built with Vite and Tailwind CSS. It provides an intuitive, high-performance interface for managing learning progress and completing interactive exercises.

## 🏗️ Component Structure

- **`src/pages/`**: Main page-level components (Dashboard, Tracks, CourseDetail, etc.).
- **`src/components/`**: Reusable UI primitives and complex widgets like `PdfViewer`, `Sidebar`, and `EditQuestionModal`.
- **`src/exercises/`**: Specialized applications for each exercise type (Quiz, FillBlank, DatasetChallenge, etc.).
- **`src/services/`**: Frontend-only logic for settings, feedback triggers, and API abstraction.

## ➕ Adding a New Exercise Type

To add a new exercise format:
1.  **Create the Component:** Add a new `.jsx` file in `src/exercises/`.
2.  **Define the Route:** Add a new `<Route />` entry in `src/App.jsx`.
3.  **Update Navigation:** Add a corresponding link in `src/pages/CourseDetail.jsx`.
4.  **Handle Progress:** Ensure the backend `exercise_type` mapping includes your new identifier for mastery calculations.

## 🎨 Styling & Theming

The application uses a strict **CSS Variable-based theming system** defined in `src/index.css`. **Rigorously avoid hardcoding hex values.**

### Core Variables:
- `--bg-primary`: The main page background.
- `--bg-card`: Surface background for containers and panels.
- `--bg-sidebar`: Dedicated background for the navigation drawer.
- `--accent-green`: Primary action color and success indicators (`#03ef62`).
- `--accent-red`: Error states and critical "Danger Zone" buttons.
- `--accent-yellow`: Warning states and in-progress indicators.
- `--accent-blue`: Informational badges and active focus states.
- `--border`: Standard structural border color.
- `--text-primary`: Default high-contrast text color.
- `--text-muted`: Lower-contrast secondary text.

## 🌐 Vite Proxy

In development (`npm run dev`), Vite is configured to proxy all `/api` requests to `http://localhost:3001` (or your configured `PORT`). This eliminates CORS issues and simplifies the local environment setup.
