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

    console.log("📄 File received:", file.name, file.type, file.size, "bytes");

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "application/pdf";

    console.log("📤 Sending to Gemini...");

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: `You are a resume parser. Extract structured information and return ONLY a valid JSON object with these exact fields:
- name: string (full name)
- topSkills: string[] (top 8 skills from the CV — be specific to their field)
- yearsExperience: number (total years of work experience)
- preferredRoles: string[] (3-5 exact job titles that match their background)
- keywords: string[] (4-6 short search keywords — must match their ACTUAL field)
- summary: string (2 sentence professional summary)
- dealbreakers: string[]

IMPORTANT: keywords and preferredRoles must reflect the candidate's ACTUAL profession. Never default to tech roles unless the CV is a tech CV.`
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
            { text: "Parse this resume and extract the structured profile." }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    const data = await res.json();

    // Log the full Gemini response so we can see errors
    console.log("📥 Gemini response status:", res.status);
    console.log("📥 Gemini response:", JSON.stringify(data).slice(0, 500));

    // Check for API errors
    if (data.error) {
      console.error("❌ Gemini API error:", data.error);
      return NextResponse.json(
        { error: `Gemini error: ${data.error.message}` },
        { status: 500 }
      );
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) {
      console.error("❌ No text in Gemini response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Gemini returned no content — file may be too large or unreadable" },
        { status: 500 }
      );
    }

    console.log("✅ Raw parsed text:", raw.slice(0, 200));

    const parsed = JSON.parse(raw);

    // Validate we got real data
    if (!parsed.topSkills || parsed.topSkills.length === 0) {
      console.error("❌ Parsed profile has no skills:", parsed);
      return NextResponse.json(
        { error: "Could not extract skills from CV — try a clearer PDF" },
        { status: 500 }
      );
    }

    console.log("✅ Profile extracted:", parsed.name, "| Skills:", parsed.topSkills?.slice(0, 3));

    // Try to save to job-agent folder
    try {
      const fs = await import("fs");
      const path = await import("path");
      const profilePath = path.join(process.cwd(), "..", "job-agent", "parsed-profile.json");
      fs.writeFileSync(profilePath, JSON.stringify(parsed, null, 2));
      console.log("💾 Profile saved to job-agent/parsed-profile.json");
    } catch {
      console.warn("⚠️ Could not save to job-agent folder — continuing anyway");
    }

    return NextResponse.json({ profile: parsed });

  } catch (err: any) {
    console.error("❌ Resume parse failed:", err.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to parse resume" },
      { status: 500 }
    );
  }
}