/**
 * Generate placeholder SVG icons for Chrome Web Store submission.
 * Run this script with: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function createSvgIcon(size) {
  const radius = size * 0.15;
  const iconSize = size * 0.5;
  const iconX = (size - iconSize) / 2;
  const iconY = (size - iconSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#grad)"/>
  <!-- Lightning bolt (⚡ symbol) -->
  <path d="${getLightningPath(size)}" fill="white" opacity="0.95"/>
</svg>`;
}

function getLightningPath(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const scale = s / 128;

  // Lightning bolt centered, scaled
  const pts = [
    [cx + 8 * scale, cy - 28 * scale],
    [cx - 4 * scale, cy - 4 * scale],
    [cx + 6 * scale, cy - 4 * scale],
    [cx - 8 * scale, cy + 28 * scale],
    [cx + 4 * scale, cy + 4 * scale],
    [cx - 6 * scale, cy + 4 * scale],
  ];

  return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]} L ${pts[2][0]} ${pts[2][1]} L ${pts[3][0]} ${pts[3][1]} L ${pts[4][0]} ${pts[4][1]} L ${pts[5][0]} ${pts[5][1]} Z`;
}

const sizes = [16, 32, 48, 128];
const dirs = ['public/icons', 'assets/icons'];

for (const dir of dirs) {
  mkdirSync(join(ROOT, dir), { recursive: true });
}

for (const size of sizes) {
  const svg = createSvgIcon(size);
  writeFileSync(join(ROOT, 'public/icons', `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
}

console.log('Icons generated in public/icons/');
