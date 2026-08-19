import { Page } from "playwright";
import { JobListing, SourceAdapter, SearchQuery } from "../core/types";

/**
 * LINKEDIN PUBLIC GUEST ADAPTER
 *
 * Hits LinkedIn's publicly accessible guest job search endpoint. This
 * endpoint serves HTML fragments for unauthenticated users and does NOT
 * require login — it's the same endpoint that powers the public LinkedIn
 * job search page for logged-out visitors.
 *
 * Strategy:
 * - Fetch the guest API HTML via the page context (so cookies/headers
 *   come from our stealth identity, not a raw HTTP client).
 * - Parse the returned HTML cards with multi-selector fallback.
 * - No login, no auth token, no ToS-violating credential use.
 */
export const linkedInAdapter: SourceAdapter = {
  name: "LinkedIn",
  baseUrl: "https://www.linkedin.com",

  selectorStrategies: [
    {
      label: "guest-api-base-card-2024",
      cardSelector: ".base-card, .base-search-card, .job-search-card",
      fields: {
        title: ".base-search-card__title, h3.base-search-card__title",
        company:
          ".base-search-card__subtitle, h4.base-search-card__subtitle",
        location: ".job-search-card__location",
      },
    },
    {
      label: "guest-api-result-card",
      cardSelector: "[data-entity-urn]",
      fields: {
        title: "h3, .base-search-card__title",
        company: "h4, .base-search-card__subtitle",
        location: ".job-search-card__location, .base-search-card__metadata",
      },
    },
  ],

  async fetchJobs(
    page: Page,
    query: SearchQuery = {}
  ): Promise<JobListing[]> {
    const keyword = encodeURIComponent(query.keyword || "Software Engineer");
    const location = encodeURIComponent(query.location || "India");
    const limit = Math.min(query.limit || 25, 25); // LinkedIn paginates in 25s

    const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=${location}&start=0`;

    console.log(`[LinkedIn] Fetching: ${apiUrl}`);

    // Navigate the stealth page to the guest API URL.
    // This returns an HTML fragment, not a full page.
    await page.goto(apiUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Determine which selector strategy matches the returned markup
    let matchedStrategy = this.selectorStrategies[0];
    for (const strat of this.selectorStrategies) {
      const count = await page.locator(strat.cardSelector).count();
      if (count > 0) {
        matchedStrategy = strat;
        console.log(
          `[LinkedIn] Selector strategy "${strat.label}" matched ${count} cards`
        );
        break;
      }
    }

    const cards = await page.locator(matchedStrategy.cardSelector).all();
    const jobs: JobListing[] = [];

    for (let i = 0; i < Math.min(cards.length, limit); i++) {
      const card = cards[i];
      try {
        const title =
          (
            await card
              .locator(matchedStrategy.fields.title)
              .first()
              .textContent({ timeout: 2000 })
          )?.trim() ?? "";
        const company =
          (
            await card
              .locator(matchedStrategy.fields.company)
              .first()
              .textContent({ timeout: 2000 })
          )?.trim() ?? "";
        const location =
          (
            await card
              .locator(matchedStrategy.fields.location)
              .first()
              .textContent({ timeout: 2000 })
          )?.trim() ?? "";

        // Extract the direct job link
        const link =
          (
            await card
              .locator("a.base-card__full-link, a")
              .first()
              .getAttribute("href", { timeout: 2000 })
          )?.trim() ?? "";

        // Extract posted date
        const postedDate =
          (
            await card
              .locator("time")
              .first()
              .textContent({ timeout: 2000 })
              .catch(() => null)
          )?.trim() ?? undefined;

        // Extract entity URN as external ID
        const entityUrn =
          (await card.getAttribute("data-entity-urn")) ?? undefined;
        const externalId = entityUrn
          ? entityUrn.replace("urn:li:jobPosting:", "")
          : undefined;

        // Extract company logo
        const companyLogo =
          (
            await card
              .locator("img")
              .first()
              .getAttribute("data-delayed-url", { timeout: 1000 })
              .catch(() => null)
          ) ??
          (
            await card
              .locator("img")
              .first()
              .getAttribute("src", { timeout: 1000 })
              .catch(() => null)
          ) ??
          undefined;

        if (title && company) {
          jobs.push({
            title,
            company,
            location,
            sourceUrl: link || `https://www.linkedin.com/jobs/view/${externalId || ""}`,
            source: "LinkedIn",
            postedDate,
            externalId,
            companyLogo: companyLogo || undefined,
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Skip cards that fail to parse — don't let one bad card kill the batch
        continue;
      }
    }

    // Deduplicate by externalId (LinkedIn guest API sometimes returns dupes)
    const seen = new Set<string>();
    const deduped = jobs.filter((j) => {
      const key = j.externalId || `${j.title}|${j.company}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(
      `[LinkedIn] Scraped ${deduped.length} unique jobs (${jobs.length} raw)`
    );
    return deduped;
  },
};
