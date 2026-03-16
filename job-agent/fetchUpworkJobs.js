const https = require( "https" );

function fetchURL( url )
{
    return new Promise( ( resolve, reject ) =>
    {
        https.get( url, {
            headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
        }, ( res ) =>
        {
            let data = "";
            res.on( "data", ( chunk ) => ( data += chunk ) );
            res.on( "end", () => resolve( data ) );
            res.on( "error", reject );
        } ).on( "error", reject );
    } );
}

// ── Source 1: Arbeitnow ──────────────────────────────────────
async function fetchArbeitnow( keyword )
{
    try
    {
        const raw = await fetchURL( "https://www.arbeitnow.com/api/job-board-api" );
        const jobs = JSON.parse( raw ).data ?? [];
        const kw = keyword.toLowerCase();

        return jobs
            .filter( ( job ) => `${ job.title } ${ job.description } ${ job.tags?.join( " " ) }`.toLowerCase().includes( kw ) )
            .map( ( job, i ) => ( {
                id: `arbeitnow-${ job.slug ?? i }`,
                title: job.title ?? "No title",
                description: ( job.description ?? "" ).replace( /<[^>]+>/g, "" ).replace( /&nbsp;/g, " " ).slice( 0, 500 ).trim(),
                url: job.url ?? "https://arbeitnow.com",
                postedAt: job.created_at ? new Date( job.created_at * 1000 ).toISOString() : new Date().toISOString(),
                company: job.company_name ?? "Unknown",
                location: job.location ?? "Remote",
                source: "arbeitnow",
                remote: job.remote ?? true,
                salary: job.salary ?? undefined,
            } ) );
    } catch ( err )
    {
        console.error( "❌ Arbeitnow failed:", err.message );
        return [];
    }
}

// ── Source 2: Remotive ───────────────────────────────────────
async function fetchRemotive( keyword )
{
    try
    {
        const encoded = encodeURIComponent( keyword );
        const raw = await fetchURL( `https://remotive.com/api/remote-jobs?search=${ encoded }&limit=20` );
        const jobs = JSON.parse( raw ).jobs ?? [];

        return jobs.map( ( job, i ) => ( {
            id: `remotive-${ job.id ?? i }`,
            title: job.title ?? "No title",
            description: ( job.description ?? "" ).replace( /<[^>]+>/g, "" ).replace( /&nbsp;/g, " " ).slice( 0, 500 ).trim(),
            url: job.url ?? "https://remotive.com",
            postedAt: job.publication_date ?? new Date().toISOString(),
            company: job.company_name ?? "Unknown",
            location: job.candidate_required_location || "Remote",
            source: "remotive",
            remote: true,
            salary: job.salary || undefined,
        } ) );
    } catch ( err )
    {
        console.error( "❌ Remotive failed:", err.message );
        return [];
    }
}

// ── Source 3: The Muse ───────────────────────────────────────
async function fetchTheMuse( keyword )
{
    try
    {
        const encoded = encodeURIComponent( keyword );
        const raw = await fetchURL( `https://www.themuse.com/api/public/jobs?query=${ encoded }&page=1&descending=true` );
        const jobs = JSON.parse( raw ).results ?? [];

        return jobs.map( ( job, i ) => ( {
            id: `muse-${ job.id ?? i }`,
            title: job.name ?? "No title",
            description: ( job.contents ?? "" ).replace( /<[^>]+>/g, "" ).replace( /&nbsp;/g, " " ).slice( 0, 500 ).trim(),
            url: job.refs?.landing_page ?? "https://themuse.com",
            postedAt: job.publication_date ?? new Date().toISOString(),
            company: job.company?.name ?? "Unknown",
            location: job.locations?.[0]?.name ?? "Remote",
            source: "themuse",
            remote: job.locations?.[0]?.name?.toLowerCase().includes( "remote" ) ?? false,
            salary: undefined,
        } ) );
    } catch ( err )
    {
        console.error( "❌ The Muse failed:", err.message );
        return [];
    }
}

// ── Deduplication ────────────────────────────────────────────
function deduplicate( listings )
{
    const seen = new Set();
    return listings.filter( ( job ) =>
    {
        const key = `${ job.title.toLowerCase() }-${ job.company.toLowerCase() }`;
        if ( seen.has( key ) ) return false;
        seen.add( key );
        return true;
    } );
}

// ── Main export ──────────────────────────────────────────────
async function fetchAllJobs( keyword )
{
    console.log( `🔍 Searching all sources for: "${ keyword }"` );

    const [arbeitnow, remotive, muse] = await Promise.all( [
        fetchArbeitnow( keyword ),
        fetchRemotive( keyword ),
        fetchTheMuse( keyword ),
    ] );

    console.log( `   Arbeitnow: ${ arbeitnow.length } | Remotive: ${ remotive.length } | The Muse: ${ muse.length }` );

    const combined = deduplicate( [...arbeitnow, ...remotive, ...muse] );
    console.log( `   Total after dedup: ${ combined.length }` );

    return combined;
}

module.exports = { fetchUpworkJobs: fetchAllJobs };