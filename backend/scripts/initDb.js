require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const sqlPath = path.join(__dirname, '..', 'db', 'init.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Please set DATABASE_URL in your environment (.env) before running this script.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

(async () => {
  try {
    console.log('Initializing database...');
    await pool.query(sql);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing DB:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
