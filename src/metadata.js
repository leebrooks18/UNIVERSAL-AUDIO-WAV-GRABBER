import { runCapture } from './procUtils.js';

// Attempt to fetch metadata for the provided URL. Uses yt-dlp where possible, or falls back
// to the Spotify Web API (client-credentials flow) when Spotify credentials are present.
// Returns an info object with keys: title, artist, album, thumbnail, duration.
export async function fetchMetadata(url) {
  const info = {};

  try {
    const json = await runCapture('yt-dlp', ['--no-playlist', '--dump-single-json', '--quiet', url]);
    let meta = JSON.parse(json);
    if (meta.entries) meta = meta.entries[0];
    if (meta) {
      info.title = meta.title;
      info.artist = meta.uploader || meta.artist || meta.creator;
      info.album = meta.album;
      info.thumbnail = meta.thumbnail;
      info.duration = meta.duration;
      info.sourceInfo = meta;
      return info;
    }
  } catch {
    // fall through to Spotify lookup below
  }

  if (url.includes('open.spotify.com')) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
    if (clientId && clientSecret && match) {
      try {
        const [, type, id] = match;
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ grant_type: 'client_credentials' }),
        });
        const { access_token: accessToken } = await tokenRes.json();
        if (accessToken && type === 'track') {
          const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const t = await trackRes.json();
          info.title = t.name;
          info.artist = (t.artists || []).map((a) => a.name).join(', ');
          info.album = t.album?.name;
          info.thumbnail = t.album?.images?.[0]?.url;
        }
      } catch {
        // Apple Music / other fallbacks: return whatever minimal info we already have
      }
    }
  }

  return info;
}
