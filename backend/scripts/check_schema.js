require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const idx = await p.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'tickets'
    ORDER BY indexname
  `);
  console.log('\n--- tickets indexes ---');
  idx.rows.forEach(r => console.log(`  ${r.indexname}\n    ${r.indexdef}`));
  await p.end();
}
main().catch(e => { console.error(e.message); p.end(); });
