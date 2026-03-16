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
async function fetchArbeitnow( keyword, { remoteOnly, location } )
{
    try
    {
        let url = "https://www.arbeitnow.com/api/job-board-api";
        if ( remoteOnly ) url += "?remote=true";

        const raw = await fetchURL( url );
        const jobs = JSON.parse( raw ).data ?? [];
        const kw = keyword.toLowerCase();

        return jobs
            .filter( ( job ) =>
            {
                const text = `${ job.title } ${ job.description } ${ job.tags?.join( " " ) }`.toLowerCase();
                if ( !text.includes( kw ) ) return false;
                if ( location && !job.location?.toLowerCase().includes( location.toLowerCase() ) ) return false;
                return true;
            } )
            .map( ( job, i ) => ( {
                id: `arbeitnow-${ job.slug ?? i }`,
                title: job.title ?? "No title",
                description: ( job.description ?? "" ).replace( /<[^>]+>/g, "" ).replace( /&nbsp;/g, " " ).slice( 0, 600 ).trim(),
                url: job.url ?? "https://arbeitnow.com",
                postedAt: job.created_at ? new Date( job.created_at * 1000 ).toISOString() : new Date().toISOString(),
                company: job.company_name ?? "Unknown",
                location: job.location ?? "Remote",
                source: "arbeitnow",
                remote: job.remote ?? false,
                salary: job.salary ?? undefined,
            } ) );
    } catch ( err )
    {
        console.error( "❌ Arbeitnow failed:", err.message );
        return [];
    }
}

// ── Source 2: Remotive (remote jobs only) ────────────────────
async function fetchRemotive( keyword )
{
    try
    {
        const raw = await fetchURL(
            `https://remotive.com/api/remote-jobs?search=${ encodeURIComponent( keyword ) }&limit=20`
        );
        const jobs = JSON.parse( raw ).jobs ?? [];

        return jobs.map( ( job, i ) => ( {
            id: `remotive-${ job.id ?? i }`,
            title: job.title ?? "No title",
            description: ( job.description ?? "" ).replace( /<[^>]+>/g, "" ).replace( /&nbsp;/g, " " ).slice( 0, 600 ).trim(),
            url: job.url ?? "https://remotive.com",
            postedAt: job.publication_date ?? new Date().toISOString(),
            company: job.company_name ?? "Unknown",
            location: job.candidate_required_location || "Worldwide",
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
async function fetchTheMuse( keyword, { location } )
{
    try
    {
        let url = `https://www.themuse.com/api/public/jobs?query=${ encodeURIComponent( keyword ) }&page=1&descending=true`;
        if ( location ) url += `&location=${ encodeURIComponent( location ) }`;

        const raw = await fetchURL( url );
        const jobs = JSON.parse( raw ).results ?? [];

        return jobs.map( ( job, i ) =>
        {
            const loc = job.locations?.[0]?.name ?? "Remote";
            return {
                id: `muse-${ job.id ?? i }`,
                title: job.name ?? "No title",
                description: ( job.contents ?? "" ).replace( /<[^>]+>/g, "" ).replace( /&nbsp;/g, " " ).slice( 0, 600 ).trim(),
                url: job.refs?.landing_page ?? "https://themuse.com",
                postedAt: job.publication_date ?? new Date().toISOString(),
                company: job.company?.name ?? "Unknown",
                location: loc,
                source: "themuse",
                remote: loc.toLowerCase().includes( "remote" ) || loc.toLowerCase().includes( "flexible" ),
                salary: undefined,
            };
        } );
    } catch ( err )
    {
        console.error( "❌ The Muse failed:", err.message );
        return [];
    }
}

// ── Source 4: Jobicy ─────────────────────────────────────────
async function fetchJobicy( keyword, { remoteOnly, location } )
{
    try
    {
        let url = `https://jobicy.com/api/v2/remote-jobs?count=20&tag=${ encodeURIComponent( keyword ) }`;
        if ( location ) url += `&geo=${ encodeURIComponent( location ) }`;

        const raw = await fetchURL( url );
        const jobs = JSON.parse( raw ).jobs ?? [];

        return jobs
            .filter( ( job ) => !remoteOnly || (
                Array.isArray( job.jobType )
                    ? job.jobType.some( ( t ) => t?.toLowerCase().includes( "remote" ) )
                    : typeof job.jobType === "string"
                        ? job.jobType.toLowerCase().includes( "remote" )
                        : true
            ) )
            .map( ( job, i ) => ( {
                id: `jobicy-${ job.id ?? i }`,
                title: job.jobTitle ?? "No title",
                description: ( job.jobDescription ?? "" ).replace( /<[^>]+>/g, "" ).replace( /&nbsp;/g, " " ).slice( 0, 600 ).trim(),
                url: job.url ?? "https://jobicy.com",
                postedAt: job.pubDate ?? new Date().toISOString(),
                company: job.companyName ?? "Unknown",
                location: job.jobGeo ?? "Remote",
                source: "jobicy",
                remote: Array.isArray( job.jobType )
                    ? job.jobType.some( ( t ) => t?.toLowerCase().includes( "remote" ) )
                    : typeof job.jobType === "string"
                        ? job.jobType.toLowerCase().includes( "remote" )
                        : true,
                salary: job.annualSalaryMin
                    ? `$${ job.annualSalaryMin }–$${ job.annualSalaryMax }`
                    : undefined,
            } ) );
    } catch ( err )
    {
        console.error( "❌ Jobicy failed:", err.message );
        return [];
    }
}

// ── Source 5: Working Nomads ─────────────────────────────────
async function fetchWorkingNomads( keyword )
{
    try
    {
        const raw = await fetchURL(
            `https://www.workingnomads.com/api/exposed_jobs/?search=${ encodeURIComponent( keyword ) }`
        );
        const jobs = JSON.parse( raw ) ?? [];

        return jobs.slice( 0, 15 ).map( ( job, i ) => ( {
            id: `workingnomads-${ job.id ?? i }`,
            title: job.title ?? "No title",
            description: ( job.description ?? "" ).replace( /<[^>]+>/g, "" ).slice( 0, 600 ).trim(),
            url: job.url ?? "https://workingnomads.com",
            postedAt: job.pub_date ?? new Date().toISOString(),
            company: job.company_name ?? "Unknown",
            location: job.region || "Worldwide",
            source: "workingnomads",
            remote: true,
            salary: undefined,
        } ) );
    } catch ( err )
    {
        console.error( "❌ Working Nomads failed:", err.message );
        return [];
    }
}

// ── Deduplication ────────────────────────────────────────────
function deduplicate( listings )
{
    const seen = new Set();
    return listings.filter( ( job ) =>
    {
        const key = `${ job.title.toLowerCase().slice( 0, 40 ) }-${ job.company.toLowerCase() }`;
        if ( seen.has( key ) ) return false;
        seen.add( key );
        return true;
    } );
}

// ── Main export ──────────────────────────────────────────────
async function fetchAllJobs( keyword, options = {} )
{
    const { remoteOnly = false, location = "" } = options;

    console.log( `\n🔍 Searching for: "${ keyword }"` );
    if ( location ) console.log( `   📍 Location filter: ${ location }` );
    if ( remoteOnly ) console.log( `   🌍 Remote only: yes` );

    const sources = remoteOnly
        ? [
            // Remote-only sources
            fetchRemotive( keyword ),
            fetchWorkingNomads( keyword ),
            fetchJobicy( keyword, { remoteOnly, location } ),
            fetchArbeitnow( keyword, { remoteOnly, location } ),
        ]
        : [
            // All sources
            fetchArbeitnow( keyword, { remoteOnly, location } ),
            fetchRemotive( keyword ),
            fetchTheMuse( keyword, { location } ),
            fetchJobicy( keyword, { remoteOnly, location } ),
            fetchWorkingNomads( keyword ),
        ];

    const results = await Promise.all( sources );
    const [s1, s2, s3, s4, s5] = results;

    console.log( `\n   📊 Results per source:` );
    console.log( `      Arbeitnow:      ${ ( s1 ?? s4 ?? [] ).length }` );
    console.log( `      Remotive:       ${ ( s2 ?? s1 ?? [] ).length }` );
    console.log( `      The Muse:       ${ ( s3 ?? [] ).length }` );
    console.log( `      Jobicy:         ${ ( s4 ?? s3 ?? [] ).length }` );
    console.log( `      Working Nomads: ${ ( s5 ?? s4 ?? [] ).length }` );

    const combined = deduplicate( results.flat() );
    console.log( `\n   ✅ Total after dedup: ${ combined.length } listings\n` );

    return combined;
}

module.exports = { fetchUpworkJobs: fetchAllJobs };