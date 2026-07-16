import { run } from './procUtils.js';

// Encode input_path to output_path using ffmpeg with presets for WAV/MP3/FLAC/M4A.
export async function encodeAudio(inputPath, outputPath, { fmt = 'wav', bitrate } = {}) {
  // Remove streams we don't want: -vn -sn -dn, copy metadata when possible -map_metadata 0
  const common = ['-y', '-i', inputPath, '-vn', '-sn', '-dn', '-map_metadata', '0'];

  let args;
  if (fmt === 'wav') {
    // codec: pcm_s24le, samplerate 48000, channels 2, soxr resampler precision 33, dither triangular
    args = [
      ...common,
      '-c:a', 'pcm_s24le',
      '-ar', '48000',
      '-ac', '2',
      '-af', 'aresample=resampler=soxr:precision=33:dither_method=triangular',
      outputPath,
    ];
  } else if (fmt === 'mp3') {
    const br = bitrate || '320k';
    args = [...common, '-c:a', 'libmp3lame', '-b:a', br, '-ar', '48000', '-ac', '2', outputPath];
  } else if (fmt === 'flac') {
    args = [...common, '-c:a', 'flac', '-compression_level', '5', '-ar', '48000', '-ac', '2', outputPath];
  } else if (fmt === 'm4a') {
    // use alac for lossless if bitrate not provided, otherwise aac lossy
    if (!bitrate) {
      args = [...common, '-c:a', 'alac', '-ar', '48000', '-ac', '2', outputPath];
    } else {
      args = [...common, '-c:a', 'aac', '-b:a', bitrate, '-ar', '48000', '-ac', '2', outputPath];
    }
  } else {
    throw new Error('Unsupported format');
  }

  await run('ffmpeg', args);
}
