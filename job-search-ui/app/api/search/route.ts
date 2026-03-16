import { NextRequest, NextResponse } from "next/server";
import { SkillsProfile, ScoredListing, Source } from "@/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callGemini(prompt: string, systemInstruction: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

// ── Scrapers ──────────────────────────────────────────────────

async function fetchArbeitnow(keyword: string, remoteOnly: boolean, location: string) {
  try {
    let url = "https://www.arbeitnow.com/api/job-board-api";
    if (remoteOnly) url += "?remote=true";
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();
    const kw = keyword.toLowerCase();
    return (json.data ?? [])
      .filter((job: any) => {
        const text = `${job.title} ${job.description} ${job.tags?.join(" ")}`.toLowerCase();
        if (!text.includes(kw)) return false;
        if (location && !job.location?.toLowerCase().includes(location.toLowerCase())) return false;
        return true;
      })
      .map((job: any, i: number) => ({
        id: `arbeitnow-${job.slug ?? i}`,
        title: job.title ?? "No title",
        description: (job.description ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
        url: job.url ?? "https://arbeitnow.com",
        postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
        company: job.company_name ?? "Unknown",
        location: job.location ?? "Remote",
        source: "upwork" as Source,
        remote: job.remote ?? false,
        salary: job.salary ?? undefined,
      }));
  } catch { return []; }
}

async function fetchRemotive(keyword: string) {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}&limit=20`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const json = await res.json();
    return (json.jobs ?? []).map((job: any, i: number) => ({
      id: `remotive-${job.id ?? i}`,
      title: job.title ?? "No title",
      description: (job.description ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
      url: job.url ?? "https://remotive.com",
      postedAt: job.publication_date ?? new Date().toISOString(),
      company: job.company_name ?? "Unknown",
      location: job.candidate_required_location || "Worldwide",
      source: "wellfound" as Source,
      remote: true,
      salary: job.salary || undefined,
    }));
  } catch { return []; }
}

async function fetchTheMuse(keyword: string, location: string) {
  try {
    let url = `https://www.themuse.com/api/public/jobs?query=${encodeURIComponent(keyword)}&page=1&descending=true`;
    if (location) url += `&location=${encodeURIComponent(location)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();
    return (json.results ?? []).map((job: any, i: number) => {
      const loc = job.locations?.[0]?.name ?? "Remote";
      return {
        id: `muse-${job.id ?? i}`,
        title: job.name ?? "No title",
        description: (job.contents ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
        url: job.refs?.landing_page ?? "https://themuse.com",
        postedAt: job.publication_date ?? new Date().toISOString(),
        company: job.company?.name ?? "Unknown",
        location: loc,
        source: "linkedin" as Source,
        remote: loc.toLowerCase().includes("remote") || loc.toLowerCase().includes("flexible"),
      };
    });
  } catch { return []; }
}

async function fetchJobicy(keyword: string, location: string) {
  try {
    let url = `https://jobicy.com/api/v2/remote-jobs?count=20&tag=${encodeURIComponent(keyword)}`;
    if (location) url += `&geo=${encodeURIComponent(location)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();
    return (json.jobs ?? []).map((job: any, i: number) => ({
      id: `jobicy-${job.id ?? i}`,
      title: job.jobTitle ?? "No title",
      description: (job.jobDescription ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
      url: job.url ?? "https://jobicy.com",
      postedAt: job.pubDate ?? new Date().toISOString(),
      company: job.companyName ?? "Unknown",
      location: job.jobGeo ?? "Remote",
      source: "jobberman" as Source,
      remote: Array.isArray(job.jobType)
        ? job.jobType.some((t: any) => t?.toLowerCase().includes("remote"))
        : typeof job.jobType === "string"
        ? job.jobType.toLowerCase().includes("remote")
        : true,
      salary: job.annualSalaryMin ? `$${job.annualSalaryMin}–$${job.annualSalaryMax}` : undefined,
    }));
  } catch { return []; }
}

async function fetchWorkingNomads(keyword: string) {
  try {
    const res = await fetch(
      `https://www.workingnomads.com/api/exposed_jobs/?search=${encodeURIComponent(keyword)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const json = await res.json();
    return (json ?? []).slice(0, 15).map((job: any, i: number) => ({
      id: `nomads-${job.id ?? i}`,
      title: job.title ?? "No title",
      description: (job.description ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
      url: job.url ?? "https://workingnomads.com",
      postedAt: job.pub_date ?? new Date().toISOString(),
      company: job.company_name ?? "Unknown",
      location: job.region || "Worldwide",
      source: "myjobmag" as Source,
      remote: true,
    }));
  } catch { return []; }
}

function deduplicate(listings: any[]) {
  const seen = new Set<string>();
  return listings.filter((job) => {
    const key = `${job.title.toLowerCase().slice(0, 40)}-${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Scoring ───────────────────────────────────────────────────

async function scoreListing(
  listing: any,
  profile: SkillsProfile,
  remoteOnly: boolean,
  location: string
): Promise<ScoredListing> {
  try {
    const raw = await callGemini(
      `Score this job listing for this candidate.

CANDIDATE:
- Skills: ${profile.topSkills.join(", ")}
- Years experience: ${profile.yearsExperience}
- Preferred roles: ${profile.preferredRoles.join(", ")}
- Remote only: ${remoteOnly}
- Location preference: ${location || "anywhere"}
- Dealbreakers: ${profile.dealbreakers.join(", ") || "none"}

JOB:
Title: ${listing.title}
Company: ${listing.company}
Location: ${listing.location}
Remote: ${listing.remote}
${listing.salary ? `Salary: ${listing.salary}` : ""}
Description: ${listing.description.slice(0, 300)}`,
   `You are a job matching assistant. Return ONLY a JSON object with:
- score: number 0-100
- rationale: string (1 sentence overall summary)
- breakdown: object with these 4 keys:
    - skillsMatch: string (1 sentence — how well skills align)
    - experienceMatch: string (1 sentence — seniority and years fit)
    - locationMatch: string (1 sentence — location and remote fit)
    - roleMatch: string (1 sentence — how well the role type fits)
- recommendation: "apply" | "borderline" | "skip"
- confidence: "high" | "medium" | "low"
- skills: string[] (up to 5 skills from the listing)
- corrected: false`
    );
    return { ...listing, ...JSON.parse(raw) };
  } catch {
    return {
      ...listing,
      score: 0,
      rationale: "Scoring failed.",
      recommendation: "skip",
      confidence: "low",
      skills: [],
      corrected: false,
    };
  }
}

async function scoreInBatches(
  listings: any[],
  batchSize: number,
  profile: SkillsProfile,
  remoteOnly: boolean,
  location: string
): Promise<ScoredListing[]> {
  const results: ScoredListing[] = [];
  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    const scored = await Promise.all(
      batch.map((l) => scoreListing(l, profile, remoteOnly, location))
    );
    results.push(...scored);
  }
  return results;
}

// ── POST handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    profile,
    location = "",
    remoteOnly = false,
  }: { profile: SkillsProfile; location: string; remoteOnly: boolean } = body;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const keyword = profile.keywords[0] ?? "developer";

  // 1. Fetch all sources in parallel
  const [arbeitnow, remotive, muse, jobicy, nomads] = await Promise.all([
    fetchArbeitnow(keyword, remoteOnly, location),
    fetchRemotive(keyword),
    fetchTheMuse(keyword, location),
    fetchJobicy(keyword, location),
    fetchWorkingNomads(keyword),
  ]);

  let combined = deduplicate([...arbeitnow, ...remotive, ...muse, ...jobicy, ...nomads]);

  // 2. Apply filters
  if (remoteOnly) combined = combined.filter((j) => j.remote === true);
 if (location) {
    const loc = location.toLowerCase();
    combined = combined.filter(
      (j) => j.remote || j.location?.toLowerCase().includes(loc)
    );
  }

  // 3. Pre-filter — skip obvious mismatches before calling Gemini
  const skillKeywords = profile.topSkills.map((s) => s.toLowerCase());
  const preFiltered = combined.filter((job) => {
    const text = `${job.title} ${job.description}`.toLowerCase();
    return skillKeywords.some((skill) => text.includes(skill));
  });

  const toScore = (preFiltered.length > 0 ? preFiltered : combined).slice(0, 10);

  if (toScore.length === 0) {
    return NextResponse.json({
      results: [],
      stats: { scanned: combined.length, scored: 0, passed: 0, sources: {} },
    });
  }

  // 4. Score in parallel batches of 5
  const scored = await scoreInBatches(toScore, 5, profile, remoteOnly, location);
  const sorted = scored.sort((a, b) => b.score - a.score);

  const stats = {
    scanned: combined.length,
    scored: scored.length,
    passed: sorted.filter((l) => l.score >= 65).length,
    sources: {
      arbeitnow: arbeitnow.length,
      remotive: remotive.length,
      themuse: muse.length,
      jobicy: jobicy.length,
      workingnomads: nomads.length,
    },
  };

  return NextResponse.json({ results: sorted, stats });
}