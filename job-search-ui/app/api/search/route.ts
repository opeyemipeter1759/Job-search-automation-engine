import { NextRequest, NextResponse } from "next/server";
import { SkillsProfile, ScoredListing, Source } from "@/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID!;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY!;
const REED_API_KEY = process.env.REED_API_KEY!;
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY!;

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

// ── Adzuna ────────────────────────────────────────────────────
async function fetchAdzuna(keyword: string, location: string, remoteOnly: boolean) {
  try {
    const country = location.toLowerCase().includes("nigeria") ||
      location.toLowerCase().includes("lagos") ? "ng" : "gb";
    const loc = location || "london";
    let url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=20&what=${encodeURIComponent(keyword)}&where=${encodeURIComponent(loc)}&content-type=application/json`;
    if (remoteOnly) url += "&title_only=remote";

    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();

    return (json.results ?? []).map((job: any, i: number) => ({
      id: `adzuna-${job.id ?? i}`,
      title: job.title ?? "No title",
      description: (job.description ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
      url: job.redirect_url ?? "https://adzuna.com",
      postedAt: job.created ?? new Date().toISOString(),
      company: job.company?.display_name ?? "Unknown",
      location: job.location?.display_name ?? location,
      source: "adzuna" as Source,
      remote: job.title?.toLowerCase().includes("remote") || job.description?.toLowerCase().includes("remote") || false,
      salary: job.salary_min ? `£${Math.round(job.salary_min / 1000)}k–£${Math.round(job.salary_max / 1000)}k` : undefined,
    }));
  } catch (err: any) {
    console.error("❌ Adzuna failed:", err.message);
    return [];
  }
}

// ── Reed ─────────────────────────────────────────────────────
async function fetchReed(keyword: string, location: string, remoteOnly: boolean) {
  try {
    let url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(keyword)}&resultsToTake=20`;
    if (location) url += `&locationName=${encodeURIComponent(location)}`;
    if (remoteOnly) url += `&distanceFromLocation=0`;

    const credentials = Buffer.from(`${REED_API_KEY}:`).toString("base64");
    const res = await fetch(url, {
      headers: {
        "Authorization": `Basic ${credentials}`,
        "User-Agent": "Mozilla/5.0",
      },
    });
    const json = await res.json();

    return (json.results ?? []).map((job: any, i: number) => ({
      id: `reed-${job.jobId ?? i}`,
      title: job.jobTitle ?? "No title",
      description: (job.jobDescription ?? job.snippet ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
      url: job.jobUrl ?? "https://reed.co.uk",
      postedAt: job.date ?? new Date().toISOString(),
      company: job.employerName ?? "Unknown",
      location: job.locationName ?? location,
      source: "reed" as Source,
      remote: job.jobTitle?.toLowerCase().includes("remote") || false,
      salary: job.minimumSalary
        ? `£${Math.round(job.minimumSalary / 1000)}k–£${Math.round(job.maximumSalary / 1000)}k`
        : undefined,
    }));
  } catch (err: any) {
    console.error("❌ Reed failed:", err.message);
    return [];
  }
}

// ── Jooble ────────────────────────────────────────────────────
async function fetchJooble(keyword: string, location: string) {
  try {
    const res = await fetch(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: keyword,
        location: location || "",
        page: 1,
      }),
    });
    const json = await res.json();

    return (json.jobs ?? []).slice(0, 20).map((job: any, i: number) => ({
      id: `jooble-${job.id ?? i}`,
      title: job.title ?? "No title",
      description: (job.snippet ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
      url: job.link ?? "https://jooble.org",
      postedAt: job.updated ?? new Date().toISOString(),
      company: job.company ?? "Unknown",
      location: job.location ?? location,
      source: "jooble" as Source,
      remote: job.type?.toLowerCase().includes("remote") ||
        job.title?.toLowerCase().includes("remote") || false,
      salary: job.salary || undefined,
    }));
  } catch (err: any) {
    console.error("❌ Jooble failed:", err.message);
    return [];
  }
}

// ── Greenhouse ────────────────────────────────────────────────
async function fetchGreenhouse(keyword: string) {
  // Greenhouse board tokens for well-known companies
  const boards = [
    "stripe", "airbnb", "figma", "notion", "vercel",
    "linear", "supabase", "openai", "anthropic", "shopify",
    "gitlab", "hashicorp", "confluent", "datadog", "mongodb",
  ];

  const kw = keyword.toLowerCase();
  const results: any[] = [];

  await Promise.all(
    boards.map(async (board) => {
      try {
        const res = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const json = await res.json();
        const jobs = (json.jobs ?? []).filter((job: any) =>
          `${job.title} ${job.content}`.toLowerCase().includes(kw)
        );

        jobs.slice(0, 3).forEach((job: any, i: number) => {
          results.push({
            id: `greenhouse-${board}-${job.id ?? i}`,
            title: job.title ?? "No title",
            description: (job.content ?? "").replace(/<[^>]+>/g, "").slice(0, 600).trim(),
            url: job.absolute_url ?? `https://boards.greenhouse.io/${board}`,
            postedAt: job.updated_at ?? new Date().toISOString(),
            company: board.charAt(0).toUpperCase() + board.slice(1),
            location: job.location?.name ?? "Remote",
            source: "greenhouse" as Source,
            remote: job.location?.name?.toLowerCase().includes("remote") ||
              job.title?.toLowerCase().includes("remote") || false,
            salary: undefined,
          });
        });
      } catch {
        // silently skip boards that fail
      }
    })
  );

  return results;
}

// ── Remotive ──────────────────────────────────────────────────
async function fetchRemotive(keyword: string) {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}&limit=15`,
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
      source: "remotive" as Source,
      remote: true,
      salary: job.salary || undefined,
    }));
  } catch { return []; }
}

async function fetchJobberman(keyword: string) {
  try {
    const res = await fetch(
      `https://www.jobberman.com/jobs?q=${encodeURIComponent(keyword)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    const html = await res.text();
    const blocks = [...html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)];

    return blocks.slice(0, 10).map((m, i) => {
      const block = m[1];
      const title = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "No title";
      const company = block.match(/class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "Unknown";
      const location = block.match(/class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "Nigeria";
      const urlMatch = block.match(/href="([^"]*job[^"]*)"/i);
      const url = urlMatch ? (urlMatch[1].startsWith("http") ? urlMatch[1] : `https://www.jobberman.com${urlMatch[1]}`) : "https://www.jobberman.com";
      return { id: `jobberman-${i}`, title, description: `${title} at ${company}. ${location}.`, url, postedAt: new Date().toISOString(), company, location, source: "jobberman" as Source, remote: location.toLowerCase().includes("remote") };
    }).filter(j => j.title !== "No title" && j.title.length > 3);
  } catch { return []; }
}

async function fetchHotNigeriaJobs(keyword: string) {
  try {
    const res = await fetch(
      `https://www.hotnigerianjobs.com/hotjobs/?q=${encodeURIComponent(keyword)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const html = await res.text();
    const blocks = [...html.matchAll(/<div[^>]*class="[^"]*job[-_]?item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];

    return blocks.slice(0, 10).map((m, i) => {
      const block = m[1];
      const titleMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      const title = titleMatch?.[2]?.replace(/<[^>]+>/g, "").trim() ?? "No title";
      const url = titleMatch ? (titleMatch[1].startsWith("http") ? titleMatch[1] : `https://www.hotnigerianjobs.com${titleMatch[1]}`) : "https://www.hotnigerianjobs.com";
      return { id: `hotnigeriajobs-${i}`, title, description: `${title} position in Nigeria.`, url, postedAt: new Date().toISOString(), company: "Nigerian Employer", location: "Nigeria", source: "hotnigeriajobs" as Source, remote: false };
    }).filter(j => j.title !== "No title" && j.title.length > 3);
  } catch { return []; }
}


async function fetchMyJobMag(keyword: string) {
  try {
    const res = await fetch(
      `https://www.myjobmag.com/jobs/${encodeURIComponent(keyword.replace(/\s+/g, "-"))}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const html = await res.text();
    const blocks = [...html.matchAll(/<li[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)];

    return blocks.slice(0, 10).map((m, i) => {
      const block = m[1];
      const titleMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      const title = titleMatch?.[2]?.replace(/<[^>]+>/g, "").trim() ?? "No title";
      const url = titleMatch ? (titleMatch[1].startsWith("http") ? titleMatch[1] : `https://www.myjobmag.com${titleMatch[1]}`) : "https://www.myjobmag.com";
      const company = block.match(/class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "Unknown";
      const location = block.match(/class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "Nigeria";
      return { id: `myjobmag-${i}`, title, description: `${title} at ${company}. ${location}.`, url, postedAt: new Date().toISOString(), company, location, source: "myjobmag" as Source, remote: location.toLowerCase().includes("remote") };
    }).filter(j => j.title !== "No title" && j.title.length > 3);
  } catch { return []; }
}

// ── Deduplication ─────────────────────────────────────────────
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
- score: number 0-100 (0-20 if the job is completely unrelated to the candidate's field)
- rationale: string (1 sentence — be honest if it is a poor match)
- breakdown: object with keys skillsMatch, experienceMatch, locationMatch, roleMatch, cultureAndGrowth (each a 1 sentence string)
- recommendation: "apply" | "borderline" | "skip"
- confidence: "high" | "medium" | "low"
- skills: string[] (up to 5 skills from the listing)
- corrected: false

CRITICAL: If the job is in a completely different field from the candidate (e.g. candidate is an accountant but job is software engineering), give a score of 5 or less and recommend "skip". Do not force a match that does not exist. Always score based on the candidate's ACTUAL profession and skills.`
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
  const { profile, sources, location = "", remoteOnly = false } = body;

  const AGENT_URL = process.env.AGENT_API_URL;

  // ── If agent server is running, use it ───────────────────────
  if (AGENT_URL) {
    try {
      const res = await fetch(`${AGENT_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, sources, location, remoteOnly }),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Agent server unavailable, falling back to built-in scrapers");
    }
  }

  // ── Fallback — built-in scrapers in route.ts ─────────────────
  // (keep all the existing scraper code here as fallback)
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

// Use shortest keyword that's 1-2 words, fall back to first preferred role
const rawKeyword =
  profile.keywords?.find((k: string) => k.split(" ").length <= 2) ||
  profile.keywords?.[0] ||
  profile.preferredRoles?.[0] ||
  "professional";

// Clean it up — lowercase, max 2 words
    const keyword = rawKeyword.toLowerCase().split( " " ).slice( 0, 2 ).join( " " );
  const activeSources = sources?.length > 0 ? sources : ["greenhouse", "remotive"];

  const fetchMap: Record<string, () => Promise<any[]>> = {
    adzuna: () => fetchAdzuna(keyword, location, remoteOnly),
    reed: () => fetchReed(keyword, location, remoteOnly),
    jooble: () => fetchJooble(keyword, location),
    greenhouse: () => fetchGreenhouse(keyword),
    remotive: () => fetchRemotive(keyword),
    jobberman: () => fetchJobberman(keyword),
    hotnigeriajobs: () => fetchHotNigeriaJobs(keyword),
    myjobmag: () => fetchMyJobMag(keyword),
  };

  const fetched = await Promise.all(
      activeSources.map((s: string) => fetchMap[s]?.() ?? Promise.resolve([]))

  );

  const sourceStats: Partial<Record<Source, number>> = {};
  activeSources.forEach((s, i) => {
    sourceStats[s as Source] = fetched[i].length;
  });

  let combined = deduplicate(fetched.flat());

  if (remoteOnly) combined = combined.filter((j: any) => j.remote === true);
  if (location) {
    const loc = location.toLowerCase();
    combined = combined.filter(
      (j: any) => j.remote || j.location?.toLowerCase().includes(loc)
    );
  }

// Filter by role keywords only — not skills (skills are too specific)
const roleKeywords = [
  ...(profile.preferredRoles ?? []),
  ...(profile.keywords ?? []),
].map((s: string) => s.toLowerCase());

const preFiltered = roleKeywords.length > 0
  ? combined.filter((job: any) => {
      const text = `${job.title} ${job.description}`.toLowerCase();
      return roleKeywords.some((kw: string) => text.includes(kw));
    })
  : combined;

const toScore = (preFiltered.length > 0 ? preFiltered : combined).slice(0, 10);

  if (toScore.length === 0) {
    return NextResponse.json({
      results: [],
      stats: { scanned: combined.length, scored: 0, passed: 0, sources: sourceStats },
    });
  }

  const scored = await scoreInBatches(toScore, 5, profile, remoteOnly, location);
  const sorted = scored.sort((a: any, b: any) => b.score - a.score);

  return NextResponse.json({
    results: sorted,
    stats: {
      scanned: combined.length,
      scored: scored.length,
      passed: sorted.filter((l: any) => l.score >= 65).length,
      sources: sourceStats,
    },
  });
}
