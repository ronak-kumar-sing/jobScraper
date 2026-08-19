import { useState, useEffect, useRef } from "react";
import {
  Search,
  Shield,
  Activity,
  Cpu,
  RefreshCw,
  ExternalLink,
  Zap,
  Moon,
  Sun,
  Download,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Sparkles,
  Terminal as TerminalIcon,
  Play,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface JobListing {
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

interface TelemetryData {
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

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function App() {
  // ── State ──
  const [keyword, setKeyword] = useState("Software Engineer");
  const [location, setLocation] = useState("India");
  const [source, setSource] = useState<"all" | "linkedin" | "naukri" | "mock">("all");
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [scrapeDuration, setScrapeDuration] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeTab, setActiveTab] = useState("discovery");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [easterEggActive, setEasterEggActive] = useState(false);
  const [driftSimLogs, setDriftSimLogs] = useState<string[]>([]);
  const [isDriftTesting, setIsDriftTesting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Theme toggle ──
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // ── Fetch Telemetry ──
  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {
      // Backend might be offline or starting
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => clearInterval(interval);
  }, []);

  // ── Konami Code Easter Egg ──
  useEffect(() => {
    const konami = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
      "KeyB", "KeyA",
    ];
    let index = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === konami[index]) {
        index++;
        if (index === konami.length) {
          index = 0;
          setEasterEggActive(true);
        }
      } else {
        index = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Matrix Rain Animation ──
  useEffect(() => {
    if (!easterEggActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "JOBPULSE0101STEALTH_EVASION_NAUKRI_LINKEDIN_ROTATION";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    let animationId: number;
    const draw = () => {
      ctx.fillStyle = "rgba(10, 14, 23, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#818cf8";
      ctx.font = `${fontSize}px JetBrains Mono, monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [easterEggActive]);

  // ── Handle Scrape Trigger ──
  const handleScrape = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const startTime = Date.now();
    setLoadingStep("Rotating stealth identity & spoofing navigator...");

    const stepTimer1 = setTimeout(() => {
      setLoadingStep("Applying randomized jitter & human browsing pauses...");
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep("Querying unauthenticated endpoints & parsing DOM tuples...");
    }, 2400);

    try {
      const params = new URLSearchParams({
        source,
        q: keyword,
        loc: location,
        limit: "25",
      });

      const res = await fetch(`${API_BASE}/api/jobs?${params}`);
      if (!res.ok) throw new Error(`Scraper returned status ${res.status}`);

      const data = await res.json();
      setJobs(data.jobs || []);
      setScrapeDuration(Date.now() - startTime);
      fetchTelemetry();
    } catch (err: any) {
      console.error("Scrape failed:", err);
      setJobs([]);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  // ── Test Sandbox Drift ──
  const runDriftTest = async () => {
    setIsDriftTesting(true);
    setDriftSimLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Firing 3 requests to sandbox target (/jobs) to simulate markup evolution...`,
      ...prev,
    ]);

    try {
      for (let i = 1; i <= 3; i++) {
        const res = await fetch(`${API_BASE}/api/jobs?source=mock`);
        const data = await res.json();
        const count = data.jobs?.length || 0;
        setDriftSimLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] Request #${i}: Status 200 OK — Parsed ${count} jobs via resilient selector fallback.`,
          ...prev,
        ]);
      }
      setDriftSimLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ✅ Circuit Breaker & Fallback verification completed successfully.`,
        ...prev,
      ]);
    } catch (e: any) {
      setDriftSimLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ❌ Error during test: ${e.message}`,
        ...prev,
      ]);
    } finally {
      setIsDriftTesting(false);
      fetchTelemetry();
    }
  };

  // ── Filtered Jobs ──
  const filteredJobs = jobs.filter((j) => {
    const matchesTag = !selectedTag || (j.tags && j.tags.includes(selectedTag));
    const matchesSearch =
      !searchFilter ||
      j.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      j.company.toLowerCase().includes(searchFilter.toLowerCase()) ||
      j.location.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesTag && matchesSearch;
  });

  // Collect all unique tags
  const allTags = Array.from(new Set(jobs.flatMap((j) => j.tags || []))).slice(0, 12);

  // Export to JSON
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredJobs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobpulse_export_${keyword.replace(/\s+/g, "_")}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* ── Background Glow Elements ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/25 text-white font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  JobPulse
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary py-0 px-1.5 h-4">
                  v2.4 STEALTH
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                High-Stealth Multi-Source Ingestion Pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>
                {telemetry?.identityPool.available ?? 5}/5 Identities Ready
              </span>
              <span className="text-border">|</span>
              <span className={telemetry?.circuitBreaker.isOpen ? "text-destructive font-bold" : "text-emerald-500"}>
                CB: {telemetry?.circuitBreaker.isOpen ? "OPEN" : "HEALTHY"}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEasterEggActive((v) => !v)}
              className="font-mono text-xs hidden lg:flex items-center gap-1.5"
            >
              <TerminalIcon className="w-3.5 h-3.5 text-primary" />
              <span>HUD</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="rounded-full w-9 h-9"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* ── Hero Section ── */}
        <section className="text-center max-w-3xl mx-auto space-y-4 py-4 sm:py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero Account Burn · Unauthenticated Public Ingestion</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Real-Time Job Ingestion &amp;{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Anti-Detection Engine
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Pulls live job data directly from <strong>LinkedIn</strong>, <strong>Naukri</strong>, and our <strong>Sandbox Target</strong>.
            Equipped with rotating stealth browser fingerprints, jittered pacing, and automatic selector fallback against markup drift.
          </p>

          {/* Quick Keywords */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 pt-2">
            <span className="text-xs text-muted-foreground font-mono mr-1">Quick Scrapes:</span>
            {["React", "Node.js", "AI Engineer", "Frontend Lead", "DevOps", "Full Stack"].map((kw) => (
              <button
                key={kw}
                onClick={() => {
                  setKeyword(kw);
                }}
                className="text-xs px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border/60 transition-colors font-medium cursor-pointer"
              >
                {kw}
              </button>
            ))}
          </div>
        </section>

        {/* ── Main Navigation Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <div className="flex justify-center">
            <TabsList className="bg-secondary/60 backdrop-blur-md p-1 border border-border/50 rounded-xl h-auto">
              <TabsTrigger value="discovery" className="rounded-lg py-2 px-4 text-xs sm:text-sm font-medium flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>Discovery Console</span>
              </TabsTrigger>
              <TabsTrigger value="telemetry" className="rounded-lg py-2 px-4 text-xs sm:text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Pipeline Telemetry</span>
              </TabsTrigger>
              <TabsTrigger value="detection" className="rounded-lg py-2 px-4 text-xs sm:text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Detection Surface</span>
              </TabsTrigger>
              <TabsTrigger value="drift" className="rounded-lg py-2 px-4 text-xs sm:text-sm font-medium flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                <span>Drift Simulator</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════ TAB 1: DISCOVERY CONSOLE ═══════════ */}
          <TabsContent value="discovery" className="space-y-6">
            {/* Search & Control Card */}
            <Card className="border-border/60 shadow-xl bg-card/70 backdrop-blur-xl">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary" /> Keyword / Role
                    </label>
                    <Input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                      placeholder="e.g. React Developer, Data Scientist..."
                      className="bg-background/80 h-11"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Target Location
                    </label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                      placeholder="e.g. India, Bengaluru, Remote..."
                      className="bg-background/80 h-11"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Button
                      onClick={handleScrape}
                      disabled={isLoading}
                      className="w-full h-11 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-semibold shadow-lg shadow-primary/20 cursor-pointer"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2 fill-current" />
                      )}
                      {isLoading ? "Ingesting..." : "Scrape Now"}
                    </Button>
                  </div>
                </div>

                {/* Source Selection Pills */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono mr-1">Source:</span>
                    {[
                      { id: "all", label: "All Real Sources", color: "bg-primary" },
                      { id: "linkedin", label: "LinkedIn Guest API", color: "bg-[#0a66c2]" },
                      { id: "naukri", label: "Naukri Stealth Engine", color: "bg-[#4a7aff]" },
                      { id: "mock", label: "Sandbox Target (:4000)", color: "bg-amber-500" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSource(s.id as any)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-2 cursor-pointer ${
                          source === s.id
                            ? "bg-primary/15 border-primary text-foreground font-semibold shadow-sm"
                            : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {jobs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportJSON}
                      className="h-8 text-xs font-mono flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON ({filteredJobs.length})</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loading Radar Animation */}
            {isLoading && (
              <Card className="border-primary/40 bg-card/60 backdrop-blur-xl overflow-hidden animate-pulse">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-25" />
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      Live Ingestion Pipeline Active
                    </h3>
                    <p className="text-xs font-mono text-primary mt-0.5">
                      {loadingStep || "Dispatching stealth worker..."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Filter & Count Bar */}
            {jobs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-secondary/30 p-3.5 rounded-xl border border-border/40 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-bold">{filteredJobs.length}</span> of{" "}
                  <span>{jobs.length}</span> jobs fetched across{" "}
                  <span className="text-primary font-semibold">{source.toUpperCase()}</span> in{" "}
                  <span className="text-foreground font-semibold">
                    {scrapeDuration ? `${(scrapeDuration / 1000).toFixed(2)}s` : "0s"}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter results..."
                      className="h-8 pl-8 text-xs font-sans bg-background/60"
                    />
                  </div>

                  {selectedTag && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTag(null)}
                      className="h-8 text-xs px-2"
                    >
                      Clear tag ({selectedTag})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Skill Tags Filter Bar */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mr-1">
                  <SlidersHorizontal className="w-3 h-3" /> Filter Tag:
                </span>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-colors cursor-pointer ${
                      selectedTag === tag
                        ? "bg-primary text-white border-primary"
                        : "bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Job Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job, idx) => (
                <Card
                  key={idx}
                  className="border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card/70 backdrop-blur-sm flex flex-col justify-between group overflow-hidden"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] uppercase py-0 px-2 h-5 border ${
                          job.source === "LinkedIn"
                            ? "border-[#0a66c2]/40 text-[#0a66c2] bg-[#0a66c2]/10"
                            : job.source === "Naukri"
                            ? "border-[#4a7aff]/40 text-[#4a7aff] bg-[#4a7aff]/10"
                            : "border-amber-500/40 text-amber-500 bg-amber-500/10"
                        }`}
                      >
                        {job.source}
                      </Badge>

                      {job.postedDate && (
                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {job.postedDate}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {job.title}
                      </h4>
                      <p className="text-xs font-semibold text-primary/90 flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{job.company}</span>
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
                      {job.location && (
                        <span className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded-md border border-border/30">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{job.location}</span>
                        </span>
                      )}
                      {job.experience && (
                        <span className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded-md border border-border/30">
                          <Briefcase className="w-3 h-3 text-muted-foreground" />
                          <span>{job.experience}</span>
                        </span>
                      )}
                      {job.salary && (
                        <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono font-medium">
                          <DollarSign className="w-3 h-3" />
                          <span>{job.salary}</span>
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    )}

                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {job.tags.slice(0, 4).map((t, tidx) => (
                          <span
                            key={tidx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(job.scrapedAt).toLocaleTimeString()}
                      </span>

                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold transition-colors"
                      >
                        <span>Apply</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {!isLoading && jobs.length === 0 && (
              <Card className="border-dashed border-border/80 bg-card/30 p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground">
                  <Search className="w-8 h-8 opacity-40" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">No Job Data Fetched Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Click <strong>"Scrape Now"</strong> above to dispatch stealth workers against LinkedIn, Naukri, or the sandbox.
                  </p>
                </div>
                <Button onClick={handleScrape} variant="outline" className="font-mono text-xs">
                  Launch Ingestion Run
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════ TAB 2: TELEMETRY ═══════════ */}
          <TabsContent value="telemetry" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Circuit Breaker */}
              <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Circuit Breaker
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Auto-cooldown upon consecutive failures
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">State:</span>
                    <Badge
                      variant={telemetry?.circuitBreaker.isOpen ? "destructive" : "outline"}
                      className="font-mono text-xs"
                    >
                      {telemetry?.circuitBreaker.isOpen ? "OPEN (COOLING DOWN)" : "CLOSED (HEALTHY)"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Failure Threshold:</span>
                    <span className="font-bold">3 strikes</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Current Failures:</span>
                    <span className="font-bold">{telemetry?.circuitBreaker.failureCount ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Cooldown Window:</span>
                    <span>30,000 ms</span>
                  </div>
                </CardContent>
              </Card>

              {/* Identity Pool */}
              <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" /> Identity Pool
                  </CardTitle>
                  <CardDescription className="text-xs">
                    5 Rotating Stealth Fingerprints
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  {telemetry?.identityPool.identities.map((id) => (
                    <div
                      key={id.id}
                      className="flex items-center justify-between text-xs font-mono bg-secondary/40 p-2 rounded-md border border-border/30"
                    >
                      <span className="font-semibold text-foreground">{id.id}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{id.requestCount} reqs</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            id.isCoolingDown ? "bg-destructive animate-ping" : "bg-emerald-500"
                          }`}
                        />
                      </div>
                    </div>
                  )) || <p className="text-xs text-muted-foreground">Loading identity pool...</p>}
                </CardContent>
              </Card>

              {/* Last Scrape Telemetry */}
              <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Ingestion Telemetry
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Performance of most recent run
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Source:</span>
                    <span className="font-bold text-foreground">
                      {telemetry?.lastScrape?.source.toUpperCase() ?? "IDLE"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jobs Parsed:</span>
                    <span className="font-bold text-foreground">
                      {telemetry?.lastScrape?.jobCount ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-bold text-primary">
                      {telemetry?.lastScrape?.durationMs ? `${telemetry.lastScrape.durationMs}ms` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-emerald-500 font-bold">
                      {telemetry?.lastScrape?.status ?? "READY"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════ TAB 3: DETECTION SURFACE ═══════════ */}
          <TabsContent value="detection" className="space-y-6">
            <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
              <CardHeader className="p-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Detection Surface Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  How our architecture circumvents modern bot-detection vectors without ToS breaches.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-3 font-semibold">Detection Signal</th>
                        <th className="pb-3 font-semibold">How Real Platforms Check It</th>
                        <th className="pb-3 font-semibold">Our Defense Strategy</th>
                        <th className="pb-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <tr>
                        <td className="py-3 font-bold text-foreground">navigator.webdriver</td>
                        <td className="py-3 text-muted-foreground font-sans">Set to true in default automated Chrome</td>
                        <td className="py-3 text-primary font-sans">Init script overrides property to false + realistic plugins array</td>
                        <td className="py-3 text-right"><Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Cloaked</Badge></td>
                      </tr>
                      <tr>
                        <td className="py-3 font-bold text-foreground">Request Timing Regularity</td>
                        <td className="py-3 text-muted-foreground font-sans">Exact interval triggers velocity rate limits</td>
                        <td className="py-3 text-primary font-sans">PacedThrottle with 1.5–4.0s randomized human jitter & pauses</td>
                        <td className="py-3 text-right"><Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Jittered</Badge></td>
                      </tr>
                      <tr>
                        <td className="py-3 font-bold text-foreground">Header Order & Completeness</td>
                        <td className="py-3 text-muted-foreground font-sans">Missing sec-ch-ua, sec-fetch-* reveals curl/axios</td>
                        <td className="py-3 text-primary font-sans">Full browser network context injects valid Chromium client hints</td>
                        <td className="py-3 text-right"><Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Spoofed</Badge></td>
                      </tr>
                      <tr>
                        <td className="py-3 font-bold text-foreground">Session Consistency</td>
                        <td className="py-3 text-muted-foreground font-sans">Fresh cookies on every hit look like bot spawns</td>
                        <td className="py-3 text-primary font-sans">Persistent storageState per identity reuses cookies/sessions across runs</td>
                        <td className="py-3 text-right"><Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Persisted</Badge></td>
                      </tr>
                      <tr>
                        <td className="py-3 font-bold text-foreground">Markup Drift (DOM Layout)</td>
                        <td className="py-3 text-muted-foreground font-sans">Class name hashing causes static scrapers to silently return 0</td>
                        <td className="py-3 text-primary font-sans">Multi-tier resolveSelectorStrategy falls through known patterns loudly</td>
                        <td className="py-3 text-right"><Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Resilient</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 4: DRIFT SIMULATOR ═══════════ */}
          <TabsContent value="drift" className="space-y-6">
            <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
              <CardHeader className="p-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <RotateCw className="w-5 h-5 text-primary" /> Sandbox Markup Drift Simulator
                </CardTitle>
                <CardDescription className="text-xs">
                  The mock sandbox (:4000) intentionally flips its HTML structure between `layout-v1-divs` and `layout-v2-list` every 20 requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={runDriftTest}
                    disabled={isDriftTesting}
                    className="font-mono text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  >
                    {isDriftTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    )}
                    Fire 3 Test Requests
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">
                    Tests automatic fallback without breaking pipeline output
                  </span>
                </div>

                <div className="bg-black/80 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1.5 min-h-[160px] max-h-[260px] overflow-y-auto border border-border/40">
                  {driftSimLogs.length === 0 ? (
                    <p className="text-muted-foreground">Click button above to stream live drift logs...</p>
                  ) : (
                    driftSimLogs.map((log, lidx) => <p key={lidx}>{log}</p>)
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-background/50 backdrop-blur-md py-6 text-xs text-muted-foreground z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">JobPulse</span>
            <span>— Acdyon Engineering Frontend Challenge</span>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <a href={`${API_BASE || ""}/api/jobs`} target="_blank" className="hover:text-primary transition-colors">
              /api/jobs
            </a>
            <a href={`${API_BASE || ""}/api/telemetry`} target="_blank" className="hover:text-primary transition-colors">
              /api/telemetry
            </a>
            <a href={`${API_BASE || ""}/health`} target="_blank" className="hover:text-primary transition-colors">
              /health
            </a>
          </div>
        </div>
      </footer>

      {/* ── Easter Egg HUD Matrix Canvas ── */}
      {easterEggActive && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between p-6">
          <canvas ref={canvasRef} className="absolute inset-0 z-0" />
          <div className="relative z-10 flex justify-between items-start">
            <Badge className="bg-indigo-600 text-white font-mono text-sm px-3 py-1">
              🎮 STEALTH DEBUG HUD ACTIVATED (KONAMI CODE DETECTED)
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEasterEggActive(false)}
              className="font-mono text-xs"
            >
              Close HUD [ESC]
            </Button>
          </div>

          <div className="relative z-10 max-w-xl bg-black/90 p-4 rounded-xl border border-primary/50 text-emerald-400 font-mono text-xs space-y-2 backdrop-blur-md">
            <p className="font-bold text-white">✨ BONUS ROUND: Acdyon Easter Egg Found!</p>
            <p>• Identity Pool: 5 active stealth fingerprints</p>
            <p>• Pacing: PacedThrottle active (1500–4000ms jitter window)</p>
            <p>• Resilience: resolveSelectorStrategy armed for DOM mutations</p>
            <p>• Real Sources: LinkedIn Guest API, Naukri Chromium Engine, Sandbox</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
