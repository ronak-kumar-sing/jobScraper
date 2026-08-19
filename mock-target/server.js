/**
 * MOCK JOB BOARD — a sandbox target you control.
 *
 * This simulates the real defenses used by sites like Naukri/LinkedIn/Indeed
 * so you can build + demo an ingestion pipeline that handles them, without
 * ever touching a real account or violating a real ToS. This IS the "sandbox
 * you control" the assessment explicitly allows.
 *
 * Defenses implemented (each maps to a real technique):
 *   1. Session gating       -> must visit "/" and carry a valid session cookie
 *   2. JS fingerprint check -> must execute a client-side challenge and POST
 *                              the result before job data is served (this is
 *                              how Naukri/LinkedIn catch curl/requests-based
 *                              bots that never run JS at all)
 *   3. navigator.webdriver  -> the challenge script checks the classic
 *                              headless flag real sites check
 *   4. Rate limiting        -> per-IP sliding window, escalating to a
 *                              temporary block (429) past threshold
 *   5. UA sniffing          -> blocks empty/known-bot user agents
 *   6. Markup drift         -> the HTML structure/class names rotate every
 *                              ~20 requests, to test your scraper's
 *                              resilience to layout changes
 */
const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const app = express();
app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ---- in-memory state (sandbox only) ----
const sessions = new Map(); // sessionId -> { verified: bool, createdAt }
const requestLog = new Map(); // ip -> [timestamps]
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 6; // >6 requests / 10s from one IP => throttled
let requestCounter = 0; // drives markup drift

const JOBS = [
  { title: "Backend Engineer (Node.js)", company: "Nimbus Systems", location: "Bengaluru", exp: "2-4 yrs" },
  { title: "Frontend Developer (React)", company: "Vertex Labs", location: "Pune", exp: "1-3 yrs" },
  { title: "Full Stack Engineer", company: "Orbital Tech", location: "Remote (India)", exp: "3-5 yrs" },
  { title: "DevOps Engineer", company: "Cascade Cloud", location: "Hyderabad", exp: "2-5 yrs" },
  { title: "Data Engineer", company: "Lumen Analytics", location: "Gurgaon", exp: "1-4 yrs" },
  { title: "SDE II - Platform", company: "Nimbus Systems", location: "Bengaluru", exp: "3-6 yrs" },
];

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const log = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  log.push(now);
  requestLog.set(ip, log);

  if (log.length > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "rate_limited", retryAfterMs: RATE_LIMIT_WINDOW_MS });
  }
  next();
}

function uaCheck(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  const blockedPatterns = [/curl/i, /python-requests/i, /axios\/[0-9]/i, /^$/, /HeadlessChrome/i];
  if (blockedPatterns.some((p) => p.test(ua))) {
    return res.status(403).json({ error: "forbidden_user_agent" });
  }
  next();
}

// Step 1: landing page — issues a session + the JS fingerprint challenge
app.get("/", rateLimit, uaCheck, (req, res) => {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { verified: false, createdAt: Date.now() });
  res.cookie("sid", sessionId, { httpOnly: false });

  res.send(`
    <html>
      <body>
        <h1>Mock JobBoard</h1>
        <p>Loading listings...</p>
        <script>
          // Real anti-bot scripts check dozens of these signals.
          // We check just two, to keep the demo legible.
          const fingerprint = {
            webdriver: navigator.webdriver === true,
            hasChrome: typeof window.chrome !== 'undefined',
            pluginsLen: navigator.plugins ? navigator.plugins.length : 0,
          };
          fetch('/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fingerprint)
          }).then(() => { window.location.href = '/jobs'; });
        </script>
      </body>
    </html>
  `);
});

// Step 2: fingerprint verification
app.post("/verify", rateLimit, (req, res) => {
  const sessionId = req.cookies.sid;
  const session = sessions.get(sessionId);
  if (!session) return res.status(403).json({ error: "no_session" });

  const { webdriver, hasChrome } = req.body || {};
  if (webdriver === true) {
    return res.status(403).json({ error: "bot_fingerprint_detected", signal: "navigator.webdriver" });
  }
  session.verified = true;
  res.json({ ok: true });
});

// Step 3: the actual job listings — only served to verified sessions
app.get("/jobs", rateLimit, uaCheck, (req, res) => {
  const sessionId = req.cookies.sid;
  const session = sessions.get(sessionId);
  if (!session || !session.verified) {
    return res.status(403).json({ error: "unverified_session_or_missing_cookie" });
  }

  requestCounter++;
  const driftPhase = Math.floor(requestCounter / 20) % 2; // flips every 20 requests

  const rows = JOBS.map((j) =>
    driftPhase === 0
      ? `<div class="job-card"><h3 class="job-title">${j.title}</h3><span class="job-company">${j.company}</span><span class="job-loc">${j.location}</span><span class="job-exp">${j.exp}</span></div>`
      : `<li class="listing"><p class="role-name">${j.title}</p><em class="org">${j.company}</em><small class="place">${j.location}</small><small class="years">${j.exp}</small></li>`
  ).join("\n");

  res.send(`<html><body><div id="results">${rows}</div></body></html>`);
});

app.listen(PORT, () => {
  console.log(`Mock job board running on http://localhost:${PORT}`);
  console.log(`Markup drift toggles every 20 requests to /jobs (tests scraper resilience)`);
});
