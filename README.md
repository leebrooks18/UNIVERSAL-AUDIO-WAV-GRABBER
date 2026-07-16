# UNIVERSAL-AUDIO-WAV-GRABBER

Universal Audio WAV Grabber — converts Spotify, Apple Music, and YouTube URLs into audio files (WAV/MP3/FLAC/M4A) with advanced encoding presets.

## Spotify OAuth Redirect URIs (Recommended)

When you create a Spotify app in the Spotify Dashboard, add these exact Redirect URIs below. The localhost entries are for local development (PKCE + local callback). The production entries are HTTPS and intended for deployed apps.

Important: Spotify requires an exact string match between the redirect URI you register and the redirect URI used by your client. Add each of the lines below exactly as shown.

Local (development) Redirect URIs — add all of these:

- http://127.0.0.1:8080/callback
- http://localhost:8080/callback
- http://127.0.0.1:53110/callback
- http://localhost:53110/callback

Note: Spotify marks non-HTTPS localhost redirects as "not secure" in the Dashboard — this is expected for local development. PKCE + localhost is the recommended flow for CLI/native apps and does not require a client secret.

Advanced Production Redirect URIs — add one or more of these (replace yourdomain.com):

- https://yourdomain.com/callback
- https://app.yourdomain.com/callback
- https://auth.yourdomain.com/spotify/callback
- https://www.yourdomain.com/callback

Notes for production URIs:
- Production redirect URIs must use HTTPS. Spotify will reject non-HTTPS production redirects.
- Use the exact hostname and path you will deploy to. Do not use wildcards.

## Installation (CLI)

This project is a Node.js command-line tool. It shells out to [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and
[`ffmpeg`](https://ffmpeg.org/), so both must be installed and available on your `PATH`.

```bash
npm install
npm link
```

This exposes the `universal-audio` command. Run it directly with `node bin/universal-audio.js` instead if you'd
rather not link it globally.

## Converting a URL to audio

```bash
universal-audio convert "https://open.spotify.com/track/..." -f wav -o output
```

Options:

- `-f, --format <format>` — `wav` (default), `mp3`, `flac`, or `m4a`
- `-b, --bitrate <bitrate>` — bitrate for lossy formats, e.g. `320k`
- `-o, --output <output>` — output filename without extension (default: `output`)
- `--keep-intermediate` — keep the intermediate downloaded file
- `--no-tag` — skip metadata tagging

## Quick PKCE Authorization Example (CLI)

1. Register the Redirect URIs above in your Spotify Dashboard for your app.
2. Export your client id locally (no secret required for PKCE):

```bash
export SPOTIFY_CLIENT_ID="your-client-id"
```

3. Run the CLI auth flow (example uses port 8080):

```bash
universal-audio auth --port 8080
```

4. The CLI will open a browser to Spotify's consent screen. After you authenticate and consent, Spotify will redirect to:

```
http://127.0.0.1:8080/callback?code=AUTH_CODE&state=STATE
```

5. The CLI captures the authorization code, performs the PKCE token exchange using the code_verifier it generated, and stores the tokens locally (default location: `~/.config/universal-audio/spotify_token.json`).

Security note: do NOT commit your Client Secret or token files into the repository. If a secret or token is exposed, revoke it in the Spotify Dashboard immediately.
