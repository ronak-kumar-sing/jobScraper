export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const identities = [
    { id: "identity-0", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0.0.0", isCoolingDown: false, failureStreak: 0 },
    { id: "identity-1", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0", isCoolingDown: false, failureStreak: 0 },
    { id: "identity-2", userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/125.0", isCoolingDown: false, failureStreak: 0 },
    { id: "identity-3", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1) Mobile/15E148", isCoolingDown: false, failureStreak: 0 },
    { id: "identity-4", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/124.0.0.0", isCoolingDown: false, failureStreak: 0 }
  ];

  return res.status(200).json({
    circuitBreaker: {
      isOpen: false,
      consecutiveFailures: 0,
      cooldownRemainingMs: 0,
      state: "closed"
    },
    identityPool: {
      total: 5,
      available: 5,
      coolingDown: 0,
      identities: identities
    },
    lastScrape: {
      source: "LinkedIn",
      jobsScraped: 10,
      durationMs: 380,
      status: "success"
    },
    sources: ["LinkedIn", "Naukri", "Mock Sandbox"]
  });
}
