import type { PetArt } from './types';

// A cream puppy with chestnut floppy ears and cap (a little beagle), a big button nose, and a rose
// collar with a gold tag. Same poses as the cat; its tail wags.
const fur = 'url(#fur)';
const furFlat = '#F6DFC0';
const shade = '#E2C097';
const patch = 'url(#patch)';
const patchFlat = '#B9773F';
const cream = '#FFFDF7';
const creamShade = '#EBD1B0';
const ink = '#3A2A22';
const mouth = '#9A4A3E';
const tongue = '#EE8E86';
const blush = '#F39C93';
const white = '#FFFFFF';
const collar = '#E0806F';
const tag = '#F2C14E';
const tagShade = '#C9962E';
const tear = '#9CCBE6';

const line = (d: string, color = ink, width = 1.8) =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const path = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, opacity = 1) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
const circle = (cx: number, cy: number, r: number, fill: string) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

const GROW = 1.3;
const grow = ([cx, cy]: [number, number], svg: string) =>
  `<g transform="translate(${cx} ${cy}) scale(${GROW}) translate(${-cx} ${-cy})">${svg}</g>`;
const grown = ([cx, cy]: [number, number], [x, y]: [number, number]): [number, number] => [
  cx + GROW * (x - cx),
  cy + GROW * (y - cy),
];

/** A big shiny button nose, centred on (x, y). */
const buttonNose = (x: number, y: number, s = 1) =>
  path(
    `M${x - 6.5 * s} ${y - 1.5 * s} C${x - 6.5 * s} ${y - 4.5 * s} ${x + 6.5 * s} ${y - 4.5 * s} ${x + 6.5 * s} ${y - 1.5 * s} C${x + 6.5 * s} ${y + 2.5 * s} ${x + 2 * s} ${y + 5 * s} ${x} ${y + 5 * s} C${x - 2 * s} ${y + 5 * s} ${x - 6.5 * s} ${y + 2.5 * s} ${x - 6.5 * s} ${y - 1.5 * s} Z`,
    ink,
  ) + ellipse(x - 2.4 * s, y - 2 * s, 2 * s, 1.1 * s, white, 0.8);

// --- sitting, facing you -----------------------------------------------------------------------

const eyes = (dy = 0, wet = false) =>
  [66, 94]
    .map(
      (x) =>
        circle(x, 46 + dy, 6.2, ink) +
        circle(x + 2.1, 43.6 + dy, 2.5, white) +
        circle(x - 2, 48.6 + dy, 1.2, white) +
        (wet ? ellipse(x, 50.5 + dy, 4.6, 1.6, '#BFE0F2', 0.85) : ''),
    )
    .join('');
const cheeks = (opacity = 0.65, rx = 6) =>
  ellipse(56, 57, rx, 3.6, blush, opacity) + ellipse(104, 57, rx, 3.6, blush, opacity);

const sitHead =
  path('M80 16 C103 16 115 30 115 46 C115 62 101 73 80 73 C59 73 45 62 45 46 C45 30 57 16 80 16 Z', fur) +
  // a chestnut cap with a cream blaze down the middle
  path(
    'M48.6 36 C52 23 64 16 80 16 C96 16 108 23 111.4 36 C105 33.4 97 33.6 91 38 C88 31 84.4 27.6 80 27.6 C75.6 27.6 72 31 69 38 C63 33.6 55 33.4 48.6 36 Z',
    patch,
  ) +
  ellipse(80, 59.5, 15.5, 11.5, cream) +
  buttonNose(80, 53.5) +
  line('M80 58.5 L80 61');

const sitEar = (side: 1 | -1) => {
  const x = (v: number) => (side === 1 ? v : 160 - v);
  return (
    path(
      `M${x(58)} 23 C${x(49)} 23 ${x(40)} 30 ${x(38)} 43 C${x(36.5)} 55 ${x(38.5)} 65 ${x(45)} 69 C${x(50.5)} 72 ${x(56)} 67 ${x(57)} 58 C${x(58)} 48 ${x(61)} 36 ${x(64.5)} 28 C${x(63.5)} 24.5 ${x(61)} 23 ${x(58)} 23 Z`,
      patch,
    ) + line(`M${x(47)} 40 C${x(45)} 48 ${x(45)} 56 ${x(47)} 62`, '#A56632', 1.6)
  );
};

const sitBody =
  ellipse(58, 101, 13.5, 12.5, shade) +
  ellipse(102, 101, 13.5, 12.5, shade) +
  path('M80 60 C99 60 108 79 108.5 95 C109 108 99 114 80 114 C61 114 51 108 51.5 95 C52 79 61 60 80 60 Z', fur) +
  // a chestnut saddle on its back, peeking round the sides
  path('M52.4 88 C54 80 57 74 61 70 C60 78 59.6 86 60.6 94 C57 93 54 91 52.4 88 Z', patch) +
  path('M107.6 88 C106 80 103 74 99 70 C100 78 100.4 86 99.4 94 C103 93 106 91 107.6 88 Z', patch) +
  path(
    'M80 72 C88 72 93 79 94 88 C95.5 96 92 105 85 107 C82 108.5 78 108.5 75 107 C68 105 64.5 96 66 88 C67 79 72 72 80 72 Z',
    cream,
  ) +
  // front legs
  line('M69.5 94 L69.5 107', creamShade, 11) +
  line('M90.5 94 L90.5 107', creamShade, 11) +
  line('M69.5 94 L69.5 107', cream, 9) +
  line('M90.5 94 L90.5 107', cream, 9);

const sitFront =
  ellipse(69.5, 110.5, 8.6, 5.6, cream) +
  ellipse(90.5, 110.5, 8.6, 5.6, cream) +
  line(
    'M66 108.4 L66 112 M69.5 108 L69.5 112.4 M73 108.4 L73 112 M87 108.4 L87 112 M90.5 108 L90.5 112.4 M94 108.4 L94 112',
    creamShade,
    1.4,
  ) +
  path(
    'M61 68.5 C67 73 73.5 74.5 80 74.5 C86.5 74.5 93 73 99 68.5 L100.5 72.5 C94 77.5 87.5 79 80 79 C72.5 79 66 77.5 59.5 72.5 Z',
    collar,
  ) +
  circle(80, 82.5, 4.8, tag) +
  circle(80, 82.5, 2.4, tagShade) +
  circle(78.2, 80.6, 1.1, white);

const sitTail =
  line('M103 104 C115 103 121 95 123 84', furFlat, 9) + line('M121.6 89 C122.6 87.2 123.2 85.6 123 84', patchFlat, 9);

// --- curled up asleep --------------------------------------------------------------------------

const sleepBody =
  path('M42 113 C28 113 24 101 30 90 C38 75 61 66 92 66 C123 66 140 80 140 97 C140 108 131 113 119 113 Z', fur) +
  path('M84 70 C100 64.6 122 68 134 81 C123 78 105 78 91 82 C87 78 84.6 74 84 70 Z', patch) +
  path('M60 112 C70 106 84 104 98 106 C108 107.5 116 110.5 120 113 Z', creamShade);

const sleepEar = (front: boolean) =>
  front
    ? path('M30 76 C22 80 17.5 92 21 103 C24.6 110 33 109 35.6 101 C38 93 38.4 84 36.6 77 Z', patch)
    : path('M70 69 C78 69.4 84.6 77 85.6 87 C81 85 76.6 81.4 72 79 Z', patch);

const sleepHead =
  path('M54 66 C73 66 86 76.5 86 90 C86 104.5 72.5 113 54 113 C35.5 113 22 104.5 22 90 C22 76.5 35 66 54 66 Z', fur) +
  path(
    'M27 80 C31 71 41 66 54 66 C67 66 77 71 81 80 C75 78 68 78.6 63 82 C60.6 77.6 57.4 75.6 54 75.6 C50.6 75.6 47.4 77.6 45 82 C40 78.6 33 78 27 80 Z',
    patch,
  ) +
  ellipse(54, 102, 13, 8.6, cream) +
  buttonNose(54, 97.5, 0.8);

const sleepFace =
  line('M36 92 Q41.5 96.5 47 92 M61 92 Q66.5 96.5 72 92', ink, 2.6) +
  line('M51.4 105 Q54 107 56.6 105', ink, 1.6) +
  ellipse(32.5, 100, 5, 3, blush, 0.65) +
  ellipse(75.5, 100, 5, 3, blush, 0.65);

const sleepFront =
  ellipse(75, 111, 9.5, 4.8, cream) +
  line('M128 106 C122 114.5 106 116.6 94 115', furFlat, 9) +
  line('M99.6 115.8 C97.6 115.8 95.8 115.5 94 115', patchFlat, 9);

// --- the play bow: front down, back up, facing left ----------------------------------------------

const stretchTail =
  line('M121 63 C128 54 131 45 129 35', furFlat, 9) + line('M130.2 40.4 C130 38.4 129.6 36.6 129 35', patchFlat, 9);

const stretchBody =
  line('M112 76 L114 110', shade, 12) +
  line('M102 78 L102 110', furFlat, 12) +
  ellipse(103, 111.5, 7.5, 4.5, cream) +
  ellipse(115, 111.5, 7, 4.2, creamShade) +
  path(
    'M42 104 C38 93 47 85 61 83 C82 80 98 61 115 58.5 C128 57 131 70 125 81 C119 92 105 99 93 103 C77 108.5 55 110.5 42 104 Z',
    fur,
  ) +
  path('M84 70 C96 62 108 58 116 58.6 C124 59.4 126 66 122 72 C112 70 98 72 88 77 C86 75 84.6 72.6 84 70 Z', patch) +
  line('M62 106 L33 109.5', shade, 10) +
  line('M68 107.5 L39 112.5', furFlat, 10) +
  ellipse(31, 109.5, 7, 4.3, creamShade) +
  ellipse(37.5, 112.5, 7.5, 4.5, cream);

const stretchEar = (back: boolean) =>
  back
    ? path('M58 74 C64 74 68 80 68 88 C64 86 60 82 57.5 78 Z', patch)
    : path('M32 76 C25 79 21.5 89 24 98 C26.6 104 33 103.4 35 97 C36.6 91 37 84 35.8 78 Z', patch);

const stretchHead =
  path('M45 72 C59 72 67 81 67 91 C67 101.5 57.5 108 45 108 C32.5 108 23.5 101.5 23.5 91 C23.5 81 31 72 45 72 Z', fur) +
  path(
    'M26 84 C28.6 76.6 36 72 45 72 C54 72 61.4 76.6 64 84 C59.6 82.4 54.4 82.8 51 85.4 C49.4 81.6 47.2 80.2 45 80.2 C42.8 80.2 40.6 81.6 39 85.4 C35.6 82.8 30.4 82.4 26 84 Z',
    patch,
  ) +
  ellipse(43, 99.5, 11, 7.6, cream) +
  buttonNose(43, 95.6, 0.7);

const stretchFace =
  line('M30 89 Q34.5 85.5 39 89 M49 89 Q53.5 85.5 58 89', ink, 2.6) +
  path('M38 101.2 Q43 110 48 101.2 Q43 103 38 101.2 Z', mouth) +
  path('M40.4 104.4 C40.4 110 45.6 110 45.6 104.4 Q43 105.4 40.4 104.4 Z', tongue) +
  ellipse(28, 97, 4.4, 2.6, blush, 0.7) +
  ellipse(60, 97, 4.4, 2.6, blush, 0.7);

// --- mid-leap, facing left ---------------------------------------------------------------------

const leapTail =
  line('M112 58 C121 52 126 45 128 37', furFlat, 9) + line('M127.4 42.2 C127.8 40.4 128 38.8 128 37', patchFlat, 9);

const leapBody =
  line('M104 68 L128 86', shade, 10) +
  line('M98 70 L120 92', furFlat, 10) +
  ellipse(122, 93, 6.5, 4.2, cream) +
  ellipse(130, 87, 6, 3.8, creamShade) +
  path('M48 56 C60 45 86 44 104 50 C116 54 120 64 113 71 C104 79 80 80 64 76 C52 73 42 65 48 56 Z', fur) +
  path('M76 47 C88 45 102 47 110 53 C114 56 116 60 115 64 C106 60 94 58.6 82 59.6 C79 56 77 51.6 76 47 Z', patch) +
  path('M62 74 C72 77.5 86 78 98 75.5 C92 79.5 74 80.5 62 74 Z', creamShade) +
  line('M58 68 L34 76', shade, 9.5) +
  line('M64 71 L40 82', furFlat, 9.5) +
  ellipse(32.5, 76.5, 6, 3.8, creamShade) +
  ellipse(38.5, 82.5, 6.5, 4, cream);

// its ears fly out behind it
const leapEar = (back: boolean) =>
  back
    ? path('M58 34 C66 30 75 30 81 35 C75 38 68 40 61 40 Z', patch)
    : path('M54 38 C62 34 72 35 78 41 C71 44 63 45.6 56 44 Z', patch);

const leapHead =
  path('M45 31 C59 31 67 40 67 50 C67 60.5 57.5 67 45 67 C32.5 67 23.5 60.5 23.5 50 C23.5 40 31 31 45 31 Z', fur) +
  path(
    'M26 43 C28.6 35.6 36 31 45 31 C54 31 61.4 35.6 64 43 C59.6 41.4 54.4 41.8 51 44.4 C49.4 40.6 47.2 39.2 45 39.2 C42.8 39.2 40.6 40.6 39 44.4 C35.6 41.8 30.4 41.4 26 43 Z',
    patch,
  ) +
  ellipse(41, 58.5, 11, 7.6, cream) +
  buttonNose(40, 54.6, 0.7);

const leapFace =
  circle(33, 47, 4.8, ink) +
  circle(34.8, 45.2, 1.9, white) +
  circle(51, 47, 4.8, ink) +
  circle(52.8, 45.2, 1.9, white) +
  path('M35.6 60.4 Q41 67 46.4 60.4 Q41 62 35.6 60.4 Z', mouth) +
  path('M38.4 62.6 C38.4 67.6 43.6 67.6 43.6 62.6 Q41 63.4 38.4 62.6 Z', tongue) +
  ellipse(27, 56, 4.4, 2.6, blush, 0.75) +
  ellipse(57, 56, 4.4, 2.6, blush, 0.75);

const stretchCentre: [number, number] = [45, 90];
const leapCentre: [number, number] = [45, 49];

export const dog: PetArt = {
  box: [160, 120],
  defs:
    '<defs><linearGradient id="fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDEFDC"/><stop offset="1" stop-color="#ECD0AB"/></linearGradient>' +
    '<linearGradient id="patch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C98A4E"/><stop offset="1" stop-color="#A9672F"/></linearGradient></defs>',
  shadow: [80, 114.5, 46, 4.5],
  // floppy ears hang closer when sad, and flick out when cross
  earMood: { sad: 8, cross: -12 },
  tail: 'wag',

  sit: {
    tail: { svg: sitTail, pivot: [103, 104] },
    body: { svg: sitBody, pivot: [80, 114] },
    ears: [
      { svg: sitEar(1), pivot: [59, 26] },
      { svg: sitEar(-1), pivot: [101, 26] },
    ],
    head: { svg: sitHead, pivot: [80, 73] },
    front: sitFront,
    faces: {
      content: {
        eyes: eyes(),
        eyesAt: [80, 46],
        rest: line('M73.5 61.5 Q77 65 80 61 Q83 65 86.5 61.5') + cheeks(),
      },
      happy: {
        eyes: line('M60 47.5 Q66 40 72 47.5 M88 47.5 Q94 40 100 47.5', ink, 3.2),
        eyesAt: [80, 45],
        rest:
          path('M72.5 61 Q80 72 87.5 61 Q80 63.6 72.5 61 Z', mouth) +
          path('M76.4 64 C76.4 72.6 83.6 72.6 83.6 64 Q80 65.4 76.4 64 Z', tongue) +
          line('M80 65.6 L80 69.6', '#D9706A', 1.2) +
          cheeks(1, 6.5) +
          line('M36 30 L36 36 M33 33 L39 33 M124 26 L124 31 M121.5 28.5 L126.5 28.5', tag, 1.8),
      },
      sad: {
        eyes: eyes(2, true),
        eyesAt: [80, 48],
        rest:
          line('M58 38.6 Q64 38 71 34 M102 38.6 Q96 38 89 34', '#5A3A28', 2.6) +
          line('M75 65 Q80 61.4 85 65') +
          path('M102 51 C100.3 54 100.1 56 102 57 C103.9 56 103.7 54 102 51 Z', tear) +
          cheeks(0.4),
      },
      cross: {
        eyes:
          path('M59.8 45 L72.2 45 A6.2 6.2 0 0 1 59.8 45 Z', ink) +
          path('M87.8 45 L100.2 45 A6.2 6.2 0 0 1 87.8 45 Z', ink) +
          circle(67.6, 47.2, 1.2, white) +
          circle(95.6, 47.2, 1.2, white),
        eyesAt: [80, 46],
        rest:
          line('M58 35.4 L72 41 M102 35.4 L88 41', '#5A3A28', 2.8) +
          line('M75 64 Q80 61 85 64') +
          cheeks(0.95, 7.5) +
          `<g transform="translate(112 18)">${line('M-5 -2 Q-2 -2 -2 -5 M2 -5 Q2 -2 5 -2 M5 2 Q2 2 2 5 M-2 5 Q-2 2 -5 2', collar, 2.4)}</g>`,
      },
      yawn: {
        eyes:
          line('M60 45 Q66 49.5 72 45 M88 45 Q94 49.5 100 45', ink, 3) +
          line('M58.6 43.2 L57 41.6 M101.4 43.2 L103 41.6', ink, 1.4),
        eyesAt: [80, 46],
        rest:
          path('M72.6 60.6 C72.6 75 87.4 75 87.4 60.6 C84 62.4 76 62.4 72.6 60.6 Z', mouth) +
          path('M75.6 68 Q80 74 84.4 68 Q80 66 75.6 68 Z', tongue) +
          cheeks(0.55),
      },
    },
  },

  sleep: {
    body: { svg: sleepBody, pivot: [86, 113] },
    ears: [
      { svg: sleepEar(true), pivot: [33, 78] },
      { svg: sleepEar(false), pivot: [72, 72] },
    ],
    head: { svg: sleepHead, pivot: [54, 113] },
    face: sleepFace,
    front: sleepFront,
  },

  stretch: {
    tail: { svg: stretchTail, pivot: [121, 63] },
    body: { svg: stretchBody, pivot: [80, 112] },
    ears: [
      { svg: grow(stretchCentre, stretchEar(true)), pivot: grown(stretchCentre, [60, 76]) },
      { svg: grow(stretchCentre, stretchEar(false)), pivot: grown(stretchCentre, [33, 78]) },
    ],
    head: { svg: grow(stretchCentre, stretchHead), pivot: grown(stretchCentre, [52, 104]) },
    face: grow(stretchCentre, stretchFace),
  },

  leap: {
    tail: { svg: leapTail, pivot: [112, 58] },
    body: { svg: leapBody, pivot: [80, 64] },
    ears: [
      { svg: grow(leapCentre, leapEar(true)), pivot: grown(leapCentre, [60, 36]) },
      { svg: grow(leapCentre, leapEar(false)), pivot: grown(leapCentre, [56, 40]) },
    ],
    head: { svg: grow(leapCentre, leapHead), pivot: grown(leapCentre, [52, 64]) },
    face: grow(leapCentre, leapFace),
  },
};
