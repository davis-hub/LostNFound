// api/nft-image.js
// Vercel serverless function — proxies NFT images with correct CORS headers
// Uses CommonJS syntax (module.exports) — works on Vercel without package.json changes

const IPFS_GATEWAYS = [
‘https://cloudflare-ipfs.com/ipfs/’,
‘https://nftstorage.link/ipfs/’,
‘https://ipfs.io/ipfs/’,
‘https://gateway.pinata.cloud/ipfs/’,
];

async function fetchWithGateways(ipfsHash) {
for (const gateway of IPFS_GATEWAYS) {
try {
const response = await fetch(`${gateway}${ipfsHash}`, {
headers: { ‘User-Agent’: ‘LnF0-Game/1.0 NFT-Image-Proxy’ },
signal: AbortSignal.timeout(8000),
});
if (response.ok) return response;
} catch (e) {
console.warn(`Gateway ${gateway} failed:`, e.message);
}
}
return null;
}

module.exports = async function handler(req, res) {
// Always set CORS headers first — even on errors
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

// Handle preflight
if (req.method === ‘OPTIONS’) {
return res.status(200).end();
}

// Only allow GET
if (req.method !== ‘GET’) {
return res.status(405).json({ error: ‘Method not allowed’ });
}

const { url } = req.query;

if (!url) {
return res.status(400).json({ error: ‘Missing url parameter’ });
}

let imageUrl;
try {
imageUrl = decodeURIComponent(url);
} catch (e) {
return res.status(400).json({ error: ‘Invalid URL encoding’ });
}

try {
let response = null;
// Handle IPFS protocol — try multiple gateways
if (imageUrl.startsWith('ipfs://')) {
  const ipfsHash = imageUrl.replace('ipfs://', '');
  response = await fetchWithGateways(ipfsHash);
  if (!response) {
    return res.status(502).json({ error: 'All IPFS gateways failed' });
  }
} else {
  // Regular HTTP/HTTPS URL
  let hostname;
  try {
    hostname = new URL(imageUrl).hostname;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  console.log('Proxying image from:', hostname);

  response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'LnF0-Game/1.0 NFT-Image-Proxy',
      'Referer': 'https://lost-n-found-yfbn.vercel.app/',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    console.warn('Direct fetch failed:', response.status, imageUrl);
    return res.status(response.status).json({
      error: 'Upstream error: ' + response.status + ' ' + response.statusText,
      url: imageUrl,
    });
  }
}

const contentType = response.headers.get('content-type') || 'image/png';

// Accept images and binary types
if (
  !contentType.startsWith('image/') &&
  !contentType.includes('octet-stream') &&
  !contentType.includes('application/octet')
) {
  return res.status(400).json({
    error: 'URL does not point to an image',
    contentType: contentType,
  });
}

const buffer = await response.arrayBuffer();

if (!buffer || buffer.byteLength === 0) {
  return res.status(502).json({ error: 'Empty response from image server' });
}

res.setHeader('Content-Type', contentType);
res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
res.setHeader('X-Proxy', 'LnF0-NFT-Proxy');

return res.status(200).send(Buffer.from(buffer));

} catch (error) {
console.error(‘NFT image proxy error:’, error.message, error.name);
if (error.name === 'TimeoutError' || (error.message && error.message.includes('timeout'))) {
  return res.status(504).json({ error: 'Image fetch timed out', detail: error.message });
}

return res.status(500).json({ error: 'Failed to fetch image', detail: error.message });

}
};
