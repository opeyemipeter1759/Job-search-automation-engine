"use client";
import { getScoreColor, getScoreRingColor } from "@/lib/utils";

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const dim = { sm: "w-10 h-10 text-xs", md: "w-13 h-13 text-sm", lg: "w-16 h-16 text-base" }[size];

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${dim} w-12 h-12`}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor"
          strokeWidth="3" className="text-zinc-100 dark:text-zinc-800" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={getScoreRingColor(score)}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <span className={`relative font-semibold tabular-nums ${getScoreColor(score)}`}>
        {score}
      </span>
    </div>
  );
}
