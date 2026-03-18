require( "dotenv" ).config();
const { GoogleGenerativeAI } = require( "@google/generative-ai" );
const { fetchUpworkJobs } = require( "./fetchUpworkJobs" );
const { fetchJobberman, fetchHotNigeriaJobs, fetchMyJobMag } = require( "./fetchNigerianJobs" );
// const { MY_PROFILE } = require( "./skills-profile" );
delete require.cache[require.resolve( "./skills-profile" )];

const fs = require( "fs" );
const path = require( "path" );

const genAI = new GoogleGenerativeAI( process.env.GEMINI_API_KEY );

// ── Score a single listing ────────────────────────────────────
async function scoreJob( listing )
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
    cultureAndGrowth: string (1 sentence about growth/culture fit)
- recommendation: "apply" | "borderline" | "skip"
- confidence: "high" | "medium" | "low"
- skills: string[] (up to 5 skills from the listing)
- corrected: false`,
    } );

    const prompt = `Score this job listing for this specific candidate.

CANDIDATE PROFILE:
- Name: ${ MY_PROFILE.name }
- Skills: ${ MY_PROFILE.skills.join( ", " ) }
- Years of experience: ${ MY_PROFILE.yearsExperience }
- Seniority: ${ MY_PROFILE.seniority }
- Preferred roles: ${ MY_PROFILE.preferredRoles.join( ", " ) }
- Preferred locations: ${ MY_PROFILE.preferredLocations.join( ", " ) }
- Remote only: ${ MY_PROFILE.remoteOnly }
- Dealbreakers: ${ MY_PROFILE.dealbreakers.join( ", " ) }
- Values: ${ MY_PROFILE.values.join( ", " ) }
${ MY_PROFILE.minSalary ? `- Minimum salary: ${ MY_PROFILE.minSalary }` : "" }

JOB LISTING:
Title: ${ listing.title }
Company: ${ listing.company }
Location: ${ listing.location }
Remote: ${ listing.remote }
Source: ${ listing.source }
${ listing.salary ? `Salary: ${ listing.salary }` : "" }
Description: ${ listing.description.slice( 0, 400 ) }

Score this honestly. Consider skill alignment, seniority fit, location, culture, and growth potential.
Flag any dealbreakers immediately with score 0.`;

    const result = await model.generateContent( prompt );
    return JSON.parse( result.response.text() );
}

// ── Self-critique loop ────────────────────────────────────────
async function scoreWithCritique( listing )
{
    // First pass
    const firstScore = await scoreJob( listing );

    // Only run critique if confidence is low or medium
    if ( firstScore.confidence === "high" )
    {
        return { ...firstScore, corrected: false };
    }

    try
    {
        const model = genAI.getGenerativeModel( {
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" },
            systemInstruction: `You are a quality reviewer for job match scores. 
Return ONLY a valid JSON object with:
- revisedScore: number (the corrected score, or same if no change needed)
- changed: boolean
- reason: string (why you changed it, or "score is accurate" if not)`
        } );

        const critique = await model.generateContent(
            `Review this job match score.

Job: ${ listing.title } at ${ listing.company }
Original score: ${ firstScore.score }/100
Original rationale: ${ firstScore.rationale }
Recommendation: ${ firstScore.recommendation }

Candidate skills: ${ MY_PROFILE.skills.join( ", " ) }
Candidate experience: ${ MY_PROFILE.yearsExperience } years

Is this score accurate? Should it be higher or lower?
If the score should change by more than 10 points, provide the revised score.`
        );

        const review = JSON.parse( critique.response.text() );

        if ( review.changed && Math.abs( review.revisedScore - firstScore.score ) > 10 )
        {
            return {
                ...firstScore,
                score: review.revisedScore,
                rationale: `${ firstScore.rationale } (Score revised: ${ review.reason })`,
                corrected: true,
            };
        }

        return { ...firstScore, corrected: false };
    } catch
    {
        return { ...firstScore, corrected: false };
    }
}

// ── Save results to file ──────────────────────────────────────
function saveResults( shortlist, stats )
{
    const resultsDir = path.join( process.cwd(), "results" );
    if ( !fs.existsSync( resultsDir ) ) fs.mkdirSync( resultsDir );

    const date = new Date().toISOString().split( "T" )[0];
    const output = {
        date,
        generatedAt: new Date().toISOString(),
        stats,
        shortlist: shortlist.filter( j => j.recommendation !== "skip" ),
        flaggedForReview: shortlist.filter( j => j.recommendation === "borderline" ),
        all: shortlist,
    };

    const filePath = path.join( resultsDir, `${ date }.json` );
    fs.writeFileSync( filePath, JSON.stringify( output, null, 2 ) );
    console.log( `\n💾 Results saved to results/${ date }.json` );
    return filePath;
}

// ── Main ──────────────────────────────────────────────────────
async function main()
{
    delete require.cache[require.resolve( "./skills-profile" )];
    const { MY_PROFILE } = require( "./skills-profile" );
    const keyword = process.argv[2] ?? MY_PROFILE.keywords[0];
    const remoteOnly = process.argv[3] === "--remote";
    const location = process.argv[4] ?? MY_PROFILE.preferredLocations[0] ?? "";
    const includeNigeria = process.argv[3] === "--nigeria" || process.argv[4] === "--nigeria";

    console.log( "🚀 Job Search Agent — Day 4\n" );
    console.log( `   Profile: ${ MY_PROFILE.name }` );
    console.log( `   Keyword: "${ keyword }"` );
    console.log( `   Location: ${ location || "anywhere" }` );
    console.log( `   Remote only: ${ remoteOnly }` );

    // Fetch from all sources
    const [globalJobs, nigerianJobs] = await Promise.all( [
        fetchUpworkJobs( keyword, { remoteOnly, location } ),
        includeNigeria || MY_PROFILE.preferredLocations.some( l => l.toLowerCase().includes( "nigeria" ) || l.toLowerCase().includes( "lagos" ) )
            ? Promise.all( [
                fetchJobberman( keyword ),
                fetchHotNigeriaJobs( keyword ),
                fetchMyJobMag( keyword ),
            ] ).then( results =>
            {
                const [j, h, m] = results;
                console.log( `\n   🇳🇬 Nigerian sources:` );
                console.log( `      Jobberman:       ${ j.length }` );
                console.log( `      HotNigeriaJobs:  ${ h.length }` );
                console.log( `      MyJobMag:        ${ m.length }` );
                return [...j, ...h, ...m];
            } )
            : Promise.resolve( [] ),
    ] );

    const allListings = [...globalJobs, ...nigerianJobs];

    if ( allListings.length === 0 )
    {
        console.log( "\nNo listings found." );
        return;
    }

    console.log( `\n📋 Scoring ${ Math.min( allListings.length, 10 ) } listings with self-critique...\n` );

    const toScore = allListings.slice( 0, 10 );
    const scored = [];

    for ( const listing of toScore )
    {
        process.stdout.write( `   Scoring: ${ listing.title.slice( 0, 50 ) }...` );
        try
        {
            const result = await scoreWithCritique( listing );
            scored.push( { ...listing, ...result } );
            process.stdout.write( ` ${ result.score }/100 ${ result.corrected ? "(revised)" : "" }\n` );
        } catch ( err )
        {
            scored.push( { ...listing, score: 0, recommendation: "skip", rationale: "Scoring failed", confidence: "low", skills: [], corrected: false } );
            process.stdout.write( ` ❌ failed\n` );
        }
    }

    // Sort by score
    scored.sort( ( a, b ) => b.score - a.score );

    // Print top results
    console.log( "\n🏆 Top matches:\n" );
    scored
        .filter( j => j.recommendation !== "skip" )
        .slice( 0, 5 )
        .forEach( ( j, i ) =>
        {
            console.log( `${ i + 1 }. ${ j.title } — ${ j.company }` );
            console.log( `   📍 ${ j.location } | Source: ${ j.source }` );
            console.log( `   Score: ${ j.score }/100 | ${ j.recommendation.toUpperCase() }` );
            console.log( `   ${ j.rationale }` );
            if ( j.corrected ) console.log( `   ⚠️  Score was revised by self-critique` );
            console.log( "" );
        } );

    // Save results
    const stats = {
        totalScanned: allListings.length,
        scored: scored.length,
        apply: scored.filter( j => j.recommendation === "apply" ).length,
        borderline: scored.filter( j => j.recommendation === "borderline" ).length,
        skip: scored.filter( j => j.recommendation === "skip" ).length,
        sources: [...new Set( allListings.map( j => j.source ) )].reduce( ( acc, s ) =>
        {
            acc[s] = allListings.filter( j => j.source === s ).length;
            return acc;
        }, {} ),
    };

    saveResults( scored, stats );

    console.log( `\n✅ Done. Apply: ${ stats.apply } | Borderline: ${ stats.borderline } | Skip: ${ stats.skip }` );
}

main();