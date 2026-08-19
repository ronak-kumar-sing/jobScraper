import { Page } from "playwright";
import { JobListing, SourceAdapter, SearchQuery } from "../core/types";

/**
 * NAUKRI.COM REAL ADAPTER
 *
 * Naukri is a heavily protected platform with JS-rendered content, anti-bot
 * detection (ShieldSquare/Radware), and dynamic class names. This adapter
 * uses a full stealth Playwright context to:
 *
 * 1. Navigate to the search results page (which triggers all JS rendering)
 * 2. Wait for job tuples to appear in the DOM
 * 3. Extract fields using multiple fallback selectors
 *
 * Key selectors discovered via live DOM inspection:
 * - `.srp-jobtuple-wrapper` — primary job card wrapper (2024-2026)
 * - `.cust-job-tuple` — alternate wrapper class
 * - `[data-job-id]` — data attribute on card elements
 * - `a.title` — job title link
 * - `a.comp-name` / `.comp-name` — company name
 * - `.loc-wrap` / `.locWdth` — location
 * - `.expwdth` / `.exp-wrap` — experience range
 * - `.sal-wrap` / `.ni-job-tuple-icon-srp-rupee` — salary
 * - `.job-desc` — description snippet
 * - `.tag-li`, `.dot-gt` — skill tags
 */
export const naukriAdapter: SourceAdapter = {
  name: "Naukri",
  baseUrl: "https://www.naukri.com",

  selectorStrategies: [
    {
      label: "srp-wrapper-2024",
      cardSelector: ".srp-jobtuple-wrapper",
      fields: {
        title: "a.title",
        company: "a.comp-name, .comp-name",
        location: ".loc-wrap .locWdth, .loc-wrap span, .loc-wrap, .locWdth",
        experience: ".expwdth, .exp-wrap span, .exp-wrap",
        salary: ".sal-wrap span, .sal-wrap, .ni-job-tuple-icon-srp-rupee + span",
        description: ".job-desc, .job-description",
      },
    },
    {
      label: "cust-job-tuple",
      cardSelector: ".cust-job-tuple",
      fields: {
        title: "a.title, .title",
        company: ".comp-name, .companyInfo a",
        location: ".loc-wrap, .locWdth, .location",
        experience: ".expwdth, .exp, .experience",
        salary: ".sal-wrap, .salary",
        description: ".job-desc, .job-description",
      },
    },
    {
      label: "data-job-id-attr",
      cardSelector: "[data-job-id]",
      fields: {
        title: "a.title, .title, h2 a",
        company: ".comp-name, .subTitle, .companyInfo a",
        location: ".loc-wrap, .locWdth, .location",
        experience: ".expwdth, .exp, .experience",
        salary: ".sal-wrap, .salary",
        description: ".job-desc",
      },
    },
  ],

  async fetchJobs(
    page: Page,
    query: SearchQuery = {}
  ): Promise<JobListing[]> {
    const keyword = query.keyword || "software engineer";
    const location = query.location || "";
    const limit = query.limit || 20;

    // Build canonical Naukri search URL (handles location slugs correctly)
    const slug = keyword.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const locSlug = location ? location.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") : "";

    let searchUrl = locSlug
      ? `https://www.naukri.com/${slug}-jobs-in-${locSlug}?k=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}`
      : `https://www.naukri.com/${slug}-jobs?k=${encodeURIComponent(keyword)}`;

    console.log(`[Naukri] Navigating to: ${searchUrl}`);

    try {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      // Allow client-side React hydration to complete
      await page.waitForTimeout(3000);
      await page.evaluate(() => window.scrollBy(0, 500)).catch(() => {});
      await page.waitForTimeout(1000);
    } catch (navErr) {
      console.warn(`[Naukri] Navigation warning: ${(navErr as Error).message}`);
    }

    // Wait for job cards to render
    try {
      await page.waitForSelector(
        ".srp-jobtuple-wrapper, .cust-job-tuple, [data-job-id], a.title, .jobTuple",
        { timeout: 10000 }
      );
    } catch {
      console.warn(
        "[Naukri] No primary job cards appeared within timeout — checking fallbacks"
      );
    }

    // Determine which selector strategy matches
    let matchedStrategy = this.selectorStrategies[0];
    for (const strat of this.selectorStrategies) {
      const count = await page.locator(strat.cardSelector).count();
      if (count > 0) {
        matchedStrategy = strat;
        console.log(
          `[Naukri] Selector strategy "${strat.label}" matched ${count} cards`
        );
        break;
      }
    }

    // Use page.$$eval for fast bulk extraction (runs inside browser context,
    // avoids slow per-element Playwright round-trips)
    const fields = matchedStrategy.fields;
    const jobs: JobListing[] = await page.$$eval(
      matchedStrategy.cardSelector,
      (cards, f) => {
        return cards.map((card) => {
          const getText = (selectors: string): string => {
            for (const sel of selectors.split(",").map((s) => s.trim())) {
              const el = card.querySelector(sel);
              if (el?.textContent?.trim()) return el.textContent.trim();
            }
            return "";
          };

          const getAttr = (
            selectors: string,
            attr: string
          ): string => {
            for (const sel of selectors.split(",").map((s) => s.trim())) {
              const el = card.querySelector(sel);
              const val = el?.getAttribute(attr);
              if (val?.trim()) return val.trim();
            }
            return "";
          };

          const title = getText(f.title);
          const company = getText(f.company);
          const location = getText(f.location);
          const experience = f.experience ? getText(f.experience) : undefined;
          const salary = f.salary ? getText(f.salary) : undefined;
          const description = f.description
            ? getText(f.description)
            : undefined;

          // Extract tags
          const tagEls = card.querySelectorAll(
            ".tag-li, .dot-gt, .tags-gt li, .tags-gt span"
          );
          const tags = Array.from(tagEls)
            .map((t) => t.textContent?.trim())
            .filter((t): t is string => !!t)
            .slice(0, 8);

          // Extract link
          const sourceUrl = getAttr("a.title, a", "href") || "https://www.naukri.com";

          // Company logo
          const companyLogo =
            getAttr(".comp-logo img, .companyAvatar img, img", "src") ||
            undefined;

          return {
            title,
            company,
            location: location || "India",
            experience: experience || undefined,
            salary: salary || undefined,
            description: description || undefined,
            tags: tags.length > 0 ? tags : undefined,
            sourceUrl,
            source: "Naukri" as const,
            companyLogo: companyLogo || undefined,
            scrapedAt: new Date().toISOString(),
          };
        });
      },
      fields
    );

    // Filter out empty cards and deduplicate
    const valid = jobs
      .filter((j) => j.title && j.company)
      .slice(0, limit);

    const seen = new Set<string>();
    const deduped = valid.filter((j) => {
      const key = `${j.title}|${j.company}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(
      `[Naukri] Scraped ${deduped.length} unique jobs (${jobs.length} raw)`
    );
    return deduped;
  },
};
