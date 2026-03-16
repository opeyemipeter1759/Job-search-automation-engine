"use client";

const STEPS = [
  { key: "scraping", label: "Scraping job boards", icon: "🔍" },
  { key: "scoring",  label: "Scoring with Gemini", icon: "🤖" },
  { key: "done",     label: "Done",                icon: "✅" },
];

export function SearchProgress({ step }: { step: string }) {
  const current = STEPS.findIndex(s => s.key === step);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-5">
      {/* Animated spinner */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-zinc-100 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {STEPS[current]?.label ?? "Running…"}
        </p>
        <p className="text-xs text-zinc-400 mt-1">Your agents are working</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-colors ${
              i < current ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" :
              i === current ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium" :
              "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            }`}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-px ${i < current ? "bg-emerald-300" : "bg-zinc-200 dark:bg-zinc-700"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
