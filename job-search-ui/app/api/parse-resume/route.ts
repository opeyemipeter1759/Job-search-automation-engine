import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "application/pdf";

    // Send to Gemini with the file
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: `You are a resume parser. Extract structured information from the resume and return ONLY a valid JSON object with these exact fields:
- name: string (full name of the candidate)
- topSkills: string[] (top 8 most relevant skills)
- yearsExperience: number (total years of work experience, estimate if not explicit)
- preferredRoles: string[] (3-5 job titles that match their background)
- keywords: string[] (4-6 search keywords to find matching jobs, single words or short phrases)
- summary: string (2 sentence professional summary)
- dealbreakers: string[] (leave empty array, user will fill this in)`
          }]
        },
        contents: [{
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              }
            },
            {
              text: "Parse this resume and extract the structured profile."
            }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(raw);

// Save parsed profile to a shared file job-agent can read
    const fs = await import("fs");
    const path = await import("path");
    const profilePath = path.join(process.cwd(), "..", "job-agent", "parsed-profile.json");
    
    try {
      fs.writeFileSync(profilePath, JSON.stringify(parsed, null, 2));
      console.log("✅ Profile saved to job-agent/parsed-profile.json");
    } catch {
      // Don't fail if write fails — frontend still works
      console.warn("⚠️ Could not save profile to job-agent folder");
    }

    return NextResponse.json({ profile: parsed });
  } catch (err: any) {
    console.error("Resume parse failed:", err.message);
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}