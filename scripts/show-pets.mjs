// Draws every pose and mood of a pet into one picture, to check the art without building the app:
//   node scripts/show-pets.mjs [cat] [out.png]
// Writes an HTML page and screenshots it with Edge or Chrome (headless). Node 22.18+ reads the
// TypeScript art file directly.
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const name = process.argv[2] ?? 'cat';
const out = resolve(process.argv[3] ?? join(tmpdir(), `pet-${name}.png`));
const { [name]: art } = await import(pathToFileURL(resolve(`src/features/pet/art/${name}.ts`)).href);
const [w, h] = art.box;

const turn = (part, deg) =>
  part ? `<g transform="rotate(${deg} ${part.pivot[0]} ${part.pivot[1]})">${part.svg}</g>` : '';

/** One frame, the way the app stacks the layers. */
function frame(pose, face, { ears = 0, tilt = 0 } = {}) {
  const [left, right] = pose.ears ?? [];
  const head = `<g transform="rotate(${tilt} ${pose.head.pivot[0]} ${pose.head.pivot[1]})">${turn(left, -ears)}${turn(right, ears)}${pose.head.svg}${face}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${pose.tail?.svg ?? ''}${pose.body.svg}${head}${pose.front ?? ''}</svg>`;
}

const faces = art.awake.faces;
const frames = [
  ['asleep', frame(art.asleep, art.asleep.face)],
  ['content', frame(art.awake, faces.content.eyes + faces.content.rest)],
  ['happy', frame(art.awake, faces.happy.eyes + faces.happy.rest, { tilt: -6 })],
  ['sad (gentle)', frame(art.awake, faces.sad.eyes + faces.sad.rest, { ears: 24, tilt: 4 })],
  ['cross (cheeky)', frame(art.awake, faces.cross.eyes + faces.cross.rest, { ears: -6 })],
];

const html = `<!doctype html><meta charset="utf-8"><style>
body { margin: 0; padding: 24px; background: #fff8f5; font: 14px sans-serif; color: #3b2a22; }
.row { display: flex; gap: 20px; margin-bottom: 20px; }
.card { background: #f6ebe4; border-radius: 20px; padding: 8px 8px 0; text-align: center; }
.big svg { width: ${w * 2.2}px; height: ${h * 2.2}px; }
.small svg { width: ${w * 0.6}px; height: ${h * 0.6}px; }
</style>
<div class="row big">${frames.map(([label, svg]) => `<div class="card">${svg}<p>${label}</p></div>`).join('')}</div>
<div class="row small">${frames.map(([label, svg]) => `<div class="card">${svg}<p>${label}</p></div>`).join('')}</div>`;

const page = join(tmpdir(), `pet-${name}.html`);
writeFileSync(page, html);
const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);
if (!browser) throw new Error('Needs Edge or Chrome to take the picture; open ' + page);
execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--screenshot=${out}`,
  `--window-size=${Math.ceil(5 * (w * 2.2 + 36) + 48)},${Math.ceil(h * 2.2 + h * 0.6 + 170)}`,
  pathToFileURL(page).href,
]);
console.log(out);
