import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run } from './procUtils.js';

async function downloadArt(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const artPath = path.join(os.tmpdir(), `uawg_art_${process.pid}_${Math.round(Math.random() * 1e9)}.jpg`);
  fs.writeFileSync(artPath, buf);
  return artPath;
}

// Apply basic metadata tags and embed cover art where possible.
export async function applyTags(filePath, info) {
  if (!info) return;

  const tags = {};
  if (info.title) tags.title = info.title;
  if (info.artist) tags.artist = info.artist;
  if (info.album) tags.album = info.album;

  const hasArt = Boolean(info.thumbnail);
  if (Object.keys(tags).length === 0 && !hasArt) return;

  const ext = path.extname(filePath).toLowerCase();
  const tmpOut = `${filePath}.tagged${ext}`;

  let artPath = null;
  if (hasArt) {
    artPath = await downloadArt(info.thumbnail).catch(() => null);
  }

  const metadataArgs = [];
  for (const [key, value] of Object.entries(tags)) {
    metadataArgs.push('-metadata', `${key}=${value}`);
  }

  // Cover art embedding as an attached picture stream is only supported by these containers.
  const canEmbedArt = artPath && ['.mp3', '.flac', '.m4a'].includes(ext);
  const args = canEmbedArt
    ? ['-y', '-i', filePath, '-i', artPath, '-map', '0:a', '-map', '1:0', '-c', 'copy', '-disposition:v:0', 'attached_pic', ...metadataArgs, tmpOut]
    : ['-y', '-i', filePath, '-c', 'copy', ...metadataArgs, tmpOut];

  try {
    await run('ffmpeg', args);
    fs.renameSync(tmpOut, filePath);
  } finally {
    if (artPath) fs.rmSync(artPath, { force: true });
  }
}
