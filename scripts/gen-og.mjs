// Rasterise public/og-image.svg -> public/og-image.png (1200x630) for social cards.
//
// Most OG consumers (Facebook, WhatsApp, iMessage, LinkedIn, X) do NOT render
// SVG, so a PNG is required. This is a BUILD-TIME tool only — `sharp` is a
// devDependency and never ships to the browser, so it doesn't affect the site's
// "zero third-party runtime requests" / DSGVO posture.
//
// Usage:
//   npm i -D sharp
//   node scripts/gen-og.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = join(root, 'public', 'og-image.svg');
const png = join(root, 'public', 'og-image.png');

const sharp = (await import('sharp')).default;
const buf = await readFile(svg);
await writeFile(png, await sharp(buf).resize(1200, 630).png().toBuffer());
console.log('Wrote', png);
