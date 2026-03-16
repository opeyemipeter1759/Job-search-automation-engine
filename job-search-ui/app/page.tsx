"use client";

import { useState } from "react";
import { SkillsProfile, ScoredListing, Source } from "@/types";
import { ProfileForm } from "@/components/ProfileForm";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SearchProgress } from "@/components/SearchProgress";

type AppState = "idle" | "scraping" | "scoring" | "done" | "error";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [results, setResults] = useState<ScoredListing[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("scraping");

  async function handleSearch(profile: SkillsProfile, sources: Source[]) {
    setAppState("scraping");
    setStep("scraping");
    setError("");
    setResults([]);

    // Simulate step progression for UX
    const stepTimer = setTimeout(() => setStep("scoring"), 1500);

    try {
    const res = await fetch("/api/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    profile,
    sources,
    location: profile.preferredLocations[0] ?? "",
    remoteOnly: profile.remoteOnly,
  }),
});

      clearTimeout(stepTimer);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Search failed");
      }

      const data = await res.json();
      setResults(data.results);
      setStats(data.stats);
      setStep("done");
      setAppState("done");
    } catch (e: any) {
      clearTimeout(stepTimer);
      setError(e.message ?? "Something went wrong");
      setAppState("error");
    }
  }

  const loading = appState === "scraping" || appState === "scoring";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center">
              <svg className="w-4 h-4 text-white dark:text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Job Search Agent</span>
              {/* <span className="ml-2 text-xs text-zinc-400">powered by Gemini</span> */}
            </div>
          </div>

          {appState === "done" && (
            <button
              onClick={() => { setAppState("idle"); setResults([]); setStats(null); }}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New search
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero — shown only on first load */}
        {appState === "idle" && (
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Find your next role,<br />automatically.
            </h1>
            <p className="mt-2 text-zinc-400 text-sm max-w-md mx-auto">
Enter your skills and the role you are looking for. The agent searches across multiple job boards and scores every listing against your profile using Gemini AI.
            </p>
          </div>
        )}

        <div className={`grid gap-6 ${appState === "done" ? "grid-cols-1 lg:grid-cols-[320px_1fr]" : "grid-cols-1 max-w-xl mx-auto"}`}>
          {/* Left: profile form — always visible */}
          <div className={appState === "done" ? "lg:sticky lg:top-20 lg:self-start" : ""}>
            <ProfileForm onSearch={handleSearch} loading={loading} />
          </div>

          {/* Right: results / progress / error */}
          {loading && (
            <div>
              <SearchProgress step={step} />
            </div>
          )}

          {appState === "error" && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Search failed</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
              <button onClick={() => setAppState("idle")}
                className="mt-3 text-xs text-red-600 dark:text-red-400 underline underline-offset-2">
                Try again
              </button>
            </div>
          )}

          {appState === "done" && stats && (
            <ResultsPanel results={results} stats={stats} />
          )}
        </div>
      </main>
    </div>
  );
}
