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

export const SOURCE_META: Record<Source, {
  label: string;
  color: string;
  bg: string;
  description: string;
  badge: string;
}> = {
  adzuna: {
    label: "Adzuna",
    color: "text-blue-800 dark:text-blue-200",
    bg: "bg-blue-100 dark:bg-blue-900/40",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    description: "Global job board · Nigeria + 20 countries",
  },
  reed: {
    label: "Reed",
    color: "text-red-800 dark:text-red-200",
    bg: "bg-red-100 dark:bg-red-900/40",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    description: "UK's largest job site · 130k+ live jobs",
  },
  jooble: {
    label: "Jooble",
    color: "text-orange-800 dark:text-orange-200",
    bg: "bg-orange-100 dark:bg-orange-900/40",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    description: "Aggregates 140k+ sources globally",
  },
  greenhouse: {
    label: "Greenhouse",
    color: "text-emerald-800 dark:text-emerald-200",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    description: "Direct from top tech companies · no middleman",
  },
  remotive: {
    label: "Remotive",
    color: "text-violet-800 dark:text-violet-200",
    bg: "bg-violet-100 dark:bg-violet-900/40",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    description: "Curated remote jobs only",
  },
  arbeitnow: {
    label: "Arbeitnow",
    color: "text-zinc-800 dark:text-zinc-200",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    badge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
    description: "European & global tech roles",
  },
  themuse: {
    label: "The Muse",
    color: "text-pink-800 dark:text-pink-200",
    bg: "bg-pink-100 dark:bg-pink-900/40",
    badge: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
    description: "Culture-first jobs · all industries",
  },
  workingnomads: {
    label: "Working Nomads",
    color: "text-teal-800 dark:text-teal-200",
    bg: "bg-teal-100 dark:bg-teal-900/40",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
    description: "Remote-only · curated for nomads",
    },
  jobberman: {
    label: "Jobberman",
    color: "text-green-800 dark:text-green-200",
    bg: "bg-green-100 dark:bg-green-900/40",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    description: "Nigeria's largest job board",
  },
  hotnigeriajobs: {
    label: "HotNigeriaJobs",
    color: "text-yellow-800 dark:text-yellow-200",
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
    description: "Aggregates Nigerian job listings",
  },
  myjobmag: {
    label: "MyJobMag",
    color: "text-lime-800 dark:text-lime-200",
    bg: "bg-lime-100 dark:bg-lime-900/40",
    badge: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200",
    description: "Nigeria, Ghana & Kenya roles",
  },
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
