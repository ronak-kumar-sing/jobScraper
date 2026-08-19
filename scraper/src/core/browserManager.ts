import { chromium as chromiumExtra } from "playwright-extra";
// @ts-ignore - no types published for this plugin
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { BrowserContext } from "playwright";
import fs from "fs";
import path from "path";
import { Identity, ProxyConfig } from "./types";

chromiumExtra.use(StealthPlugin());

const REALISTIC_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
];

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
];

const TIMEZONES = ["Asia/Kolkata", "Asia/Kolkata", "Asia/Kolkata"];
const LOCALES = ["en-IN", "en-US", "en-GB"];

/**
 * Identity pool = the "rotation" half of the ingestion strategy. Each
 * identity bundles: a User-Agent, a viewport, an optional proxy, and a
 * persisted browser storage state (cookies/localStorage) so it behaves
 * like the SAME returning user across runs rather than a fresh bot every
 * time. Proxies are pluggable — swap `proxies` for a real residential
 * proxy provider's pool in production; a public demo runs with proxy
 * rotation disabled (no proxies configured) since it's hitting our own
 * sandbox, not a rate-limiting real target.
 */
export class IdentityPool {
  private identities: Identity[] = [];
  private cursor = 0;

  constructor(count: number, proxies: ProxyConfig[] = [], stateDir = "./sessions") {
    fs.mkdirSync(stateDir, { recursive: true });
    for (let i = 0; i < count; i++) {
      this.identities.push({
        id: `identity-${i}`,
        proxy: proxies.length ? proxies[i % proxies.length] : undefined,
        userAgent: REALISTIC_USER_AGENTS[i % REALISTIC_USER_AGENTS.length],
        viewport: VIEWPORTS[i % VIEWPORTS.length],
        storageStatePath: path.join(stateDir, `identity-${i}.json`),
        requestCount: 0,
        lastUsedAt: 0,
      });
    }
  }

  /** Round-robin, skipping any identity still in cooldown from a circuit trip. */
  next(): Identity {
    const now = Date.now();
    for (let i = 0; i < this.identities.length; i++) {
      const idx = (this.cursor + i) % this.identities.length;
      const candidate = this.identities[idx];
      if (!candidate.cooldownUntil || candidate.cooldownUntil < now) {
        this.cursor = idx + 1;
        candidate.lastUsedAt = now;
        candidate.requestCount++;
        return candidate;
      }
    }
    // all identities cooling down — fall back to the least-recently-used one
    return this.identities.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0];
  }

  cooldown(identity: Identity, ms: number): void {
    identity.cooldownUntil = Date.now() + ms;
  }

  /** Returns telemetry snapshot of all identities for the dashboard. */
  getStats(): { total: number; available: number; identities: { id: string; requestCount: number; isCoolingDown: boolean }[] } {
    const now = Date.now();
    const available = this.identities.filter(
      (id) => !id.cooldownUntil || id.cooldownUntil < now
    ).length;
    return {
      total: this.identities.length,
      available,
      identities: this.identities.map((id) => ({
        id: id.id,
        requestCount: id.requestCount,
        isCoolingDown: !!(id.cooldownUntil && id.cooldownUntil > now),
      })),
    };
  }
}

export async function launchStealthContext(identity: Identity): Promise<BrowserContext> {
  const browser = await chromiumExtra.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
    proxy: identity.proxy
      ? { server: identity.proxy.server, username: identity.proxy.username, password: identity.proxy.password }
      : undefined,
  });

  const storageState = fs.existsSync(identity.storageStatePath) ? identity.storageStatePath : undefined;
  const tzIdx = parseInt(identity.id.replace("identity-", ""), 10) || 0;

  const context = await browser.newContext({
    userAgent: identity.userAgent,
    viewport: identity.viewport,
    storageState, // reuse cookies/session from last run for this identity
    locale: LOCALES[tzIdx % LOCALES.length],
    timezoneId: TIMEZONES[tzIdx % TIMEZONES.length],
    permissions: ["geolocation"],
    extraHTTPHeaders: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
    },
  });

  // Evasion: override navigator.webdriver, chrome runtime, and permissions
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en-US", "en"] });
    // @ts-ignore
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
  });

  return context;
}

export async function persistSession(context: BrowserContext, identity: Identity): Promise<void> {
  await context.storageState({ path: identity.storageStatePath });
}
