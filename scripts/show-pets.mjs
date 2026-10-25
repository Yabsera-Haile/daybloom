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
function frame(pose, face, { ears = 0, tilt = 0, shadow = true } = {}) {
  const [left, right] = pose.ears ?? [];
  const head = `<g transform="rotate(${tilt} ${pose.head.pivot[0]} ${pose.head.pivot[1]})">${turn(left, -ears)}${turn(right, ears)}${pose.head.svg}${face}</g>`;
  const wings = (pose.wings ?? []).map((wing) => wing.svg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${art.defs}${shadow ? `<ellipse cx="${art.shadow[0]}" cy="${art.shadow[1]}" rx="${art.shadow[2]}" ry="${art.shadow[3]}" fill="#5A4632" opacity="0.12"/>` : ''}${pose.tail?.svg ?? ''}${wings}${pose.body.svg}${head}${pose.front ?? ''}</svg>`;
}

const faces = art.sit.faces;
const sit = (name, opts) => frame(art.sit, faces[name].eyes + faces[name].rest, opts);
const frames = [
  ['asleep', frame(art.sleep, art.sleep.face)],
  ['content', sit('content')],
  ['happy', sit('happy', { tilt: -6 })],
  ['sad (gentle)', sit('sad', { ears: art.earMood.sad, tilt: 4 })],
  ['cross (cheeky)', sit('cross', { ears: art.earMood.cross })],
  ['yawn', sit('yawn', { tilt: -4 })],
  ['stretch', frame(art.stretch, art.stretch.face)],
  ['leap', frame(art.leap, art.leap.face, { shadow: false })],
];

const html = `<!doctype html><meta charset="utf-8"><style>
body { margin: 0; padding: 24px; background: #fff8f5; font: 14px sans-serif; color: #3b2a22; }
.row { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; max-width: ${4 * (w * 2.2 + 36)}px; }
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
  `--window-size=${Math.ceil(4 * (w * 2.2 + 36) + 48)},${Math.ceil(2 * (h * 2.2 + 60) + h * 0.6 + 130)}`,
  pathToFileURL(page).href,
]);
console.log(out);
