import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Connected successfully:', result.rows[0]);
  } catch (err) {
    console.error('✗ Connection failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
