import type { PetArt } from './types';

// A ginger cat in the stickers' flat style, with soft shading: butterscotch fur, cream chest and
// muzzle, blush cheeks, and a sage collar with a little gold bell.
const fur = 'url(#fur)';
const furFlat = '#E8AA58';
const shade = '#D3923F';
const stripe = '#C27B33';
const cream = '#FFE4C2';
const creamShade = '#F4CB9C';
const pink = '#F4B2A4';
const nose = '#E2837A';
const blush = '#F39C93';
const ink = '#3A2A22';
const brow = '#8F4B3B';
const mouth = '#9A4A3E';
const tongue = '#EE8E86';
const white = '#FFFFFF';
const collar = '#6F9A7E';
const bell = '#F2C14E';
const bellShade = '#C9962E';
const tear = '#9CCBE6';

const line = (d: string, color = ink, width = 1.8) =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const path = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, opacity = 1) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
const circle = (cx: number, cy: number, r: number, fill: string) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

/** Side-view heads are drawn small and grown to match the sitting head, keeping the cat in proportion. */
const GROW = 1.3;
const grow = ([cx, cy]: [number, number], svg: string) =>
  `<g transform="translate(${cx} ${cy}) scale(${GROW}) translate(${-cx} ${-cy})">${svg}</g>`;
const grown = ([cx, cy]: [number, number], [x, y]: [number, number]): [number, number] => [
  cx + GROW * (x - cx),
  cy + GROW * (y - cy),
];
const stretchCentre: [number, number] = [45, 90];
const leapCentre: [number, number] = [45, 49];

// --- sitting, facing you -----------------------------------------------------------------------

/** Big round eyes with two sparkles; `dy` looks down, `wet` adds a watery shine, `bright` (happy) makes them bigger and shinier. */
const eyes = (dy = 0, wet = false, bright = false) =>
  [66, 94]
    .map(
      (x) =>
        circle(x, 47 + dy, bright ? 6.9 : 6.2, ink) +
        (bright
          ? circle(x + 2.3, 44.3 + dy, 3, white) +
            circle(x - 2.3, 49.8 + dy, 1.5, white) +
            circle(x + 3.4, 49 + dy, 0.9, white)
          : circle(x + 2.1, 44.6 + dy, 2.5, white) + circle(x - 2, 49.6 + dy, 1.2, white)) +
        (wet ? ellipse(x, 51.5 + dy, 4.6, 1.6, '#BFE0F2', 0.85) : ''),
    )
    .join('');
const cheeks = (opacity = 0.7, rx = 6) =>
  ellipse(57, 58, rx, 3.6, blush, opacity) + ellipse(103, 58, rx, 3.6, blush, opacity);
const whiskers = line('M55 56 L42 53 M55 59.5 L42 60.5 M105 56 L118 53 M105 59.5 L118 60.5', stripe, 1.4);

const sitHead =
  // a round mochi face with little cheek tufts
  path(
    'M80 14 C104 14 117 28 117 44 C117 52 114.5 57.5 110 61.5 L114 64.5 L106.5 65.5 C100 71 91 74 80 74 C69 74 60 71 53.5 65.5 L46 64.5 L50 61.5 C45.5 57.5 43 52 43 44 C43 28 56 14 80 14 Z',
    fur,
  ) +
  line('M73 16.5 L75 25 M80 15 L80 24 M87 16.5 L85 25', stripe, 3.2) +
  line('M44 44 L50 45.5 M43.6 49 L49.5 49.5 M116 44 L110 45.5 M116.4 49 L110.5 49.5', stripe, 2.6) +
  ellipse(80, 58, 13.5, 9.5, cream) +
  path('M76 53.2 Q80 52 84 53.2 Q82.6 56.8 80 57.4 Q77.4 56.8 76 53.2 Z', nose) +
  ellipse(78.6, 53.6, 1.2, 0.7, white, 0.7) +
  whiskers;

/** A wide smile with its tongue, rosy cheeks and two sparkles: happy, eyes open or squeezed shut. */
const happyRest =
  path('M73.5 59 Q80 69.5 86.5 59 Q80 61.2 73.5 59 Z', mouth) +
  path('M76.8 63 Q80 67.4 83.2 63 Q80 64.2 76.8 63 Z', tongue) +
  cheeks(1, 6.5) +
  line('M38 30 L38 36 M35 33 L41 33 M122 26 L122 31 M119.5 28.5 L124.5 28.5', bell, 1.8);

const sitEar = (side: 1 | -1) => {
  const x = (v: number) => (side === 1 ? v : 160 - v);
  return (
    path(`M${x(49)} 37 C${x(45)} 23 ${x(47)} 11 ${x(52)} 6 C${x(60)} 9 ${x(70)} 16 ${x(74)} 23 Z`, fur) +
    path(
      `M${x(53.5)} 13 C${x(58.5)} 16 ${x(63.5)} 20 ${x(66.5)} 24 L${x(56)} 30.5 C${x(53)} 25 ${x(52.5)} 18 ${x(53.5)} 13 Z`,
      pink,
    ) +
    line(`M${x(56)} 27 L${x(59)} 21 M${x(59)} 28 L${x(62.5)} 23`, white, 1.3)
  );
};

const sitBody =
  // haunches, a round body, and a fluffy cream bib
  ellipse(57, 100, 14, 13, shade) +
  ellipse(103, 100, 14, 13, shade) +
  path('M80 60 C99 60 108 79 108.5 95 C109 108 99 114 80 114 C61 114 51 108 51.5 95 C52 79 61 60 80 60 Z', fur) +
  path(
    'M80 70 C88 70 93 77 94 86 C96.5 88 95 92 93.5 93 C95.5 96 93.5 100 91 100.5 C91.5 104 88 106.5 85 105.5 C83.5 108.5 76.5 108.5 75 105.5 C72 106.5 68.5 104 69 100.5 C66.5 100 64.5 96 66.5 93 C65 92 63.5 88 66 86 C67 77 72 70 80 70 Z',
    cream,
  ) +
  line(
    'M55 86 C59 86 62 88 63 90.5 M53.5 95 C57.5 95 60.5 97 61.5 99.5 M105 86 C101 86 98 88 97 90.5 M106.5 95 C102.5 95 99.5 97 98.5 99.5',
    stripe,
    3,
  );

const sitFront =
  // paws with toes, then the collar and its bell
  ellipse(70, 111, 9, 5.8, cream) +
  ellipse(90, 111, 9, 5.8, cream) +
  line(
    'M66.5 108.8 L66.5 112.5 M70 108.4 L70 112.8 M73.5 108.8 L73.5 112.5 M86.5 108.8 L86.5 112.5 M90 108.4 L90 112.8 M93.5 108.8 L93.5 112.5',
    creamShade,
    1.4,
  ) +
  path(
    'M60 68.5 C66 73.5 73 75 80 75 C87 75 94 73.5 100 68.5 L101.5 72.5 C95 78 88 79.5 80 79.5 C72 79.5 65 78 58.5 72.5 Z',
    collar,
  ) +
  circle(80, 82, 4.6, bell) +
  path('M76 82.5 A4.6 4.6 0 0 0 84 82.5 Z', bellShade) +
  line('M78.6 84.2 L81.4 84.2', bellShade, 1) +
  circle(78.4, 80.3, 1.1, white);

const sitTail =
  line('M100 106 C123 108 134 92 128 77 C124 67 130 58 138 60', furFlat, 11.5) +
  line('M129.6 85 C132.4 84 134.4 82.6 135.6 80.6 M126.7 70.9 C129.3 72 131.6 72.2 133.7 71.4', stripe, 3) +
  line('M131.2 61.6 C133.4 60.2 135.8 59.6 138 60', stripe, 11.5);

// --- curled up asleep --------------------------------------------------------------------------

const sleepBody =
  path('M42 113 C28 113 24 101 30 90 C38 75 61 66 92 66 C123 66 140 80 140 97 C140 108 131 113 119 113 Z', fur) +
  path('M60 112 C70 106 84 104 98 106 C108 107.5 116 110.5 120 113 Z', creamShade) +
  line(
    'M92 68 C95 74 94 79.5 90 83.5 M106 70 C109.5 76 108.5 81.5 104.5 85.5 M120 75 C122.5 80.5 121.5 86 117.5 89',
    stripe,
    3.4,
  );

const sleepEar = (left: boolean) =>
  left
    ? path('M26 82 C21.5 71.5 22.5 62 26 57.5 C32.5 59.5 40 64.5 44.5 71 Z', fur) +
      path('M27.6 63.5 C32 65.6 35.6 68.6 38 72 L29.6 76.4 C27.8 72.4 27.2 67.6 27.6 63.5 Z', pink)
    : path('M63 68.5 C66 59 71.5 53 76 50.5 C79.5 56 80.5 65.5 79 73.5 Z', fur) +
      path('M74.6 56 C76 60.5 76.2 64.6 75.6 68.6 L67.8 68.6 C69.4 63.8 71.6 59.4 74.6 56 Z', pink);

const sleepHead =
  path('M54 66 C73 66 86 76.5 86 90 C86 104.5 72.5 113 54 113 C35.5 113 22 104.5 22 90 C22 76.5 35 66 54 66 Z', fur) +
  line('M47.5 68.4 L48.6 75.6 M54.5 67.4 L54.5 74.6 M61.5 68.4 L60 75.6', stripe, 3.2) +
  ellipse(54, 101.5, 12, 8, cream) +
  path('M50.8 97.2 Q54 96 57.2 97.2 Q56 100.4 54 100.9 Q52 100.4 50.8 97.2 Z', nose) +
  line('M33 99 L22 97.5 M33 102 L22 103 M75 99 L86 97.5 M75 102 L86 103', stripe, 1.3);

const sleepFace =
  line('M36 91.5 Q41.5 96.5 47 91.5 M61 91.5 Q66.5 96.5 72 91.5', ink, 2.6) +
  line('M35.4 90.2 L34 88.6 M72.6 90.2 L74 88.6', ink, 1.4) +
  line('M51.2 104 Q54 106.2 56.8 104', ink, 1.6) +
  ellipse(32.5, 99.5, 5, 3, blush, 0.7) +
  ellipse(75.5, 99.5, 5, 3, blush, 0.7);

const sleepFront =
  ellipse(75, 111, 9.5, 4.8, cream) +
  line('M134 103 C126 116.5 95 118.5 72 113.5', furFlat, 11.5) +
  line('M118 112.6 C116 114.2 113.6 115 111 115.4 M101 115.4 C99 116.3 97 116.6 95 116.6', stripe, 3) +
  line('M78.5 115 C76 114.6 74 114.1 72 113.5', stripe, 11.5);

// --- stretching (front down, back up), facing left -----------------------------------------------

const stretchTail =
  line('M121 62 C131 52 138 39 133 25', furFlat, 11) +
  line('M133.6 26.5 C134 30 133.6 33 132.8 35.4', stripe, 11) +
  line('M131.8 50.2 C134.4 49.4 136.2 47.6 137.2 45.2', stripe, 3);

const stretchBody =
  // hind legs standing, an arched back, then the long front legs
  line('M112 76 L114 110', shade, 12) +
  line('M102 78 L102 110', furFlat, 12) +
  ellipse(103, 111.5, 7.5, 4.5, cream) +
  ellipse(115, 111.5, 7, 4.2, creamShade) +
  path(
    'M42 104 C38 93 47 85 61 83 C82 80 98 61 115 58.5 C128 57 131 70 125 81 C119 92 105 99 93 103 C77 108.5 55 110.5 42 104 Z',
    fur,
  ) +
  line('M96 66 C99 71 98.5 76 95 79.5 M108 61.5 C111 66.5 110.5 71.5 107 75', stripe, 3.2) +
  line('M62 106 L33 109.5', shade, 10) +
  line('M68 107.5 L39 112.5', furFlat, 10) +
  ellipse(31, 109.5, 7, 4.3, creamShade) +
  ellipse(37.5, 112.5, 7.5, 4.5, cream);

const stretchEar = (back: boolean) =>
  back
    ? path('M54 78 C55 69 59.5 62.5 64 60 C66 65.5 66 72.5 64 79 Z', shade)
    : path('M32 82 C27.5 73 27.5 64.5 30.5 60 C37 62 43.5 67 47 73 Z', fur) +
      path('M32.6 66 C36.6 68 39.6 70.8 41.6 74 L34.4 78 C33 74.4 32.4 70 32.6 66 Z', pink);

const stretchHead =
  path('M45 72 C59 72 67 81 67 91 C67 101.5 57.5 108 45 108 C32.5 108 23.5 101.5 23.5 91 C23.5 81 31 72 45 72 Z', fur) +
  line('M40 74.4 L41 80.4 M46.5 73.6 L46.5 79.8', stripe, 2.8) +
  ellipse(43, 99.5, 10, 7, cream) +
  path('M40.4 95.6 Q43 94.6 45.6 95.6 Q44.6 98.2 43 98.6 Q41.4 98.2 40.4 95.6 Z', nose);

const stretchFace =
  line('M30 89 Q34.5 85.5 39 89 M49 89 Q53.5 85.5 58 89', ink, 2.6) +
  path('M38.6 101 Q43 109 47.4 101 Q43 102.6 38.6 101 Z', mouth) +
  path('M41 104.2 Q43 107 45 104.2 Q43 105 41 104.2 Z', tongue) +
  ellipse(28, 97, 4.4, 2.6, blush, 0.7) +
  ellipse(60, 97, 4.4, 2.6, blush, 0.7);

// --- mid-leap, facing left ---------------------------------------------------------------------

const leapTail =
  line('M112 58 C126 56 138 50 148 40', furFlat, 10.5) +
  line('M142.6 45.2 C144.8 43.4 146.6 41.6 148 40', stripe, 10.5) +
  line('M124.6 55.6 C125.8 53.6 126.2 51.4 125.8 49.2', stripe, 3);

const leapBody =
  // back legs stretched behind, the body flying, front legs reaching ahead
  line('M104 68 L128 86', shade, 10) +
  line('M98 70 L120 92', furFlat, 10) +
  ellipse(122, 93, 6.5, 4.2, cream) +
  ellipse(130, 87, 6, 3.8, creamShade) +
  path('M48 56 C60 45 86 44 104 50 C116 54 120 64 113 71 C104 79 80 80 64 76 C52 73 42 65 48 56 Z', fur) +
  path('M62 74 C72 77.5 86 78 98 75.5 C92 79.5 74 80.5 62 74 Z', creamShade) +
  line('M84 47 C86.5 52 86 57 83 60.5 M97 49.5 C99.5 54.5 99 59.5 96 63', stripe, 3.2) +
  line('M58 68 L34 76', shade, 9.5) +
  line('M64 71 L40 82', furFlat, 9.5) +
  ellipse(32.5, 76.5, 6, 3.8, creamShade) +
  ellipse(38.5, 82.5, 6.5, 4, cream);

const leapEar = (back: boolean) =>
  back
    ? path('M54 37 C55 28 59.5 21.5 64 19 C66 24.5 66 31.5 64 38 Z', shade)
    : path('M32 41 C27.5 32 27.5 23.5 30.5 19 C37 21 43.5 26 47 32 Z', fur) +
      path('M32.6 25 C36.6 27 39.6 29.8 41.6 33 L34.4 37 C33 33.4 32.4 29 32.6 25 Z', pink);

const leapHead =
  path('M45 31 C59 31 67 40 67 50 C67 60.5 57.5 67 45 67 C32.5 67 23.5 60.5 23.5 50 C23.5 40 31 31 45 31 Z', fur) +
  line('M40 33.4 L41 39.4 M46.5 32.6 L46.5 38.8', stripe, 2.8) +
  ellipse(42, 58.5, 10, 7, cream) +
  path('M39.4 54.6 Q42 53.6 44.6 54.6 Q43.6 57.2 42 57.6 Q40.4 57.2 39.4 54.6 Z', nose);

const leapFace =
  circle(34, 47, 4.8, ink) +
  circle(35.8, 45.2, 1.9, white) +
  circle(52, 47, 4.8, ink) +
  circle(53.8, 45.2, 1.9, white) +
  path('M37.6 60 Q42 66 46.4 60 Q42 61.4 37.6 60 Z', mouth) +
  ellipse(28, 56, 4.4, 2.6, blush, 0.75) +
  ellipse(58, 56, 4.4, 2.6, blush, 0.75);

export const cat: PetArt = {
  box: [160, 120],
  defs:
    '<defs><linearGradient id="fur" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#F0B866"/><stop offset="1" stop-color="#DE9C4C"/></linearGradient></defs>',
  shadow: [80, 114.5, 46, 4.5],
  earMood: { sad: 24, cross: -6 },
  tail: 'sway',

  sit: {
    tail: { svg: sitTail, pivot: [100, 106] },
    body: { svg: sitBody, pivot: [80, 114] },
    ears: [
      { svg: sitEar(1), pivot: [61, 30] },
      { svg: sitEar(-1), pivot: [99, 30] },
    ],
    head: { svg: sitHead, pivot: [80, 74] },
    front: sitFront,
    faces: {
      content: {
        eyes: eyes(),
        eyesAt: [80, 47],
        rest: line('M74.5 59 Q77.2 62.2 80 59.2 Q82.8 62.2 85.5 59') + cheeks(),
      },
      happy: { eyes: eyes(0, false, true), eyesAt: [80, 47], rest: happyRest },
      beam: {
        eyes: line('M60 48.5 Q66 41 72 48.5 M88 48.5 Q94 41 100 48.5', ink, 3.2),
        eyesAt: [80, 46],
        rest: happyRest,
      },
      sad: {
        eyes: eyes(2, true),
        eyesAt: [80, 49],
        rest:
          line('M58 40 Q64 39.4 71 35.4 M102 40 Q96 39.4 89 35.4', brow, 2.6) +
          line('M75.5 63.5 Q80 59.8 84.5 63.5') +
          path('M101.5 52 C99.8 55 99.6 57 101.5 58 C103.4 57 103.2 55 101.5 52 Z', tear) +
          cheeks(0.45),
      },
      cross: {
        eyes:
          path('M59.8 46 L72.2 46 A6.2 6.2 0 0 1 59.8 46 Z', ink) +
          path('M87.8 46 L100.2 46 A6.2 6.2 0 0 1 87.8 46 Z', ink) +
          circle(67.6, 48.2, 1.2, white) +
          circle(95.6, 48.2, 1.2, white),
        eyesAt: [80, 47],
        rest:
          line('M58 36.5 L72 42 M102 36.5 L88 42', brow, 2.8) +
          line('M75.5 62.4 Q80 59.6 84.5 62.4') +
          cheeks(0.95, 7.5) +
          `<g transform="translate(108 18)">${line('M-5 -2 Q-2 -2 -2 -5 M2 -5 Q2 -2 5 -2 M5 2 Q2 2 2 5 M-2 5 Q-2 2 -5 2', nose, 2.4)}</g>`,
      },
      yawn: {
        eyes:
          line('M60 46 Q66 50.5 72 46 M88 46 Q94 50.5 100 46', ink, 3) +
          line('M58.6 44.2 L57 42.6 M101.4 44.2 L103 42.6', ink, 1.4),
        eyesAt: [80, 47],
        rest:
          path('M73 58.6 C73 72 87 72 87 58.6 C84 60.4 76 60.4 73 58.6 Z', mouth) +
          path('M75.8 65.6 Q80 71 84.2 65.6 Q80 63.8 75.8 65.6 Z', tongue) +
          path('M75 59.6 L76.4 62.6 L77.8 60 Z M85 59.6 L83.6 62.6 L82.2 60 Z', white) +
          cheeks(0.6),
      },
    },
  },

  sleep: {
    body: { svg: sleepBody, pivot: [86, 113] },
    ears: [
      { svg: sleepEar(true), pivot: [35, 76] },
      { svg: sleepEar(false), pivot: [70, 70] },
    ],
    head: { svg: sleepHead, pivot: [54, 113] },
    face: sleepFace,
    front: sleepFront,
  },

  stretch: {
    tail: { svg: stretchTail, pivot: [121, 62] },
    body: { svg: stretchBody, pivot: [80, 112] },
    ears: [
      { svg: grow(stretchCentre, stretchEar(true)), pivot: grown(stretchCentre, [60, 76]) },
      { svg: grow(stretchCentre, stretchEar(false)), pivot: grown(stretchCentre, [40, 76]) },
    ],
    head: { svg: grow(stretchCentre, stretchHead), pivot: grown(stretchCentre, [52, 104]) },
    face: grow(stretchCentre, stretchFace),
  },

  leap: {
    tail: { svg: leapTail, pivot: [112, 58] },
    body: { svg: leapBody, pivot: [80, 64] },
    ears: [
      { svg: grow(leapCentre, leapEar(true)), pivot: grown(leapCentre, [60, 35]) },
      { svg: grow(leapCentre, leapEar(false)), pivot: grown(leapCentre, [40, 35]) },
    ],
    head: { svg: grow(leapCentre, leapHead), pivot: grown(leapCentre, [52, 64]) },
    face: grow(leapCentre, leapFace),
  },
};
