import { jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.js'

let env, db, scanContent, contentDir

function createTrackJson(trackSlug) {
  const trackDir = path.join(contentDir, 'tracks', trackSlug)
  fs.mkdirSync(trackDir, { recursive: true })
  fs.writeFileSync(path.join(trackDir, 'track.json'), JSON.stringify({ slug: trackSlug }), 'utf-8')
  return trackDir
}

function createCourseFolder(trackDir, courseSlug) {
  const courseDir = path.join(trackDir, courseSlug)
  fs.mkdirSync(courseDir, { recursive: true })
  return courseDir
}

beforeAll(async () => {
  env = setupTestEnvironment()
  contentDir = path.join(env.tmpDir, 'content')
  process.env.CONTENT_PATH = contentDir

  jest.resetModules()

  const { initSchema } = await import('../db/schema.js')
  initSchema()

  const Database = (await import('better-sqlite3')).default
  db = new Database(env.dbPath)
  db.pragma('journal_mode = WAL')

  db.prepare('DELETE FROM user_stats').run()
  db.prepare('DELETE FROM sessions').run()
  db.prepare('DELETE FROM users').run()

  seedTestData(db)

  const mod = await import('../services/contentScanner.js')
  scanContent = mod.scanContent
})

afterAll(() => {
  cleanupTestEnvironment(env.tmpDir)
})

afterEach(() => {
  if (fs.existsSync(contentDir)) {
    fs.rmSync(contentDir, { recursive: true, force: true })
  }
  db.prepare('UPDATE courses SET has_pdf = 0, has_glossary = 0').run()
})

describe('scanContent', () => {
  test('returns empty summary when tracks path does not exist', () => {
    fs.mkdirSync(contentDir, { recursive: true })

    const result = scanContent()

    expect(result).toEqual({
      scanned_tracks: 0,
      scanned_courses: 0,
      pdfs_found: 0,
      glossaries_found: 0,
      courses_with_datasets: 0,
      updates_made: 0
    })
  })

  test('returns summary with scanned_tracks and scanned_courses when content exists', () => {
    const trackDir = createTrackJson('data-science')
    createCourseFolder(trackDir, 'python-basics')

    const result = scanContent()

    expect(result.scanned_tracks).toBe(1)
    expect(result.scanned_courses).toBe(1)
    expect(result.pdfs_found).toBe(0)
    expect(result.glossaries_found).toBe(0)
    expect(result.courses_with_datasets).toBe(0)
    expect(result.updates_made).toBe(0)
  })

  test('detects PDF and glossary files and updates has_pdf and has_glossary', () => {
    const trackDir = createTrackJson('data-science')
    const courseDir = createCourseFolder(trackDir, 'python-basics')

    fs.writeFileSync(path.join(courseDir, 'python-basics.pdf'), 'fake slides content')
    fs.writeFileSync(path.join(courseDir, 'python-basics-glossary.pdf'), 'fake glossary content')

    const result = scanContent()

    expect(result.pdfs_found).toBe(1)
    expect(result.glossaries_found).toBe(1)
    expect(result.scanned_tracks).toBe(1)
    expect(result.scanned_courses).toBe(1)
    expect(result.updates_made).toBe(1)

    const course = db.prepare("SELECT has_pdf, has_glossary FROM courses WHERE slug = 'python-basics'").get()
    expect(course.has_pdf).toBe(1)
    expect(course.has_glossary).toBe(1)
  })

  test('sets has_pdf to 1 when a slides PDF exists', () => {
    const trackDir = createTrackJson('data-science')
    const courseDir = createCourseFolder(trackDir, 'python-basics')

    fs.writeFileSync(path.join(courseDir, 'python-basics.pdf'), 'fake slides content')

    const result = scanContent()

    expect(result.pdfs_found).toBe(1)
    expect(result.updates_made).toBe(1)

    const course = db.prepare("SELECT has_pdf, has_glossary FROM courses WHERE slug = 'python-basics'").get()
    expect(course.has_pdf).toBe(1)
    expect(course.has_glossary).toBe(0)
  })

  test('sets has_glossary to 1 when a glossary PDF exists', () => {
    const trackDir = createTrackJson('data-science')
    const courseDir = createCourseFolder(trackDir, 'python-basics')

    fs.writeFileSync(path.join(courseDir, 'glossary.pdf'), 'fake glossary content')

    const result = scanContent()

    expect(result.glossaries_found).toBe(1)
    expect(result.updates_made).toBe(1)

    const course = db.prepare("SELECT has_pdf, has_glossary FROM courses WHERE slug = 'python-basics'").get()
    expect(course.has_pdf).toBe(0)
    expect(course.has_glossary).toBe(1)
  })
})
