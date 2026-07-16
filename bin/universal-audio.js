#!/usr/bin/env node
import fs from 'node:fs';
import { Command } from 'commander';
import { fetchMetadata } from '../src/metadata.js';
import { downloadToFile } from '../src/downloader.js';
import { encodeAudio } from '../src/encoder.js';
import { applyTags } from '../src/tagger.js';
import { spotifyAuth } from '../src/auth.js';

const program = new Command();
program.name('universal-audio').description('Universal Audio WAV Grabber');

program
  .command('convert')
  .description('Convert a URL (Spotify / Apple Music / YouTube) to audio')
  .argument('<url>', 'source URL')
  .option('-f, --format <format>', 'output format: wav, mp3, flac, m4a', 'wav')
  .option('-b, --bitrate <bitrate>', 'bitrate for lossy formats (e.g. 128k, 320k)')
  .option('-o, --output <output>', 'output filename without extension', 'output')
  .option('--keep-intermediate', 'keep intermediate downloaded file', false)
  .option('--no-tag', 'skip metadata tagging')
  .action(async (url, opts) => {
    const fmt = opts.format.toLowerCase();
    if (!['wav', 'mp3', 'flac', 'm4a'].includes(fmt)) {
      console.error(`Unsupported format: ${opts.format}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Resolving and downloading: ${url}`);
    const info = await fetchMetadata(url);
    const { path: tempPath, info: downloadInfo } = await downloadToFile(url, info);
    console.log(`Downloaded to temporary file: ${tempPath}`);

    const outPath = `${opts.output}.${fmt}`;
    console.log(`Encoding to ${outPath} (format=${fmt})`);
    await encodeAudio(tempPath, outPath, { fmt, bitrate: opts.bitrate });

    if (opts.tag) {
      console.log('Applying metadata tags (if available)');
      try {
        await applyTags(outPath, { ...downloadInfo, ...info });
      } catch (err) {
        console.log(`Warning: tagging failed: ${err.message}`);
      }
    }

    if (!opts.keepIntermediate) {
      fs.rm(tempPath, { force: true }, () => {});
    }

    console.log(`Done: ${outPath}`);
  });

program
  .command('auth')
  .description('Perform Spotify Authorization Code + PKCE flow (local host callback)')
  .option('--client-id <clientId>', 'Spotify Client ID (or set SPOTIFY_CLIENT_ID env var)')
  .option('--port <port>', 'localhost port for redirect (must match app redirect URI)', '8080')
  .option(
    '--scopes <scopes>',
    'space-separated Spotify scopes',
    'playlist-read-private playlist-read-collaborative user-library-read',
  )
  .action(async (opts) => {
    const clientId = opts.clientId || process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      console.log('Spotify Client ID not provided. Set SPOTIFY_CLIENT_ID or pass --client-id');
      process.exitCode = 1;
      return;
    }

    const redirectUri = `http://127.0.0.1:${opts.port}/callback`;
    try {
      await spotifyAuth({ clientId, redirectUri, scopes: opts.scopes.split(' ') });
      console.log('Spotify auth successful. Tokens stored.');
    } catch (err) {
      console.log(`Spotify auth failed: ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
