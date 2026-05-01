// api/nft-image.js

export const config = { runtime: ‘nodejs18.x’ };

const https = require(‘https’);

module.exports = function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, OPTIONS’);

if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘GET’) return res.status(405).end();

const { url } = req.query;
if (!url) return res.status(400).json({ error: ‘Missing url’ });

let imageUrl;
try { imageUrl = decodeURIComponent(url); } catch { return res.status(400).end(); }

if (imageUrl.startsWith(‘ipfs://’)) {
imageUrl = imageUrl.replace(‘ipfs://’, ‘https://cloudflare-ipfs.com/ipfs/’);
}

const options = {
headers: {
‘User-Agent’: ‘Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36’,
‘Accept’: ‘image/webp,image/apng,image/*,*/*;q=0.8’,
‘Accept-Language’: ‘en-US,en;q=0.9’,
‘Referer’: ‘https://opensea.io/’,
‘Origin’: ‘https://opensea.io’,
}
};

try {
https.get(imageUrl, options, (upstream) => {
if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
// Follow redirect
https.get(upstream.headers.location, options, (redirected) => {
res.setHeader(‘Content-Type’, redirected.headers[‘content-type’] || ‘image/png’);
res.setHeader(‘Cache-Control’, ‘public, max-age=86400’);
res.status(200);
redirected.pipe(res);
}).on(‘error’, () => res.status(502).end());
return;
}
if (upstream.statusCode !== 200) {
return res.status(upstream.statusCode).json({ error: ‘Upstream error’, status: upstream.statusCode });
}
res.setHeader(‘Content-Type’, upstream.headers[‘content-type’] || ‘image/png’);
res.setHeader(‘Cache-Control’, ‘public, max-age=86400’);
res.status(200);
upstream.pipe(res);
}).on(‘error’, (e) => {
res.status(500).json({ error: e.message });
});
} catch (e) {
res.status(500).json({ error: e.message });
}
};
