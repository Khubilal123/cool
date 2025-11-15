# 🚀 Express + SQLite Backend - Setup Summary

Your backend is ready! Here's how to get started:

## What You Got
✅ **server.js** — Full Express + SQLite REST API
✅ **main-api.js** — Updated frontend that calls the API
✅ **BACKEND.md** — Complete API documentation
✅ **package.json** — Updated with all dependencies and scripts
✅ **.env** — Configuration file
✅ **sqlite3** database (auto-created on first run)

## Quick Start (3 Steps)

### 1. Install dependencies
```powershell
npm install
```

### 2. Switch frontend to use API (in index.html)
Change this line:
```html
<script src="main.js"></script>
```
To:
```html
<script src="main-api.js"></script>
```

### 3. Run everything together
```powershell
npm run dev
```
- Frontend: http://localhost:8080
- Backend: http://localhost:3001

## What Works
- ✅ Report lost/found items (saved to database)
- ✅ Upload images with items (stored in `uploads/` folder)
- ✅ Search and filter items
- ✅ Mask contact info (reveal on click)
- ✅ Mark items as resolved (delete from DB)
- ✅ Data persists across browser reloads (backend!)
- ✅ Multiple users can see same items

## File Structure
```
project/
├── server.js          ← Your backend (Express + SQLite)
├── main-api.js        ← Frontend that uses the API
├── main.js            ← Old frontend (uses localStorage)
├── index.html         ← Update script tag to use main-api.js
├── data/
│   └── lost_found.db  ← Database (auto-created)
├── uploads/           ← Uploaded images
└── BACKEND.md         ← Full API documentation
```

## API Endpoints
All requests to: `http://localhost:3001/api`

- `POST /items` — Add item (with image upload)
- `GET /items` — List all items (with search/filter)
- `GET /items/:id` — Get single item
- `DELETE /items/:id` — Remove item
- `POST /items/:id/reveal-contact` — Reveal contact

See **BACKEND.md** for full details and examples.

## Next Steps
1. Run `npm install` and `npm run dev`
2. Test adding items, uploading images, searching
3. Check that data persists when you reload the page
4. For production: set `NODE_ENV=production` in `.env`

## Running Backend Separately
If you want to develop frontend and backend separately:
```powershell
npm run server        # Just backend on port 3001
npm start             # Just frontend on port 8080
```

## Notes
- Images are stored in the `uploads/` folder (not in DB as base64)
- Database is SQLite, stored in `data/lost_found.db`
- To reset the database, delete the file and restart the server
- For production, migrate to PostgreSQL for better scaling

Enjoy! 🎉
