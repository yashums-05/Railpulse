require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('\n=== Testing FIXED agg query (2024-01-01 to 2024-01-07) ===');
  const t0 = Date.now();
  const r = await pool.query(`
    SELECT inner_agg.train_no,
           SUM(inner_agg.coach_pax)                                   AS total_passengers,
           json_object_agg(inner_agg.coach_type, inner_agg.coach_pax) AS coach_breakdown
    FROM (
      SELECT dt.train_no,
             dt.coach_type,
             SUM(dt.total_passengers) AS coach_pax
      FROM crowd_daily_train dt
      WHERE dt.booking_date >= '2024-01-01'::date AND dt.booking_date <= '2024-01-07'::date
      GROUP BY dt.train_no, dt.coach_type
    ) inner_agg
    GROUP BY inner_agg.train_no
    ORDER BY total_passengers DESC
    LIMIT 30
  `);
  console.log('  Rows returned:', r.rows.length, '  Time:', Date.now() - t0, 'ms');
  if (r.rows.length > 0) {
    console.log('  Top train:', r.rows[0].train_no, 'pax:', r.rows[0].total_passengers);
    console.log('  Coach breakdown:', r.rows[0].coach_breakdown);
  }
  await pool.end();
}
main().catch(async e => { console.error(e.message); await pool.end(); });
