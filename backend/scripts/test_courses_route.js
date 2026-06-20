import express from 'express'
import request from 'supertest'
import coursesRouter from '../routes/courses.js'
import { setupTestEnvironment, seedTestData } from '../__tests__/helpers/testEnv.pg.js'

async function run() {
  await setupTestEnvironment()
  const testData = await seedTestData()
  const app = express()
  app.use(express.json())
  app.use((req, res, next) => {
    req.user = testData.studentUser
    next()
  })
  app.use('/api', coursesRouter)
  const res = await request(app).get('/api/courses')
  console.log(res.status)
  if (res.error) console.error(res.error)
  console.log(res.body)
  process.exit(0)
}
run()
