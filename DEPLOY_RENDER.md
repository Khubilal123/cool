Render Deployment (GitHub integration)

Quick summary
- This repo contains a Node/Express backend (`server.js`) and static frontend files.
- Recommended: deploy the backend as a Render "Web Service" and either serve the frontend from the same service or use Render Static Site / Vercel.

Steps to deploy backend on Render (recommended)

1. Push your repo to GitHub (if not already done):

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\campus-lost-found-portal"
git add .
git commit -m "Prepare repo for Render deploy"
git push origin main
```

2. Create a Render account and connect GitHub.

3. Create a new **Web Service** in Render:
- Repo: choose `campus-lost-found-portal`
- Branch: `main`
- Environment: `Node` (default)
- Build Command: `npm install`
- Start Command: `npm start`  # uses `node server.js` from `package.json`

4. Configure persistent storage for SQLite and uploads
- In Render, under the Web Service's "Settings" enable a **Persistent Disk** (if you want to keep `data/lost_found.db` and uploaded files across restarts).
- If you enabled persistent disk, set these environment variables in Render (Dashboard → Environment):
  - `DB_FILE` = `/var/data/lost_found.db`
  - `UPLOADS_DIR` = `/var/data/uploads`
  - (Optional) `DATA_DIR` = `/var/data`

If you don't enable persistent disk, the filesystem is ephemeral — files will be lost between deploys. For production, prefer a managed DB (Postgres) and an object store (S3/DigitalOcean Spaces/Supabase Storage) instead of local files.

5. Add other env vars in Render as needed
- `NODE_ENV` = `production`
- Any storage or DB credentials if switching to managed services (e.g., `DATABASE_URL`, `S3_KEY`, `S3_SECRET`, `S3_BUCKET`, `S3_REGION`).

6. Health check & logs
- Render will expose the service URL. Use `/health` to verify the service is running.
- Check live logs in Render to debug startup issues.

Alternative: Frontend on Render Static Site (or Vercel)
- You can create a separate Render "Static Site" using the same GitHub repo and point the publish directory to the repo root (or a `dist/` folder if you add a build step). Static sites are served from CDN.

Notes & recommendations
- For production scale, migrate from SQLite to a managed Postgres and from file-based uploads to S3/Spaces.
- Keep secrets out of Git; use Render environment variables or GitHub Secrets for CI.
- The server supports overriding `UPLOADS_DIR`, `DATA_DIR`, and `DB_FILE` via environment variables.

If you'd like, I can:
- Add a small `render.yaml` manifest for infrastructure-as-code on Render.
- Convert persistence to Postgres and uploads to S3, then update server code and env examples.

