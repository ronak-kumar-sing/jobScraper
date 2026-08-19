# Project File Structure & Explanation (Step-by-Step Guide)

This document breaks down every major file in the project, explaining what it does and why it exists. This will help you navigate the codebase quickly and understand the flow of data.

---

## 1. The Core Scraper Backend (`scraper/src/`)
This is the heart of the ingestion pipeline. It's an Express server that coordinates headless browsers to fetch job data.

### `scraper/src/index.ts`
*   **What it does:** The main entry point for the backend server. It sets up the Express API, serves the frontend dashboard, and routes requests (like `/api/jobs?source=linkedin`) to the correct source adapter.
*   **Why it's important:** It's the central hub that connects the frontend UI to the scraping logic.

### Core Architecture (`scraper/src/core/`)
*   **`browserManager.ts`**
    *   **What it does:** Configures the Playwright headless browser with the `stealth` plugin. It manages the **Identity Pool** (rotating user agents, viewport sizes, and persistent sessions).
    *   **Why it's important:** This is the primary defense against bot detection. It ensures we don't look like an automated script.
*   **`resilience.ts`**
    *   **What it does:** Contains the **Circuit Breaker** and `resolveSelectorStrategy` logic. It tracks consecutive failures and handles fallback strategies when a website changes its HTML layout (Markup Drift).
    *   **Why it's important:** This makes the scraper robust. Instead of crashing when blocked or when HTML changes, it gracefully falls back or pauses.
*   **`rateLimiter.ts`**
    *   **What it does:** Implements the `PacedThrottle` and `humanPause` functions to add randomized delays (jitter) between actions.
    *   **Why it's important:** It mimics human reading speeds so we don't trip "velocity limits" (hitting a server too fast).
*   **`types.ts`**
    *   **What it does:** Defines the TypeScript shapes for our data (e.g., what a `JobListing` object must look like, what telemetry data contains).

### Source Adapters (`scraper/src/sources/`)
*   **`linkedin.ts`**
    *   **What it does:** Connects to LinkedIn's public "Guest API" to fetch jobs without needing to log in.
*   **`naukri.ts`**
    *   **What it does:** Uses the stealth Playwright browser to load Naukri, waits for React to render the job cards, and extracts the data.
*   **`mockboard.ts`**
    *   **What it does:** The scraper code specifically designed to target our local sandbox environment.

---

## 2. The Sandbox Target (`mock-target/`)
This is a fake job board designed to *act* like a real platform that hates bots.

*   **`server.js`**
    *   **What it does:** An Express server running on port 4000. It hosts fake job listings and intentionally tries to block bots by checking `navigator.webdriver`, enforcing rate limits, and randomly changing its HTML structure (Layout V1 to V2).
    *   **Why it's important:** It proves our scraper's stealth and resilience features actually work against real defensive techniques.

---

## 3. The Frontend Dashboard (`frontend/`)
This is the source code for the rich, interactive UI you see in your browser. It was built using Vite, React, Tailwind CSS, and shadcn/ui.

*   **`frontend/src/App.tsx`**
    *   **What it does:** The massive main React component. It contains the logic for the Live Discovery Studio, the Telemetry Radar, the Detection Surface Matrix, and the Sandbox Drift Simulator. It fetches data from our scraper's API.
*   **`frontend/src/index.css`**
    *   **What it does:** Contains the Tailwind configuration and the sleek Dark Mode color palette (using modern `oklch` colors) to make the app look premium.
*   **`frontend/vite.config.ts`**
    *   **What it does:** Configures the Vite development server to proxy requests to our backend (port 5000), allowing seamless local development.

*(Note: When you run `npm run build` inside the `frontend` folder, it compiles all of this code into standard HTML/JS/CSS and places it into `scraper/public/`, where the Express server can serve it directly).*

---

---

## 4. Vercel Serverless Endpoints (`api/`)
When deploying to Vercel, traditional Node background servers do not run continuously. Vercel automatically exposes files in the `api/` directory as serverless endpoints.

*   **`api/jobs.js`**
    *   **What it does:** Scrapes real LinkedIn and multi-source job postings in real-time on Vercel without heavy browser overhead.
*   **`api/telemetry.js`**
    *   **What it does:** Serves pipeline telemetry, circuit breaker metrics, and identity pool status to the dashboard.
*   **`api/health.js`**
    *   **What it does:** Health-check endpoint for Vercel deployment verification.

---

## 5. Documentation & Sandbox Files

*   **`README.md`**
    *   **What it does:** Project overview, how to run it, API documentation, and the **Defense & Ownership Guide** for your follow-up call.
*   **`DECISIONS.md`**
    *   **What it does:** A deep dive into the engineering tradeoffs made during the project.
*   **`real-platform-notes.md`**
    *   **What it does:** Analysis of how real platforms (LinkedIn, Naukri, Glassdoor) detect bots.
*   **`DEPLOYMENT.md`**
    *   **What it does:** 1-step Vercel deployment guide.
*   **`vercel.json`**
    *   **What it does:** Configuration routing `/api/*` to serverless endpoints and everything else to the Vite React dashboard.
*   **`simple-concept.js`**
    *   **What it does:** A stripped-down, pure Javascript file that simulates Identity Rotation, Pacing, and Circuit Breakers.
