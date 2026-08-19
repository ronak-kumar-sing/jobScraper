# System Architecture & Technical Flow

This document provides a visual representation of how the **Job Ingestion Engine** operates end-to-end.

---

## 1. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   REACT 19 DASHBOARD                                     │
│   [ Live Discovery Studio ]   [ Telemetry Radar ]   [ Sandbox Drift Simulator ]          │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ HTTP REST Requests (/api/jobs, /api/telemetry)
┌───────────────────────────────────────────▼──────────────────────────────────────────────┐
│                                   EXPRESS API SERVER (:5000)                             │
│   • Request Validation & Sanitization                                                    │
│   • Multi-Source Request Dispatcher                                                      │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Parallel Dispatch
                 ┌──────────────────────────┼──────────────────────────┐
                 │                          │                          │
┌────────────────▼─────────────┐ ┌──────────▼─────────────┐ ┌──────────▼─────────────┐
│    LinkedIn Guest Adapter    │ │   Naukri Stealth Adapter │ │   Mock Sandbox Adapter   │
│ (Public Unauthenticated API) │ │ (Playwright Headless UI) │ │ (Self-Hosted Target) │
└────────────────┬─────────────┘ └──────────┬─────────────┘ └──────────┬─────────────┘
                 │                          │                          │
                 └──────────────────────────┼──────────────────────────┘
                                            │
┌───────────────────────────────────────────▼──────────────────────────────────────────────┐
│                               CORE RESILIENCE & STEALTH LAYER                             │
│                                                                                          │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐  ┌───────────────────┐  │
│  │       IDENTITY POOL         │  │     PacedThrottle          │  │  CIRCUIT BREAKER  │  │
│  │ • 5 Rotating User-Agents    │  │ • 1.5s-4s Jittered Pause   │  │ • Fail-Fast (3x)  │  │
│  │ • Viewport & Fingerprint    │  │ • Human Scroll Simulation  │  │ • 30s Cooldown    │  │
│  │ • Persisted Session Storage │  │ • Anti-Timing Fingerprint  │  │ • Fail-Safe State │  │
│  └─────────────────────────────┘  └────────────────────────────┘  └───────────────────┘  │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         SELECTOR FALLBACK STRATEGY CHAIN                           │  │
│  │ Primary Selectors (.srp-jobtuple) ──(On Empty)──► Secondary (.cust-job-tuple) ──...│  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ingestion & Resilience Sequence Flow (Mermaid Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Frontend Dashboard
    participant API as Express API (/api/jobs)
    participant CB as Circuit Breaker
    participant Pool as Identity Pool
    participant Throttle as PacedThrottle
    participant Browser as Stealth Playwright Context
    participant Target as Target Website (LinkedIn / Naukri)
    participant Parser as Selector Fallback Parser

    User->>API: GET /api/jobs?source=all&q=React&loc=India
    API->>CB: Check Status (isOpen?)
    
    alt Circuit Breaker Open (Cooling Down)
        CB-->>API: Return Circuit Open Warning
        API-->>User: HTTP 200 (Degraded Mode Notice)
    else Circuit Breaker Closed (Healthy)
        CB-->>API: Proceed
        API->>Pool: Acquire Next Identity
        Pool-->>API: Returns Identity (UA, Viewport, Cookies)
        
        API->>Throttle: wait() + humanPause()
        Note over Throttle: Sleeps for 1.5s - 4s (Jittered)
        Throttle-->>API: Delay Complete
        
        API->>Browser: Launch Context(Identity) + stealth plugin
        Browser->>Target: GET /jobs-search (Headers, Fingerprint)
        Target-->>Browser: HTML / Rendered DOM Response
        
        alt Blocked (HTTP 429 / CAPTCHA Challenge)
            Browser-->>API: Blocked / Exception
            API->>CB: Record Failure Streak (+1)
            API->>Pool: Mark Identity Cooling Down
            API-->>User: Retry or Partial Failover Response
        else Successful DOM Load
            Browser->>Parser: Resolve Selector Strategy
            
            alt Strategy 1 (.job-card) Matches
                Parser-->>API: Returns Parsed Jobs (Strategy 1)
            else Strategy 1 Fails -> Strategy 2 (.tuple-v2) Matches
                Parser-->>API: Returns Parsed Jobs (Fallback Strategy 2)
            end
            
            API->>CB: Record Success (Reset Failure Counter to 0)
            API-->>User: Returns Scraped Jobs + Telemetry Metadata
        end
    end
```

---

## 3. How the Scraper Survives Anti-Bot Defenses

| Anti-Bot Defensive Vector | How Our Pipeline Defeats It | Code Reference |
| :--- | :--- | :--- |
| **`navigator.webdriver = true` Detection** | `puppeteer-extra-plugin-stealth` cloaks the automation flag and spoofs Chrome runtime objects. | [`browserManager.ts`](file:///Users/ronakkumarsingh/Desktop/job-scraper-challenge/scraper/src/core/browserManager.ts) |
| **Fixed Interval Bot Timing Analysis** | `PacedThrottle` introduces non-deterministic random jitter (1.5s–4.0s) between actions. | [`rateLimiter.ts`](file:///Users/ronakkumarsingh/Desktop/job-scraper-challenge/scraper/src/core/rateLimiter.ts) |
| **Per-User Rate Limiting & Gating** | `IdentityPool` rotates 5 unique fingerprints (User-Agents, viewports, locales, cookie jars). | [`browserManager.ts`](file:///Users/ronakkumarsingh/Desktop/job-scraper-challenge/scraper/src/core/browserManager.ts) |
| **Markup Drift (CSS Class Renaming)** | `resolveSelectorStrategy` tries backup selectors sequentially before throwing an error. | [`resilience.ts`](file:///Users/ronakkumarsingh/Desktop/job-scraper-challenge/scraper/src/core/resilience.ts) |
| **IP Ban Protection Mid-Run** | `CircuitBreaker` trips after 3 failures and enforces a 30s pause instead of hammering the target. | [`resilience.ts`](file:///Users/ronakkumarsingh/Desktop/job-scraper-challenge/scraper/src/core/resilience.ts) |
