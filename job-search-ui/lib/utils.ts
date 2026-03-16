import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Recommendation, Source } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 65) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

export function getScoreRingColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
}

export function getRecBadge(rec: Recommendation) {
  switch (rec) {
    case "apply":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "borderline":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "skip":
      return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

export const SOURCE_META: Record<Source, { label: string; color: string }> = {
  upwork:    { label: "Upwork",    color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  linkedin:  { label: "LinkedIn",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  wellfound: { label: "Wellfound", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  jobberman: { label: "Jobberman", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  myjobmag:  { label: "MyJobMag",  color: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" },
};

export function formatTimeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d >= 7) return `${Math.floor(d / 7)}w ago`;
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  return "just now";
}
