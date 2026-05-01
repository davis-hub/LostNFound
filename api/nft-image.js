// api/nft-image.js

export const config = {
runtime: ‘edge’,
};

const IPFS_GATEWAYS = [
‘https://cloudflare-ipfs.com/ipfs/’,
‘https://nftstorage.link/ipfs/’,
‘https://ipfs.io/ipfs/’,
];

export default async function handler(req) {
const corsHeaders = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Methods’: ‘GET, OPTIONS’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
};

if (req.method === ‘OPTIONS’) {
return new Response(null, { status: 200, headers: corsHeaders });
}

const { searchParams } = new URL(req.url);
const url = searchParams.get(‘url’);

if (!url) {
return new Response(JSON.stringify({ error: ‘Missing url parameter’ }), {
status: 400,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ },
});
}

let imageUrl = decodeURIComponent(url);

try {
let response = null;
// Handle IPFS URLs — try multiple gateways
if (imageUrl.startsWith('ipfs://')) {
  const hash = imageUrl.replace('ipfs://', '');
  for (const gateway of IPFS_GATEWAYS) {
    try {
      response = await fetch(`${gateway}${hash}`);
      if (response.ok) break;
    } catch (e) {
      continue;
    }
  }
  if (!response || !response.ok) {
    return new Response(JSON.stringify({ error: 'All IPFS gateways failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
} else {
  response = await fetch(imageUrl, {
    headers: { 'User-Agent': 'LnF0-Game/1.0' },
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Upstream error: ' + response.status }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

const contentType = response.headers.get('content-type') || 'image/png';
const buffer = await response.arrayBuffer();

return new Response(buffer, {
  status: 200,
  headers: {
    ...corsHeaders,
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, immutable',
  },
});

} catch (error) {
return new Response(JSON.stringify({ error: ‘Failed to fetch image’, detail: error.message }), {
status: 500,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ },
});
}
}
