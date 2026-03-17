export type Recommendation = "apply" | "borderline" | "skip";
export type Confidence = "high" | "medium" | "low";
export type Source = "adzuna" | "reed" | "jooble" | "greenhouse" | "remotive" | "arbeitnow" | "themuse" | "workingnomads" | "jobberman" | "hotnigeriajobs" | "myjobmag";


export interface SkillsProfile {
  name: string;
  topSkills: string[];
  yearsExperience: number;
  preferredRoles: string[];
  preferredLocations: string[];
  remoteOnly: boolean;
  minSalary?: string;
  dealbreakers: string[];
  keywords: string[];
}

export interface RawListing {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: Source;
  description: string;
  postedAt: string;
  remote?: boolean;
  salary?: string;
}

export interface ScoreBreakdown {
  skillsMatch: string;
  experienceMatch: string;
  locationMatch: string;
  roleMatch: string;
}

export interface ScoredListing extends RawListing {
  score: number;
    rationale: string;
    breakdown?: ScoreBreakdown;
  recommendation: Recommendation;
  confidence: Confidence;
  corrected?: boolean;
  skills?: string[];
}

export interface SearchState {
  status: "idle" | "scraping" | "scoring" | "done" | "error";
  progress: {
    step: string;
    current: number;
    total: number;
  };
  results: ScoredListing[];
  stats: {
    scanned: number;
    scored: number;
    passed: number;
    sources: Partial<Record<Source, number>>;
  };
  error?: string;
}

export interface ParsedResume {
  name: string;
  topSkills: string[];
  yearsExperience: number;
  preferredRoles: string[];
  summary: string;
  dealbreakers: string[];
  keywords: string[];
}


