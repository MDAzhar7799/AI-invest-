/**
 * Main UI — app/page.tsx
 *
 * "use client" = this component runs in the browser (not the server).
 * The server-side work happens in /app/api/research/route.ts
 */
"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Result = {
  company:    string;
  verdict:    string;
  score:      number;
  summary:    string;
  reasons:    string[];
  keyMetrics: Record<string, string>;
};

// ─── Loading Messages (animate while waiting for agent) ───────────────────────
const STEPS = [
  "🔍  Searching financial databases...",
  "📊  Analyzing market position...",
  "📰  Reading latest news...",
  "🧠  Running investment analysis...",
  "⚖️  Weighing risks vs opportunities...",
];

// ─── Quick example buttons ────────────────────────────────────────────────────
const EXAMPLES = ["Apple", "Zomato", "Tesla", "Nvidia", "Reliance Industries"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [company,     setCompany]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [stepIndex,   setStepIndex]   = useState(0);
  const [result,      setResult]      = useState<Result | null>(null);
  const [error,       setError]       = useState("");

  // Cycle through STEPS every 2 seconds while loading
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStepIndex(i => (i + 1) % STEPS.length), 2000);
    return () => clearInterval(id);
  }, [loading]);

  // Submit handler — calls our Next.js API route
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || loading) return;

    setLoading(true);
    setStepIndex(0);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/research", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ company: company.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");
      setResult(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isInvest = result?.verdict === "INVEST";

  // Score → colour helper
  const scoreColor = (s: number) =>
    s >= 7 ? "text-emerald-400" : s >= 5 ? "text-yellow-400" : "text-red-400";

  const scoreBorder = (s: number) =>
    s >= 7
      ? "border-emerald-400 bg-emerald-400/10"
      : s >= 5
      ? "border-yellow-400 bg-yellow-400/10"
      : "border-red-400 bg-red-400/10";

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Nav ── */}
      <nav className="border-b border-white/5 sticky top-0 z-10 bg-gray-950/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <span className="font-semibold text-sm tracking-tight">Investment Agent</span>
          </div>
          <span className="text-xs text-white/30 hidden sm:block">
            LangGraph · GPT-4o-mini · Tavily
          </span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black mb-3 bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
            Should you invest?
          </h1>
          <p className="text-white/40 text-sm">
            AI agent researches any company and gives you a data-backed Invest or Pass decision
          </p>
        </div>

        {/* ── Input Form ── */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5 focus-within:border-white/20 transition">
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Enter company name (e.g. Apple, Zomato, Tesla)"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!company.trim() || loading}
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap"
            >
              {loading ? "Analyzing…" : "Analyze →"}
            </button>
          </div>
        </form>

        {/* ── Example chips ── */}
        {!result && !loading && (
          <div className="flex flex-wrap gap-2 mb-8">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setCompany(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/70 transition"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading State ── */}
        {loading && (
          <div className="border border-white/10 rounded-2xl p-10 text-center bg-white/[0.02]">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-5" />
            <p className="text-sm font-medium text-white/70 mb-1">{STEPS[stepIndex]}</p>
            <p className="text-xs text-white/30">Researching {company}…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* ── Result ── */}
        {result && !loading && (
          <div className="space-y-3">

            {/* Main Verdict Card */}
            <div className={`rounded-2xl p-6 border ${
              isInvest
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10   border-red-500/30"
            }`}>
              {/* Top row: verdict + score */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-2">
                    {result.company}
                  </p>
                  <p className={`text-5xl font-black tracking-tight ${
                    isInvest ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {isInvest ? "✅ INVEST" : "❌ PASS"}
                  </p>
                </div>

                {/* Score circle */}
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center ${scoreBorder(result.score)}`}>
                    <span className={`text-2xl font-black leading-none ${scoreColor(result.score)}`}>
                      {result.score}
                    </span>
                    <span className="text-[10px] text-white/30 mt-0.5">/10</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">Score</p>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-1.5 bg-white/10 rounded-full mb-5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isInvest ? "bg-emerald-400" : "bg-red-400"
                  }`}
                  style={{ width: `${result.score * 10}%` }}
                />
              </div>

              {/* Summary */}
              <p className="text-sm text-white/70 leading-relaxed">{result.summary}</p>
            </div>

            {/* Key Metrics Grid */}
            {Object.keys(result.keyMetrics || {}).length > 0 && (
              <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Key Metrics</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.keyMetrics).map(([key, value]) => (
                    <div key={key} className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">{key}</p>
                      <p className="text-xs text-white/80 font-medium leading-snug">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Analysis</p>
              <div className="space-y-3">
                {result.reasons.map((reason, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className={`mt-0.5 text-[10px] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                      isInvest
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {i + 1}
                    </span>
                    <p className="text-sm text-white/60 leading-relaxed">{reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer + Reset */}
            <p className="text-center text-xs text-white/20">
              AI-generated research for educational purposes only · Not financial advice
            </p>
            <button
              onClick={() => { setResult(null); setCompany(""); }}
              className="w-full py-3 text-sm text-white/30 hover:text-white/50 transition"
            >
              ← Analyze another company
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
