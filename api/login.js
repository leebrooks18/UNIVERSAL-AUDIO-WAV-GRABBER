// api/login.js
export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = `https://${process.env.VERCEL_URL || 'audio-universal.vercel.app'}/api/callback`;
  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read'
  ].join(' ');
  const state = Math.random().toString(36).slice(2);
  res.setHeader('Set-Cookie', `spotify_auth_state=${state}; HttpOnly; Path=/; Max-Age=600`);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    state
  });
  res.writeHead(302, { Location: `https://accounts.spotify.com/authorize?${params.toString()}` });
  res.end();
}
