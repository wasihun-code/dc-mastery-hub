# Deployment Checklist

Follow this guide to deploy DC Mastery Hub to a production server.

## 🖥️ Server Requirements

- **Node.js:** v18 or later.
- **Python:** v3.8 or later.
- **Python Dependencies:** `pandas`, `numpy` installed in the global environment or accessible via `PYTHON_PATH`.
- **Memory:** At least 512MB RAM available for spawning Python subprocesses.
- **Disk:** Write access to `/tmp` (or the system temp directory) for challenge script generation.

## 🚀 Steps to Deploy

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/yourusername/dc-mastery-hub.git
    cd dc-mastery-hub
    ```

2.  **Install Production Dependencies:**
    ```bash
    # Install root dependencies
    npm install --omit=dev
    
    # Install backend dependencies
    cd backend && npm install --omit=dev
    
    # Install frontend dependencies (needed for build)
    cd ../frontend && npm install
    ```

3.  **Setup Environment Variables:**
    Copy `backend/.env.example` to `backend/.env` and configure:
    - Set `NODE_ENV=production`.
    - Generate a long, random `SESSION_SECRET`.
    - Ensure `PYTHON_PATH` points to the correct Python 3 executable.
    - Set `DB_PATH` to a location outside the `frontend/dist` directory.

4.  **Build the Frontend:**
    ```bash
    cd ../frontend
    npm run build
    ```

5.  **Initialize the Database:**
    The database will be automatically created and seeded on the first startup.

6.  **Start the Application:**
    It is recommended to use a process manager like **PM2**.
    ```bash
    cd ..
    pm2 start npm --name "dc-mastery-hub" -- start
    ```

7.  **Final Verification:**
    Confirm the backend is running and all challenges are passing:
    ```bash
    npm run verify-challenges
    ```

## 🛡️ Security Checklist

- [ ] **`SESSION_SECRET`**: Ensure this is a random 64+ character string.
- [ ] **`NODE_ENV`**: Set to `production` to enable static file serving and disable dev logs.
- [ ] **`.env` File**: Never commit your `.env` file to version control.
- [ ] **Database Access**: Ensure the SQLite `.db` file is NOT served by a static web server (nginx/apache). The application serves files from `frontend/dist` only.
- [ ] **Subprocess Safety:** The Python sandbox has built-in term blocking, but ensure the server user has limited filesystem permissions.
