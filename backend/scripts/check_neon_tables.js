import db from '../db/database.pg.js'

async function check() {
  const { rows } = await db._pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
  console.log(rows.map(r => r.table_name))
  process.exit(0)
}
check()
