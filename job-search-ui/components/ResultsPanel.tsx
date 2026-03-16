"use client";
import { useState, useMemo } from "react";
import { ScoredListing, Recommendation } from "@/types";
import { JobCard } from "./JobCard";
import { SOURCE_META } from "@/lib/utils";

interface ResultsPanelProps {
  results: ScoredListing[];
  stats: {
    scanned: number;
    scored: number;
    passed: number;
    sources: Record<string, number>;
  };
}

const REC_TABS: { value: Recommendation | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "apply", label: "Apply" },
  { value: "borderline", label: "Borderline" },
  { value: "skip", label: "Skip" },
];

export function ResultsPanel({ results, stats }: ResultsPanelProps) {
  const [rec, setRec] = useState<Recommendation | "all">("all");
  const [search, setSearch] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);

  const filtered = useMemo(() => {
    return results.filter(j => {
      if (rec !== "all" && j.recommendation !== rec) return false;
      if (remoteOnly && !j.remote) return false;
      if (j.score < minScore) return false;
      if (search) {
        const q = search.toLowerCase();
        if (![j.title, j.company, j.description, ...(j.skills ?? [])].join(" ").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [results, rec, search, remoteOnly, minScore]);

  const applyCount = results.filter(j => j.recommendation === "apply").length;
  const borderlineCount = results.filter(j => j.recommendation === "borderline").length;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Scanned", value: stats.scanned, color: "" },
          { label: "Passed filter", value: stats.passed, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Apply", value: applyCount, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Borderline", value: borderlineCount, color: "text-amber-600 dark:text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-semibold tabular-nums mt-0.5 ${s.color || "text-zinc-900 dark:text-zinc-100"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sources breakdown */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Sources</span>
        {Object.entries(stats.sources).map(([src, count]) => (
          <span key={src} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">{SOURCE_META[src as keyof typeof SOURCE_META]?.label ?? src}</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-1.5 py-0.5 tabular-nums">{count}</span>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Search title, company, skills…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Recommendation</p>
            <div className="flex gap-1.5">
              {REC_TABS.map(t => (
                <button key={t.value} onClick={() => setRec(t.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${rec === t.value ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 min-w-36">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex justify-between">
              <span>Min score</span>
              <span className="text-zinc-700 dark:text-zinc-300">{minScore}</span>
            </p>
            <input type="range" min={0} max={100} step={5} value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-full accent-zinc-900 dark:accent-zinc-100" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setRemoteOnly(!remoteOnly)}
              className={`w-9 h-5 rounded-full relative transition-colors ${remoteOnly ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-transform ${remoteOnly ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Remote only</span>
          </label>
        </div>

        <p className="text-xs text-zinc-400">
          Showing <span className="font-medium text-zinc-700 dark:text-zinc-300">{filtered.length}</span> of {results.length} results
        </p>
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-sm">No listings match your filters.</p>
          <button onClick={() => { setRec("all"); setSearch(""); setMinScore(0); setRemoteOnly(false); }}
            className="mt-2 text-xs text-zinc-500 underline underline-offset-2">Reset</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job, i) => <JobCard key={job.id} job={job} rank={i + 1} />)}
        </div>
      )}
    </div>
  );
}
