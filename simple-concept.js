/**
 * HOW THE SCRAPER WORKS (Plain English / Plain JavaScript)
 * 
 * Run this file with: node simple-concept.js
 * 
 * This file demonstrates the core concepts used in the complex Typescript codebase.
 * It's simplified so anyone who knows basic Javascript can understand the architecture.
 */

// --- 1. IDENTITY ROTATION ---
// Why? If you always visit a site looking the same, they know you're a bot.
// How? We keep a list of different "Identities" (like different people with different browsers).
const identityPool = [
  { id: 'Identity_A', browser: 'Chrome on Mac' },
  { id: 'Identity_B', browser: 'Firefox on Windows' },
  { id: 'Identity_C', browser: 'Safari on iPhone' }
];
let currentIdentityIndex = 0;

function getNextIdentity() {
  const identity = identityPool[currentIdentityIndex];
  // Move to the next identity, loop back to start if at the end
  currentIdentityIndex = (currentIdentityIndex + 1) % identityPool.length;
  return identity;
}


// --- 2. JITTERED PACING ---
// Why? Bots fetch data exactly every 1000ms. Humans take random amounts of time to read.
// How? We wait a random amount of time between requests.
function sleepLikeAHuman(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  console.log(`[Pacing] Sleeping for ${delay}ms...`);
  return new Promise(resolve => setTimeout(resolve, delay));
}


// --- 3. CIRCUIT BREAKER ---
// Why? If LinkedIn starts showing us CAPTCHAs, we shouldn't keep hammering them.
// How? If we fail 'X' times in a row, we "trip the breaker" and stop trying for a while.
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

async function fetchWithCircuitBreaker(url, identity) {
  if (consecutiveFailures >= MAX_FAILURES) {
    throw new Error(`CIRCUIT BREAKER OPEN! We are blocked. Waiting for cooldown.`);
  }

  console.log(`[Network] ${identity.id} (${identity.browser}) fetching ${url}`);

  // Simulate a random block from the server (e.g., 25% chance the site blocks us)
  const isBlocked = Math.random() < 0.25;

  if (isBlocked) {
    consecutiveFailures++;
    console.log(`[Error] Request blocked! Failure streak: ${consecutiveFailures}`);
    throw new Error("HTTP 429 Too Many Requests");
  } else {
    consecutiveFailures = 0; // Reset streak on success
    return { html: "<div class='job-card-v2'>Senior JS Developer</div>" };
  }
}


// --- 4. SELECTOR FALLBACK (Resilience against Markup Drift) ---
// Why? Websites change their HTML class names randomly to break scrapers (Markup Drift).
// How? We have a list of backup strategies. If V1 fails, try V2.
function extractJobs(html) {
  const strategies = [
    { name: "Layout V1", match: "class='old-job-card'" },
    { name: "Layout V2", match: "class='job-card-v2'" }
  ];

  for (const strategy of strategies) {
    if (html.includes(strategy.match)) {
      console.log(`[Parser] Extracted data successfully using strategy: ${strategy.name}`);
      return ["Job Found!"]; // Simulated result
    }
  }

  throw new Error("Structural Drift: HTML changed drastically, none of our selectors worked.");
}


// --- PUTTING IT ALL TOGETHER ---
async function runScraperDemo() {
  console.log("=== Starting Scraper Demo ===\n");

  for (let i = 1; i <= 6; i++) {
    const identity = getNextIdentity(); // Get a fresh identity

    try {
      await sleepLikeAHuman(500, 1500); // Wait randomly
      const response = await fetchWithCircuitBreaker("https://naukri.com/jobs", identity); // Fetch safely
      const jobs = extractJobs(response.html); // Parse safely
      console.log(`[Success] Scrape #${i} finished. \n`);
    } catch (error) {
      console.log(`[Failed] Scrape #${i} aborted: ${error.message}\n`);
      if (error.message.includes("CIRCUIT BREAKER OPEN")) {
        console.log("=== Scraper stopped gracefully due to blocks ===");
        break; // Stop completely to avoid bans
      }
    }
  }
}

runScraperDemo();
