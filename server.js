// Campus Lost & Found Portal Backend
// Express + sql.js (Pure JavaScript SQLite) - No C++ compilation needed!

const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Postgres support: when DATABASE_URL is set, use Postgres via `db-pg.js`
const usePostgres = !!process.env.DATABASE_URL;
let dbPg;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

// Ensure uploads and data directories exist (configurable via env)
const UPLOADS_DIR_ENV = process.env.UPLOADS_DIR || '';
const DATA_DIR_ENV = process.env.DATA_DIR || '';

const uploadsDir = UPLOADS_DIR_ENV
  ? path.resolve(UPLOADS_DIR_ENV)
  : path.join(__dirname, 'uploads');
const dataDir = DATA_DIR_ENV ? path.resolve(DATA_DIR_ENV) : path.join(__dirname, 'data');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Serve uploaded files as static
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 1.5 * 1024 * 1024 }, // 1.5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
    } else {
      cb(null, true);
    }
  }
});

let db;
// Allow overriding DB filename/location via env (useful for hosts)
const DB_FILE_ENV = process.env.DB_FILE || '';
const dbPath = DB_FILE_ENV ? path.resolve(DB_FILE_ENV) : path.join(dataDir, 'lost_found.db');

// Initialize database (either sql.js SQLite or Postgres)
async function initDatabase() {
  try {
    if (usePostgres) {
      dbPg = require('./db-pg');
      await dbPg.init();
      console.log('✅ Postgres database initialized');
      return;
    }

    const SQL = await initSqlJs();
    
    // Load existing database or create new
    let data;
    if (fs.existsSync(dbPath)) {
      data = fs.readFileSync(dbPath);
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
    }

    // Create table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('lost', 'found')),
        itemName TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        contact TEXT NOT NULL,
        imageUrl TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);

    saveDatabase();
    console.log('✅ SQLite database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

// Save database to disk
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Utility: Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// Utility: Validate item data
function validateItem(data) {
  const errors = [];
  if (!data.itemName || typeof data.itemName !== 'string') errors.push('itemName required');
  if (!data.type || !['lost', 'found'].includes(data.type)) errors.push('type must be "lost" or "found"');
  if (!data.location || typeof data.location !== 'string') errors.push('location required');
  if (!data.contact || typeof data.contact !== 'string') errors.push('contact required');
  return errors;
}

// Routes

// GET /api/items - List all items (with optional filters)
app.get('/api/items', async (req, res) => {
  try {
    const { type, search, limit = 100, offset = 0 } = req.query;
    if (usePostgres) {
      const where = [];
      const params = [];
      let idx = 1;
      if (type && ['lost', 'found'].includes(type)) {
        where.push(`type = $${idx++}`);
        params.push(type);
      }
      if (search) {
        where.push(`(itemName ILIKE $${idx} OR location ILIKE $${idx+1} OR description ILIKE $${idx+2})`);
        const term = `%${search}%`;
        params.push(term, term, term);
        idx += 3;
      }
      params.push(parseInt(limit), parseInt(offset));
      const q = `SELECT * FROM items ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY createdAt DESC LIMIT $${idx++} OFFSET $${idx}`;
      const result = await dbPg.query(q, params);
      return res.json(result.rows);
    }

    // sqlite path
    let query = 'SELECT * FROM items WHERE 1=1';
    const params = [];

    if (type && ['lost', 'found'].includes(type)) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (itemName LIKE ? OR location LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// GET /api/items/:id - Get a single item
app.get('/api/items/:id', async (req, res) => {
  try {
    if (usePostgres) {
      const result = await dbPg.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
      return res.json(result.rows[0]);
    }

    const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
    stmt.bind([req.params.id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      res.json(row);
    } else {
      stmt.free();
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// POST /api/items - Create a new item
app.post('/api/items', upload.single('image'), async (req, res) => {
  try {
    const { type, itemName, location, description, contact } = req.body;

    // Validate
    const errors = validateItem({ type, itemName, location, contact });
    if (errors.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ errors });
    }

    const id = generateId();
    const now = Date.now();
    let imageUrl = null;

    // If file uploaded, rename and keep
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const newName = `${id}${ext}`;
      const newPath = path.join(uploadsDir, newName);
      fs.renameSync(req.file.path, newPath);
      imageUrl = `/uploads/${newName}`;
    }

    if (usePostgres) {
      const q = `INSERT INTO items (id,type,itemName,location,description,contact,imageUrl,createdAt,updatedAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
      await dbPg.query(q, [id, type, itemName, location, description || '', contact, imageUrl, now, now]);
      return res.status(201).json({ id, type, itemName, location, description, contact, imageUrl, createdAt: now, updatedAt: now });
    }

    const stmt = db.prepare(`
      INSERT INTO items (id, type, itemName, location, description, contact, imageUrl, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.bind([id, type, itemName, location, description || '', contact, imageUrl, now, now]);
    stmt.step();
    stmt.free();
    saveDatabase();

    res.status(201).json({ id, type, itemName, location, description, contact, imageUrl, createdAt: now, updatedAt: now });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to create item', details: err.message });
  }
});

// DELETE /api/items/:id - Delete an item
app.delete('/api/items/:id', async (req, res) => {
  try {
    if (usePostgres) {
      // fetch imageUrl
      const r = await dbPg.query('SELECT imageUrl FROM items WHERE id = $1', [req.params.id]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
      const row = r.rows[0];
      if (row.imageurl) {
        const filePath = path.join(__dirname, row.imageurl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await dbPg.query('DELETE FROM items WHERE id = $1', [req.params.id]);
      return res.json({ success: true, message: 'Item deleted' });
    }

    const stmt = db.prepare('SELECT imageUrl FROM items WHERE id = ?');
    stmt.bind([req.params.id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Item not found' });
    }

    const row = stmt.getAsObject();
    stmt.free();

    // Delete image file if exists
    if (row.imageUrl) {
      const filePath = path.join(__dirname, row.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from DB
    const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?');
    deleteStmt.bind([req.params.id]);
    deleteStmt.step();
    deleteStmt.free();
    saveDatabase();

    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item', details: err.message });
  }
});

// PATCH /api/items/:id - Update an item
app.patch('/api/items/:id', async (req, res) => {
  try {
    const { description } = req.body;
    const now = Date.now();

    if (description === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (usePostgres) {
      await dbPg.query('UPDATE items SET description = $1, updatedAt = $2 WHERE id = $3', [description, now, req.params.id]);
      return res.json({ success: true, message: 'Item updated' });
    }

    const stmt = db.prepare('UPDATE items SET description = ?, updatedAt = ? WHERE id = ?');
    stmt.bind([description, now, req.params.id]);
    stmt.step();
    stmt.free();
    saveDatabase();

    res.json({ success: true, message: 'Item updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item', details: err.message });
  }
});

// POST /api/items/:id/reveal-contact - Reveal contact
app.post('/api/items/:id/reveal-contact', (req, res) => {
  try {
    if (usePostgres) {
      dbPg.query('SELECT contact FROM items WHERE id = $1', [req.params.id]).then(r => {
        if (r.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
        return res.json({ contact: r.rows[0].contact });
      }).catch(err => res.status(500).json({ error: 'Database error', details: err.message }));
      return;
    }

    const stmt = db.prepare('SELECT contact FROM items WHERE id = ?');
    stmt.bind([req.params.id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      res.json({ contact: row.contact });
    } else {
      stmt.free();
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lost & Found API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server after database is initialized
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Lost & Found API running on http://localhost:${PORT}`);
    console.log(`📝 POST /api/items - Create item with image`);
    console.log(`🔍 GET /api/items - List items`);
    console.log(`⚙️  GET /health - Health check\n`);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Ensure DB is saved before exit
process.on('SIGINT', () => {
  try {
    if (db) saveDatabase();
  } catch (e) {
    console.error('Error saving DB during shutdown', e);
  }
  process.exit(0);
});
