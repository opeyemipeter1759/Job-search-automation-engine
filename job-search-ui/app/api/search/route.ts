import { NextRequest, NextResponse } from "next/server";
import { SkillsProfile, ScoredListing, Source } from "@/types";

// ─────────────────────────────────────────────────────────────
// This route is the bridge between the Next.js UI and your
// Node.js agents. It calls your agent functions directly
// (monorepo) or via HTTP if you expose them as an Express server.
//
// For the sprint, we call the Gemini API directly from here
// so the UI works even before all agents are built.
// ─────────────────────────────────────────────────────────────

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

// Mock scraper — replace with your real agent imports once built
function getMockListings(keywords: string[], sources: Source[]): ScoredListing[] {
  const pool = [
    { id: "1", title: "Senior Node.js Engineer", company: "Flutterwave", location: "Lagos · Remote", url: "https://flutterwave.com/careers", source: "linkedin" as Source, description: "Build payment APIs serving millions of transactions. Own backend services end-to-end. Node.js, PostgreSQL, AWS, REST APIs required.", postedAt: new Date(Date.now() - 86400000).toISOString(), remote: true, salary: "$60k–$90k" },
    { id: "2", title: "Backend Engineer", company: "Paystack", location: "Lagos", url: "https://paystack.com/careers", source: "wellfound" as Source, description: "Scale Paystack's core API infrastructure. Work with Node.js, TypeScript, Redis, and PostgreSQL on high-throughput systems.", postedAt: new Date(Date.now() - 172800000).toISOString(), remote: false },
    { id: "3", title: "Node.js API Developer", company: "Remote Startup", location: "Remote · Worldwide", url: "https://upwork.com/jobs/mock1", source: "upwork" as Source, description: "Part-time 20hrs/week. Build REST APIs for a SaaS platform. Node.js, Express, PostgreSQL. Senior level, must work independently.", postedAt: new Date(Date.now() - 43200000).toISOString(), remote: true },
    { id: "4", title: "Full Stack Developer", company: "Andela", location: "Remote · Africa", url: "https://andela.com/talent", source: "jobberman" as Source, description: "Contract roles with global companies. React, Node.js, TypeScript. 6-month initial engagement, renewable.", postedAt: new Date(Date.now() - 259200000).toISOString(), remote: true },
    { id: "5", title: "Software Engineer II", company: "Kuda Bank", location: "Lagos", url: "https://kuda.com/careers", source: "linkedin" as Source, description: "Scale Kuda's banking infrastructure for 6M+ customers. Microservices, Node.js, AWS, Redis. High-throughput transaction systems.", postedAt: new Date(Date.now() - 345600000).toISOString(), remote: false },
    { id: "6", title: "Backend Engineer (Fintech)", company: "Mono", location: "Remote · Nigeria", url: "https://mono.co/careers", source: "wellfound" as Source, description: "Build financial data APIs. Node.js, Express, MongoDB. Experience with open banking APIs a strong plus.", postedAt: new Date(Date.now() - 21600000).toISOString(), remote: true },
    { id: "7", title: "API Integration Engineer", company: "Global Client", location: "Remote", url: "https://upwork.com/jobs/mock2", source: "upwork" as Source, description: "One-time project, 3 months. Integrate payment gateway APIs into existing Node.js backend. $50/hr budget.", postedAt: new Date(Date.now() - 7200000).toISOString(), remote: true, salary: "$50/hr" },
    { id: "8", title: "Junior Node.js Developer", company: "Local Agency", location: "Lagos", url: "https://jobberman.com/mock1", source: "jobberman" as Source, description: "2 years experience required. Build web applications using Node.js and React. On-site only. Entry level salary.", postedAt: new Date(Date.now() - 432000000).toISOString(), remote: false },
  ];

  return pool
    .filter((l) => sources.includes(l.source))
    .map((l) => ({ ...l, score: 0, rationale: "", recommendation: "skip" as const, confidence: "medium" as const, skills: [] }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profile, sources }: { profile: SkillsProfile; sources: Source[] } = body;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set in .env.local" }, { status: 500 });
  }

  // 1. Scrape / get listings (mock for now, swap your real scrapers in)
  const listings = getMockListings(profile.keywords, sources.length ? sources : ["upwork", "linkedin", "wellfound", "jobberman", "myjobmag"]);

  // 2. Score each listing with Gemini
  const scored: ScoredListing[] = [];

  for (const listing of listings) {
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
      scored.push({ ...listing, score: 0, rationale: "Scoring failed.", recommendation: "skip", confidence: "low", skills: [] });
    }
  }

  // 3. Sort and filter
  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .filter((l) => !(profile.remoteOnly && !l.remote));

  const stats = {
    scanned: listings.length,
    scored: scored.length,
    passed: sorted.filter((l) => l.score >= 65).length,
    sources: sources.reduce((acc, s) => {
      acc[s] = listings.filter((l) => l.source === s).length;
      return acc;
    }, {} as Record<Source, number>),
  };

  return NextResponse.json({ results: sorted, stats });
}
