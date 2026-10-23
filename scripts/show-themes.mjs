// Prints the seasonal themes (design/themes.json) role by role with their OKLCH chroma and hue, and
// checks the main text pairs, to compare seasons when tuning scripts/generate-themes.mjs.
// Usage: node scripts/show-themes.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { contrast, hexToOklch } from './lib/color.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const themes = JSON.parse(readFileSync(path.join(root, 'design', 'themes.json'), 'utf8'));
const names = ['autumn', 'spring', 'summer', 'winter'];
const roles = [
  'primary',
  'primaryContainer',
  'primaryFixed',
  'secondary',
  'secondaryContainer',
  'secondaryFixed',
  'tertiary',
  'tertiaryContainer',
  'tertiaryFixed',
  'surface',
  'surfaceContainer',
  'surfaceVariant',
  'outline',
  'outlineVariant',
  'onSurfaceVariant',
];
for (const role of roles) {
  const row = names.map((s) => {
    const hex = themes[s].color[role];
    const { C, H } = hexToOklch(hex);
    return `${hex} C${C.toFixed(3)} H${H.toFixed(0).padStart(3)}`;
  });
  console.log(role.padEnd(20), row.join('   '));
}
const pairs = [
  ['onSurface', 'surface'],
  ['onSurfaceVariant', 'surface'],
  ['onPrimary', 'primary'],
  ['onPrimaryContainer', 'primaryContainer'],
  ['primary', 'surface'],
  ['onPrimaryFixed', 'primaryFixed'],
  ['onSecondaryContainer', 'secondaryContainer'],
  ['onTertiaryContainer', 'tertiaryContainer'],
  ['secondary', 'surface'],
  ['tertiary', 'surface'],
];
console.log('\ncontrast');
for (const [fg, bg] of pairs) {
  console.log(
    `${fg} on ${bg}`.padEnd(46),
    names.map((s) => contrast(themes[s].color[fg], themes[s].color[bg]).toFixed(2).padStart(6)).join(''),
  );
}
