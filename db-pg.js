const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Set it to use Postgres mode.');
}

const pool = new Pool({ connectionString });

async function init() {
  // Create table if not exists
  const create = `
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('lost','found')),
      itemName TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT,
      contact TEXT NOT NULL,
      imageUrl TEXT,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL
    );
  `;
  await pool.query(create);
}

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

async function close() {
  await pool.end();
}

module.exports = { init, query, close, pool };
