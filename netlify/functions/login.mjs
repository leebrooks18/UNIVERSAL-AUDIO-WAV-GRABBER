import { randomBytes } from 'node:crypto';

// Kicks off the Spotify Authorization Code flow: sets a short-lived state cookie and
// redirects the user to Spotify's consent screen.
export default function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return new Response('Missing SPOTIFY_CLIENT_ID', { status: 500 });
  }

  const requestUrl = new URL(req.url);
  const host = (process.env.PUBLIC_URL || '').replace(/^https?:\/\//, '') || requestUrl.host;
  const redirectUri = `https://${host}/api/callback`;

  const scopes = ['playlist-read-private', 'playlist-read-collaborative', 'user-library-read'].join(' ');
  const state = randomBytes(16).toString('hex');

  const secure = process.env.CONTEXT === 'production' ? '; Secure' : '';
  const cookie = `spotify_auth_state=${state}; HttpOnly; Path=/; Max-Age=600${secure}; SameSite=Lax`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.spotify.com/authorize?${params.toString()}`,
      'Set-Cookie': cookie,
    },
  });
}

export const config = {
  path: '/api/login',
};
