import { jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { setupTestEnvironment, seedTestData, cleanupTestEnvironment } from './helpers/testEnv.pg.js'

let db, testData, env, contentDir, getChallenges

beforeAll(async () => {
  env = await setupTestEnvironment()

  contentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-content-'))
  process.env.CONTENT_PATH = contentDir

  jest.resetModules()

  const { initSchema } = await import('../db/schema.js')
  console.log('2. initSchema'); await initSchema(); console.log('2. done')

  const pgDb = (await import('../db/database.pg.js')).default
  db = pgDb

  console.log('3. delete'); await db.prepare('DELETE FROM user_stats').run()
  await db.prepare('DELETE FROM sessions').run()
  await db.prepare('DELETE FROM users').run()

  console.log('4. seedTestData'); testData = await seedTestData(db); console.log('4. done')

  // The courses are already associated with their tracks via seedTestData.

  // Create a datasets folder for pandas-fundamentals (data-science track)
  const datasetsDir = path.join(contentDir, 'tracks', 'data-science', 'pandas-fundamentals', 'datasets')
  fs.mkdirSync(datasetsDir, { recursive: true })
  fs.writeFileSync(path.join(datasetsDir, 'sales.csv'), 'date,amount,region\n2024-01,100,North\n2024-02,200,South\n')
  fs.writeFileSync(path.join(datasetsDir, 'products.csv'), 'id,name,price\n1,Widget,9.99\n2,Gadget,19.99\n')
  fs.writeFileSync(path.join(datasetsDir, 'users.csv'), 'user_id,name,age\n1,Alice,30\n2,Bob,25\n')

  const mod = await import('../services/challengeGenerator.js')
  getChallenges = mod.getChallenges
})

afterAll(async () => {
  await cleanupTestEnvironment(env.tmpDir)
  if (typeof db !== 'undefined' && db && db.end) await db.end();
  try { fs.rmSync(contentDir, { recursive: true, force: true }) } catch (e) {}
  delete process.env.CONTENT_PATH
})

describe('getChallenges', () => {
  test('returns empty array when course does not exist', async () => {
    const result = await getChallenges('non-existent-course')
    expect(result).toEqual([])
  })

  test('returns empty array when no datasets folder exists', async () => {
    const result = await getChallenges('python-basics')
    expect(result).toEqual([])
  })

  test('returns challenges when valid CSV dataset exists in folder', async () => {
    const result = await getChallenges('pandas-fundamentals')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(c => typeof c.title === 'string')).toBe(true)
  })

  test('challenges have correct structure', async () => {
    const result = await getChallenges('pandas-fundamentals')
    for (const challenge of result) {
      expect(challenge).toHaveProperty('id')
      expect(typeof challenge.id).toBe('string')
      expect(challenge).toHaveProperty('title')
      expect(typeof challenge.title).toBe('string')
      expect(challenge).toHaveProperty('difficulty')
      expect(typeof challenge.difficulty).toBe('number')
      expect(challenge).toHaveProperty('description')
      expect(typeof challenge.description).toBe('string')
      expect(challenge).toHaveProperty('starter_code')
      expect(typeof challenge.starter_code).toBe('string')
      expect(challenge).toHaveProperty('expected_output_code')
      expect(typeof challenge.expected_output_code).toBe('string')
      expect(challenge).toHaveProperty('hints')
      expect(Array.isArray(challenge.hints)).toBe(true)
      expect(challenge).toHaveProperty('concepts_tested')
      expect(Array.isArray(challenge.concepts_tested)).toBe(true)
    }
  })

  test('returns at most 10 challenges', async () => {
    // 3 CSV files x 4 challenges each = 12, but .slice(0, 10) caps at 10
    const result = await getChallenges('pandas-fundamentals')
    expect(result.length).toBeLessThanOrEqual(10)
  })
})
