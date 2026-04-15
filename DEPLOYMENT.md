# Deployment: Vercel (frontend) + Render (backend)

This app uses **MongoDB Atlas**, a **Node/Express** API with **Socket.IO**, and a **Vite + React** frontend.

## 1. MongoDB Atlas

1. Create a cluster and database user.
2. Network access: allow `0.0.0.0/0` (or Render’s outbound IPs) for production.
3. Copy the connection string and replace `<password>`.

## 2. Cloudinary (recommended for uploads)

1. Create a Cloudinary account.
2. Copy **Cloud name**, **API key**, and **API secret** into Render env vars.

If Cloudinary is not configured, the API stores files under `/uploads` on the server disk (set `PUBLIC_API_URL` to your Render URL so links work).

## 3. Render (backend)

1. New **Web Service** → connect this repo (or deploy from Git).
2. **Root directory:** `backend`
3. **Build command:** `npm install`
4. **Start command:** `npm start`
5. **Environment variables:**

| Variable | Example |
|----------|---------|
| `PORT` | (set automatically by Render) |
| `MONGODB_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | long random string |
| `CLIENT_URL` | `https://your-app.vercel.app` (comma-separate multiple origins if needed) |
| `PUBLIC_API_URL` | `https://your-service.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |

6. After deploy, note the public URL, e.g. `https://attendance-api-xxxx.onrender.com`.

**Socket.IO:** The same Render service hosts HTTP + WebSocket. No separate port.

## 4. Vercel (frontend)

1. Import the repo; **root directory:** `frontend`.
2. **Framework:** Vite.
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. **Environment variable:**

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | `https://your-service.onrender.com` (no trailing slash) |

6. Redeploy after changing env vars.

The client uses `VITE_API_BASE_URL` for REST calls and Socket.IO.

## 5. CORS

`CLIENT_URL` on Render must include your Vercel production URL (and preview URLs if you use them), comma-separated:

`https://app.vercel.app,https://app-git-branch-user.vercel.app`

## 6. Local development

1. **Environment:** Ensure `backend/.env` exists with at least `JWT_SECRET`, `MONGODB_URI`, and `CLIENT_URL=http://localhost:5173`. You can copy `backend/.env.example` and adjust.
2. **MongoDB:** Either:
   - Run **Docker**: from the repo root, `docker compose up -d` (starts MongoDB on port `27017`), or
   - Use **MongoDB Atlas**: set `MONGODB_URI` to your Atlas connection string.
3. From the repo root: `npm install` then `npm run dev` (API on port **5000**, Vite on **5173** with `/api` proxied).

If the API exits with “Missing JWT_SECRET” or “Missing MONGODB_URI”, the `.env` file is missing or not loaded. If MongoDB connection fails, start Docker or fix the URI.

## 7. Health check

`GET https://your-api.onrender.com/api/health` should return `{ "ok": true, ... }`.
