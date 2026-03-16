require( 'dotenv' ).config();
const { GoogleGenerativeAI } = require( '@google/generative-ai' );

const genAI = new GoogleGenerativeAI( process.env.GEMINI_API_KEY );

const jobDescription = `
  React Frontend at Flutterwave (Lagos, Remote)
  We are looking for a backend engineer to build and maintain our payment APIs.
  Requirements: 4+ years Node.js, REST API design, PostgreSQL, AWS experience.
  Nice to have: fintech background, experience with high-throughput systems.
`;

async function analyseJob( description )
{
    const model = genAI.getGenerativeModel( {
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json'  // Forces Gemini to return JSON
        },
        systemInstruction: `You are a job analysis assistant.
Always respond with ONLY a valid JSON object with exactly these fields:
- role: string (the job title)
- skills: array of 5 strings (key skills required)
- fitScore: number from 0 to 100 (how suitable this is for a senior Node.js developer)`
    } );

    const result = await model.generateContent(
        `Analyse this job description:\n\n${ description }`
    );

    const rawText = result.response.text();
    const parsed = JSON.parse( rawText );

    return parsed;
}

analyseJob( jobDescription )
    .then( result =>
    {
        console.log( '✅ Analysis complete:\n' );
        console.log( JSON.stringify( result, null, 2 ) );
    } )
    .catch( err =>
    {
        console.error( '❌ Error:', err.message );
    } );