const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const dbPath = path.join(__dirname, '..', 'data', 'lost_found.db');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL in .env to run migration');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function ensureTable(client) {
  const create = `
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    itemName TEXT,
    location TEXT,
    description TEXT,
    contact TEXT,
    imageUrl TEXT,
    createdAt BIGINT,
    updatedAt BIGINT
  );
  `;
  await client.query(create);
}

async function migrate() {
  let client;
  try {
    const SQL = await initSqlJs();
    if (!fs.existsSync(dbPath)) {
      console.error('SQLite DB not found at', dbPath);
      process.exit(1);
    }
    const data = fs.readFileSync(dbPath);
    const db = new SQL.Database(data);

    const res = db.exec('SELECT * FROM items');
    if (!res || res.length === 0) {
      console.log('No rows to migrate');
      process.exit(0);
    }

    const cols = res[0].columns;
    const values = res[0].values;

    client = await pool.connect();
    await ensureTable(client);

    // Use transaction + prepared statement, batch commits every 500 rows
    await client.query('BEGIN');
    const insertText = `INSERT INTO items (id,type,itemName,location,description,contact,imageUrl,createdAt,updatedAt)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`;
    let count = 0;
    const batchSize = 500;

    for (const row of values) {
      const obj = {};
      cols.forEach((c, i) => (obj[c] = row[i] == null ? null : row[i]));

      const params = [
        obj.id,
        obj.type,
        obj.itemName,
        obj.location,
        obj.description,
        obj.contact,
        obj.imageUrl,
        obj.createdAt ? Number(obj.createdAt) : null,
        obj.updatedAt ? Number(obj.updatedAt) : null
      ];

      await client.query(insertText, params);
      count++;

      if (count % batchSize === 0) {
        await client.query('COMMIT');
        await client.query('BEGIN');
        console.log(`Migrated ${count} rows...`);
      }
    }

    await client.query('COMMIT');
    console.log(`Migration completed: ${count} rows migrated.`);
    db.close();
  } catch (err) {
    console.error('Migration error:', err);
    try { if (client) await client.query('ROLLBACK'); } catch {}
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
