require('dotenv').config({ path: '../../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check tickets indexes
  const idx = await pool.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'tickets' ORDER BY indexname
  `);
  console.log('\n=== Tickets Indexes ===');
  if (idx.rows.length === 0) console.log('  (none)');
  idx.rows.forEach(r => console.log(' ', r.indexname));

  // Check crowd_daily_train row count
  const cnt = await pool.query(`SELECT COUNT(*) AS cnt FROM crowd_daily_train`);
  console.log('\n=== crowd_daily_train rows ===');
  console.log(' ', cnt.rows[0].cnt);

  // Check crowd_daily_station row count
  const cnt2 = await pool.query(`SELECT COUNT(*) AS cnt FROM crowd_daily_station`);
  console.log('\n=== crowd_daily_station rows ===');
  console.log(' ', cnt2.rows[0].cnt);

  await pool.end();
}
main().catch(async e => { console.error(e.message); await pool.end(); });
