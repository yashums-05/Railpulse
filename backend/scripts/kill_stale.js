const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Kill all stale update sessions (not autovacuum, not this script)
  const myPid = await pool.query('SELECT pg_backend_pid() AS pid');
  const mine = myPid.rows[0].pid;

  const killed = await pool.query(`
    SELECT pg_terminate_backend(pid), pid, LEFT(query,60) AS q
    FROM pg_stat_activity
    WHERE state != 'idle'
      AND pid != $1
      AND query ILIKE '%UPDATE tickets%'
  `, [mine]);

  console.log(`Killed ${killed.rows.length} stale sessions:`);
  killed.rows.forEach(r => console.log(`  pid ${r.pid}`));

  // Now check booking_date fill status
  const s = (await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE booking_date IS NOT NULL) AS filled,
      COUNT(*) FILTER (WHERE booking_date IS NULL)     AS nulls
    FROM tickets
  `)).rows[0];

  console.log(`\nbooking_date: ${Number(s.filled).toLocaleString()} filled, ${Number(s.nulls).toLocaleString()} NULLs`);
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
