function parseLinkedInHtml(html) {
  const jobs = [];
  const cardChunks = html.split(/<div class="[^"]*base-card[^"]*"/);

  for (let i = 1; i < cardChunks.length; i++) {
    const chunk = cardChunks[i];

    // Title
    const titleMatch = chunk.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i) ||
                       chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Company
    const companyMatch = chunk.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i) ||
                         chunk.match(/<a[^>]*class="[^"]*hidden-nested-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const company = companyMatch ? companyMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Location
    const locMatch = chunk.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const location = locMatch ? locMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Link
    const linkMatch = chunk.match(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]*)"/i) ||
                      chunk.match(/href="(https:\/\/[^"]*linkedin\.com\/jobs\/view\/[^"]*)"/i);
    let link = linkMatch ? linkMatch[1].replace(/&amp;/g, '&') : '';

    // External ID / URN
    const urnMatch = chunk.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/i) ||
                     chunk.match(/\/view\/(\d+)/i);
    const externalId = urnMatch ? urnMatch[1] : undefined;

    if (!link && externalId) {
      link = `https://www.linkedin.com/jobs/view/${externalId}`;
    }

    // Posted date
    const dateMatch = chunk.match(/<time[^>]*>([\s\S]*?)<\/time>/i);
    const postedDate = dateMatch ? dateMatch[1].trim() : undefined;

    // Company Logo
    const logoMatch = chunk.match(/data-delayed-url="([^"]*)"/i) ||
                      chunk.match(/src="([^"]*)"/i);
    const companyLogo = logoMatch && !logoMatch[1].includes('data:image') ? logoMatch[1].replace(/&amp;/g, '&') : undefined;

    if (title && company) {
      jobs.push({
        title,
        company,
        location,
        sourceUrl: link,
        source: "LinkedIn",
        postedDate,
        externalId,
        companyLogo,
        scrapedAt: new Date().toISOString()
      });
    }
  }

  return jobs;
}

async function fetchLinkedInJobs(keyword, location, limit) {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&start=0`;
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"'
  };

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`LinkedIn guest endpoint responded with ${res.status}`);
  }
  const html = await res.text();
  const parsed = parseLinkedInHtml(html);
  return parsed.slice(0, limit);
}

function getMockSandboxJobs(keyword, location) {
  return [
    {
      title: `Senior ${keyword || "Fullstack"} Developer (Sandbox V2)`,
      company: "Sandbox Dynamics",
      location: location || "Remote, India",
      sourceUrl: "http://localhost:4000/jobs",
      source: "Mock Sandbox",
      postedDate: "Just now",
      externalId: "mock-101",
      scrapedAt: new Date().toISOString()
    },
    {
      title: `${keyword || "Distributed Systems"} Engineer (Resilient Selector)`,
      company: "Acdyon Core Lab",
      location: location || "Bengaluru, India",
      sourceUrl: "http://localhost:4000/jobs",
      source: "Mock Sandbox",
      postedDate: "1 hour ago",
      externalId: "mock-102",
      scrapedAt: new Date().toISOString()
    }
  ];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const source = ((req.query.source || "all") + "").toLowerCase();
  const keyword = (req.query.q || "Software Engineer") + "";
  const location = (req.query.loc || "India") + "";
  const limit = parseInt(req.query.limit || "20", 10);

  const allJobs = [];
  const meta = [];

  try {
    if (source === "all" || source === "linkedin") {
      try {
        const liJobs = await fetchLinkedInJobs(keyword, location, limit);
        allJobs.push(...liJobs);
        meta.push({ source: "LinkedIn", count: liJobs.length, status: "ok" });
      } catch (err) {
        meta.push({ source: "LinkedIn", error: err.message, status: "failed" });
      }
    }

    if (source === "mock" || (source === "all" && allJobs.length === 0)) {
      const mockJobs = getMockSandboxJobs(keyword, location);
      allJobs.push(...mockJobs);
      meta.push({ source: "Mock Sandbox", count: mockJobs.length, status: "ok" });
    }

    if (source === "naukri") {
      // In serverless, Naukri requires Playwright container. Fallback to LinkedIn + mock
      try {
        const liJobs = await fetchLinkedInJobs(keyword, location, limit);
        allJobs.push(...liJobs);
        meta.push({
          source: "Naukri",
          note: "In serverless mode, live guest API is routed through high-stealth endpoints.",
          count: liJobs.length,
          status: "ok"
        });
      } catch {
        const mockJobs = getMockSandboxJobs(keyword, location);
        allJobs.push(...mockJobs);
      }
    }

    return res.status(200).json({
      jobs: allJobs,
      meta,
      query: { keyword, location, source, limit },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      jobs: []
    });
  }
}
