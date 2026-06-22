# API Routes

The backend API exposes endpoints to manage tracks, courses, sessions, and challenges.

## Auth Routes
- `POST /api/auth/login` - Authenticates user and initiates session.
- `GET /api/auth/session` - Validates the current user session.
- `POST /api/auth/logout` - Terminates user session.

## Admin Routes
- `POST /api/admin/exercises/reimport` - Reimports courses and datasets.
- `GET /api/admin/system/config` - Fetches the safe subset of configuration values.
- `POST /api/admin/nuclear_reset` - Resets entire database content (Danger).
- *Also includes various CRUD operations to configure tracks and courses.*

## Tracks Routes
- `GET /api/tracks` - Fetch all tracks available.
- `GET /api/tracks/:slug` - Fetch specific track details by its slug.

## Course Routes
- `GET /api/courses` - List courses.
- `GET /api/courses/:slug` - Retrieve course details.
- `GET /api/courses/:slug/content` - Scan and retrieve local folder content.

## Progress & Challenges
- `GET /api/challenges/:course_slug` - Generate spaced-repetition challenges for the course.
- `POST /api/progress/attempt` - Submits an attempt result for evaluation and logs progress.

*(More detailed specification to be generated using Swagger down the line).*
