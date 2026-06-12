import db from './database.js'

export function validateDatabase() {
  const errors = []
  const report = []

  try {
    // 1. Check tracks and count courses
    const tracks = db.prepare('SELECT * FROM tracks').all()
    report.push(`Tracks found: ${tracks.length}`)
    for (const t of tracks) {
      report.push(`  - Track: "${t.name}" (Slug: ${t.slug}, Lang: ${t.language})`)
    }

    // Expected course counts per track
    const expectedCounts = {
      'associate-data-scientist-python': 23,
      'data-engineer-python': 14,
      'data-analyst-python': 13,
      'associate-data-analyst-sql': 11,
      'associate-python-developer': 9
    }

    let totalMemberships = 0

    for (const [slug, expected] of Object.entries(expectedCounts)) {
      const track = tracks.find(t => t.slug === slug)
      if (!track) {
        errors.push(`Missing track: ${slug}`)
        continue
      }

      // Check course count
      const courses = db.prepare('SELECT * FROM courses WHERE track_id = ? AND is_deleted = 0').all(track.id)
      report.push(`    Course count for ${slug}: ${courses.length} (Expected: ${expected})`)
      if (courses.length !== expected) {
        errors.push(`Track ${slug} has course count ${courses.length}, but expected ${expected}`)
      }
      totalMemberships += courses.length

      // Check for duplicate course entries within the same track
      const slugs = courses.map(c => c.slug)
      const uniqueSlugs = new Set(slugs)
      if (slugs.length !== uniqueSlugs.size) {
        const duplicates = slugs.filter((item, index) => slugs.indexOf(item) !== index)
        errors.push(`Track ${slug} has duplicate course entries for slug: ${duplicates.join(', ')}`)
      }

      // Check that every course has a corresponding mastery score row
      for (const c of courses) {
        const score = db.prepare('SELECT * FROM mastery_scores WHERE course_id = ?').get(c.id)
        if (!score) {
          errors.push(`Course ID ${c.id} (${c.name}) has no mastery score row`)
        }
      }
    }

    report.push(`Total memberships found: ${totalMemberships} (Expected: 70)`)
    if (totalMemberships !== 70) {
      errors.push(`Total track-course memberships is ${totalMemberships}, but expected 70`)
    }

    // Check shared courses
    const sharedCoursesExpected = [
      'introduction-to-python',
      'intermediate-python',
      'python-toolbox',
      'introduction-to-statistics-in-python',
      'working-with-dates-and-times-in-python',
      'writing-functions-in-python',
      'introduction-to-importing-data-in-python',
      'cleaning-data-in-python'
    ]

    for (const slug of sharedCoursesExpected) {
      const occurrences = db.prepare('SELECT COUNT(*) AS count FROM courses WHERE slug = ? AND is_deleted = 0').get(slug).count
      if (occurrences < 2) {
        // Some shared courses might only exist in a subset of tracks based on the PDF
        errors.push(`Course slug ${slug} was expected to be shared across tracks, but has only ${occurrences} occurrences in the database`)
      } else {
        report.push(`    Shared course "${slug}" verified with ${occurrences} track memberships.`)
      }
    }

    // Check broken course IDs/references
    const orphanedScores = db.prepare(`
      SELECT ms.id, ms.course_id FROM mastery_scores ms
      LEFT JOIN courses c ON c.id = ms.course_id
      WHERE c.id IS NULL
    `).all()
    if (orphanedScores.length > 0) {
      errors.push(`Found ${orphanedScores.length} orphaned mastery scores`)
    }

    const orphanedConcepts = db.prepare(`
      SELECT id, course_id FROM concepts WHERE course_id NOT IN (SELECT id FROM courses)
    `).all()
    if (orphanedConcepts.length > 0) {
      errors.push(`Found ${orphanedConcepts.length} orphaned concepts`)
    }

  } catch (err) {
    errors.push(`Validation exception: ${err.message}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    report
  }
}
