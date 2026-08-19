# DECISIONS.md

## 1. Why this ingestion strategy over the obvious alternative?

The obvious alternative is a raw HTTP client (curl/requests/axios) hitting
endpoints directly with rotated headers. It's faster and cheaper to run,
but it fails immediately against any JS-based fingerprint challenge — which
is exactly what Naukri's ShieldSquare/Radware integration does, and what
our sandbox's `/verify` step simulates. I tested a raw `fetch()` call to
Naukri first — the response body was a blank page with no job data because
Naukri renders everything client-side via React/Next.js. LinkedIn's public
guest endpoint (`/jobs-guest/jobs/api/seeMoreJobPostings/search`) _does_
return HTML fragments to raw HTTP, but even that requires realistic
`User-Agent`, `sec-ch-ua`, and `Accept-Language` headers or you get a 429.

A real headless browser with `playwright-extra` + `puppeteer-extra-plugin-stealth`
was the minimum viable tool that could:
1. Execute Naukri's client-side JS and wait for React-rendered job tuples
2. Pass the sandbox's `navigator.webdriver` fingerprint check
3. Carry persisted cookies/sessions across runs so each identity looks like
   a returning user instead of a fresh bot

The trade-off is cost: a Playwright context takes ~2-3 seconds to launch
vs. ~50ms for an HTTP request. That's acceptable for the ingestion cadence
we need (hourly, not real-time), and the alternative (getting blocked
immediately) has infinite cost.

## 2. One trade-off made under the time limit

No real residential proxy pool — the identity pool rotates User-Agent,
viewport, locale, and persisted session state, but all 5 identities share
the same IP. The sandbox doesn't need proxies (it's localhost), and LinkedIn's
public guest endpoint is permissive enough that IP rotation isn't needed for
a demo. With a real deployment cadence against Naukri (which is much more
aggressive about rate-limiting datacenter IPs), I'd wire in a residential
proxy provider (e.g., Bright Data or IPRoyal) and configure the `ProxyConfig`
in `IdentityPool` to distribute identities across different exit IPs. The
circuit breaker would then trip and cool down individual proxy+identity
pairs instead of the global pool.

## 3. Where did you use AI tools, and what did you personally verify/change?

Used Claude to scaffold the stealth browser config, retry/circuit-breaker
logic, the sandbox's fingerprint challenge, and the multi-source adapter
pattern. I personally:

- **Ran live scrapes against LinkedIn and Naukri** to discover the real DOM
  selectors (`.srp-jobtuple-wrapper`, `a.title`, `.comp-name`, etc.) — the
  selectors in `naukri.ts` and `linkedin.ts` came from inspecting actual
  2026 page markup, not from AI guessing.
- **Tested the markup-drift scenario** by hitting the sandbox 20+ times and
  watching the selector fallback actually trigger in the console logs instead
  of just reading correct-looking code.
- **Verified identity rotation** by tracing through `IdentityPool.next()`
  and confirming that cooldown logic correctly skips burned identities and
  falls back to LRU when all are cooling.
- **Tuned rate-limit thresholds** after testing — the initial 500ms-1s
  window was too aggressive for Naukri and triggered blocks; 1.5-4s with
  human-pause jitter passes reliably.
- **Built the interactive dashboard** to visualize the pipeline state in
  real-time, so the architecture is demonstrable rather than just described.
