import { Page } from "playwright";
import { SelectorStrategy } from "./types";

/**
 * Tries each selector strategy in order until one actually matches elements
 * on the page. This is what keeps the pipeline alive when a source changes
 * its markup overnight (Part 1, "Resilience" requirement) — instead of a
 * single hardcoded selector silently returning zero results, we detect the
 * mismatch and fall through to the next known layout.
 */
export async function resolveSelectorStrategy(
  page: Page,
  strategies: SelectorStrategy[]
): Promise<SelectorStrategy> {
  for (const strategy of strategies) {
    const count = await page.locator(strategy.cardSelector).count();
    if (count > 0) return strategy;
  }
  throw new StructuralDriftError(
    `No known selector strategy matched. Tried: ${strategies.map((s) => s.label).join(", ")}`
  );
}

export class StructuralDriftError extends Error {}

/** Generic retry with exponential backoff + jitter. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries: number; baseDelayMs: number; onRetry?: (attempt: number, err: unknown) => void }
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      opts.onRetry?.(attempt, err);
      if (attempt < opts.retries) {
        const backoff = opts.baseDelayMs * 2 ** attempt;
        const jitter = Math.random() * backoff * 0.3;
        await new Promise((r) => setTimeout(r, backoff + jitter));
      }
    }
  }
  throw lastErr;
}

/**
 * Trips after N consecutive failures for a given identity/source pair and
 * forces a cooldown — this is the "plan B when the primary approach gets
 * shut down mid-run" behavior. Instead of hammering a source that just
 * started blocking you, the pipeline backs off and (in a real deployment)
 * would fail over to another identity/proxy or pause the source entirely.
 */
export class CircuitBreaker {
  private failureCount = 0;
  private openUntil = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly cooldownMs: number
  ) {}

  isOpen(): boolean {
    return Date.now() < this.openUntil;
  }

  recordSuccess(): void {
    this.failureCount = 0;
  }

  recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      this.failureCount = 0;
    }
  }

  /** Telemetry snapshot for the dashboard. */
  getStats(): { isOpen: boolean; failureCount: number; cooldownRemainingMs: number } {
    const now = Date.now();
    return {
      isOpen: this.isOpen(),
      failureCount: this.failureCount,
      cooldownRemainingMs: this.isOpen() ? this.openUntil - now : 0,
    };
  }
}

/**
 * Safely extract text content from a locator with a short timeout.
 * Returns the trimmed text or a fallback string if extraction fails.
 * This prevents the entire scrape from hanging if a single field's
 * selector has drifted.
 */
export async function safeText(
  card: import("playwright").Locator,
  selector: string,
  fallback = ""
): Promise<string> {
  try {
    const el = card.locator(selector).first();
    const count = await el.count();
    if (count === 0) return fallback;
    const text = await el.textContent({ timeout: 2000 });
    return text?.trim() ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely extract an attribute value from a locator with a short timeout.
 */
export async function safeAttr(
  card: import("playwright").Locator,
  selector: string,
  attr: string,
  fallback = ""
): Promise<string> {
  try {
    const el = card.locator(selector).first();
    const count = await el.count();
    if (count === 0) return fallback;
    const val = await el.getAttribute(attr, { timeout: 2000 });
    return val?.trim() ?? fallback;
  } catch {
    return fallback;
  }
}
