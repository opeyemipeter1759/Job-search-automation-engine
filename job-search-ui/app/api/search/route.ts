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

// ── Real scraper using Arbeitnow free API ──
async function fetchRealJobs(keyword: string) {
  const [arbeitnow, remotive, muse] = await Promise.all([
    fetchArbeitnow(keyword),
    fetchRemotive(keyword),
    fetchTheMuse(keyword),
  ]);

  const combined = [...arbeitnow, ...remotive, ...muse];

  // Deduplicate by title+company
  const seen = new Set<string>();
  return combined.filter((job) => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchArbeitnow(keyword: string) {
  try {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const json = await res.json();
    const kw = keyword.toLowerCase();
    return (json.data ?? [])
      .filter((job: any) => `${job.title} ${job.description} ${job.tags?.join(" ")}`.toLowerCase().includes(kw))
      .map((job: any, i: number) => ({
        id: `arbeitnow-${job.slug ?? i}`,
        title: job.title ?? "No title",
        description: (job.description ?? "").replace(/<[^>]+>/g, "").slice(0, 500).trim(),
        url: job.url ?? "https://arbeitnow.com",
        postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
        company: job.company_name ?? "Unknown",
        location: job.location ?? "Remote",
        source: "upwork" as Source,
        remote: job.remote ?? true,
      }));
  } catch { return []; }
}

async function fetchRemotive(keyword: string) {
  try {
    const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}&limit=20`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const json = await res.json();
    return (json.jobs ?? []).map((job: any, i: number) => ({
      id: `remotive-${job.id ?? i}`,
      title: job.title ?? "No title",
      description: (job.description ?? "").replace(/<[^>]+>/g, "").slice(0, 500).trim(),
      url: job.url ?? "https://remotive.com",
      postedAt: job.publication_date ?? new Date().toISOString(),
      company: job.company_name ?? "Unknown",
      location: job.candidate_required_location || "Remote",
      source: "wellfound" as Source,
      remote: true,
      salary: job.salary || undefined,
    }));
  } catch { return []; }
}

async function fetchTheMuse(keyword: string) {
  try {
    const res = await fetch(`https://www.themuse.com/api/public/jobs?query=${encodeURIComponent(keyword)}&page=1&descending=true`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const json = await res.json();
    return (json.results ?? []).map((job: any, i: number) => ({
      id: `muse-${job.id ?? i}`,
      title: job.name ?? "No title",
      description: (job.contents ?? "").replace(/<[^>]+>/g, "").slice(0, 500).trim(),
      url: job.refs?.landing_page ?? "https://themuse.com",
      postedAt: job.publication_date ?? new Date().toISOString(),
      company: job.company?.name ?? "Unknown",
      location: job.locations?.[0]?.name ?? "Remote",
      source: "linkedin" as Source,
      remote: job.locations?.[0]?.name?.toLowerCase().includes("remote") ?? false,
    }));
  } catch { return []; }
}
// ```

// ---

// ## Test keywords that work across all three sources
// ```
// "product manager"
// "data analyst"
// "designer"
// "marketing"
// "customer success"
// "finance"
// "devops"
// "react"
// "python"

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profile, sources }: { profile: SkillsProfile; sources: Source[] } = body;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set in .env.local" }, { status: 500 });
  }

  // 1. Fetch real listings — use first keyword from profile
  const keyword = profile.keywords[0] ?? "javascript";
  const listings = await fetchRealJobs(keyword);

  // Fallback to mock if API returns nothing
  const finalListings = listings.length > 0 ? listings.slice(0, 10) : getMockListings();

  // 2. Score each listing with Gemini
  const scored: ScoredListing[] = [];

  for (const listing of finalListings) {
    try {
      const raw = await callGemini(
        `Score this job listing for this candidate profile.

CANDIDATE PROFILE:
- Skills: ${profile.topSkills.join(", ")}
- Years experience: ${profile.yearsExperience}
- Preferred roles: ${profile.preferredRoles.join(", ")}
- Remote only: ${profile.remoteOnly}
- Dealbreakers: ${profile.dealbreakers.join(", ")}

JOB LISTING:
Title: ${listing.title}
Company: ${listing.company}
Location: ${listing.location}
Description: ${listing.description}
Remote: ${listing.remote ?? false}`,
        `You are a job matching assistant. Analyse job listings for a candidate and return ONLY a JSON object with:
- score: number 0-100 (fit score)
- rationale: string (2 sentences explaining the score)
- recommendation: "apply" | "borderline" | "skip"
- confidence: "high" | "medium" | "low"
- skills: string[] (up to 5 key skills mentioned in the listing)
- corrected: false`
      );

      const parsed = JSON.parse(raw);
      scored.push({ ...listing, ...parsed });
    } catch {
      scored.push({ ...listing, score: 0, rationale: "Scoring failed.", recommendation: "skip", confidence: "low", skills: [], corrected: false });
    }
  }

  // 3. Sort and filter
  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .filter((l) => !(profile.remoteOnly && !l.remote));

  const stats = {
    scanned: finalListings.length,
      scored: scored.length,
      passed: sorted.filter((l) => l.score >= 65).length,
    sources: { arbeitnow: finalListings.length },
  };

  return NextResponse.json({ results: sorted, stats });
}

// Fallback mock data if API is unreachable
function getMockListings() {
  return [
    { id: "m1", title: "Senior Node.js Engineer", company: "Flutterwave", location: "Remote", url: "https://flutterwave.com/careers", source: "upwork" as Source, description: "Build payment APIs with Node.js, PostgreSQL, REST. 4+ years experience required.", postedAt: new Date().toISOString(), remote: true },
    { id: "m2", title: "Backend API Developer", company: "Remote Client", location: "Remote", url: "https://arbeitnow.com", source: "upwork" as Source, description: "Node.js REST API development for SaaS platform. TypeScript, Express, PostgreSQL.", postedAt: new Date().toISOString(), remote: true },
  ];
}  