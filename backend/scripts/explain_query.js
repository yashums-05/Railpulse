require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const client = await pool.connect();
  await client.query("SET work_mem = '256MB'");

  const t = Date.now();
  const r = await client.query(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT inner_agg.train_no,
           SUM(inner_agg.coach_pax) AS total_passengers,
           json_object_agg(inner_agg.coach_type, inner_agg.coach_pax) AS coach_breakdown
    FROM (
      SELECT dt.train_no, dt.coach_type, SUM(dt.total_passengers) AS coach_pax
      FROM crowd_daily_train dt
      WHERE dt.booking_date >= '2024-01-01' AND dt.booking_date <= '2024-01-31'
      GROUP BY dt.train_no, dt.coach_type
    ) inner_agg
    GROUP BY inner_agg.train_no
    ORDER BY total_passengers DESC
    LIMIT 30
  `);
  r.rows.forEach(row => console.log(row['QUERY PLAN']));
  console.log('\nTotal time:', Date.now() - t, 'ms');
  client.release();
  await pool.end();
}
test().catch(async e => { console.error(e.message); await pool.end(); });
