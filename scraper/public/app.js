/* ═══════════════════════════════════════════
   JobPulse — Frontend Application
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── State ──
  let activeSource = "all";
  let isLoading = false;
  let scrapeTimerInterval = null;
  let scrapeStartTime = 0;

  // ── DOM References ──
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const searchBtn = $("#search-btn");
  const searchKeyword = $("#search-keyword");
  const searchLocation = $("#search-location");
  const sourcePills = $$("#source-pills .pill");
  const scrapeStatus = $("#scrape-status");
  const scrapeStatusText = $("#scrape-status-text");
  const scrapeTimer = $("#scrape-timer");
  const resultsSummary = $("#results-summary");
  const resultsCount = $("#results-count");
  const resultsSources = $("#results-sources");
  const resultsTime = $("#results-time");
  const jobsGrid = $("#jobs-grid");
  const jobsEmpty = $("#jobs-empty");
  const themeToggle = $("#theme-toggle");
  const themeIcon = $("#theme-icon");
  const refreshTelemetry = $("#refresh-telemetry");
  const matrixCanvas = $("#matrix-canvas");

  // ── Theme ──
  function initTheme() {
    const saved = localStorage.getItem("jobpulse-theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
      themeIcon.textContent = saved === "light" ? "☀️" : "🌙";
    }
  }

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("jobpulse-theme", next);
    themeIcon.textContent = next === "light" ? "☀️" : "🌙";
  });

  initTheme();

  // ── Source Pills ──
  sourcePills.forEach((pill) => {
    pill.addEventListener("click", () => {
      sourcePills.forEach((p) => p.classList.remove("pill--active"));
      pill.classList.add("pill--active");
      activeSource = pill.dataset.source;
    });
  });

  // ── Scrape Timer ──
  function startScrapeTimer() {
    scrapeStartTime = Date.now();
    scrapeTimerInterval = setInterval(() => {
      const elapsed = ((Date.now() - scrapeStartTime) / 1000).toFixed(1);
      scrapeTimer.textContent = elapsed + "s";
    }, 100);
  }

  function stopScrapeTimer() {
    if (scrapeTimerInterval) {
      clearInterval(scrapeTimerInterval);
      scrapeTimerInterval = null;
    }
  }

  // ── Status Messages ──
  const statusMessages = [
    "Initializing stealth browser contexts…",
    "Rotating identity pool…",
    "Applying jittered pacing delays…",
    "Navigating to source endpoints…",
    "Executing JS fingerprint bypass…",
    "Resolving selector strategies…",
    "Extracting job listings…",
    "Deduplicating results…",
  ];

  function cycleStatusMessages() {
    let i = 0;
    return setInterval(() => {
      scrapeStatusText.textContent = statusMessages[i % statusMessages.length];
      i++;
    }, 2500);
  }

  // ── Fetch Jobs ──
  async function fetchJobs() {
    if (isLoading) return;
    isLoading = true;

    const keyword = searchKeyword.value.trim() || "Software Engineer";
    const location = searchLocation.value.trim() || "India";

    // Show loading state
    scrapeStatus.style.display = "flex";
    resultsSummary.style.display = "none";
    jobsGrid.innerHTML = "";
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<span class="search-bar__btn-icon">⏳</span> Scraping…';

    startScrapeTimer();
    const msgCycler = cycleStatusMessages();

    try {
      const params = new URLSearchParams({
        source: activeSource,
        q: keyword,
        loc: location,
        limit: "25",
      });

      const response = await fetch(`/api/jobs?${params}`);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const { jobs, meta } = data;
      const durationMs = Date.now() - scrapeStartTime;

      // Stop loading
      stopScrapeTimer();
      clearInterval(msgCycler);
      scrapeStatus.style.display = "none";

      // Show results summary
      resultsSummary.style.display = "block";
      resultsCount.textContent = jobs.length;
      resultsSources.textContent = meta.sources ? meta.sources.length : 1;
      resultsTime.textContent = durationMs;

      // Render job cards
      renderJobs(jobs);

      // Refresh telemetry
      fetchTelemetry();
    } catch (err) {
      stopScrapeTimer();
      clearInterval(msgCycler);
      scrapeStatus.style.display = "none";

      jobsGrid.innerHTML = `
        <div class="error-banner" style="grid-column: 1/-1;">
          ⚠️ Scrape failed: ${escapeHtml(err.message)}
          <br><small>Make sure the scraper server is running on port 5000.</small>
        </div>
      `;
    } finally {
      isLoading = false;
      searchBtn.disabled = false;
      searchBtn.innerHTML =
        '<span class="search-bar__btn-icon">🔍</span> Scrape Now';
    }
  }

  // ── Render Jobs ──
  function renderJobs(jobs) {
    if (!jobs || jobs.length === 0) {
      jobsGrid.innerHTML = `
        <div class="jobs-grid__empty">
          <div class="jobs-grid__empty-icon">📭</div>
          <p>No jobs found. Try different keywords or sources.</p>
        </div>
      `;
      return;
    }

    jobsGrid.innerHTML = jobs
      .map((job, i) => {
        const sourceClass = (job.source || "Mock-Target")
          .toLowerCase()
          .replace("-target", "")
          .replace(/\s/g, "");
        const sourceName = job.source || "Mock-Target";

        const metaItems = [];
        if (job.location) metaItems.push(`📍 ${escapeHtml(job.location)}`);
        if (job.experience) metaItems.push(`💼 ${escapeHtml(job.experience)}`);
        if (job.salary) metaItems.push(`💰 ${escapeHtml(job.salary)}`);

        const tags = (job.tags || [])
          .slice(0, 5)
          .map((t) => `<span class="job-card__tag">${escapeHtml(t)}</span>`)
          .join("");

        return `
          <div class="job-card" style="animation-delay: ${i * 50}ms;">
            <span class="job-card__source job-card__source--${sourceClass}">
              ${sourceName}
            </span>
            <h3 class="job-card__title">
              <a href="${escapeHtml(job.sourceUrl)}" target="_blank" rel="noopener">
                ${escapeHtml(job.title)}
              </a>
            </h3>
            <div class="job-card__company">${escapeHtml(job.company)}</div>
            <div class="job-card__meta">
              ${metaItems.map((m) => `<span class="job-card__meta-item">${m}</span>`).join("")}
            </div>
            ${job.description ? `<p class="job-card__desc">${escapeHtml(job.description)}</p>` : ""}
            ${tags ? `<div class="job-card__tags">${tags}</div>` : ""}
            <div class="job-card__footer">
              <span class="job-card__date">${job.postedDate ? escapeHtml(job.postedDate) : formatTime(job.scrapedAt)}</span>
              <a href="${escapeHtml(job.sourceUrl)}" target="_blank" rel="noopener" class="job-card__link">
                Apply → 
              </a>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ── Telemetry ──
  async function fetchTelemetry() {
    try {
      const res = await fetch("/api/telemetry");
      if (!res.ok) return;
      const data = await res.json();

      // Circuit Breaker
      const cbDot = $("#tele-circuit .status-dot");
      const cbText = $("#cb-status-text");
      const cbFailures = $("#cb-failures");
      const cbCooldown = $("#cb-cooldown");

      if (data.circuitBreaker.isOpen) {
        cbDot.className = "status-dot status-dot--red";
        cbText.textContent = "Open (Tripped!)";
      } else {
        cbDot.className = "status-dot status-dot--green";
        cbText.textContent = "Closed (Healthy)";
      }
      cbFailures.textContent = data.circuitBreaker.failureCount;
      cbCooldown.textContent = data.circuitBreaker.cooldownRemainingMs + "ms";

      // Identity Pool
      $("#id-available").textContent = data.identityPool.available;
      $("#id-total").textContent = data.identityPool.total;

      const bars = data.identityPool.identities
        .map((id) => {
          const maxReqs = Math.max(
            ...data.identityPool.identities.map((i) => i.requestCount),
            1
          );
          const pct = Math.round((id.requestCount / maxReqs) * 100);
          const statusClass = id.isCoolingDown
            ? "identity-bar__status--cooldown"
            : "identity-bar__status--active";

          return `
            <div class="identity-bar">
              <span class="identity-bar__label">${escapeHtml(id.id)}</span>
              <div class="identity-bar__track">
                <div class="identity-bar__fill" style="width: ${pct}%"></div>
              </div>
              <span class="identity-bar__status ${statusClass}"></span>
            </div>
          `;
        })
        .join("");

      $("#identity-bars").innerHTML = bars;

      // Last Scrape
      if (data.lastScrape) {
        $("#ls-source").textContent = data.lastScrape.source;
        $("#ls-count").textContent = data.lastScrape.jobCount;
        $("#ls-duration").textContent = data.lastScrape.durationMs + "ms";
        $("#ls-status").textContent = data.lastScrape.status;
      }
    } catch {
      // Silently ignore telemetry fetch errors
    }
  }

  // ── Event Listeners ──
  searchBtn.addEventListener("click", fetchJobs);

  searchKeyword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchJobs();
  });

  searchLocation.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchJobs();
  });

  refreshTelemetry.addEventListener("click", fetchTelemetry);

  // ── Smooth Scroll for nav links ──
  $$("a[href^='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // ── Easter Egg: Konami Code ──
  const konamiCode = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
    "KeyB", "KeyA",
  ];
  let konamiIndex = 0;
  let matrixActive = false;

  document.addEventListener("keydown", (e) => {
    if (e.code === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        konamiIndex = 0;
        toggleMatrix();
      }
    } else {
      konamiIndex = 0;
    }
  });

  function toggleMatrix() {
    matrixActive = !matrixActive;
    if (matrixActive) {
      matrixCanvas.classList.add("matrix-canvas--active");
      startMatrix();
    } else {
      matrixCanvas.classList.remove("matrix-canvas--active");
    }
  }

  function startMatrix() {
    const ctx = matrixCanvas.getContext("2d");
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    const chars = "ジョブパルス01アイデンティティ回転ステルス";
    const fontSize = 14;
    const columns = Math.floor(matrixCanvas.width / fontSize);
    const drops = Array(columns).fill(1);

    function draw() {
      if (!matrixActive) return;

      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      ctx.fillStyle = "#818cf8";
      ctx.font = fontSize + "px JetBrains Mono, monospace";

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      requestAnimationFrame(draw);
    }

    draw();

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      matrixActive = false;
      matrixCanvas.classList.remove("matrix-canvas--active");
    }, 8000);
  }

  window.addEventListener("resize", () => {
    if (matrixActive) {
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
    }
  });

  // ── Helpers ──
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(isoStr) {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  }

  // ── Initial telemetry fetch ──
  fetchTelemetry();

  // ── Nav scroll effect ──
  const nav = $("#nav");
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 100) {
      nav.style.boxShadow = "0 4px 30px rgba(0, 0, 0, 0.15)";
    } else {
      nav.style.boxShadow = "none";
    }
    lastScroll = currentScroll;
  });
})();
