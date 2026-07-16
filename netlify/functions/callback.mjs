function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((c) => c.trim())
    .reduce((acc, pair) => {
      if (!pair) return acc;
      const idx = pair.indexOf('=');
      const k = pair.substring(0, idx);
      const v = pair.substring(idx + 1);
      acc[k] = decodeURIComponent(v);
      return acc;
    }, {});
}

// Completes the Spotify Authorization Code flow: validates the state cookie, exchanges the
// auth code for tokens, stores the refresh token in a cookie, and redirects to the success page.
export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const returnedState = requestUrl.searchParams.get('state');
  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const cookies = parseCookies(req.headers.get('cookie') || '');
  const savedState = cookies['spotify_auth_state'];
  if (!savedState || savedState !== returnedState) {
    return new Response('Invalid state', { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing Spotify credentials', { status: 500 });
  }

  const host = (process.env.PUBLIC_URL || '').replace(/^https?:\/\//, '') || requestUrl.host;
  const redirectUri = `https://${host}/api/callback`;

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error('token exchange error', tokenRes.status, await tokenRes.text());
    return new Response('Token exchange failed', { status: 502 });
  }

  const tokenJson = await tokenRes.json();

  // Save refresh token in a secure cookie (demo). Consider a DB in production.
  const secure = process.env.CONTEXT === 'production' ? '; Secure' : '';
  const sameSite = '; SameSite=Lax';
  const cookie = `spotify_refresh=${encodeURIComponent(tokenJson.refresh_token || '')}; HttpOnly; Path=/; Max-Age=2592000${secure}${sameSite}`;
  const clearState = `spotify_auth_state=; HttpOnly; Path=/; Max-Age=0${secure}${sameSite}`;

  const headers = new Headers({ Location: '/auth-success.html' });
  headers.append('Set-Cookie', cookie);
  headers.append('Set-Cookie', clearState);

  return new Response(null, { status: 302, headers });
}

export const config = {
  path: '/api/callback',
};
