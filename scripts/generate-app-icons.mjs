// Builds the app icons from the Daybloom logo (design/stitch/_assets/logo.svg), rendered by headless
// Chrome. The mascot replaces the flower in a later version.
//   assets/images/icon.png                     1024², sage background (iOS and older Android)
//   assets/images/android-icon-foreground.png  1024², transparent, flower in the adaptive-icon safe zone
//   assets/images/android-icon-monochrome.png  1024², white flower for themed icons (center cut out)
// Usage: node scripts/generate-app-icons.mjs   (needs Google Chrome)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'images');
const chrome =
  process.env.CHROME ??
  (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome');

const SAGE = '#5B7E67';
// The flower from logo.svg (viewBox 0..100): it spans x 28..72, y 20..82, centered on (50, 51).
const flower = (petal, center, leaf, stem) => `
  <path d="M50 20 C50 20 62 34 62 48 C62 56 56 62 50 62 C44 62 38 56 38 48 C38 34 50 20 50 20 Z" fill="${petal}"/>
  ${center ? `<circle cx="50" cy="50" r="7" fill="${center}"/>` : ''}
  <path d="M32 60 C38 55 45 66 50 62 C55 66 62 55 68 60 C72 64 68 74 60 76 C52 78 48 76 40 76 C32 74 28 64 32 60 Z" fill="${leaf}"/>
  <path d="M50 62 L50 82" fill="none" stroke="${stem}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M50 72 C44 70 40 72 38 75" fill="none" stroke="${stem}" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M50 68 C56 66 60 68 62 71" fill="none" stroke="${stem}" stroke-width="2.5" stroke-linecap="round"/>`;

/** An SVG whose flower is `share` of the canvas tall, centered. */
function svg(share, body, background) {
  const size = 62 / share; // viewBox units across
  const x = 50 - size / 2;
  const y = 51 - size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${x} ${y} ${size} ${size}">
    ${background ? `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${background}"/>` : ''}
    ${body}
  </svg>`;
}

const icons = {
  'icon.png': svg(0.62, flower('#FDFBF7', '#E08D79', '#E7E0D6', '#FDFBF7'), SAGE),
  // adaptive icons show the middle 2/3 (and less in a circle): the flower fills most of that
  'android-icon-foreground.png': svg(0.56, flower('#FDFBF7', '#E08D79', '#F4EAE0', '#FDFBF7')),
  'android-icon-monochrome.png': svg(
    0.56,
    `<mask id="m"><rect x="0" y="0" width="100" height="100" fill="white"/><circle cx="50" cy="50" r="7" fill="black"/></mask>
     <g mask="url(#m)">${flower('#FFFFFF', null, '#FFFFFF', '#FFFFFF')}</g>`,
  ),
};

const tmp = mkdtempSync(path.join(tmpdir(), 'daybloom-icons-'));
for (const [name, markup] of Object.entries(icons)) {
  const page = path.join(tmp, `${name}.html`);
  writeFileSync(page, `<!doctype html><html><body style="margin:0;background:transparent">${markup}</body></html>`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    '--window-size=1024,1024',
    `--screenshot=${path.join(out, name)}`,
    pathToFileURL(page).href,
  ]);
  console.log(`wrote assets/images/${name}`);
}
