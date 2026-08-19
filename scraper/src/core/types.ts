export interface JobListing {
  title: string;
  company: string;
  location: string;
  experience?: string;
  salary?: string;
  description?: string;
  tags?: string[];
  sourceUrl: string;
  source: "LinkedIn" | "Naukri" | "Mock-Target";
  companyLogo?: string;
  postedDate?: string;
  externalId?: string;
  scrapedAt: string;
}

export interface Identity {
  id: string;
  proxy?: ProxyConfig;
  userAgent: string;
  viewport: { width: number; height: number };
  // cookies/localStorage persisted per identity so a "session" looks
  // continuous across runs instead of spawning fresh every time
  storageStatePath: string;
  requestCount: number;
  lastUsedAt: number;
  cooldownUntil?: number;
}

export interface ProxyConfig {
  server: string; // e.g. "http://proxy-host:port"
  username?: string;
  password?: string;
  label: string; // e.g. "residential-in-1"
}

export interface SourceAdapter {
  name: string;
  baseUrl: string;
  /** Selector strategies in priority order — first one that matches wins.
   *  This is the core defense against markup drift. */
  selectorStrategies: SelectorStrategy[];
  fetchJobs(
    page: import("playwright").Page,
    query?: SearchQuery
  ): Promise<JobListing[]>;
}

export interface SelectorStrategy {
  label: string;
  cardSelector: string;
  fields: {
    title: string;
    company: string;
    location: string;
    experience?: string;
    salary?: string;
    description?: string;
  };
}

/** Query parameters passed from the API to source adapters. */
export interface SearchQuery {
  keyword?: string;
  location?: string;
  limit?: number;
}

/** Telemetry snapshot returned by /api/telemetry. */
export interface TelemetrySnapshot {
  circuitBreaker: {
    isOpen: boolean;
    failureCount: number;
    cooldownRemainingMs: number;
  };
  identityPool: {
    total: number;
    available: number;
    identities: {
      id: string;
      requestCount: number;
      isCoolingDown: boolean;
    }[];
  };
  lastScrape: {
    source: string;
    timestamp: string;
    jobCount: number;
    durationMs: number;
    status: string;
  } | null;
  sources: string[];
}
