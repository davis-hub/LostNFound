// api/nft-image.js
const https = require(‘https’);
const http = require(‘http’);

function fetchImage(url, cb) {
const lib = url.startsWith(‘https’) ? https : http;
lib.get(url, {
headers: {
‘User-Agent’: ‘Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36’,
‘Accept’: ‘image/webp,image/apng,image/*,*/*;q=0.8’,
‘Referer’: ‘https://opensea.io/’,
‘Origin’: ‘https://opensea.io’,
}
}, (res) => {
if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
return fetchImage(res.headers.location, cb);
}
cb(null, res);
}).on(‘error’, (e) => cb(e));
}

module.exports = function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, OPTIONS’);

if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘GET’) return res.status(405).end();

const { url } = req.query;
if (!url) return res.status(400).json({ error: ‘Missing url’ });

let imageUrl;
try { imageUrl = decodeURIComponent(url); } catch (e) { return res.status(400).end(); }

if (imageUrl.startsWith(‘ipfs://’)) {
imageUrl = imageUrl.replace(‘ipfs://’, ‘https://cloudflare-ipfs.com/ipfs/’);
}

fetchImage(imageUrl, (err, upstream) => {
if (err) return res.status(500).json({ error: err.message });
if (upstream.statusCode !== 200) return res.status(upstream.statusCode).json({ error: ‘Upstream error’ });
res.setHeader(‘Content-Type’, upstream.headers[‘content-type’] || ‘image/png’);
res.setHeader(‘Cache-Control’, ‘public, max-age=86400’);
res.status(200);
upstream.pipe(res);
});
};
