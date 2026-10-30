const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Boost work_mem for large GROUP BY / sort operations (crowd analytics)
pool.on('connect', (client) => {
  client.query("SET work_mem = '256MB'").catch(() => {});
});

module.exports = pool;
