// api/nft-image.js
// Vercel serverless function — proxies NFT images with correct CORS headers
// Uses Node.js built-in https module — works on ALL Node versions (no fetch needed)

const https = require(‘https’);
const http = require(‘http’);

const IPFS_GATEWAYS = [
‘https://cloudflare-ipfs.com/ipfs/’,
‘https://nftstorage.link/ipfs/’,
‘https://ipfs.io/ipfs/’,
‘https://gateway.pinata.cloud/ipfs/’,
];

function fetchUrl(url, timeoutMs = 10000) {
return new Promise((resolve, reject) => {
const lib = url.startsWith(‘https’) ? https : http;
const req = lib.get(url, {
headers: {
‘User-Agent’: ‘LnF0-Game/1.0 NFT-Image-Proxy’,
‘Referer’: ‘https://lost-n-found-yfbn.vercel.app/’,
}
}, (res) => {
// Handle redirects
if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject);
return;
}
const chunks = [];
res.on(‘data’, chunk => chunks.push(chunk));
res.on(‘end’, () => {
resolve({
status: res.statusCode,
ok: res.statusCode >= 200 && res.statusCode < 300,
contentType: res.headers[‘content-type’] || ‘image/png’,
buffer: Buffer.concat(chunks),
});
});
res.on(‘error’, reject);
});
req.setTimeout(timeoutMs, () => {
req.destroy();
reject(new Error(‘Request timed out’));
});
req.on(‘error’, reject);
});
}

async function fetchWithGateways(ipfsHash) {
for (const gateway of IPFS_GATEWAYS) {
try {
const result = await fetchUrl(`${gateway}${ipfsHash}`);
if (result.ok) return result;
console.warn(`Gateway ${gateway} returned ${result.status}`);
} catch (e) {
console.warn(`Gateway ${gateway} failed:`, e.message);
}
}
return null;
}

module.exports = async function handler(req, res) {
// Always set CORS headers first
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

if (req.method === ‘OPTIONS’) {
return res.status(200).end();
}

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
let result = null;
if (imageUrl.startsWith('ipfs://')) {
  const ipfsHash = imageUrl.replace('ipfs://', '');
  result = await fetchWithGateways(ipfsHash);
  if (!result) {
    return res.status(502).json({ error: 'All IPFS gateways failed' });
  }
} else {
  try { new URL(imageUrl); } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  console.log('Proxying image from:', imageUrl);
  result = await fetchUrl(imageUrl);

  if (!result.ok) {
    console.warn('Fetch failed:', result.status, imageUrl);
    return res.status(result.status).json({
      error: 'Upstream error: ' + result.status,
      url: imageUrl,
    });
  }
}

const contentType = result.contentType || 'image/png';

if (
  !contentType.startsWith('image/') &&
  !contentType.includes('octet-stream')
) {
  return res.status(400).json({
    error: 'Not an image',
    contentType: contentType,
  });
}

if (!result.buffer || result.buffer.length === 0) {
  return res.status(502).json({ error: 'Empty response' });
}

res.setHeader('Content-Type', contentType);
res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

return res.status(200).send(result.buffer);

} catch (error) {
console.error(‘Proxy error:’, error.message);
return res.status(500).json({ error: ‘Failed to fetch image’, detail: error.message });
}
};
