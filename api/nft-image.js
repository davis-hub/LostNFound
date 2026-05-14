export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  let imageUrl = decodeURIComponent(url);
  if (imageUrl.startsWith('ipfs://')) imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'LnF0-Game/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Upstream error' });
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}
