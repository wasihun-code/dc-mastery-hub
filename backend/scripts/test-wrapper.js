import db from '../db/database.pg.js'

async function runTests() {
  console.log('--- Testing DB Wrapper ---')
  
  // Clean up any previous test runs
  await db.exec("DELETE FROM users WHERE username LIKE 'testuser_%'")

  // 1. Single row insert (like schema.js:50)
  const r1 = await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, FALSE)').run('testuser_1', 'hash', 'salt')
  console.log('1. Single row insert lastInsertRowid:', r1.lastInsertRowid, r1.lastInsertRowid > 0 ? '(PASS)' : '(FAIL)')

  // 2. Single row insert with existing RETURNING clause
  const r2 = await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, FALSE) RETURNING id').run('testuser_2', 'hash', 'salt')
  console.log('2. Existing RETURNING clause lastInsertRowid:', r2.lastInsertRowid, r2.lastInsertRowid > 0 ? '(PASS)' : '(FAIL)')

  // 3. Different case returning clause
  const r3 = await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, FALSE) returning id, username').run('testuser_3', 'hash', 'salt')
  console.log('3. Lowercase returning clause lastInsertRowid:', r3.lastInsertRowid, r3.lastInsertRowid > 0 ? '(PASS)' : '(FAIL)')

  // 4. Multi-row insert (does it break?)
  try {
    const r4 = await db.prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, FALSE), (?, ?, ?, FALSE)').run('testuser_4', 'h', 's', 'testuser_5', 'h', 's')
    console.log('4. Multi-row insert lastInsertRowid:', r4.lastInsertRowid, '(Returned first ID inserted)')
  } catch (e) {
    console.log('4. Multi-row insert FAIL:', e.message)
  }

  process.exit(0)
}

runTests().catch(e => {
  console.error('Test script failed:', e)
  process.exit(1)
})
