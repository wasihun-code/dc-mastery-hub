import db from '../db/database.pg.js'

async function check() {
  try {
    const res = await db.prepare('SELECT * FROM user_courses').all()
    console.log(res)
  } catch (err) {
    console.error(err)
  }
  process.exit(0)
}
check()
