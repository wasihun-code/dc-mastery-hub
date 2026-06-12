import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

export function scanContent() {
  const rawContentFolder = process.env.CONTENT_FOLDER
  const contentFolder = rawContentFolder
    ? (path.isAbsolute(rawContentFolder) ? rawContentFolder : path.resolve(__dirname, '..', rawContentFolder))
    : DEFAULT_CONTENT_FOLDER
  const tracksPath = path.join(contentFolder, 'tracks')
  
  const summary = {
    scanned_tracks: 0,
    scanned_courses: 0,
    pdfs_found: 0,
    glossaries_found: 0,
    courses_with_datasets: 0,
    updates_made: 0
  }

  if (!fs.existsSync(tracksPath)) {
    console.warn(`[Scanner] Tracks path not found: ${tracksPath}`)
    return summary
  }

  const trackFolders = fs.readdirSync(tracksPath)
  const slugsWithPdf = new Set()
  const slugsWithGlossary = new Set()
  const slugsWithDatasets = new Set()
  const allSeenSlugs = new Set()

  for (const trackFolder of trackFolders) {
    const trackFolderPath = path.join(tracksPath, trackFolder)
    if (!fs.statSync(trackFolderPath).isDirectory()) continue

    const trackJsonPath = path.join(trackFolderPath, 'track.json')
    if (!fs.existsSync(trackJsonPath)) continue

    try {
      const trackData = JSON.parse(fs.readFileSync(trackJsonPath, 'utf8'))
      const trackSlug = trackData.slug
      const track = db.prepare('SELECT id FROM tracks WHERE slug = ?').get(trackSlug)

      if (!track) {
        console.warn(`[Scanner] Track not found in DB: ${trackSlug}`)
        continue
      }

      summary.scanned_tracks++

      const courseFolders = fs.readdirSync(trackFolderPath)
      for (const courseFolder of courseFolders) {
        const courseFolderPath = path.join(trackFolderPath, courseFolder)
        if (!fs.statSync(courseFolderPath).isDirectory()) continue
        if (courseFolder === 'datasets') continue // Not a course folder

        const courseSlug = courseFolder
        const courseExists = db.prepare('SELECT 1 FROM courses WHERE slug = ?').get(courseSlug)

        if (!courseExists) continue

        allSeenSlugs.add(courseSlug)

        // Check for slides PDF
        const slidesPath = path.join(courseFolderPath, `${courseSlug}.pdf`)
        if (fs.existsSync(slidesPath)) {
          slugsWithPdf.add(courseSlug)
        }

        // Check for glossary PDF
        const glossaryPath = path.join(courseFolderPath, `${courseSlug}-glossary.pdf`)
        if (fs.existsSync(glossaryPath)) {
          slugsWithGlossary.add(courseSlug)
        }

        // Check for datasets
        const datasetsPath = path.join(courseFolderPath, 'datasets')
        if (fs.existsSync(datasetsPath) && fs.statSync(datasetsPath).isDirectory()) {
          const datasetFiles = fs.readdirSync(datasetsPath)
          const validExtensions = ['.csv', '.sql', '.pkl', '.p', '.json', '.xlsx']
          const datasetCount = datasetFiles.filter(file => 
            !file.startsWith('.') && validExtensions.includes(path.extname(file).toLowerCase())
          ).length
          if (datasetCount > 0) {
            slugsWithDatasets.add(courseSlug)
          }
        }
      }
    } catch (err) {
      console.error(`[Scanner] Error processing track folder ${trackFolder}:`, err)
    }
  }

  // Final Update Pass - process each unique slug once
  for (const slug of allSeenSlugs) {
    summary.scanned_courses++
    const hasSlides = slugsWithPdf.has(slug) ? 1 : 0
    const hasGlossary = slugsWithGlossary.has(slug) ? 1 : 0
    
    const course = db.prepare('SELECT has_pdf, has_glossary FROM courses WHERE slug = ?').get(slug)
    
    // Update DB if anything changed for this unique slug
    if (hasSlides !== course.has_pdf || hasGlossary !== course.has_glossary) {
      db.prepare('UPDATE courses SET has_pdf = ?, has_glossary = ? WHERE slug = ?')
        .run(hasSlides, hasGlossary, slug)
      summary.updates_made++
      console.log(`[Scanner] Finalized course ${slug}: slides=${hasSlides}, glossary=${hasGlossary}`)
    }
  }

  summary.pdfs_found = slugsWithPdf.size
  summary.glossaries_found = slugsWithGlossary.size
  summary.courses_with_datasets = slugsWithDatasets.size

  return summary
}
