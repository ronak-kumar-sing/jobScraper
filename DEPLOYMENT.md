# Deployment Guide — Vercel Monorepo

Deploying this project is a 1-step process on **Vercel**. Both the React Frontend and the Serverless Ingestion Engine run together on the same domain.

---

## 🚀 1-Step Deployment on Vercel

1. Push this repository to your **GitHub**.
2. Go to the [Vercel Dashboard](https://vercel.com/new) and import your repository.
3. Keep the default settings:
   - **Framework Preset:** `Other` (or `Vite`)
   - **Root Directory:** `./`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Output Directory:** `frontend/dist`
4. Click **Deploy**.

---

## 🛠️ How it works on Vercel

* **Frontend:** Vercel builds the React app from `frontend/` and serves it on `/`.
* **Serverless Backend (`api/`):** Vercel automatically exposes the files in the `api/` directory as serverless endpoints:
  - `api/jobs.js` → `https://your-app.vercel.app/api/jobs`
  - `api/telemetry.js` → `https://your-app.vercel.app/api/telemetry`
  - `api/health.js` → `https://your-app.vercel.app/health`

No Docker, external servers, or extra configuration needed!
