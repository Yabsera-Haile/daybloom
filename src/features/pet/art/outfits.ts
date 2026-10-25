import type { Season } from '@/calendar/dates';

import type { PetArt, Place, PoseName } from './types';

// Seasonal outfits (MS-13), drawn once and dressed onto every pet and pose. A hat is drawn around
// the top of the head (0,0 is its topmost point, on a head about 74 wide); a scarf around the
// front of the neck (0,0 is just under the chin). Nothing reaches down past the forehead or up past
// the chin, so the eyes, brows and mouth that show a mood are never covered.

const white = '#FFFFFF';

const path = (d: string, fill: string, opacity = 1) =>
  `<path d="${d}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
const line = (d: string, color: string, width: number) =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, rotate = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${rotate ? ` transform="rotate(${rotate} ${cx} ${cy})"` : ''}/>`;
const circle = (cx: number, cy: number, r: number, fill: string, opacity = 1) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;

// --- winter: a berry knitted beanie with a cream cuff and pom-pom ------------------------------

const berry = '#C4505B';
const berryDark = '#A23E49';
const wool = '#F6EADC';
const woolShade = '#E2CDB5';

const beanie =
  // the pom-pom, the knitted crown with its ribs, and the turned-up cuff
  circle(0, -17.5, 6.4, wool) +
  circle(-2, -19.6, 2.2, white, 0.7) +
  path('M-20.5 4 C-21.5 -9.5 -11 -16 0 -16 C11 -16 21.5 -9.5 20.5 4 Z', berry) +
  line('M-11 -12.6 C-12.4 -7 -12.6 -2 -12 3 M0 -15.6 L0 3 M11 -12.6 C12.4 -7 12.6 -2 12 3', berryDark, 1.5) +
  path('M-23.5 1.6 Q0 -2 23.5 1.6 L23 9.6 Q0 6.4 -23 9.6 Z', wool) +
  line(
    'M-18 1.2 L-18 8.8 M-12 0.4 L-12 8 M-6 0 L-6 7.4 M0 -0.2 L0 7.2 M6 0 L6 7.4 M12 0.4 L12 8 M18 1.2 L18 8.8',
    woolShade,
    1.4,
  );

/** A knitted band round the neck, knotted on one side, with two ends hanging down the chest. */
const scarf = (main: string, dark: string) =>
  path('M-12 6 C-14.6 13 -16.4 20 -17 27.5 L-9.4 28.6 C-9 21.4 -8 14 -5.4 7.6 Z', main) +
  path('M-8 6.6 C-6.6 13 -5.8 19 -6 25.6 L1.4 25.4 C1.2 18.6 0 12.4 -2 6.8 Z', main) +
  line('M-16.4 23.4 L-9.2 24.4 M-6 21.4 L1.4 21.2', dark, 1.6) +
  path(
    'M-24 -8 C-16 -1.4 -8 0.4 0 0.4 C8 0.4 16 -1.4 24 -8 L25 1 C16.6 9 8.4 11.6 0 11.6 C-8.4 11.6 -16.6 9 -25 1 Z',
    main,
  ) +
  line('M-17 -2.4 L-18.2 6.6 M-6 0.6 L-6.4 10.8 M6 0.6 L6.4 10.8 M17 -2.4 L18.2 6.6', dark, 1.6) +
  ellipse(-9.4, 7.4, 5, 4.2, main) +
  line('M-12 6 Q-9.4 8.6 -6.8 6.4', dark, 1.2);

// --- spring: a crown of little daisies -----------------------------------------------------------

/** Six white petals round a yellow middle. */
const daisy = (x: number, y: number, s = 1) =>
  [0, 60, 120, 180, 240, 300]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      const at = (v: number) => Math.round(v * 100) / 100;
      return ellipse(at(x + Math.sin(r) * 2.6 * s), at(y - Math.cos(r) * 2.6 * s), 1.5 * s, 2.6 * s, white, a);
    })
    .join('') +
  circle(x, y, 1.8 * s, '#F2C14E') +
  circle(x - 0.5 * s, y - 0.5 * s, 0.6 * s, white, 0.8);

const daisies =
  // leaves first, then five daisies in an arc across the top of the head
  ellipse(-15, 6, 1.9, 4.2, '#7FB069', 60) +
  ellipse(15, 6, 1.9, 4.2, '#7FB069', -60) +
  ellipse(-5, 2, 1.7, 3.8, '#7FB069', 75) +
  ellipse(5, 2, 1.7, 3.8, '#7FB069', -75) +
  daisy(-20, 8.4, 1.15) +
  daisy(-10, 2.6, 1.25) +
  daisy(0, 0.4, 1.4) +
  daisy(10, 2.6, 1.25) +
  daisy(20, 8.4, 1.15);

// --- summer: sunglasses pushed up on its head -----------------------------------------------------

const frame = '#E0735A';
const lens = '#33363F';

const sunglasses =
  path(
    'M-17.5 5.4 C-17.5 3.6 -16 3 -14 3 L-4.4 3 C-2.6 3 -1.8 4 -2 5.6 C-2.4 9.6 -4.6 12.4 -9 12.4 C-14 12.4 -17.5 9.6 -17.5 5.4 Z',
    lens,
  ) +
  path(
    'M17.5 5.4 C17.5 3.6 16 3 14 3 L4.4 3 C2.6 3 1.8 4 2 5.6 C2.4 9.6 4.6 12.4 9 12.4 C14 12.4 17.5 9.6 17.5 5.4 Z',
    lens,
  ) +
  line(
    'M-17.5 5.4 C-17.5 3.6 -16 3 -14 3 L-4.4 3 C-2.6 3 -1.8 4 -2 5.6 C-2.4 9.6 -4.6 12.4 -9 12.4 C-14 12.4 -17.5 9.6 -17.5 5.4 Z M17.5 5.4 C17.5 3.6 16 3 14 3 L4.4 3 C2.6 3 1.8 4 2 5.6 C2.4 9.6 4.6 12.4 9 12.4 C14 12.4 17.5 9.6 17.5 5.4 Z M-2 4.6 Q0 3 2 4.6 M-17.5 4.6 L-21 3.6 M17.5 4.6 L21 3.6',
    frame,
    1.7,
  ) +
  line('M-14 5.4 L-11 5.4 M6 5.4 L9 5.4', white, 1.3);

// --- autumn: a russet leaf on its head and a plum scarf with mustard stripes ----------------------

const leaf =
  `<g transform="translate(10 1.6) rotate(28) scale(1.4)">` +
  path(
    'M0 4 C-1 2 -5.6 2.4 -6.4 -0.6 C-4.6 -0.6 -4.4 -2.4 -6 -4.4 C-3.4 -4.2 -2.4 -5.4 -2.4 -8.6 C-1 -7.2 0 -7.6 0 -11 C0 -7.6 1 -7.2 2.4 -8.6 C2.4 -5.4 3.4 -4.2 6 -4.4 C4.4 -2.4 4.6 -0.6 6.4 -0.6 C5.6 2.4 1 2 0 4 Z',
    '#D9612F',
  ) +
  line('M0 6.4 L0 -8 M0 -1 L-3.6 -4 M0 -1 L3.6 -4', '#A8431D', 1) +
  '</g>';

export interface Outfit {
  hat: string;
  /** The hat covers the top of the head, so whatever pokes up through it (a dragon's horns) is drawn over it. */
  covers?: boolean;
  neck?: string;
}

export const outfits: Record<Season, Outfit> = {
  winter: { hat: beanie, covers: true, neck: scarf(berry, berryDark) },
  spring: { hat: daisies },
  summer: { hat: sunglasses },
  autumn: { hat: leaf, neck: scarf('#8E4F6E', '#E0A23C') },
};

const put = ([x, y, size, turn]: Place, svg: string) =>
  `<g transform="translate(${x} ${y}) rotate(${turn}) scale(${size})">${svg}</g>`;

/** What a pet wears in a pose and season, as drawings in its box; nothing out of season. */
export function dress(
  art: PetArt,
  pose: PoseName,
  season: Season | null | undefined,
): { hat?: string; over?: string; neck?: string; neckBehind?: boolean } {
  if (!season) return {};
  const outfit = outfits[season];
  const fit = art.fits[pose];
  return {
    hat: put(fit.hat, outfit.hat),
    over: outfit.covers ? art[pose].horns : undefined,
    neck: outfit.neck && fit.neck ? put(fit.neck, outfit.neck) : undefined,
    neckBehind: fit.neckBehind,
  };
}
