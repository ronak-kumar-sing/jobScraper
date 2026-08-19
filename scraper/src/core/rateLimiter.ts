/**
 * Real anti-bot systems flag traffic that's *too regular* — a bot hitting
 * every 2.000 seconds is a bigger tell than raw request volume. This adds
 * randomized pacing that mimics a human reading a page before acting.
 */
export class PacedThrottle {
  private lastRequestAt = 0;

  constructor(
    private readonly minDelayMs: number,
    private readonly maxDelayMs: number
  ) {}

  /** Call this before every outbound request/navigation. */
  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const target = this.minDelayMs + Math.random() * (this.maxDelayMs - this.minDelayMs);
    const remaining = target - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
    this.lastRequestAt = Date.now();
  }
}

/** Simulates a human scroll/read pause on a listing page before extracting data. */
export async function humanPause(minMs = 800, maxMs = 2200): Promise<void> {
  await sleep(minMs + Math.random() * (maxMs - minMs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
