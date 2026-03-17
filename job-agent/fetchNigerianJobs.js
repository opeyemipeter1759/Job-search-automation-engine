const https = require( "https" );
const http = require( "http" );

function fetchURL( url )
{
    return new Promise( ( resolve, reject ) =>
    {
        const client = url.startsWith( "https" ) ? https : http;
        const req = client.get( url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
        }, ( res ) =>
        {
            // Follow redirects
            if ( res.statusCode >= 300 && res.statusCode < 400 && res.headers.location )
            {
                return fetchURL( res.headers.location ).then( resolve ).catch( reject );
            }
            let data = "";
            res.on( "data", ( chunk ) => ( data += chunk ) );
            res.on( "end", () => resolve( data ) );
            res.on( "error", reject );
        } );
        req.on( "error", reject );
        req.setTimeout( 10000, () => { req.destroy(); reject( new Error( "Timeout" ) ); } );
    } );
}

function extractText( html, regex )
{
    const match = html.match( regex );
    return match ? match[1].replace( /<[^>]+>/g, "" ).trim() : "";
}

// ── Jobberman ────────────────────────────────────────────────
async function fetchJobberman( keyword )
{
    try
    {
        const url = `https://www.jobberman.com/jobs?q=${ encodeURIComponent( keyword ) }`;
        const html = await fetchURL( url );

        const jobBlocks = [...html.matchAll( /<article[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/article>/gi )];

        if ( jobBlocks.length === 0 )
        {
            // Try alternative pattern
            const altBlocks = [...html.matchAll( /<div[^>]*class="[^"]*listing[^"]*"[^>]*>([\s\S]*?)<\/div>/gi )];
            if ( altBlocks.length === 0 )
            {
                console.log( "   Jobberman: no listings found (may be blocking)" );
                return [];
            }
        }

        return jobBlocks.slice( 0, 10 ).map( ( m, i ) =>
        {
            const block = m[1];
            const title = extractText( block, /<h2[^>]*>([\s\S]*?)<\/h2>/i ) ||
                extractText( block, /<h3[^>]*>([\s\S]*?)<\/h3>/i ) || "No title";
            const company = extractText( block, /class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\//i ) || "Unknown";
            const location = extractText( block, /class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\//i ) || "Nigeria";
            const urlMatch = block.match( /href="([^"]*job[^"]*)"/i );
            const jobUrl = urlMatch
                ? ( urlMatch[1].startsWith( "http" ) ? urlMatch[1] : `https://www.jobberman.com${ urlMatch[1] }` )
                : "https://www.jobberman.com";

            return {
                id: `jobberman-${ Date.now() }-${ i }`,
                title: title.replace( /\s+/g, " " ).trim(),
                description: extractText( block, /class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\//i ) || keyword,
                url: jobUrl,
                postedAt: new Date().toISOString(),
                company: company.replace( /\s+/g, " " ).trim(),
                location: location.replace( /\s+/g, " " ).trim() || "Lagos, Nigeria",
                source: "jobberman",
                remote: location.toLowerCase().includes( "remote" ),
            };
        } ).filter( j => j.title !== "No title" && j.title.length > 3 );
    } catch ( err )
    {
        console.error( "❌ Jobberman failed:", err.message );
        return [];
    }
}

// ── HotNigeriaJobs ───────────────────────────────────────────
async function fetchHotNigeriaJobs( keyword )
{
    try
    {
        const url = `https://www.hotnigerianjobs.com/hotjobs/?q=${ encodeURIComponent( keyword ) }`;
        const html = await fetchURL( url );

        const jobBlocks = [...html.matchAll( /<div[^>]*class="[^"]*job[-_]?item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi )];

        return jobBlocks.slice( 0, 10 ).map( ( m, i ) =>
        {
            const block = m[1];
            const titleMatch = block.match( /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i );
            const title = titleMatch ? titleMatch[2].replace( /<[^>]+>/g, "" ).trim() : "No title";
            const jobUrl = titleMatch
                ? ( titleMatch[1].startsWith( "http" ) ? titleMatch[1] : `https://www.hotnigerianjobs.com${ titleMatch[1] }` )
                : "https://www.hotnigerianjobs.com";
            const company = extractText( block, /class="[^"]*employer[^"]*"[^>]*>([\s\S]*?)<\//i ) || "Nigerian Employer";
            const location = extractText( block, /class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\//i ) || "Nigeria";

            return {
                id: `hotnigeriajobs-${ Date.now() }-${ i }`,
                title: title.replace( /\s+/g, " " ).trim(),
                description: `${ title } position at ${ company }. Location: ${ location }. Apply via HotNigeriaJobs.`,
                url: jobUrl,
                postedAt: new Date().toISOString(),
                company: company.replace( /\s+/g, " " ).trim(),
                location: location.replace( /\s+/g, " " ).trim() || "Nigeria",
                source: "hotnigeriajobs",
                remote: location.toLowerCase().includes( "remote" ),
            };
        } ).filter( j => j.title !== "No title" && j.title.length > 3 );
    } catch ( err )
    {
        console.error( "❌ HotNigeriaJobs failed:", err.message );
        return [];
    }
}

// ── MyJobMag ─────────────────────────────────────────────────
async function fetchMyJobMag( keyword )
{
    try
    {
        const url = `https://www.myjobmag.com/jobs/${ encodeURIComponent( keyword.replace( /\s+/g, "-" ) ) }`;
        const html = await fetchURL( url );

        const jobBlocks = [...html.matchAll( /<li[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/li>/gi )];

        return jobBlocks.slice( 0, 10 ).map( ( m, i ) =>
        {
            const block = m[1];
            const titleMatch = block.match( /<a[^>]*href="([^"]*)"[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/i ) ||
                block.match( /<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i );
            const title = titleMatch ? titleMatch[2].replace( /<[^>]+>/g, "" ).trim() : "No title";
            const jobUrl = titleMatch
                ? ( titleMatch[1].startsWith( "http" ) ? titleMatch[1] : `https://www.myjobmag.com${ titleMatch[1] }` )
                : "https://www.myjobmag.com";
            const company = extractText( block, /class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\//i ) || "Unknown";
            const location = extractText( block, /class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\//i ) || "Nigeria";

            return {
                id: `myjobmag-${ Date.now() }-${ i }`,
                title: title.replace( /\s+/g, " " ).trim(),
                description: `${ title } role at ${ company }. Based in ${ location }. Apply via MyJobMag.`,
                url: jobUrl,
                postedAt: new Date().toISOString(),
                company: company.replace( /\s+/g, " " ).trim(),
                location: location.replace( /\s+/g, " " ).trim() || "Nigeria",
                source: "myjobmag",
                remote: location.toLowerCase().includes( "remote" ),
            };
        } ).filter( j => j.title !== "No title" && j.title.length > 3 );
    } catch ( err )
    {
        console.error( "❌ MyJobMag failed:", err.message );
        return [];
    }
}

module.exports = { fetchJobberman, fetchHotNigeriaJobs, fetchMyJobMag };