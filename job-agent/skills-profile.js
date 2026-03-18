const fs = require( "fs" );
const path = require( "path" );

// Try to load from CV upload first, fall back to manual profile
function loadProfile()
{
    const parsedPath = path.join( process.cwd(), "parsed-profile.json" );

    if ( fs.existsSync( parsedPath ) )
    {
        try
        {
            const raw = fs.readFileSync( parsedPath, "utf-8" );
            const parsed = JSON.parse( raw );
            console.log( `📄 Profile loaded from uploaded CV (${ parsed.name || "unnamed" })` );
            return {
                name: parsed.name ?? "",
                skills: parsed.topSkills ?? [],
                yearsExperience: parsed.yearsExperience ?? 3,
                preferredRoles: parsed.preferredRoles ?? [],
                seniority: parsed.yearsExperience >= 7 ? "senior" : parsed.yearsExperience >= 3 ? "mid" : "junior",
                remoteOnly: false,
                preferredLocations: ["Lagos", "Remote"],
                minSalary: "",
                dealbreakers: [
                    "unpaid trial",
                    "commission only",
                ],
                values: [
                    "growth opportunities",
                    "good engineering culture",
                ],
                keywords: parsed.keywords ?? parsed.preferredRoles?.map( r => r.toLowerCase() ) ?? ["software engineer"],
            };
        } catch ( err )
        {
            console.warn( "⚠️ Could not parse parsed-profile.json, using manual profile" );
        }
    }

    // Fallback — manual profile (edit this if no CV is uploaded)
    console.log( "📝 No CV found — using manual profile from skills-profile.js" );
    return {
        name: "Your Name",
        skills: [
            "Node.js",
            "JavaScript",
            "REST APIs",
            "PostgreSQL",
            "TypeScript",
        ],
        yearsExperience: 3,
        preferredRoles: [
            "Backend Engineer",
            "Software Developer",
            "API Developer",
        ],
        seniority: "mid",
        remoteOnly: false,
        preferredLocations: ["Lagos", "Remote"],
        minSalary: "",
        dealbreakers: [
            "unpaid trial",
            "commission only",
        ],
        values: [
            "growth opportunities",
            "good engineering culture",
        ],
        keywords: ["backend engineer", "software developer"],
    };
}

const MY_PROFILE = loadProfile();

module.exports = { MY_PROFILE };