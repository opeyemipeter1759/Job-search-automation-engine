"use client";
import { useState } from "react";
import { ScoredListing } from "@/types";
import { ScoreBadge } from "./ScoreBadge";
import { getRecBadge, SOURCE_META, formatTimeAgo } from "@/lib/utils";

export function JobCard({ job, rank }: { job: ScoredListing; rank: number }) {
  const [open, setOpen] = useState(false);
  const src = SOURCE_META[job.source];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
      <div className="p-4 flex gap-3">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="text-[10px] tabular-nums text-zinc-300 dark:text-zinc-600 font-medium">#{rank}</span>
          <ScoreBadge score={job.score} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">{job.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{job.company}</p>
            </div>
            <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getRecBadge(job.recommendation)}`}>
              {job.recommendation}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${src.color}`}>{src.label}</span>

            <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {job.location}
            </span>

            {job.remote && (
              <span className="text-xs bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">Remote</span>
            )}
            {job.salary && (
              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">{job.salary}</span>
            )}
            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">{formatTimeAgo(job.postedAt)}</span>
          </div>

          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{job.rationale}</p>

          {job.corrected && (
            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Score revised by self-critique
            </p>
          )}

          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.skills.map(s => (
                <span key={s} className="text-[11px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md font-medium">{s}</span>
              ))}
            </div>
          )}

          {open && (
            <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-3">{job.description}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <button onClick={() => setOpen(!open)}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1">
          {open ? "Less" : "Full description"}
          <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <a href={job.url} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1.5">
          Apply
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
