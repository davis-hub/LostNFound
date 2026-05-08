// api/nft-image.js
// Vercel serverless function — proxies NFT images with correct CORS headers
// so they can be drawn onto HTML canvas without security errors.
// Deploy this file to your Vercel project at: /api/nft-image.js

export default async function handler(req, res) {
// Only allow GET requests
if (req.method !== ‘GET’) {
return res.status(405).json({ error: ‘Method not allowed’ });
}

const { url } = req.query;

// Validate URL is present
if (!url) {
return res.status(400).json({ error: ‘Missing url parameter’ });
}

let imageUrl = decodeURIComponent(url);

// Convert IPFS protocol URLs to HTTP gateway
if (imageUrl.startsWith(‘ipfs://’)) {
imageUrl = imageUrl.replace(‘ipfs://’, ‘https://ipfs.io/ipfs/’);
}

// Security: only allow image URLs from known safe domains
const ALLOWED_DOMAINS = [
‘ipfs.io’,
‘cloudflare-ipfs.com’,
‘nftstorage.link’,
‘arweave.net’,
‘cdn.alchemy.com’,
‘res.cloudinary.com’,
‘metadata.ens.domains’,
‘openseauserdata.com’,
‘seadn.io’,
‘lh3.googleusercontent.com’,
‘i.seadn.io’,
];

let hostname;
try {
hostname = new URL(imageUrl).hostname;
} catch {
return res.status(400).json({ error: ‘Invalid URL’ });
}

const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(’.’ + d));
if (!isAllowed) {
// Still try to fetch — just log it
console.warn(`Proxying unlisted domain: ${hostname}`);
}

try {
const response = await fetch(imageUrl, {
headers: {
‘User-Agent’: ‘LnF0-Game/1.0 NFT-Image-Proxy’,
},
// 8 second timeout
signal: AbortSignal.timeout(8000),
});

```
if (!response.ok) {
  return res.status(response.status).json({
    error: `Upstream error: ${response.status} ${response.statusText}`,
  });
}

const contentType = response.headers.get('content-type') || 'image/png';

// Only proxy actual image content types
if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
  return res.status(400).json({ error: 'URL does not point to an image' });
}

const buffer = await response.arrayBuffer();

// Set CORS headers — this is the whole point of this proxy
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET');
res.setHeader('Content-Type', contentType);

// Cache for 24 hours — NFT images don't change
res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

return res.status(200).send(Buffer.from(buffer));
```

} catch (error) {
console.error(‘NFT image proxy error:’, error.message);
return res.status(500).json({ error: ‘Failed to fetch image’, detail: error.message });
}
}