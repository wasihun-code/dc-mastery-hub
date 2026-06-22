const fs = require('fs');
const path = require('path');

const progressPath = path.join(__dirname, '../routes/progress.js');
let content = fs.readFileSync(progressPath, 'utf8');

// 1. db \n .prepare -> await db \n .prepare
content = content.replace(/(\breturn|\bconst\s+\w+\s*=|\blet\s+\w+\s*=)\s*db\s*\n\s*\.prepare/g, '$1 await db\n    .prepare');

// 2. getTracksSummary mapping
const tracksSummaryQuery = `async function getTracksSummary(userId) {
  const rows = await db
    .prepare(\`
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
      LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = ?
      LEFT JOIN track_courses tc ON tc.track_id = t.id
      LEFT JOIN courses c ON c.id = tc.course_id AND COALESCE((SELECT uc2.is_deleted FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), false) = false AND COALESCE((SELECT uc2.is_archived FROM user_courses uc2 WHERE uc2.course_id = c.id AND uc2.user_id = ?), false) = false
      LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
      LEFT JOIN mastery_scores ms ON ms.course_id = c.id AND ms.user_id = ?
      WHERE COALESCE(ut.is_deleted, false) = false AND COALESCE(ut.is_archived, false) = false
      GROUP BY t.id
      ORDER BY t.id
    \`)
    .all(userId, userId, userId, userId, userId)
  return rows.map(t => ({
    ...t,
    course_count: parseInt(t.course_count || 0),
    completed_count: parseInt(t.completed_count || 0),
    in_progress_count: parseInt(t.in_progress_count || 0),
    overall_mastery: Math.round(parseFloat(t.overall_mastery || 0))
  }))
}`;

content = content.replace(/async function getTracksSummary\(userId\) \{[\s\S]*?\.all\(userId, userId, userId, userId, userId\)\n\}/m, tracksSummaryQuery);


// 3. getRecentActivity mapping
const recentActivityRegex = /const recentActivity = await db[\s\S]*?ORDER BY ea\.created_at DESC\n\s*LIMIT 5\n\s*\`\)\n\s*\.all\(userId\)/m;
const recentActivityReplace = `const recentActivityRows = await db
      .prepare(\`
        SELECT 
          ea.created_at,
          ea.exercise_type,
          ea.score,
          ea.was_correct,
          ea.time_taken_secs,
          c.name AS course_name,
          c.slug AS course_slug
        FROM exercise_attempts ea
        JOIN courses c ON c.id = ea.course_id
        WHERE ea.user_id = ? AND COALESCE(ea.is_deleted, false) = false
        ORDER BY ea.created_at DESC
        LIMIT 5
      \`)
      .all(userId)
    const recentActivity = recentActivityRows.map(r => ({
      ...r,
      score: parseFloat(r.score),
      was_correct: !!r.was_correct,
      time_taken_secs: parseInt(r.time_taken_secs || 0)
    }))`;
content = content.replace(recentActivityRegex, recentActivityReplace);


// 4. weakSpots mapping
const weakSpotsRegex = /const weakSpots = await db[\s\S]*?LIMIT 5\n\s*\`\)\n\s*\.all\(userId\)/m;
const weakSpotsReplace = `const weakSpotsRows = await db
      .prepare(\`
        SELECT 
          COALESCE(qq.concept_id, fc.concept_id) AS concept_id,
          con.name AS concept_name,
          crs.name AS course_name,
          COUNT(*) AS attempt_count,
          ROUND(CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) AS correct_rate
        FROM exercise_attempts ea
        LEFT JOIN quiz_questions qq ON ea.exercise_type IN ('quiz', 'bossbattle') AND qq.id = ea.question_id
        LEFT JOIN flashcards fc ON ea.exercise_type = 'flashcard' AND fc.id = ea.question_id
        LEFT JOIN concepts con ON con.id = COALESCE(qq.concept_id, fc.concept_id)
        LEFT JOIN courses crs ON crs.id = ea.course_id
        WHERE ea.user_id = ? AND COALESCE(ea.is_deleted, false) = false AND COALESCE(con.name, '') != ''
        GROUP BY COALESCE(qq.concept_id, fc.concept_id), con.name, crs.name
        HAVING COUNT(*) >= 3 AND CAST(SUM(CASE WHEN ea.was_correct = true THEN 1 ELSE 0 END) AS REAL) / COUNT(*) < 0.7
        ORDER BY correct_rate ASC, attempt_count DESC
        LIMIT 5
      \`)
      .all(userId)
    const weakSpots = weakSpotsRows.map(ws => ({
      ...ws,
      attempt_count: parseInt(ws.attempt_count),
      correct_rate: Math.round(parseFloat(ws.correct_rate) * 100)
    }))`;
content = content.replace(weakSpotsRegex, weakSpotsReplace);


// 5. getExerciseBreakdown mapping
const exerciseBreakdownRegex = /const exerciseBreakdown = await db[\s\S]*?GROUP BY exercise_type\n\s*\`\)\n\s*\.all\(userId\)/m;
const exerciseBreakdownReplace = `const exerciseBreakdownRows = await db
      .prepare(\`
        SELECT 
          exercise_type,
          COUNT(*) AS attempt_count,
          SUM(time_taken_secs) AS total_time_secs,
          ROUND(CAST(SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) AS accuracy
        FROM exercise_attempts
        WHERE user_id = ? AND COALESCE(is_deleted, false) = false
        GROUP BY exercise_type
      \`)
      .all(userId)
    const exerciseBreakdown = exerciseBreakdownRows.map(r => ({
      ...r,
      attempt_count: parseInt(r.attempt_count),
      total_time_secs: parseInt(r.total_time_secs || 0),
      accuracy: parseFloat(r.accuracy || 0)
    }))`;
content = content.replace(exerciseBreakdownRegex, exerciseBreakdownReplace);


// 6. getDailyActivity mapping
const dailyActivityRegex = /const dailyActivity = await db[\s\S]*?ORDER BY date ASC\n\s*\`\)\n\s*\.all\(userId\)/m;
const dailyActivityReplace = `const dailyActivityRows = await db
      .prepare(\`
        SELECT 
          DATE(created_at) AS date,
          COUNT(*) AS attempt_count,
          SUM(time_taken_secs) AS total_time_secs
        FROM exercise_attempts
        WHERE user_id = ? AND created_at >= DATE(CURRENT_DATE, '-14 days') AND COALESCE(is_deleted, false) = false
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      \`)
      .all(userId)
    const dailyActivity = dailyActivityRows.map(r => ({
      ...r,
      attempt_count: parseInt(r.attempt_count),
      total_time_secs: parseInt(r.total_time_secs || 0)
    }))`;
content = content.replace(dailyActivityRegex, dailyActivityReplace);


// 7. Fix getTracksSummary call in dashboard
content = content.replace(/tracks_summary:\s*await getTracksSummary\(userId\),/g, 'tracks_summary: await getTracksSummary(userId),');

// 8. Fix aggregate variables that might still be string
content = content.replace(/const totalAttempts = totalRow\?\.count \|\| 0/g, 'const totalAttempts = parseInt(totalRow?.count || 0)');
content = content.replace(/const totalFlashcards = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM flashcards WHERE course_id = \?'\)\.get\(courseId\)\.count/g, "const totalFlashcards = parseInt(await db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(courseId).count)");

content = content.replace(/mcqAvailable = parseInt\(await db\.prepare\('SELECT COUNT\(\*\) AS count FROM quiz_questions WHERE course_id = \?'\)\.get\(course\.id\)\.count\)/g, "mcqAvailable = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course.id)).count)");
content = content.replace(/flashcardAvailable = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM flashcards WHERE course_id = \?'\)\.get\(course\.id\)\.count/g, "flashcardAvailable = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE course_id = ?').get(course.id)).count)");
content = content.replace(/ftbAvailable = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM concepts WHERE course_id = \?'\)\.get\(course\.id\)\.count/g, "ftbAvailable = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course.id)).count)");
content = content.replace(/bossAvailable = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM quiz_questions WHERE course_id = \?'\)\.get\(course\.id\)\.count/g, "bossAvailable = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course.id)).count)");
content = content.replace(/const dbConceptsCount = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM concepts WHERE course_id = \?'\)\.get\(course\.id\)\.count/g, "const dbConceptsCount = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM concepts WHERE course_id = ?').get(course.id)).count)");
content = content.replace(/mcqAvailable = await db\.prepare\('SELECT COUNT\(\*\) AS count FROM quiz_questions WHERE course_id = \?'\)\.get\(course\.id\)\.count/g, "mcqAvailable = parseInt((await db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE course_id = ?').get(course.id)).count)");

content = content.replace(/const totalQuestions = await db\.prepare\(\`\n      SELECT COUNT\(\*\) AS count FROM \(\${whereClause}\)\n    \`\)\.get\(\)/m, "const totalQuestions = await db.prepare(`SELECT COUNT(*) AS count FROM (${whereClause})`).get()");
content = content.replace(/const attemptedQuestions = await db\.prepare\(\`\n      SELECT COUNT\(DISTINCT question_id\) AS count\n      FROM exercise_attempts\n      WHERE course_id = \? AND user_id = \? AND exercise_type = \? AND question_id IS NOT NULL AND was_correct = true\n    \`\)\.get\(courseId, userId, exerciseType\)/m, "const attemptedQuestions = await db.prepare(`SELECT COUNT(DISTINCT question_id) AS count FROM exercise_attempts WHERE course_id = ? AND user_id = ? AND exercise_type = ? AND question_id IS NOT NULL AND was_correct = true`).get(courseId, userId, exerciseType)");

// For getCourseMastery: scoreForExerciseType parsing
content = content.replace(/const mcqScore = await scoreForExerciseType\(courseId, `SELECT id FROM quiz_questions WHERE course_id = \${courseId}`, userId\)/g, "const mcqScore = parseInt(await scoreForExerciseType(courseId, `SELECT id FROM quiz_questions WHERE course_id = ${courseId}`, userId))");
content = content.replace(/const bossScore = await scoreForExerciseType\(courseId, `SELECT id FROM quiz_questions WHERE course_id = \${courseId}`, userId\)/g, "const bossScore = parseInt(await scoreForExerciseType(courseId, `SELECT id FROM quiz_questions WHERE course_id = ${courseId}`, userId))");

content = content.replace("db.transaction(() => {", "await db.transaction(async () => {");
content = content.replace(/}\)\(\)\s+res\.status\(200\)\.json\(\{ success: true/m, "})\n\n    res.status(200).json({ success: true");

// Fix date/datetime functions
content = content.replace(/datetime\('now'\)/g, "CURRENT_TIMESTAMP");
content = content.replace(/date\('now'\)/g, "CURRENT_DATE");
content = content.replace(/date\('now',\s*'\+'\s*\|\|\s*\?\s*\|\|\s*' days'\)/g, "CURRENT_DATE + (? * INTERVAL '1 day')");

// Fix RETURNING *
content = content.replace(/VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)\n\s*`\)\n\s*\.run\(/m, "VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *\n      `).get(");

fs.writeFileSync(progressPath, content);

// Also fix progress.test.js
const testPath = path.join(__dirname, '../__tests__/progress.test.js');
let testContent = fs.readFileSync(testPath, 'utf8');

testContent = testContent.replace(/date\('now',\s*'\+1 year'\)/g, "CURRENT_DATE + INTERVAL '1 year'");
testContent = testContent.replace(/date\('now',\s*'-1 day'\)/g, "CURRENT_DATE - INTERVAL '1 day'");
testContent = testContent.replace(/datetime\('now'\)/g, "CURRENT_TIMESTAMP");
testContent = testContent.replace(/date\('now'\)/g, "CURRENT_DATE");

fs.writeFileSync(testPath, testContent);

console.log('Final progress JS fix applied');
