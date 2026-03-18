"use client";
import { useState } from "react";
import { SkillsProfile, Source } from "@/types";
import { SOURCE_META } from "@/lib/utils";
import { ResumeUpload } from "./ResumeUpload";
import { ParsedResume } from "@/types";

const DEFAULT_PROFILE: SkillsProfile = {
  name: "",
  topSkills: [],
  yearsExperience: 3,
  preferredRoles: [],
  preferredLocations: [],
  remoteOnly: false,
  dealbreakers: [],
  keywords: [],
};

const ALL_SOURCES: Source[] = ["adzuna", "reed", "jooble", "greenhouse", "remotive", "jobberman", "hotnigeriajobs", "myjobmag"];

interface ProfileFormProps {
  onSearch: (profile: SkillsProfile, sources: Source[]) => void;
  loading: boolean;
}

function TagInput({ label, placeholder, tags, onChange }: {
  label: string; placeholder: string;
  tags: string[]; onChange: (t: string[]) => void;
}) {
  const [val, setVal] = useState("");

  function add() {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setVal("");
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg min-h-[42px]">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 text-xs bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 px-2 py-0.5 rounded-md font-medium">
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))} className="text-zinc-400 hover:text-red-500 transition-colors">×</button>
          </span>
        ))}
        <input
          className="flex-1 min-w-24 bg-transparent outline-none text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
          placeholder={tags.length === 0 ? placeholder : "Add more…"}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          onBlur={add}
        />
      </div>
      <p className="text-[10px] text-zinc-400">Press Enter or comma to add</p>
    </div>
  );
}

export function ProfileForm({ onSearch, loading }: ProfileFormProps) {
  const [profile, setProfile] = useState<SkillsProfile>(DEFAULT_PROFILE);
  const [sources, setSources] = useState<Source[]>(ALL_SOURCES);

    function handleResumeParsed(parsed: ParsedResume) {

         console.log("📄 Parsed CV data:", parsed);
  
  if (!parsed || Object.keys(parsed).length === 0) {
    alert("CV was uploaded but no data could be extracted. Try a different file.");
    return;
  }
  setProfile({
    name: parsed.name || "",
    topSkills: parsed.topSkills || [],
    yearsExperience: parsed.yearsExperience || 3,
    preferredRoles: parsed.preferredRoles || [],
    preferredLocations: [],
    remoteOnly: false,
    dealbreakers: [],
    keywords: parsed.keywords || [],
  });
}
  function toggleSource(s: Source) {
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function set<K extends keyof SkillsProfile>(key: K, val: SkillsProfile[K]) {
    setProfile(p => ({ ...p, [key]: val }));
  }

//   function handleSearch() {
//     if (profile.topSkills.length === 0) return alert("Add at least one skill.");
//     if (sources.length === 0) return alert("Select at least one source.");
//     onSearch(profile, sources);
//   }
    
    function handleSearch() {
  if (profile.topSkills.length === 0) return alert("Add at least one skill.");
  if (sources.length === 0) return alert("Select at least one source.");
  onSearch(profile, sources);
}

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your profile</h2>
        <p className="text-xs text-zinc-400 mt-0.5">The agent scores every listing against this.</p>
          </div>
          
          {/* Resume upload */}
<ResumeUpload onParsed={handleResumeParsed} />

{/* Divider */}
<div className="flex items-center gap-3">
  <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
  <span className="text-xs text-zinc-400">or fill in manually</span>
  <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
</div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Your name (optional)</label>
        <input
          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-zinc-400 dark:focus:border-zinc-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          placeholder="e.g. Tunde"
          value={profile.name}
          onChange={e => set("name", e.target.value)}
        />
      </div>

      {/* Skills */}
      <TagInput label="Top skills *" placeholder="e.g. Project Management, Excel, Python, Copywriting…"
        tags={profile.topSkills} onChange={v => set("topSkills", v)} />

      {/* Years experience */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex justify-between">
          <span>Years of experience</span>
          <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{profile.yearsExperience} yrs</span>
        </label>
        <input type="range" min={0} max={15} step={1} value={profile.yearsExperience}
          onChange={e => set("yearsExperience", Number(e.target.value))}
          className="w-full accent-zinc-900 dark:accent-zinc-100" />
      </div>

      {/* Preferred roles */}
      <TagInput label="Preferred roles" placeholder="e.g. Product Manager, Data Analyst, UX Designer, Marketer…"

        tags={profile.preferredRoles} onChange={v => set("preferredRoles", v)} />

      {/* Keywords for search */}
      <TagInput label="Search keywords *" placeholder="e.g. product manager, graphic designer, data analyst, finance…"

        tags={profile.keywords} onChange={v => set("keywords", v)} />

      {/* Dealbreakers */}
      <TagInput label="Dealbreakers" placeholder="e.g. unpaid trial, commission only, on-site Lagos…"

              tags={profile.dealbreakers} onChange={v => set( "dealbreakers", v )} />
          
  {/* Location */}
          <div className="space-y-1.5">
  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
    Preferred location
  </label>
  <input
    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-zinc-400 dark:focus:border-zinc-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
    placeholder="e.g. London, New York, Nigeria — leave blank for anywhere"
    value={profile.preferredLocations[0] ?? ""}
    onChange={(e) =>
      set("preferredLocations", e.target.value ? [e.target.value] : [])
    }
  />
</div>

      {/* Remote toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div onClick={() => set("remoteOnly", !profile.remoteOnly)}
          className={`w-10 h-5 rounded-full relative transition-colors ${profile.remoteOnly ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-transform ${profile.remoteOnly ? "translate-x-5" : "translate-x-0.5"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Remote only</p>
          <p className="text-xs text-zinc-400">Filter out non-remote listings</p>
        </div>
      </label>
          
        


      {/* Sources */}
      {/* Sources */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Sources to scan
        </label>

        {/* Global sources */}
        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">🌍 Global</p>
        <div className="space-y-2">
          {([
            { key: "adzuna",     label: "Adzuna",      desc: "Global · Nigeria + 20 countries",   color: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",    text: "text-blue-700 dark:text-blue-300" },
            { key: "reed",       label: "Reed",         desc: "UK's largest · 130k+ live jobs",    color: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30",       text: "text-red-700 dark:text-red-300" },
            { key: "jooble",     label: "Jooble",       desc: "Aggregates 140k+ sources globally", color: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300" },
            { key: "greenhouse", label: "Greenhouse",   desc: "Direct from top tech companies",    color: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
            { key: "remotive",   label: "Remotive",     desc: "Curated remote jobs only",          color: "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300" },
          ] as const).map((s) => {
            const active = sources.includes(s.key as Source);
            return (
              <div key={s.key} onClick={() => toggleSource(s.key as Source)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${active ? s.color : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-50"}`}>
                <div>
                  <p className={`text-xs font-semibold ${active ? s.text : "text-zinc-500 dark:text-zinc-400"}`}>{s.label}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{s.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100" : "border-zinc-300 dark:border-zinc-600"}`}>
                  {active && <svg className="w-2.5 h-2.5 text-white dark:text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Nigerian sources */}
        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium pt-1">🇳🇬 Nigeria</p>
        <div className="space-y-2">
          {([
            { key: "jobberman",     label: "Jobberman",      desc: "Nigeria's largest job board",        color: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30",   text: "text-green-700 dark:text-green-300" },
            { key: "hotnigeriajobs", label: "HotNigeriaJobs", desc: "Aggregates Nigerian listings",       color: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-300" },
            { key: "myjobmag",      label: "MyJobMag",        desc: "Nigeria, Ghana & Kenya roles",       color: "border-lime-200 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30",     text: "text-lime-700 dark:text-lime-300" },
          ] as const).map((s) => {
            const active = sources.includes(s.key as Source);
            return (
              <div key={s.key} onClick={() => toggleSource(s.key as Source)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${active ? s.color : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-50"}`}>
                <div>
                  <p className={`text-xs font-semibold ${active ? s.text : "text-zinc-500 dark:text-zinc-400"}`}>{s.label}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{s.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100" : "border-zinc-300 dark:border-zinc-600"}`}>
                  {active && <svg className="w-2.5 h-2.5 text-white dark:text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Searching…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Run search
          </>
        )}
      </button>
    </div>
  );
}
