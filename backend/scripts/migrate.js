// ============================================================
// Migrate Script — Runs init-schema.sql against the database
// Run: npm run db:migrate
// ============================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function migrate() {
  console.log('Running database migration...\n');

  const sqlPath = path.join(__dirname, 'init-schema.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error('init-schema.sql not found at', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('Migration complete!');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Schema already exists — nothing to do.');
    } else {
      console.error('Migration failed:', err);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

migrate();
