require('dotenv').config();
const { Client } = require('pg');

void (async () => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.warn('OK:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exitCode = 1;
  }
})();
