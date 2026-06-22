const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const userId = 1;

  try {
    const q1 = `
      SELECT
        t.id,
        t.slug,
        t.name,
        t.color,
        t.language,
        COUNT(c.id) AS course_count,
        SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN COALESCE(uc.status, 'Not Started') = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
        ROUND(AVG(COALESCE(ms.overall_mastery, 0)), 1) AS overall_mastery
      FROM tracks t
      LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = $1
      LEFT JOIN track_courses tc ON tc.track_id = t.id
      LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = $2), false) = false AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = $3), false) = false
      LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = $4
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = $5
      WHERE COALESCE(ut.is_deleted, false) = false AND COALESCE(ut.is_archived, false) = false
      GROUP BY t.id
      ORDER BY t.id
    `;
    await pool.query(q1, [userId, userId, userId, userId, userId]);
    console.log("getTracksSummary: SUCCESS");
  } catch(e) {
    console.error("getTracksSummary: ERROR", e.message);
  }

  try {
    const q2 = `
        SELECT
          COALESCE(qq.concept_id, fc.concept_id) AS concept_id,
          con.name AS concept_name,
          crs.name AS course_name,
          COUNT(*) AS attempt_count,
          ROUND(CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) AS correct_rate
        FROM exercise_attempts ea
        LEFT JOIN quiz_questions qq ON ea.exercise_type IN ('quiz', 'bossbattle') AND qq.id = ea.question_id
        LEFT JOIN flashcards fc ON ea.exercise_type = 'flashcard' AND fc.id = ea.question_id
        JOIN concepts con ON con.id = COALESCE(qq.concept_id, fc.concept_id)
        JOIN courses crs ON crs.id = ea.course_id
        WHERE ea.user_id = $1 AND COALESCE(ea.is_deleted, false) = false AND COALESCE(con.name, '') != ''
        GROUP BY COALESCE(qq.concept_id, fc.concept_id), con.name, crs.name
        HAVING COUNT(*) >= 3 AND CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS REAL) / COUNT(*) < 0.7
        ORDER BY correct_rate ASC, attempt_count DESC
        LIMIT 5
    `;
    await pool.query(q2, [userId]);
    console.log("weakSpots: SUCCESS");
  } catch(e) {
    console.error("weakSpots: ERROR", e.message);
  }

  try {
    const q3 = `
        SELECT
          COUNT(*) AS total_attempts,
          COALESCE(SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END), 0) AS correct_attempts,
          COALESCE(SUM(time_taken_secs), 0) AS total_time_secs,
          ROUND(COALESCE(AVG(CASE WHEN was_correct = true THEN 1 ELSE 0 END), 0) * 100, 1) AS avg_accuracy
        FROM exercise_attempts
        WHERE user_id = $1
    `;
    await pool.query(q3, [userId]);
    console.log("overallStats: SUCCESS");
  } catch(e) {
    console.error("overallStats: ERROR", e.message);
  }

  pool.end();
}
run();
