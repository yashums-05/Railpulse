const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check for blocking queries / locks on tickets
  const locks = await pool.query(`
    SELECT pid, state, wait_event_type, wait_event, query_start,
           LEFT(query, 100) AS query_snippet
    FROM pg_stat_activity
    WHERE state != 'idle'
      AND query ILIKE '%tickets%'
    ORDER BY query_start
  `);
  console.log('Active queries on tickets:');
  if (locks.rows.length === 0) console.log('  (none)');
  locks.rows.forEach(r => console.log(r));

  // Check current booking_date fill status
  const status = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE booking_date IS NOT NULL) AS filled,
      COUNT(*) FILTER (WHERE booking_date IS NULL)     AS nulls,
      COUNT(*)                                          AS total
    FROM tickets
    LIMIT 1
  `);
  const s = status.rows[0];
  console.log(`\nbooking_date: ${Number(s.filled).toLocaleString()} filled, ${Number(s.nulls).toLocaleString()} nulls, ${Number(s.total).toLocaleString()} total`);

  await pool.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
