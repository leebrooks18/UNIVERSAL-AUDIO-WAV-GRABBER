import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    // No browser available (e.g. headless environment) — the URL is still printed for the user to open.
  }
}

// Perform the Spotify Authorization Code + PKCE flow via a local HTTP callback server,
// then store the resulting tokens in ~/.config/universal-audio/spotify_token.json.
export async function spotifyAuth({ clientId, redirectUri, scopes }) {
  const codeVerifier = base64url(crypto.randomBytes(64));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const redirect = new URL(redirectUri);
  const port = Number(redirect.port) || 80;

  const authorizeUrl = new URL('https://accounts.spotify.com/authorize');
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: scopes.join(' '),
    state,
  }).toString();

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, redirectUri);
      if (reqUrl.pathname !== redirect.pathname) {
        res.statusCode = 404;
        res.end();
        return;
      }

      const returnedState = reqUrl.searchParams.get('state');
      const authCode = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');

      res.setHeader('Content-Type', 'text/html');
      if (error || !authCode || returnedState !== state) {
        res.statusCode = 400;
        res.end('<h1>Authorization failed</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error(error || 'Invalid state or missing code'));
        return;
      }

      res.statusCode = 200;
      res.end('<h1>Authorization complete</h1><p>You can close this window and return to the terminal.</p>');
      server.close();
      resolve(authCode);
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      console.log(`Open this URL to authorize (or your browser will open automatically): ${authorizeUrl.toString()}`);
      openBrowser(authorizeUrl.toString());
    });
  });

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const token = await tokenRes.json();

  const configDir = path.join(os.homedir(), '.config', 'universal-audio');
  fs.mkdirSync(configDir, { recursive: true });
  const tokenPath = path.join(configDir, 'spotify_token.json');
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2), { mode: 0o600 });

  return token;
}
