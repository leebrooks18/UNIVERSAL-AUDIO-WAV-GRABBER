// api/callback.js
export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const redirectUri = `https://${process.env.VERCEL_URL || 'audio-universal.vercel.app'}/api/callback`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const authHeader = 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return res.status(500).send(`Token exchange failed: ${txt}`);
  }

  const tokenJson = await tokenRes.json();
  // Example: store refresh token in a secure cookie (for demo only)
  res.setHeader('Set-Cookie', `spotify_refresh=${tokenJson.refresh_token}; HttpOnly; Path=/; Max-Age=2592000`);
  res.writeHead(302, { Location: '/' });
  res.end();
}
