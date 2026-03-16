require( "dotenv" ).config();
const { GoogleGenerativeAI } = require( "@google/generative-ai" );
const { fetchUpworkJobs } = require( "./fetchUpworkJobs" );

const genAI = new GoogleGenerativeAI( process.env.GEMINI_API_KEY );

async function analyseJob( listing )
{
    const model = genAI.getGenerativeModel( {
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
        systemInstruction: `You are a job analysis assistant.
Always respond with ONLY a valid JSON object with exactly these fields:
- role: string (the job title)
- skills: array of 5 strings (key skills required)
- fitScore: number from 0 to 100 (fit for a senior Node.js developer)
- recommendation: "apply" | "borderline" | "skip"`,
    } );

    const result = await model.generateContent(
        `Analyse this job listing:\n\nTitle: ${ listing.title }\n\nDescription: ${ listing.description }`
    );

    return JSON.parse( result.response.text() );
}

async function main()
{
    // Change these to test different scenarios
    const keyword = process.argv[2] ?? "product manager";
    const remoteOnly = process.argv[3] === "--remote";
    const location = process.argv[4] ?? "";

    console.log( "🚀 Job Search Agent starting..." );

    const listings = await fetchUpworkJobs( keyword, { remoteOnly, location } );

    if ( listings.length === 0 )
    {
        console.log( "No listings found." );
        return;
    }

    console.log( `Scoring first 5 of ${ listings.length } listings...\n` );

    for ( const listing of listings.slice( 0, 5 ) )
    {
        console.log( `📋 ${ listing.title } — ${ listing.company }` );
        console.log( `   📍 ${ listing.location } | 🌍 Remote: ${ listing.remote }` );
        console.log( `   Source: ${ listing.source }` );
        if ( listing.salary ) console.log( `   💰 ${ listing.salary }` );

        try
        {
            const analysis = await analyseJob( listing );
            console.log( `   Score: ${ analysis.fitScore }/100` );
            console.log( `   Skills: ${ analysis.skills.join( ", " ) }` );
            console.log( `   → ${ analysis.recommendation.toUpperCase() }` );
        } catch ( err )
        {
            console.log( `   ⚠️  Scoring failed: ${ err.message }` );
        }
        console.log( "" );
    }
}
main();