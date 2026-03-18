require( "dotenv" ).config();
const express = require( "express" );
const cors = require( "cors" );
const { GoogleGenerativeAI } = require( "@google/generative-ai" );
const { fetchUpworkJobs } = require( "./fetchUpworkJobs" );
const { fetchJobberman, fetchHotNigeriaJobs, fetchMyJobMag } = require( "./fetchNigerianJobs" );

const app = express();
app.use( cors() );
app.use( express.json( { limit: "10mb" } ) );

const genAI = new GoogleGenerativeAI( process.env.GEMINI_API_KEY );

// ── Score a single listing ────────────────────────────────────
async function scoreJob( listing, profile )
{
    const model = genAI.getGenerativeModel( {
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
        systemInstruction: `You are an expert job matching assistant.
Return ONLY a valid JSON object with these exact fields:
- score: number 0-100
- rationale: string (1 sentence overall summary)
- breakdown: object with keys:
    skillsMatch: string (1 sentence)
    experienceMatch: string (1 sentence)
    locationMatch: string (1 sentence)
    roleMatch: string (1 sentence)
    cultureAndGrowth: string (1 sentence)
- recommendation: "apply" | "borderline" | "skip"
- confidence: "high" | "medium" | "low"
- skills: string[] (up to 5 skills from the listing)
- corrected: false`,
    } );

    const result = await model.generateContent(
        `Score this job listing for this candidate.

CANDIDATE:
- Skills: ${ profile.topSkills.join( ", " ) }
- Years experience: ${ profile.yearsExperience }
- Preferred roles: ${ profile.preferredRoles.join( ", " ) }
- Remote only: ${ profile.remoteOnly }
- Dealbreakers: ${ ( profile.dealbreakers ?? [] ).join( ", " ) || "none" }

JOB:
Title: ${ listing.title }
Company: ${ listing.company }
Location: ${ listing.location }
Remote: ${ listing.remote }
${ listing.salary ? `Salary: ${ listing.salary }` : "" }
Description: ${ listing.description.slice( 0, 300 ) }`
    );

    return JSON.parse( result.response.text() );
}

async function scoreInBatches( listings, profile )
{
    const results = [];
    for ( let i = 0; i < listings.length; i += 5 )
    {
        const batch = listings.slice( i, i + 5 );
        const scored = await Promise.all(
            batch.map( async ( l ) =>
            {
                try
                {
                    const result = await scoreJob( l, profile );
                    return { ...l, ...result };
                } catch
                {
                    return { ...l, score: 0, rationale: "Scoring failed.", recommendation: "skip", confidence: "low", skills: [], corrected: false };
                }
            } )
        );
        results.push( ...scored );
    }
    return results;
}

// ── /api/search ───────────────────────────────────────────────
app.post( "/api/search", async ( req, res ) =>
{
    try
    {
        const { profile, location = "", remoteOnly = false, sources = [] } = req.body;

        if ( !profile || !profile.topSkills?.length )
        {
            return res.status( 400 ).json( { error: "Profile with skills is required" } );
        }

        const rawKeyword =
            profile.keywords?.find( ( k ) => k.split( " " ).length <= 2 ) ||
            profile.keywords?.[0] ||
            profile.preferredRoles?.[0] ||
            "professional";
        const keyword = rawKeyword.toLowerCase().split( " " ).slice( 0, 2 ).join( " " );
        const includeNigeria = sources.includes( "jobberman" ) ||
            sources.includes( "hotnigeriajobs" ) ||
            sources.includes( "myjobmag" );

        console.log( `\n🔍 Search request: "${ keyword }" | location: "${ location }" | remote: ${ remoteOnly }` );

        // Fetch from all sources in parallel
        const [globalJobs, nigerianJobs] = await Promise.all( [
            fetchUpworkJobs( keyword, { remoteOnly, location } ),
            includeNigeria
                ? Promise.all( [
                    fetchJobberman( keyword ),
                    fetchHotNigeriaJobs( keyword ),
                    fetchMyJobMag( keyword ),
                ] ).then( r => r.flat() )
                : Promise.resolve( [] ),
        ] );

        let combined = [...globalJobs, ...nigerianJobs];

        // Deduplicate
        const seen = new Set();
        combined = combined.filter( ( job ) =>
        {
            const key = `${ job.title.toLowerCase().slice( 0, 40 ) }-${ job.company.toLowerCase() }`;
            if ( seen.has( key ) ) return false;
            seen.add( key );
            return true;
        } );

        // Apply filters
        if ( remoteOnly ) combined = combined.filter( j => j.remote === true );
        if ( location )
        {
            const loc = location.toLowerCase();
            combined = combined.filter( j => j.remote || j.location?.toLowerCase().includes( loc ) );
        }

        // Pre-filter by skills
        const skillKeywords = profile.topSkills.map( s => s.toLowerCase() );
        const preFiltered = combined.filter( job =>
        {
            const text = `${ job.title } ${ job.description }`.toLowerCase();
            return skillKeywords.some( skill => text.includes( skill ) );
        } );

        const toScore = ( preFiltered.length > 0 ? preFiltered : combined ).slice( 0, 10 );

        if ( toScore.length === 0 )
        {
            return res.json( {
                results: [],
                stats: { scanned: combined.length, scored: 0, passed: 0, sources: {} },
            } );
        }

        // Score in batches
        const scored = await scoreInBatches( toScore, profile );
        const sorted = scored.sort( ( a, b ) => b.score - a.score );

        const sourceStats = [...new Set( combined.map( j => j.source ) )].reduce( ( acc, s ) =>
        {
            acc[s] = combined.filter( j => j.source === s ).length;
            return acc;
        }, {} );

        console.log( `✅ Done. Scored ${ scored.length } listings.` );

        res.json( {
            results: sorted,
            stats: {
                scanned: combined.length,
                scored: scored.length,
                passed: sorted.filter( l => l.score >= 65 ).length,
                sources: sourceStats,
            },
        } );
    } catch ( err )
    {
        console.error( "Search error:", err.message );
        res.status( 500 ).json( { error: err.message } );
    }
} );

// ── /api/parse-resume ─────────────────────────────────────────
app.post( "/api/parse-resume", async ( req, res ) =>
{
    try
    {
        const { base64, mimeType } = req.body;

        if ( !base64 ) return res.status( 400 ).json( { error: "No file data" } );

        const model = genAI.getGenerativeModel( {
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" },
            systemInstruction: `You are a resume parser. Extract structured information and return ONLY a valid JSON object with:
- name: string
- topSkills: string[] (top 8 skills)
- yearsExperience: number
- preferredRoles: string[] (3-5 job titles)
- keywords: string[] (4-6 search keywords)
- summary: string (2 sentences)
- dealbreakers: string[]`,
        } );

        const result = await model.generateContent( {
            contents: [{
                role: "user",
                parts: [
                    { inline_data: { mime_type: mimeType, data: base64 } },
                    { text: "Parse this resume." }
                ]
            }]
        } );

        const parsed = JSON.parse( result.response.text() );

        // Save to parsed-profile.json
        const fs = require( "fs" );
        fs.writeFileSync(
            require( "path" ).join( process.cwd(), "parsed-profile.json" ),
            JSON.stringify( parsed, null, 2 )
        );

        console.log( `📄 CV parsed and saved: ${ parsed.name }` );
        res.json( { profile: parsed } );
    } catch ( err )
    {
        console.error( "Parse error:", err.message );
        res.status( 500 ).json( { error: err.message } );
    }
} );

// ── Health check ──────────────────────────────────────────────
app.get( "/health", ( req, res ) =>
{
    res.json( { status: "ok", timestamp: new Date().toISOString() } );
} );

const PORT = process.env.PORT || 3001;
app.listen( PORT, () =>
{
    console.log( `\n🚀 Job Agent API running on http://localhost:${ PORT }` );
    console.log( `   POST /api/search` );
    console.log( `   POST /api/parse-resume` );
    console.log( `   GET  /health\n` );
} );