require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, statement_timeout: 0 });

async function main() {
  console.log('Creating covering index on crowd_daily_train...');
  console.log('(This includes total_passengers in the index so queries never touch the heap)\n');

  const t = Date.now();
  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cdt_covering
    ON crowd_daily_train (booking_date, train_no, coach_type)
    INCLUDE (total_passengers)
  `);
  console.log(`Done in ${((Date.now() - t) / 1000).toFixed(1)}s`);

  // Also run ANALYZE to update statistics
  console.log('\nRunning ANALYZE on crowd_daily_train...');
  const t2 = Date.now();
  await pool.query('ANALYZE crowd_daily_train');
  console.log(`Done in ${((Date.now() - t2) / 1000).toFixed(1)}s`);

  console.log('\n✅ Index created and statistics updated.');
  await pool.end();
}

main().catch(async e => {
  console.error('❌', e.message);
  await pool.end();
  process.exit(1);
});
