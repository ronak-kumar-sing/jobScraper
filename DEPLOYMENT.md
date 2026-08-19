# Deployment Guide — Full-Stack Job Ingestion Engine

This guide walks you through deploying the **Frontend** on **Vercel** and the **Backend (Playwright Scraper Engine)** on **Render / Railway**, and connecting them seamlessly.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   Vercel (Frontend)                    │
│   • React 19 + Vite + Tailwind CSS v4 + shadcn/ui      │
│   • Fast global CDN delivery                           │
│   • Points API requests to Backend via VITE_API_URL    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS API Calls (/api/jobs)
┌───────────────────────────▼────────────────────────────┐
│              Render / Railway (Backend)                │
│   • Long-running Node.js + Express Container           │
│   • Playwright Headless Chromium + Stealth Engine      │
│   • Persistent Identity Pool & Circuit Breaker         │
└────────────────────────────────────────────────────────┘
```

---

## Step 1: Deploy the Backend (Render or Railway)

Because our scraper needs a real headless Chromium browser and persistent memory for the Circuit Breaker and Identity Pool, deploy it to a container platform like **Render** (free) or **Railway**.

### Option A: Deploy on Render (Recommended)
1. Push this repository to your **GitHub**.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name:** `job-scraper-backend`
   - **Environment:** `Docker` (or select **Blueprint** to use `render.yaml`)
   - **Docker Context Directory:** `scraper`
   - **Dockerfile Path:** `scraper/Dockerfile`
   - **Plan:** `Free`
5. Click **Deploy Web Service**.
6. Once deployed, copy your backend URL (e.g. `https://job-scraper-backend.onrender.com`).

---

## Step 2: Deploy the Frontend (Vercel)

Now deploy the frontend to Vercel and connect it to your newly deployed backend.

### Deploying via Vercel Web Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/new) and import your GitHub repository.
2. In the project configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and select `frontend` (or leave root since `vercel.json` is configured)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Expand **Environment Variables** and add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://job-scraper-backend.onrender.com` *(paste your backend URL from Step 1, without a trailing slash)*
4. Click **Deploy**.

---

## Step 3: Verify Your Live Deployment

Once both are live:
1. Open your Vercel deployment URL (e.g. `https://job-scraper-frontend.vercel.app`).
2. Go to the **Live Discovery** tab, enter a keyword (e.g., `React Developer`), and click **Launch Scrape Engine**.
3. Check the **Pipeline Telemetry** tab — you will see live latency, active identity rotation, and circuit breaker status streaming directly from your Render backend!

---

## 💡 Single-Host Deployment Alternative (All-in-One)

If you want both the frontend and backend running on a single URL without split deployment:
1. Simply deploy the `scraper/Dockerfile` to **Render** or **Railway**.
2. The Express server automatically serves the compiled production frontend at `/` and all API endpoints at `/api/*` on the exact same port!
