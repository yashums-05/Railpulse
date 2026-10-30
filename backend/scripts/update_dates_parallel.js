/**
 * update_dates_parallel.js  v2
 * 4 parallel workers on strictly non-overlapping id ranges.
 * Deadlock-safe: no row is touched by more than one worker.
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

const WORKERS = 4;
const LO      = 1;
const HI      = 50_000_000;
const CHUNK   = Math.ceil((HI - LO + 1) / WORKERS); // 12.5M each

// Generous pool so each worker gets its own connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: WORKERS + 2,
  statement_timeout: 0,   // no timeout
  query_timeout:    0,
});

async function updateRange(workerId, lo, hi) {
  const client = await pool.connect();
  const t0 = Date.now();
  console.log(`  [W${workerId}] starting  ids ${lo.toLocaleString()} – ${hi.toLocaleString()}`);
  try {
    const res = await client.query(`
      UPDATE tickets
      SET booking_date =
        DATE '2023-01-01'
        + ( ABS(hashtext(train_no || id::text)) % 1095 ) * INTERVAL '1 day'
      WHERE id >= $1
        AND id <= $2
    `, [lo, hi]);
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  [W${workerId}] ✔ ${res.rowCount.toLocaleString()} rows  (${sec}s)`);
  } finally {
    client.release();
  }
}

async function main() {
  console.log(`\nParallel booking_date update — ${WORKERS} workers\n`);
  const t0 = Date.now();

  const tasks = [];
  for (let i = 0; i < WORKERS; i++) {
    const lo = LO + i * CHUNK;
    const hi = Math.min(lo + CHUNK - 1, HI);
    tasks.push(updateRange(i + 1, lo, hi));
  }

  await Promise.all(tasks);

  const r = (await pool.query(`
    SELECT MIN(booking_date) AS earliest,
           MAX(booking_date) AS latest,
           COUNT(*) FILTER (WHERE booking_date IS NULL) AS nulls
    FROM tickets
  `)).rows[0];

  console.log(`\nDate range : ${r.earliest}  →  ${r.latest}`);
  console.log(`NULLs left : ${r.nulls}`);
  console.log(`Total time : ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log('✅  Done!');
  await pool.end();
}

main().catch(async err => {
  console.error('❌', err.message);
  await pool.end();
  process.exit(1);
});
