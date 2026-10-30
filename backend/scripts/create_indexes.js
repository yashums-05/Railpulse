require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, statement_timeout: 0 });

async function main() {
  const indexes = [
    // booking_date alone – helps date-range scans
    { name: 'idx_tickets_booking_date',
      sql:  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_booking_date
             ON tickets (booking_date)` },

    // composite: date + train_no – covers date-filtered train aggregations
    { name: 'idx_tickets_date_train',
      sql:  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_date_train
             ON tickets (booking_date, train_no)` },

    // composite: date + source – covers date-filtered station (source) aggregations
    { name: 'idx_tickets_date_source',
      sql:  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_date_source
             ON tickets (booking_date, source)` },

    // composite: date + destination – covers date-filtered station (destination) aggregations
    { name: 'idx_tickets_date_dest',
      sql:  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_date_dest
             ON tickets (booking_date, destination)` },
  ];

  for (const idx of indexes) {
    console.log(`\nCreating ${idx.name} ...`);
    const t0 = Date.now();
    await p.query(idx.sql);
    console.log(`  ✔ done in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }

  console.log('\n✅ All indexes created!');
  await p.end();
}

main().catch(async e => { console.error('❌', e.message); await p.end(); process.exit(1); });
