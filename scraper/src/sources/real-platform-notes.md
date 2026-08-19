# Mapping this architecture to a real platform (Naukri / LinkedIn / Indeed)

This is deliberately **notes, not code** — the live demo only ever runs
against the sandbox in `mockboard.ts`. This file is what you'd expand into
Part 1's design document sections 1-4.

## 1. Detection surface (what actually gives you away on a real platform)

| Signal | What it is | How the sandbox models it |
|---|---|---|
| `navigator.webdriver` | Set to `true` by default in automated Chrome | `/verify` checks this exact flag |
| TLS/JA3 fingerprint | Real sites fingerprint the TLS handshake itself — headless Chrome via CDP has a slightly different TLS signature than a human's browser + OS combo | Not modeled (would need a TLS-level proxy to test) |
| Header order & completeness | Bots often send headers in non-browser order, or miss `sec-ch-ua`, `sec-fetch-*` | `uaCheck` middleware is a simplified version of this |
| Request timing regularity | Fixed-interval requests are a bot tell | `PacedThrottle` with jitter addresses this |
| Behavioral signals | No mouse movement, no scroll, instant form fills | `humanPause()` is a stand-in; a real pipeline would add synthetic scroll/mouse events |
| IP reputation / ASN | Datacenter IPs (AWS, most VPS hosts) are flagged/rate-limited harder than residential IPs | `IdentityPool` proxy slot — production would use a residential proxy pool, not a VPS IP |
| Rate/volume per identity | Sustained scraping from one account/IP | `CircuitBreaker` + identity rotation |

## 2. Ingestion strategy differences for a real target

- **Identity = real proxy tier.** Datacenter proxies get burned fast on
  LinkedIn/Naukri; the identity pool would need residential or mobile proxy
  backing in production. That's a paid dependency, which is exactly the kind
  of trade-off to name explicitly in DECISIONS.md.
- **CAPTCHA path.** When a challenge appears, the pipeline should **not**
  try to auto-solve it — that crosses from "scraping" into active ToS
  evasion territory. The honest design is: detect the CAPTCHA, mark that
  identity as burned, pause it, alert a human, and continue with other
  identities. `CircuitBreaker.recordFailure()` is where that hook would sit.
- **Session TTL.** Real accounts get logged out / flagged for velocity.
  Production would rate-limit *per identity per day*, not just per request
  window.

## 3. Resilience — same as implemented, just against a less predictable target

`resolveSelectorStrategy` + `withRetry` + `CircuitBreaker` transfer directly.
The only addition for a real target: schema validation on the extracted
data (e.g. a "job title" that's empty or a company name that's actually a
CSS class leaking through) triggers the same fallback path as a selector
miss — silent garbage is worse than a loud failure.

## 4. Where the line is

- Never authenticate as a real user to scrape faster/deeper than the public
  page allows.
- Never solve or pay a service to solve CAPTCHAs — a CAPTCHA is the
  platform explicitly saying "not like this."
- Respect `robots.txt` disallow rules even though they're not legally
  binding — they're the platform's stated preference.
- Don't redistribute or resell scraped data; personal/internal use only
  unless you have a licensing agreement.
- If a source's ToS explicitly prohibits automated access (most do), the
  technically-correct move is to prefer their official API/partner feed
  where one exists, and treat scraping as the fallback of last resort —
  not the default.
