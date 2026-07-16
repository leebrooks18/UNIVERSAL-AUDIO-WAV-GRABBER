import path from 'node:path';
import os from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { run, runCapture } from './procUtils.js';

// Download the given URL to a temporary audio file, returning its path and metadata info.
export async function downloadToFile(url, info = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'uawg_'));

  // For Spotify/Apple Music URLs, yt-dlp can often extract a matching webpage; otherwise fall back to search.
  let meta = null;
  try {
    const json = await runCapture('yt-dlp', ['--no-playlist', '--dump-single-json', '--quiet', url]);
    meta = JSON.parse(json);
  } catch {
    meta = null;
  }

  let target = url;
  if (!meta || meta.extractor === 'generic') {
    const query = info.title && info.artist ? `ytsearch1:${info.artist} - ${info.title}` : `ytsearch1:${url}`;
    const json = await runCapture('yt-dlp', ['--no-playlist', '--dump-single-json', '--quiet', query]);
    meta = JSON.parse(json);
  }

  if (meta.entries) {
    meta = meta.entries[0];
  }
  target = meta.webpage_url || target;

  const outTemplate = path.join(dir, `${meta.id}.%(ext)s`);
  await run('yt-dlp', ['--no-playlist', '-f', 'bestaudio/best', '-o', outTemplate, target]);

  const ext = meta.ext || 'm4a';
  const outPath = path.join(dir, `${meta.id}.${ext}`);

  return { path: outPath, info: meta };
}
