#!/usr/bin/env node
/**
 * extract-frames — turn a screen recording into a scroll-scrub frame sequence.
 *
 * Apple's keynote pages scrub *image sequences* on a canvas rather than seeking
 * a <video>, because iOS Safari can't seek video smoothly. This script produces
 * those sequences (WebP) plus a poster, ready for <salut-scrub-stage [frames]>.
 *
 * Usage:
 *   node scripts/extract-frames.mjs                      # all public/recordings/*.{mp4,mov,webm}
 *   node scripts/extract-frames.mjs bac.mp4              # one file (name inferred: "bac")
 *   node scripts/extract-frames.mjs bac.mp4 --name bac --frames 90 --width 1080
 *
 * Output (per clip "<name>"):
 *   public/seq/<name>/frame-0001.webp …   the sequence
 *   public/seq/<name>/poster.webp         a representative still (SSR/reduced-motion)
 *   public/seq/<name>/manifest.json       { count, width, poster, frames[] }
 *
 * Requires ffmpeg + ffprobe on PATH (https://ffmpeg.org/download.html).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, parse, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REC_DIR = join(ROOT, 'public', 'recordings');
const OUT_ROOT = join(ROOT, 'public', 'seq');
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.m4v']);

const DEFAULTS = { frames: 90, width: 1080, quality: 80 };

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function has(cmd) {
  try {
    execFileSync(cmd, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Prefer a system binary; otherwise fall back to the static npm packages so the
// pipeline runs with no manual ffmpeg install.
let FFMPEG = 'ffmpeg';
let FFPROBE = 'ffprobe';

async function resolveBinaries() {
  if (!has(FFMPEG)) {
    try {
      const m = await import('ffmpeg-static');
      const p = m.default ?? m;
      if (typeof p === 'string') FFMPEG = p;
    } catch { /* package not installed */ }
  }
  if (!has(FFPROBE)) {
    try {
      const m = await import('ffprobe-static');
      const p = m.default?.path ?? m.path;
      if (typeof p === 'string') FFPROBE = p;
    } catch { /* package not installed */ }
  }
  return has(FFMPEG) && has(FFPROBE);
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS, name: null, input: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--frames') opts.frames = Number(argv[++i]);
    else if (a === '--width') opts.width = Number(argv[++i]);
    else if (a === '--quality') opts.quality = Number(argv[++i]);
    else if (a === '--name') opts.name = argv[++i];
    else opts.input = a;
  }
  return opts;
}

function durationSeconds(file) {
  const out = execFileSync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]).toString().trim();
  const d = parseFloat(out);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function extract(file, { name, frames, width, quality }) {
  const dur = durationSeconds(file);
  if (!dur) fail(`Could not read duration of ${file}`);

  const outDir = join(OUT_ROOT, name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const fps = Math.max(1, frames / dur); // sample ~`frames` evenly across the clip
  const scale = `scale=${width}:-2:flags=lanczos`;

  console.log(`• ${name}: ${dur.toFixed(1)}s → ~${frames} frames @ ${width}px`);
  execFileSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', file,
    '-vf', `fps=${fps.toFixed(4)},${scale}`,
    '-c:v', 'libwebp', '-quality', String(quality),
    '-f', 'image2', // force a numbered sequence (a .webp output otherwise picks the animated muxer)
    join(outDir, 'frame-%04d.webp'),
  ], { stdio: 'inherit' });

  // Poster: a still from the middle of the clip (the start is often blank).
  execFileSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', (dur * 0.5).toFixed(2),
    '-i', file,
    '-vf', scale,
    '-frames:v', '1',
    '-q:v', String(quality),
    join(outDir, 'poster.webp'),
  ], { stdio: 'inherit' });

  const list = readdirSync(outDir).filter((f) => f.startsWith('frame-')).sort();
  if (!list.length) fail(`No frames produced for ${name}`);

  writeFileSync(
    join(outDir, 'manifest.json'),
    JSON.stringify(
      {
        name,
        width,
        count: list.length,
        poster: `seq/${name}/poster.webp`,
        frames: list.map((f) => `seq/${name}/${f}`),
      },
      null,
      2,
    ),
  );
  console.log(`✓ ${name}: ${list.length} frames → public/seq/${name}/`);
}

async function main() {
  if (!(await resolveBinaries())) {
    fail('ffmpeg/ffprobe not found. Install ffmpeg, or `npm i -D ffmpeg-static ffprobe-static`.');
  }

  const opts = parseArgs(process.argv.slice(2));

  let jobs = [];
  if (opts.input) {
    const file = existsSync(opts.input) ? opts.input : join(REC_DIR, opts.input);
    if (!existsSync(file)) fail(`Input not found: ${opts.input}`);
    jobs.push({ file, name: opts.name || parse(file).name });
  } else {
    if (!existsSync(REC_DIR)) fail(`No recordings dir: ${REC_DIR}`);
    jobs = readdirSync(REC_DIR)
      .filter((f) => VIDEO_EXT.has(parse(f).ext.toLowerCase()))
      .map((f) => ({ file: join(REC_DIR, f), name: parse(f).name }));
    if (!jobs.length) fail(`No video files in ${REC_DIR}`);
  }

  for (const job of jobs) {
    extract(job.file, { ...opts, name: job.name });
  }
  console.log(`\nDone. Wire a sequence into an act with its manifest's "frames" array.`);
}

main().catch((err) => fail(err?.message ?? String(err)));
