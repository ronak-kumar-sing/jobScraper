import express from "express";
import path from "path";
import { IdentityPool, launchStealthContext, persistSession } from "./core/browserManager";
import { PacedThrottle, humanPause } from "./core/rateLimiter";
import { withRetry, CircuitBreaker, StructuralDriftError } from "./core/resilience";
import { mockBoardAdapter } from "./sources/mockboard";
import { linkedInAdapter } from "./sources/linkedin";
import { naukriAdapter } from "./sources/naukri";
import { JobListing, SourceAdapter, SearchQuery, TelemetrySnapshot } from "./core/types";

// ── Shared infrastructure (identity rotation, pacing, circuit breaker) ──

const identityPool = new IdentityPool(5); // 5 rotating identities
const throttle = new PacedThrottle(1500, 4000); // 1.5-4s between actions, jittered
const breaker = new CircuitBreaker(3, 30_000); // trip after 3 consecutive failures, 30s cooldown

// ── Source registry ──

const SOURCES: Record<string, SourceAdapter> = {
  linkedin: linkedInAdapter,
  naukri: naukriAdapter,
  mock: mockBoardAdapter,
};

// ── Last scrape telemetry for the dashboard ──

let lastScrape: TelemetrySnapshot["lastScrape"] = null;

// ── Ingestion engine ──

async function runIngestion(
  sourceName: string,
  adapter: SourceAdapter,
  query: SearchQuery
): Promise<{ jobs: JobListing[]; meta: Record<string, unknown> }> {
  if (breaker.isOpen()) {
    return {
      jobs: [],
      meta: {
        status: "circuit_open",
        source: sourceName,
        note: "Backing off after repeated failures.",
      },
    };
  }

  const identity = identityPool.next();
  const startTime = Date.now();

  try {
    const jobs = await withRetry(
      async () => {
        const context = await launchStealthContext(identity);
        const page = await context.newPage();

        await throttle.wait();
        await humanPause();

        const results = await adapter.fetchJobs(page, query);

        await persistSession(context, identity);
        await context.browser()?.close();
        return results;
      },
      {
        retries: 2,
        baseDelayMs: 1000,
        onRetry: (attempt, err) =>
          console.warn(`[retry ${attempt}] [${sourceName}] ${(err as Error).message}`),
      }
    );

    breaker.recordSuccess();
    const durationMs = Date.now() - startTime;

    lastScrape = {
      source: sourceName,
      timestamp: new Date().toISOString(),
      jobCount: jobs.length,
      durationMs,
      status: "ok",
    };

    return {
      jobs,
      meta: {
        status: "ok",
        source: sourceName,
        identity: identity.id,
        count: jobs.length,
        durationMs,
      },
    };
  } catch (err) {
    breaker.recordFailure();
    const durationMs = Date.now() - startTime;

    lastScrape = {
      source: sourceName,
      timestamp: new Date().toISOString(),
      jobCount: 0,
      durationMs,
      status: err instanceof StructuralDriftError ? "structural_drift" : "failed",
    };

    if (err instanceof StructuralDriftError) {
      console.error(`[${sourceName}] STRUCTURAL DRIFT DETECTED:`, err.message);
      return {
        jobs: [],
        meta: { status: "structural_drift", source: sourceName, error: err.message },
      };
    }
    identityPool.cooldown(identity, 15_000);
    return {
      jobs: [],
      meta: { status: "failed", source: sourceName, error: (err as Error).message },
    };
  }
}

// ── Express API ──

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend deployment (e.g. Vercel)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Serve the premium frontend
app.use(express.static(path.join(__dirname, "..", "public")));

/**
 * GET /api/jobs
 *
 * Query params:
 *   source  = "all" | "linkedin" | "naukri" | "mock"  (default: "all")
 *   q       = search keyword                          (default: "Software Engineer")
 *   loc     = location filter                         (default: "India")
 *   limit   = max results per source                  (default: 20)
 */
app.get("/api/jobs", async (req, res) => {
  const sourceParam = ((req.query.source as string) || "all").toLowerCase();
  const query: SearchQuery = {
    keyword: (req.query.q as string) || "Software Engineer",
    location: (req.query.loc as string) || "India",
    limit: parseInt((req.query.limit as string) || "20", 10),
  };

  let adaptersToRun: [string, SourceAdapter][] = [];

  if (sourceParam === "all") {
    // Run LinkedIn and Naukri in parallel (mock only on explicit request)
    adaptersToRun = [
      ["linkedin", SOURCES.linkedin],
      ["naukri", SOURCES.naukri],
    ];
  } else if (SOURCES[sourceParam]) {
    adaptersToRun = [[sourceParam, SOURCES[sourceParam]]];
  } else {
    return res.status(400).json({
      error: `Unknown source "${sourceParam}". Use: all, linkedin, naukri, mock`,
    });
  }

  try {
    // Run adapters in parallel for speed
    const results = await Promise.all(
      adaptersToRun.map(([name, adapter]) => runIngestion(name, adapter, query))
    );

    const allJobs = results.flatMap((r) => r.jobs);
    const allMeta = results.map((r) => r.meta);

    res.json({
      jobs: allJobs,
      meta: {
        totalCount: allJobs.length,
        sources: allMeta,
        query,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/telemetry — live pipeline health for the dashboard
 */
app.get("/api/telemetry", (_req, res) => {
  const snapshot: TelemetrySnapshot = {
    circuitBreaker: breaker.getStats(),
    identityPool: identityPool.getStats(),
    lastScrape,
    sources: Object.keys(SOURCES),
  };
  res.json(snapshot);
});

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// SPA fallback — serve index.html for any unmatched route
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Job Ingestion Pipeline — running on port ${PORT}     ║`);
  console.log(`║                                                  ║`);
  console.log(`║  Dashboard:   http://localhost:${PORT}               ║`);
  console.log(`║  API:         http://localhost:${PORT}/api/jobs       ║`);
  console.log(`║  Telemetry:   http://localhost:${PORT}/api/telemetry  ║`);
  console.log(`║  Health:      http://localhost:${PORT}/health         ║`);
  console.log(`║                                                  ║`);
  console.log(`║  Sources: LinkedIn · Naukri · Mock Sandbox       ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
});
