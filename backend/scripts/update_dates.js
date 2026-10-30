/**
 * update_dates.js
 * Updates booking_date on the tickets table in batches of 2M rows.
 * Date range: 2023-01-01 → 2025-12-31 (1095 days)
 * Seeded by hashtext(train_no || id) for deterministic "random" spread.
 */

const db = require('../config/db');

async function main() {
  // Get id range
  const bounds = await db.query('SELECT MIN(id) AS lo, MAX(id) AS hi, COUNT(*) AS total FROM tickets');
  const { lo, hi, total } = bounds.rows[0];
  console.log(`Tickets: ${Number(total).toLocaleString()} rows  (id ${lo} – ${hi})`);

  const BATCH = 2_000_000;
  let start = parseInt(lo);
  const end   = parseInt(hi);
  let done = 0;
  const t0 = Date.now();

  while (start <= end) {
    const batchEnd = Math.min(start + BATCH - 1, end);

    await db.query(`
      UPDATE tickets
      SET booking_date =
        DATE '2023-01-01'
        + ( ABS(hashtext(train_no || id::text)) % 1095 ) * INTERVAL '1 day'
      WHERE id BETWEEN $1 AND $2
        AND booking_date IS NULL
    `, [start, batchEnd]);

    done += (batchEnd - start + 1);
    const pct = ((done / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  ✔ ids ${start}–${batchEnd}  |  ${pct}% done  |  ${elapsed}s elapsed`);

    start = batchEnd + 1;
  }

  // Verify
  const sample = await db.query(`
    SELECT MIN(booking_date) AS earliest, MAX(booking_date) AS latest,
           COUNT(*) FILTER (WHERE booking_date IS NULL) AS nulls
    FROM tickets
  `);
  const r = sample.rows[0];
  console.log(`\nDate range : ${r.earliest} → ${r.latest}`);
  console.log(`NULLs left : ${r.nulls}`);
  console.log('✅  Done!');
  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
