# Deployment Guide — Render Hosting

This guide explains how to deploy the entire **Job Ingestion Engine & Interactive Dashboard** on **Render** using Docker.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│               Render Cloud Service (:5000)             │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           React 19 Interactive Dashboard         │  │
│  │          (Served static from /public)            │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │ REST API                 │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │               Express API Server                 │  │
│  │          /api/jobs      /api/telemetry           │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │     Playwright Stealth Engine & Chromium         │  │
│  │     • 5-Identity Pool Rotation                   │  │
│  │     • Circuit Breaker Resilience                 │  │
│  │     • Selector Fallback (Drift Protection)       │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Deployment on Render

1. Push your repository to **GitHub**.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint** (or **Web Service**).
4. Connect your GitHub repository.
5. If using **Blueprint**, Render automatically reads `render.yaml`.
6. If configuring manually:
   - **Environment:** `Docker`
   - **Docker Context Directory:** `scraper`
   - **Dockerfile Path:** `scraper/Dockerfile`
   - **Instance Type:** `Free`
7. Click **Deploy Web Service**.

Once deployed, Render gives you a public URL (e.g. `https://job-scraper-backend.onrender.com`), where both the Interactive Dashboard and the REST API run seamlessly together on the same port!
