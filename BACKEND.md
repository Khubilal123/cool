# Campus Lost & Found Portal - Backend Setup Guide

## Overview
This backend is built with **Express.js** and **SQLite**. It provides REST API endpoints to store, retrieve, and manage lost & found items with image support.

## Quick Start

### 1. Install Dependencies
```powershell
npm install
```

### 2. Run Backend Only
```powershell
npm run server
```
Backend starts on `http://localhost:3001`

### 3. Run Frontend + Backend Together (Recommended)
```powershell
npm run dev
```
This starts both:
- Frontend (live-server): `http://localhost:8080`
- Backend (Express): `http://localhost:3001`

### 4. Switch Frontend to Use API
By default, the frontend uses `main.js` (localStorage). To use the backend API:

In `index.html`, change:
```html
<script src="main.js"></script>
```
to:
```html
<script src="main-api.js"></script>
```

Save and reload the page. The frontend will now communicate with the backend.

---

## API Endpoints

### Base URL: `http://localhost:3001/api`

#### **GET /items** - List all items
Query parameters (optional):
- `type` - Filter by "lost" or "found"
- `search` - Search by item name, location, or description
- `limit` - Number of items per page (default: 100)
- `offset` - Pagination offset (default: 0)

**Example:**
```bash
GET http://localhost:3001/api/items?type=lost&search=keys&limit=20
```

**Response:**
```json
[
  {
    "id": "1m5x9a2b3c",
    "type": "lost",
    "itemName": "Silver Keys",
    "location": "Library",
    "description": "Car keys with blue keychain",
    "contact": "9876543210",
    "imageUrl": "/uploads/1m5x9a2b3c.jpg",
    "createdAt": 1731600000000,
    "updatedAt": 1731600000000
  }
]
```

---

#### **GET /items/:id** - Get a specific item
**Example:**
```bash
GET http://localhost:3001/api/items/1m5x9a2b3c
```

**Response:** Single item object (see above)

---

#### **POST /items** - Create a new item
**Content-Type:** `multipart/form-data`

**Form Fields:**
- `type` (required) - "lost" or "found"
- `itemName` (required) - Name of the item
- `location` (required) - Location where lost/found
- `description` (optional) - Details about the item
- `contact` (required) - Phone, email, or other contact info
- `image` (optional) - Image file (max 1.5 MB, image/* only)

**Example (cURL):**
```bash
curl -X POST http://localhost:3001/api/items \
  -F "type=lost" \
  -F "itemName=Blue Backpack" \
  -F "location=Cafeteria" \
  -F "description=Dark blue with laptop inside" \
  -F "contact=9876543210" \
  -F "image=@path/to/image.jpg"
```

**Response:** Created item object (201 Created)

---

#### **DELETE /items/:id** - Delete an item
**Example:**
```bash
DELETE http://localhost:3001/api/items/1m5x9a2b3c
```

**Response:**
```json
{
  "success": true,
  "message": "Item deleted"
}
```

---

#### **PATCH /items/:id** - Update item description
**Content-Type:** `application/json`

**Body:**
```json
{
  "description": "Updated description"
}
```

**Response:** Success message

---

#### **POST /items/:id/reveal-contact** - Reveal hidden contact
**Example:**
```bash
POST http://localhost:3001/api/items/1m5x9a2b3c/reveal-contact
```

**Response:**
```json
{
  "contact": "9876543210"
}
```

---

#### **GET /health** - Health check
**Example:**
```bash
GET http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Lost & Found API is running"
}
```

---

## Database Schema

### `items` Table
```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('lost', 'found')),
  itemName TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  contact TEXT NOT NULL,
  imageUrl TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

**Fields:**
- `id` - Unique identifier (auto-generated)
- `type` - "lost" or "found"
- `itemName` - Name of the item
- `location` - Where it was lost/found
- `description` - Optional details
- `contact` - User's phone/email
- `imageUrl` - Path to uploaded image (if any)
- `createdAt` - Timestamp in milliseconds
- `updatedAt` - Last update timestamp

---

## File Structure
```
campus-lost-found-portal/
├── server.js              # Express backend
├── main.js                # Frontend with localStorage
├── main-api.js            # Frontend with API integration
├── index.html             # HTML (same for both)
├── src/
│   ├── css/style.css
│   └── js/lib.js
├── data/
│   └── lost_found.db      # SQLite database (auto-created)
├── uploads/               # Uploaded images (auto-created)
├── package.json
├── .env                   # Environment config
├── .env.example
└── BACKEND.md             # This file
```

---

## Configuration (.env)
```
PORT=3001
NODE_ENV=development
API_BASE_URL=http://localhost:3001
```

**Environment Variables:**
- `PORT` - Backend server port (default: 3001)
- `NODE_ENV` - "development" or "production"
- `API_BASE_URL` - Frontend's API base URL

---

## Switching Between Frontend Modes

### Mode 1: localStorage (No Backend Required)
- Use `main.js` in `index.html`
- Run: `npm start` (frontend only)
- Data persists only in the browser

### Mode 2: API + Express Backend (Recommended)
- Use `main-api.js` in `index.html`
- Run: `npm run dev` (both frontend + backend)
- Data persists in SQLite database
- Shared across users

---

## Production Deployment

### For Small Campus (Single Server)
1. Deploy Express backend on a VPS (DigitalOcean, Linode, AWS EC2)
2. Deploy frontend as static files (GitHub Pages, Netlify, same VPS)
3. Update `API_BASE_URL` in frontend to point to backend URL

### For Scaling (Multiple Servers)
Migrate to PostgreSQL:
1. Install PostgreSQL server
2. Update `server.js` to use `pg` package instead of `sqlite3`
3. Update connection string in `.env`
4. Scale horizontally (load balancer, multiple Express instances)

### Security Recommendations
- Add authentication (JWT, OAuth)
- Validate and sanitize all inputs
- Rate-limit endpoints
- Use HTTPS in production
- Add CORS restrictions to specific domains
- Hash contact info or store encrypted
- Add email verification for contact reveal

---

## Troubleshooting

### Backend won't start
```powershell
# Check if port 3001 is already in use
netstat -ano | findstr :3001
# Kill the process or change PORT in .env
```

### Images not uploading
- Check file size (max 1.5 MB)
- Verify `uploads/` folder exists (auto-created)
- Check file permissions

### Database locked
- Make sure only one instance is running
- Delete `data/lost_found.db` and restart (loses data)

### CORS errors in browser console
- Ensure backend is running on port 3001
- Check `API_BASE_URL` in `main-api.js` matches your setup
- In production, configure CORS for your domain

---

## Testing the API

### Using Postman or Insomnia
1. Import the API endpoints above
2. Test each endpoint with sample data
3. Verify responses

### Using cURL (PowerShell)
```powershell
# Health check
curl http://localhost:3001/health

# List all items
curl http://localhost:3001/api/items

# Create item (no image)
$body = @{
  type = "lost"
  itemName = "Glasses"
  location = "Classroom 101"
  contact = "9876543210"
} | ConvertTo-Json

curl -Method POST -Uri http://localhost:3001/api/items `
  -Body $body `
  -ContentType "application/json"
```

---

## Next Steps
1. ✅ Run `npm run dev` and test the app
2. 📝 Add authentication (login/signup)
3. 🔍 Add email notifications when items are found/claimed
4. 📱 Deploy to production on a VPS
5. 🔐 Migrate to PostgreSQL for scalability
