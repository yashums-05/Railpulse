require('dotenv').config({ path: '../../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Date range in crowd_daily_train
  const r1 = await pool.query(`
    SELECT MIN(booking_date) AS min_date, MAX(booking_date) AS max_date FROM crowd_daily_train
  `);
  console.log('\n=== crowd_daily_train date range ===');
  console.log('  Min:', r1.rows[0].min_date, ' Max:', r1.rows[0].max_date);

  // Date range in crowd_daily_station
  const r2 = await pool.query(`
    SELECT MIN(booking_date) AS min_date, MAX(booking_date) AS max_date FROM crowd_daily_station
  `);
  console.log('\n=== crowd_daily_station date range ===');
  console.log('  Min:', r2.rows[0].min_date, ' Max:', r2.rows[0].max_date);

  // Sample a quick query like the API does
  console.log('\n=== Testing summary table query (train, 2024-01-01 to 2024-01-07) ===');
  const t0 = Date.now();
  const r3 = await pool.query(`
    SELECT COUNT(*) FROM crowd_daily_train WHERE booking_date >= '2024-01-01'::date AND booking_date <= '2024-01-07'::date
  `);
  console.log('  Rows in range:', r3.rows[0].count, '  Time:', Date.now() - t0, 'ms');

  await pool.end();
}
main().catch(async e => { console.error(e.message); await pool.end(); });
