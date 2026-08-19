# Job Ingestion Pipeline — Part 1 Submission

## What this is

A **production-grade, multi-source job ingestion pipeline** with a premium interactive dashboard:

1. **`mock-target/`** — a sandbox job board with real anti-bot defenses: JS fingerprint
   challenge, session gating, per-IP rate limiting, User-Agent sniffing, and
   markup that intentionally drifts every 20 requests.
2. **`scraper/`** — the ingestion pipeline + web dashboard. Three live source adapters
   (LinkedIn, Naukri, Mock Sandbox), stealth headless browser, 5-identity rotation pool,
   human-like request pacing, selector-fallback resilience, circuit breaker for graceful
   degradation, and a real-time telemetry dashboard.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│           Premium Web Dashboard (:5000)              │
│   Live Search · Source Filtering · Telemetry         │
└────────────┬─────────────────────────────────────────┘
             │ REST API
┌────────────▼─────────────────────────────────────────┐
│              Express API Server                       │
│   /api/jobs?source=&q=&loc=   /api/telemetry         │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│           Source Adapter Registry                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ LinkedIn  │  │  Naukri   │  │  Mock Sandbox    │   │
│  │Guest API  │  │ Stealth  │  │ Self-hosted      │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│          Core Infrastructure                          │
│  IdentityPool · StealthBrowser · PacedThrottle       │
│  CircuitBreaker · SelectorFallback · withRetry       │
└──────────────────────────────────────────────────────┘
```

### Sources

| Source | Strategy | Selectors |
|--------|----------|-----------|
| **LinkedIn** | Public guest API endpoint (no auth) | `base-card`, `base-search-card`, `data-entity-urn` |
| **Naukri** | Stealth Playwright full render | `srp-jobtuple-wrapper`, `cust-job-tuple`, `data-job-id` |
| **Mock Sandbox** | JS challenge → verified session | `job-card` / `listing` (drifts every 20 requests) |

## Running it locally

```bash
# Terminal 1 — the sandbox target (optional, only needed for mock source)
cd mock-target
npm install
npm start                # http://localhost:4000

# Terminal 2 — the scraper + dashboard
cd scraper
npm install
npx playwright install chromium
npm run dev              # http://localhost:5000

# Open the dashboard
open http://localhost:5000

# Or use the API directly:
curl "http://localhost:5000/api/jobs?source=linkedin&q=React&loc=India"
curl "http://localhost:5000/api/jobs?source=naukri&q=Python&loc=Bengaluru"
curl "http://localhost:5000/api/jobs?source=mock"
curl "http://localhost:5000/api/jobs?source=all&q=Node.js"
curl "http://localhost:5000/api/telemetry"
```

## API Reference

### `GET /api/jobs`

| Param | Default | Description |
|-------|---------|-------------|
| `source` | `all` | `all`, `linkedin`, `naukri`, `mock` |
| `q` | `Software Engineer` | Search keyword |
| `loc` | `India` | Location filter |
| `limit` | `20` | Max results per source |

### `GET /api/telemetry`
Returns circuit breaker status, identity pool states, last scrape stats.

### `GET /health`
Health check endpoint.

## How this maps to the four design-doc requirements

1. **Detection surface** → `mock-target/server.js` comments +
   `real-platform-notes.md` §1 + `browserManager.ts` stealth evasions
2. **Ingestion strategy** → `browserManager.ts` (identity/proxy rotation,
   session persistence, webdriver cloaking) + `rateLimiter.ts` (jittered pacing)
   + `linkedin.ts` (guest API) + `naukri.ts` (stealth browser rendering)
3. **Resilience** → `resilience.ts` (multi-selector fallback, retry+backoff,
   circuit breaker, safeText/safeAttr helpers)
4. **Where you'd stop** → `real-platform-notes.md` §4 + `DECISIONS.md`

## Dashboard Features

- **Live Job Search** — search by keyword/location across all sources
- **Source Filtering** — filter by LinkedIn, Naukri, or Sandbox
- **Real-time Telemetry** — circuit breaker, identity pool, scrape latency
- **Dark/Light Theme** — persistent preference
- **Responsive** — 390px mobile to 1440px+ desktop
- **Easter Egg** — try the Konami Code (↑↑↓↓←→←→BA)

## Deploying

Both are plain Node/Express apps — Render or Railway free tier works for
either. Deploy `mock-target` first, then set `MOCK_TARGET_URL` as an env
var on the `scraper` deployment to point at it.

## Honest limitations (for DECISIONS.md)

- No real residential proxy pool wired in — see DECISIONS.md §2.
- CAPTCHA handling is a stub (`CircuitBreaker` marks the identity as failed
  and moves on) rather than a solver — intentional, see the ethics section.
- TLS/JA3 fingerprinting isn't modeled in the sandbox; flagged as a known
  gap rather than pretending it's covered.
- LinkedIn guest API returns max 25 results per page and may rate-limit
  under heavy use without proxy rotation.
- Naukri's DOM selectors may drift — the 3-level fallback strategy provides
  resilience but will eventually need maintenance.

## Defense & Ownership Guide (For Follow-up Call)

This section is designed to help you defend the technical decisions during your review call.

### 1. Systems Thinking: Surviving Mid-Run Blocks
**Question:** *Does the ingestion design survive a source detecting and blocking it mid-run?*

**Answer:** Yes, absolutely. We use a **Circuit Breaker** and an **Identity Pool**.
*   **How it works:** Imagine you have 5 different browser profiles (Identities). If LinkedIn blocks Identity #1 (returns a 429 status or a CAPTCHA), the code doesn't crash. It logs a failure for that identity, puts it in "cooldown", and tries the next request with Identity #2. 
*   **The Circuit Breaker:** If the website blocks us 3 times in a row across *all* identities, it means our IP or general pattern is burned. The "Circuit Breaker" trips open. Instead of hammering the server and getting permanently IP-banned, the system gracefully pauses scraping for 30 seconds to cool down. 

### 2. Honesty: Real Data Over Fake Polish
**Question:** *Did you resist the fake-testimonial trap? Real screenshots/data over invented polish?*

**Answer:** Yes. Everything in the dashboard is real.
*   The "Scrape Now" button actually triggers a live HTTP/Playwright request to LinkedIn and Naukri. 
*   The jobs you see are jobs that exist right now on those platforms. 
*   The latency numbers (e.g., "5.4s") are real measurements of how long the headless browser took to boot and render. 
*   If you type a garbage keyword, you get zero results. If Naukri blocks us, the dashboard circuit breaker turns red. There is zero `Lorem Ipsum` or mocked successful data.

### 3. Defending Engineering Decisions
If asked why you chose this specific stack:

*   **Why Playwright instead of just `fetch()` or `axios` for Naukri?**
    *   *Defense:* Naukri is a React Single Page Application (SPA). If you `curl` or `fetch` it, you get a blank page because the jobs are rendered by Javascript *after* the page loads. You *must* use a real browser engine to wait for the DOM to render.
*   **Why `puppeteer-extra-plugin-stealth`?**
    *   *Defense:* By default, headless browsers leak a variable called `navigator.webdriver = true`. Anti-bot systems look for this and block you instantly. The stealth plugin modifies the browser fingerprint to look like a normal human user (spoofing plugins, languages, and WebGL signatures).
*   **Why have multiple selectors for the same thing? (Selector Fallback)**
    *   *Defense:* Websites change their CSS class names to break scrapers (Markup Drift). If Naukri changes `.job-card` to `.tuple-v2` overnight, a normal scraper crashes. Our system tries `.job-card`, and if it finds 0 elements, it automatically falls back to `.tuple-v2` instead of failing.
*   **Why the Express backend?**
    *   *Defense:* Headless browsers are heavy. If we did this in serverless functions (like Vercel/Next.js API routes), it would take 5 seconds just to boot the browser for *every* request. A long-running Express server lets us keep the browser "warm" and reuse contexts, making it much faster.

### 4. Simple Concept Sandbox (Plain Javascript)
If you want to understand *how* the complex Typescript code works using just basic Javascript, look at `simple-concept.js` in the root folder. It strips away all the complex Playwright and Express code and uses basic arrays, loops, and `setTimeout` to demonstrate exactly how Identity Rotation, Jittered Pacing, Circuit Breaking, and Selector Fallbacks work in plain English. Run it with `node simple-concept.js`!
