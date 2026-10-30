/**
 * create_daily_summary.js
 * Creates two pre-aggregated daily summary tables:
 *   crowd_daily_train   — (date, train_no, coach_type, total_passengers)
 *   crowd_daily_station — (date, station_code, total_passengers)
 *
 * Date-range queries hit these small tables instead of the 50M-row tickets table.
 * After initial build, run this once a day or after bulk updates.
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, statement_timeout: 0 });

async function main() {
  console.log('\n=== Building daily summary tables ===\n');

  // ── crowd_daily_train ──────────────────────────────────────────────────────
  console.log('[1/4] Creating crowd_daily_train table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crowd_daily_train (
      booking_date  DATE            NOT NULL,
      train_no      VARCHAR(20)     NOT NULL,
      coach_type    VARCHAR(50)     NOT NULL,
      total_passengers BIGINT       NOT NULL,
      PRIMARY KEY (booking_date, train_no, coach_type)
    )
  `);
  console.log('  ✔ Table exists.');

  console.log('[2/4] Populating crowd_daily_train...');
  let t0 = Date.now();
  await pool.query(`
    INSERT INTO crowd_daily_train (booking_date, train_no, coach_type, total_passengers)
    SELECT
      booking_date::date,
      train_no,
      COALESCE(coach_type, 'Unknown'),
      SUM(passenger_count)
    FROM tickets
    GROUP BY booking_date::date, train_no, COALESCE(coach_type, 'Unknown')
    ON CONFLICT (booking_date, train_no, coach_type)
    DO UPDATE SET total_passengers = EXCLUDED.total_passengers
  `);
  console.log(`  ✔ Done in ${((Date.now()-t0)/1000).toFixed(1)}s`);

  // ── crowd_daily_station ────────────────────────────────────────────────────
  console.log('[3/4] Creating crowd_daily_station table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crowd_daily_station (
      booking_date     DATE        NOT NULL,
      station_code     VARCHAR(20) NOT NULL,
      total_passengers BIGINT      NOT NULL,
      PRIMARY KEY (booking_date, station_code)
    )
  `);
  console.log('  ✔ Table exists.');

  console.log('[4/4] Populating crowd_daily_station...');
  t0 = Date.now();
  await pool.query(`
    INSERT INTO crowd_daily_station (booking_date, station_code, total_passengers)
    SELECT booking_date::date, station_code, SUM(pax)
    FROM (
      SELECT booking_date, source      AS station_code, SUM(passenger_count) AS pax
      FROM tickets GROUP BY booking_date, source
      UNION ALL
      SELECT booking_date, destination AS station_code, SUM(passenger_count) AS pax
      FROM tickets GROUP BY booking_date, destination
    ) sub
    GROUP BY booking_date::date, station_code
    ON CONFLICT (booking_date, station_code)
    DO UPDATE SET total_passengers = EXCLUDED.total_passengers
  `);
  console.log(`  ✔ Done in ${((Date.now()-t0)/1000).toFixed(1)}s`);

  // ── Indexes on the summary tables ─────────────────────────────────────────
  console.log('\nCreating indexes on summary tables...');
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cdt_date  ON crowd_daily_train   (booking_date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cdt_train ON crowd_daily_train   (train_no)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cds_date  ON crowd_daily_station (booking_date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cds_stn   ON crowd_daily_station (station_code)`);
  console.log('  ✔ Indexes created.');

  console.log('\n✅  Daily summary tables ready!\n');
  await pool.end();
}

main().catch(async e => {
  console.error('❌', e.message);
  await pool.end();
  process.exit(1);
});
