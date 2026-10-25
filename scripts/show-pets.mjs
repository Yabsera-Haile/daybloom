// Draws every pose and mood of a pet into one picture, to check the art without building the app:
//   node scripts/show-pets.mjs [cat] [out.png]
// With --outfits, every pose and mood in each season's outfit instead (MS-13).
// Writes an HTML page and screenshots it with Edge or Chrome (headless). Node 22.18+ reads the
// TypeScript art file directly.
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outfitsMode = process.argv.includes('--outfits');
const name = args[0] ?? 'cat';
const out = resolve(args[1] ?? join(tmpdir(), `pet-${name}.png`));
const { [name]: art } = await import(pathToFileURL(resolve(`src/features/pet/art/${name}.ts`)).href);
const { dress } = await import(pathToFileURL(resolve('src/features/pet/art/outfits.ts')).href);
const [w, h] = art.box;
/** Room above the box for a hat's pom-pom (the app's canvas has it too). */
const top = 14;

const turn = (part, deg) =>
  part ? `<g transform="rotate(${deg} ${part.pivot[0]} ${part.pivot[1]})">${part.svg}</g>` : '';

/** One frame, the way the app stacks the layers (PetFigure). */
function frame(pose, face, { ears = 0, tilt = 0, shadow = true, season = null } = {}) {
  const [left, right] = pose.ears ?? [];
  const poseName = ['sit', 'sleep', 'stretch', 'leap'].find((p) => art[p] === pose);
  const worn = dress(art, poseName, season);
  const head = `<g transform="rotate(${tilt} ${pose.head.pivot[0]} ${pose.head.pivot[1]})">${turn(left, -ears)}${turn(right, ears)}${pose.head.svg}${face}${worn.hat ?? ''}${worn.over ?? ''}</g>`;
  const wings = (pose.wings ?? []).map((wing) => wing.svg).join('');
  const neck = worn.neck ?? '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-top} ${w} ${h + top}">${art.defs}${shadow ? `<ellipse cx="${art.shadow[0]}" cy="${art.shadow[1]}" rx="${art.shadow[2]}" ry="${art.shadow[3]}" fill="#5A4632" opacity="0.12"/>` : ''}${pose.tail?.svg ?? ''}${wings}${pose.body.svg}${worn.neckBehind ? neck : ''}${head}${pose.front ?? ''}${worn.neckBehind ? '' : neck}</svg>`;
}

const faces = art.sit.faces;
const sit = (name, opts) => frame(art.sit, faces[name].eyes + faces[name].rest, opts);
const dressed = (season) => [
  [`${season}: content`, sit('content', { season })],
  ['happy', sit('happy', { tilt: -6, season })],
  ['sad', sit('sad', { ears: art.earMood.sad, tilt: 4, season })],
  ['cross', sit('cross', { ears: art.earMood.cross, season })],
  ['yawn', sit('yawn', { season })],
  ['asleep', frame(art.sleep, art.sleep.face, { season })],
  ['stretch', frame(art.stretch, art.stretch.face, { season })],
  ['leap', frame(art.leap, art.leap.face, { shadow: false, season })],
];
const plain = [
  ['asleep', frame(art.sleep, art.sleep.face)],
  ['content', sit('content')],
  ['happy', sit('happy', { tilt: -6 })],
  ['beaming', sit('beam', { tilt: -6 })],
  ['sad (gentle)', sit('sad', { ears: art.earMood.sad, tilt: 4 })],
  ['cross (cheeky)', sit('cross', { ears: art.earMood.cross })],
  ['yawn', sit('yawn', { tilt: -4 })],
  ['stretch', frame(art.stretch, art.stretch.face)],
  ['leap', frame(art.leap, art.leap.face, { shadow: false })],
];
const frames = outfitsMode ? ['winter', 'spring', 'summer', 'autumn'].flatMap(dressed) : plain;
const perRow = outfitsMode ? 8 : 4;
const scale = outfitsMode ? 1.3 : 2.2;

const html = `<!doctype html><meta charset="utf-8"><style>
body { margin: 0; padding: 24px; background: #fff8f5; font: 14px sans-serif; color: #3b2a22; }
.row { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; max-width: ${perRow * (w * scale + 36)}px; }
.card { background: #f6ebe4; border-radius: 20px; padding: 8px 8px 0; text-align: center; }
.big svg { width: ${w * scale}px; height: ${(h + top) * scale}px; }
.small svg { width: ${w * 0.6}px; height: ${(h + top) * 0.6}px; }
</style>
<div class="row big">${frames.map(([label, svg]) => `<div class="card">${svg}<p>${label}</p></div>`).join('')}</div>
${outfitsMode ? '' : `<div class="row small">${frames.map(([label, svg]) => `<div class="card">${svg}<p>${label}</p></div>`).join('')}</div>`}`;

const page = join(tmpdir(), `pet-${name}.html`);
writeFileSync(page, html);
const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);
if (!browser) throw new Error('Needs Edge or Chrome to take the picture; open ' + page);
execFileSync(browser, [
  '--headless=new',
  // its own profile, so a browser that's already open can't take over the request
  `--user-data-dir=${join(tmpdir(), 'show-pets-browser')}`,
  '--disable-gpu',
  '--hide-scrollbars',
  `--screenshot=${out}`,
  outfitsMode
    ? `--window-size=${Math.ceil(perRow * (w * scale + 36) + 48)},${Math.ceil(4 * ((h + top) * scale + 60) + 60)}`
    : `--window-size=${Math.ceil(4 * (w * scale + 36) + 48)},${Math.ceil(3 * ((h + top) * scale + 60) + (h + top) * 0.6 + 130)}`,
  // a fresh address each time, so the browser never shows a cached page
  `${pathToFileURL(page).href}?${Date.now()}`,
]);
console.log(out);
