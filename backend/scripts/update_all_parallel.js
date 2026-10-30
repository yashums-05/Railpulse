/**
 * update_all_parallel.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1 – Kill any stale UPDATE sessions on the tickets table
 * Step 2 – 4 parallel workers each update a non-overlapping id range,
 *           setting BOTH coach_type AND booking_date in one pass.
 * Step 3 – Refresh BOTH materialized views so the dashboard sees the new data:
 *             • mv_train_coach_crowd
 *             • mv_station_crowd
 * Step 4 – Print a verification summary from the DB (materialized views + raw table).
 *
 * Coach mapping (Indian Railways logic):
 *   ORDINARY  → 100 % Second Class (2S)
 *   SHATABDI  → 80 % Chair Car (CC)  · 20 % Executive Chair Car (EC)
 *   RAJDHANI  → 10 % First AC (1A)   · 25 % Second AC (2A) · 65 % Third AC (3A)
 *   SUPERFAST → 4% 1A · 15% 2A · 25% 3A · 50% Sleeper · 6% 2S
 *   EXPRESS   → 4% 1A · 12% 2A · 20% 3A · 52% Sleeper · 8% CC · 4% 2S
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

const WORKERS = 4;
const LO      = 1;
const HI      = 50_000_000;
const CHUNK   = Math.ceil((HI - LO + 1) / WORKERS);   // 12.5M each

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: WORKERS + 4,
  statement_timeout: 0,
  query_timeout:    0,
});

// ── Step 1: kill stale UPDATE sessions ───────────────────────────────────────
async function killStale() {
  const myPid = (await pool.query('SELECT pg_backend_pid() AS p')).rows[0].p;
  const res   = await pool.query(`
    SELECT pg_terminate_backend(pid), pid
    FROM pg_stat_activity
    WHERE state  != 'idle'
      AND pid    != $1
      AND query  ILIKE '%UPDATE tickets%'
  `, [myPid]);
  if (res.rows.length > 0)
    console.log(`  Killed ${res.rows.length} stale session(s): ${res.rows.map(r => r.pid).join(', ')}`);
  else
    console.log('  No stale sessions found.');
}

// ── Step 2: update one id range ───────────────────────────────────────────────
async function updateRange(workerId, lo, hi) {
  const client = await pool.connect();
  const t0 = Date.now();
  console.log(`  [W${workerId}] starting  ids ${lo.toLocaleString()} – ${hi.toLocaleString()}`);
  try {
    const res = await client.query(`
      UPDATE tickets t
      SET
        booking_date = DATE '2023-01-01'
                       + (ABS(hashtext(t.train_no || t.id::text)) % 1095) * INTERVAL '1 day',
        coach_type   = CASE
          WHEN UPPER(TRIM(td.train_type)) = 'ORDINARY'
            THEN 'Second Class (2S)'

          WHEN UPPER(TRIM(td.train_type)) = 'SHATABDI'
            THEN CASE
              WHEN (ABS(hashtext(t.id::text)) % 10) < 8 THEN 'Chair Car (CC)'
              ELSE 'Executive Chair Car (EC)'
            END

          WHEN UPPER(TRIM(td.train_type)) = 'RAJDHANI'
            THEN CASE
              WHEN (ABS(hashtext(t.id::text)) % 20) < 2  THEN 'First AC (1A)'
              WHEN (ABS(hashtext(t.id::text)) % 20) < 7  THEN 'Second AC (2A)'
              ELSE                                             'Third AC (3A)'
            END

          WHEN UPPER(TRIM(td.train_type)) = 'SUPERFAST'
            THEN CASE
              WHEN (ABS(hashtext(t.id::text)) % 100) < 4  THEN 'First AC (1A)'
              WHEN (ABS(hashtext(t.id::text)) % 100) < 19 THEN 'Second AC (2A)'
              WHEN (ABS(hashtext(t.id::text)) % 100) < 44 THEN 'Third AC (3A)'
              WHEN (ABS(hashtext(t.id::text)) % 100) < 94 THEN 'Sleeper (SL)'
              ELSE                                              'Second Class (2S)'
            END

          ELSE  -- EXPRESS / default
            CASE
              WHEN (ABS(hashtext(t.id::text)) % 100) < 4  THEN 'First AC (1A)'
              WHEN (ABS(hashtext(t.id::text)) % 100) < 16 THEN 'Second AC (2A)'
              WHEN (ABS(hashtext(t.id::text)) % 100) < 36 THEN 'Third AC (3A)'
              WHEN (ABS(hashtext(t.id::text)) % 100) < 88 THEN 'Sleeper (SL)'
              WHEN (ABS(hashtext(t.id::text)) % 100) < 96 THEN 'Chair Car (CC)'
              ELSE                                              'Second Class (2S)'
            END
        END
      FROM train_details td
      WHERE t.train_no = td.train_no
        AND t.id >= $1
        AND t.id <= $2
    `, [lo, hi]);
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  [W${workerId}] ✔ ${res.rowCount.toLocaleString()} rows updated  (${sec}s)`);
  } finally {
    client.release();
  }
}

// ── Step 3: refresh BOTH materialized views ──────────────────────────────────
async function refreshMV() {
  console.log('\n  Refreshing mv_train_coach_crowd …');
  await pool.query('REFRESH MATERIALIZED VIEW mv_train_coach_crowd');
  console.log('  ✔ mv_train_coach_crowd refreshed.');

  console.log('  Refreshing mv_station_crowd …');
  await pool.query('REFRESH MATERIALIZED VIEW mv_station_crowd');
  console.log('  ✔ mv_station_crowd refreshed.');
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== RailPulse tickets bulk update ===\n');

  console.log('[1/4] Killing stale sessions …');
  await killStale();

  console.log('\n[2/4] Starting 4 parallel workers …');
  const t0    = Date.now();
  const tasks = [];
  for (let i = 0; i < WORKERS; i++) {
    const lo = LO + i * CHUNK;
    const hi = Math.min(lo + CHUNK - 1, HI);
    tasks.push(updateRange(i + 1, lo, hi));
  }
  await Promise.all(tasks);
  console.log(`\n  All workers done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  console.log('\n[3/4] Refreshing materialized views …');
  await refreshMV();

  console.log('\n[4/4] Verification (DB) …');

  // ── 4a: coach_type distribution from mv_train_coach_crowd (DB view) ──
  const mvCoach = (await pool.query(`
    SELECT coach_type,
           SUM(total_passengers) AS total_pax,
           COUNT(DISTINCT train_no) AS trains
    FROM mv_train_coach_crowd
    GROUP BY coach_type
    ORDER BY total_pax DESC
  `)).rows;
  console.log('\n  [mv_train_coach_crowd] coach_type distribution:');
  mvCoach.forEach(r =>
    console.log(`    ${String(r.coach_type).padEnd(30)} pax: ${Number(r.total_pax).toLocaleString()}  trains: ${r.trains}`)
  );

  // ── 4b: station crowd summary from mv_station_crowd (DB view) ──
  const mvStation = (await pool.query(`
    SELECT COUNT(*) AS station_count,
           SUM(total_passengers) AS grand_total,
           MAX(total_passengers) AS max_pax,
           MIN(total_passengers) AS min_pax
    FROM mv_station_crowd
  `)).rows[0];
  console.log(`\n  [mv_station_crowd] stations: ${Number(mvStation.station_count).toLocaleString()}`);
  console.log(`    total passengers : ${Number(mvStation.grand_total).toLocaleString()}`);
  console.log(`    max per station  : ${Number(mvStation.max_pax).toLocaleString()}`);
  console.log(`    min per station  : ${Number(mvStation.min_pax).toLocaleString()}`);

  // ── 4c: raw tickets table booking_date sanity check ──
  const d = (await pool.query(`
    SELECT MIN(booking_date) AS earliest, MAX(booking_date) AS latest,
           COUNT(*) FILTER (WHERE booking_date IS NULL) AS nulls
    FROM tickets
  `)).rows[0];
  console.log(`\n  [tickets] booking_date: ${d.earliest} → ${d.latest}  |  NULLs: ${d.nulls}`);

  console.log('\n✅  All done — DB fully updated!');
  await pool.end();
}

main().catch(async err => {
  console.error('\n❌', err.message);
  await pool.end();
  process.exit(1);
});
