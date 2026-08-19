import { Page } from "playwright";
import { JobListing, SourceAdapter } from "../core/types";
import { resolveSelectorStrategy } from "../core/resilience";

/**
 * LIVE DEMO TARGET — safe, self-hosted sandbox (mock-target/server.js).
 * Two selector strategies are registered because the sandbox intentionally
 * flips its markup every 20 requests to prove the pipeline survives it.
 */
export const mockBoardAdapter: SourceAdapter = {
  name: "mock-jobboard",
  baseUrl: process.env.MOCK_TARGET_URL || "http://localhost:4000",

  selectorStrategies: [
    {
      label: "layout-v1-divs",
      cardSelector: ".job-card",
      fields: { title: ".job-title", company: ".job-company", location: ".job-loc", experience: ".job-exp" },
    },
    {
      label: "layout-v2-list",
      cardSelector: ".listing",
      fields: { title: ".role-name", company: ".org", location: ".place", experience: ".years" },
    },
  ],

  async fetchJobs(page: Page): Promise<JobListing[]> {
    // Step 1: land on "/" to pick up a session cookie and pass the JS
    // fingerprint challenge (this is why we use a real browser, not a raw
    // HTTP client — curl/requests can't execute the challenge script)
    await page.goto(`${this.baseUrl}/`, { waitUntil: "networkidle" });

    // Step 2: the challenge script client-side redirects to /jobs once verified
    await page.waitForURL(`${this.baseUrl}/jobs`, { timeout: 5000 });

    const strategy = await resolveSelectorStrategy(page, this.selectorStrategies);

    const cards = await page.locator(strategy.cardSelector).all();
    const jobs: JobListing[] = [];
    for (const card of cards) {
      const title = (await card.locator(strategy.fields.title).textContent())?.trim() ?? "";
      const company = (await card.locator(strategy.fields.company).textContent())?.trim() ?? "";
      const location = (await card.locator(strategy.fields.location).textContent())?.trim() ?? "";
      const experience = strategy.fields.experience
        ? (await card.locator(strategy.fields.experience).textContent())?.trim()
        : undefined;

      jobs.push({ title, company, location, experience, sourceUrl: this.baseUrl, source: "Mock-Target", scrapedAt: new Date().toISOString() });
    }
    return jobs;
  },
};
