import type { Part, PetArt } from './types';

// A little sage dragon: a cream scaled belly, gold horns, rosy bat wings that flap, peach spikes
// down its back and a heart at the end of its tail. Cross, it puffs steam.
const fur = 'url(#fur)';
const furFlat = '#8FCAA2';
const shade = '#6FAE86';
const belly = '#FFF1D6';
const scale = '#EAD2A8';
const snout = '#C8EBD4';
const horn = '#F6D58A';
const hornShade = '#DDB45A';
const spike = '#F5B08A';
const wing = '#F6B9C3';
const rib = '#E3899D';
const heart = '#F2C14E';
const ink = '#2F3A30';
const brow = '#3F6B4E';
const mouth = '#8F4B3B';
const tongue = '#EE8E86';
const blush = '#F39C93';
const white = '#FFFFFF';
const steam = '#E9EEF0';
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

/** A heart, its point at (x, y), pointing the way `angle` turns (degrees; 0 = point down). */
const heartAt = (x: number, y: number, angle = 0, s = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s})">${path(
    'M0 0 C-7 -5 -7 -12.5 -2.5 -12.5 C-1.2 -12.5 -0.4 -11.8 0 -10.8 C0.4 -11.8 1.2 -12.5 2.5 -12.5 C7 -12.5 7 -5 0 0 Z',
    heart,
  )}</g>`;

/** A bat wing: from the shoulder (x, y), spread `dir` (1 to the left, -1 to the right), `size` long, tipped `lift` up. */
const batWing = (x: number, y: number, dir: 1 | -1, size = 1, lift = 0): Part => {
  const p = (dx: number, dy: number) => `${x + dir * dx * size} ${y + (dy - lift * Math.abs(dx) * 0.25) * size}`;
  return {
    svg:
      path(
        `M${p(0, 2)} C${p(-8, -8)} ${p(-18, -16)} ${p(-30, -18)} C${p(-34, -18)} ${p(-36, -16)} ${p(-34, -12)} C${p(-30, -8)} ${p(-30, -2)} ${p(-34, 4)} C${p(-28, 2)} ${p(-24, 4)} ${p(-22, 10)} C${p(-18, 6)} ${p(-12, 6)} ${p(-8, 10)} C${p(-6, 6)} ${p(-3, 4)} ${p(0, 2)} Z`,
        wing,
      ) + line(`M${p(-1, 1)} L${p(-30, -17)} M${p(-1, 1)} L${p(-33, 3)} M${p(-1, 1)} L${p(-21, 9)}`, rib, 1.4),
    pivot: [x, y + 2 * size],
  };
};

// --- sitting, facing you -----------------------------------------------------------------------

const eyes = (dy = 0, wet = false) =>
  [66, 94]
    .map(
      (x) =>
        circle(x, 47 + dy, 6.2, ink) +
        circle(x + 2.1, 44.6 + dy, 2.5, white) +
        circle(x - 2, 49.6 + dy, 1.2, white) +
        (wet ? ellipse(x, 51.5 + dy, 4.6, 1.6, '#BFE0F2', 0.85) : ''),
    )
    .join('');
const cheeks = (opacity = 0.7, rx = 6) =>
  ellipse(57, 58, rx, 3.6, blush, opacity) + ellipse(103, 58, rx, 3.6, blush, opacity);
const nostrils = (x: number, y: number, s = 1) =>
  circle(x - 3 * s, y, 1.3 * s, shade) + circle(x + 3 * s, y, 1.3 * s, shade);

const sitHead =
  // little gold horns and peach spikes behind a round head
  path('M62 25 C57 17 57 9.5 60.5 5 C64 10 69 15.5 71.5 22 Z', horn) +
  path('M62.4 16 C63.6 18.6 66 21 68.6 22.6 L71.5 22 C69 15.5 64 10 60.5 5 C59.4 8.6 60.2 12.6 62.4 16 Z', hornShade) +
  path('M98 25 C103 17 103 9.5 99.5 5 C96 10 91 15.5 88.5 22 Z', horn) +
  path('M97.6 16 C96.4 18.6 94 21 91.4 22.6 L88.5 22 C91 15.5 96 10 99.5 5 C100.6 8.6 99.8 12.6 97.6 16 Z', hornShade) +
  path('M72 19 Q75.5 7.5 79 16 Q80 13.6 81 16 Q84.5 7.5 88 19 Z', spike) +
  path('M80 14 C104 14 117 28 117 44 C117 61 103 74 80 74 C57 74 43 61 43 44 C43 28 56 14 80 14 Z', fur) +
  ellipse(80, 59, 15, 10, snout) +
  nostrils(80, 55);

const sitEar = (side: 1 | -1) => {
  const x = (v: number) => (side === 1 ? v : 160 - v);
  return path(`M${x(46)} 45 C${x(38)} 41 ${x(33)} 34 ${x(32)} 28 C${x(39)} 30 ${x(45.6)} 34.6 ${x(49.4)} 40 Z`, wing);
};

const sitBody =
  ellipse(57, 100, 14, 13, shade) +
  ellipse(103, 100, 14, 13, shade) +
  path('M80 60 C99 60 108 79 108.5 95 C109 108 99 114 80 114 C61 114 51 108 51.5 95 C52 79 61 60 80 60 Z', fur) +
  path('M80 70 C89 70 94 78 95 88 C96 99 90 107.5 80 107.5 C70 107.5 64 99 65 88 C66 78 71 70 80 70 Z', belly) +
  line('M68 79 L92 79 M66.4 87 L93.6 87 M66.6 95 L93.4 95 M69.6 102.6 L90.4 102.6', scale, 1.6);

const sitFront =
  ellipse(70, 111, 9, 5.6, furFlat) +
  ellipse(90, 111, 9, 5.6, furFlat) +
  [65.5, 70, 74.5, 85.5, 90, 94.5].map((x) => ellipse(x, 114.2, 1.6, 1.2, belly)).join('');

const sitTail =
  line('M100 106 C121 108 131 96 128 80', furFlat, 11) +
  line('M127.4 100 L131 96 M130.6 92 L134.6 89.4', spike, 2.4) +
  heartAt(128, 80, 180, 0.95);

// --- curled up asleep --------------------------------------------------------------------------

const sleepBody =
  // spikes down its back, the body, and a folded wing
  path('M82 70 Q86 57 92.5 67 Q97.5 55 103.5 67 Q109.5 57 114 70.5 Q121 62.6 123 76 Z', spike) +
  path('M42 113 C28 113 24 101 30 90 C38 75 61 66 92 66 C123 66 140 80 140 97 C140 108 131 113 119 113 Z', fur) +
  path('M60 112 C70 106 84 104 98 106 C108 107.5 116 110.5 120 113 Z', belly) +
  path('M92 82 C100 75.6 114 75.6 123 81.6 C117 83 111 87 107 93 C103 87.6 98 84 92 82 Z', wing) +
  line('M93 82 L122 81.4 M93 82 L107 92', rib, 1.3);

const sleepEar = (left: boolean) =>
  left
    ? path('M28 84 C21 80 17 73 16.6 67 C23 69 29 73.6 32.4 79 Z', wing)
    : path('M76 72 C80 66 85.6 62 91 61 C89.6 67 86 72 80.6 75.6 Z', wing);

const sleepHead =
  path('M42 70 C38 63 38.4 56 41.6 52 C45 56.6 49.4 61.6 51.4 67.6 Z', horn) +
  path('M62 68.6 C64 61.6 68.6 56.6 73.6 54.6 C73.6 60 70.6 65.6 66.4 70 Z', horn) +
  path('M54 66 C73 66 86 76.5 86 90 C86 104.5 72.5 113 54 113 C35.5 113 22 104.5 22 90 C22 76.5 35 66 54 66 Z', fur) +
  ellipse(54, 102, 13, 8.4, snout) +
  nostrils(54, 99, 0.8);

const sleepFace =
  line('M36 91.5 Q41.5 96.5 47 91.5 M61 91.5 Q66.5 96.5 72 91.5', ink, 2.6) +
  line('M51.4 104.6 Q54 106.6 56.6 104.6', ink, 1.6) +
  ellipse(32.5, 99.5, 5, 3, blush, 0.7) +
  ellipse(75.5, 99.5, 5, 3, blush, 0.7);

const sleepFront =
  ellipse(75, 111, 9.5, 4.8, furFlat) +
  line('M134 103 C126 116.5 104 118.4 92 114.6', furFlat, 10) +
  heartAt(86, 112.6, 75, 0.85);

// --- stretching, facing left, wings up ---------------------------------------------------------

const stretchTail = line('M121 62 C131 52 138 41 134 30', furFlat, 10) + heartAt(134, 30, 175, 0.9);

const stretchBody =
  line('M112 76 L114 110', shade, 12) +
  line('M102 78 L102 110', furFlat, 12) +
  ellipse(103, 111.5, 7.5, 4.5, furFlat) +
  ellipse(115, 111.5, 7, 4.2, shade) +
  path('M58 84 Q64 74.6 70 81 Q76 70 82 77 Q88 64 94 70 Q101 57.6 106 63 Q113 52 117 59.6 L100 80 Z', spike) +
  path(
    'M42 104 C38 93 47 85 61 83 C82 80 98 61 115 58.5 C128 57 131 70 125 81 C119 92 105 99 93 103 C77 108.5 55 110.5 42 104 Z',
    fur,
  ) +
  path('M48 104.6 C62 104 80 101.6 96 96 C88 103 66 108.6 48 104.6 Z', belly) +
  line('M62 106 L33 109.5', shade, 10) +
  line('M68 107.5 L39 112.5', furFlat, 10) +
  ellipse(31, 109.5, 7, 4.3, shade) +
  ellipse(37.5, 112.5, 7.5, 4.5, furFlat);

const stretchEar = (back: boolean) =>
  back
    ? path('M60 80 C64 74 69.6 70 75 69 C73.6 75 70 80 64.6 83.6 Z', wing)
    : path('M30 86 C23 82 19 75 18.6 69 C25 71 31 75.6 34.4 81 Z', wing);

const stretchHead =
  path('M33 76 C29 69 29.4 62 32.6 58 C36 62.6 40.4 67.6 42.4 73.6 Z', horn) +
  path('M53 74.6 C55 67.6 59.6 62.6 64.6 60.6 C64.6 66 61.6 71.6 57.4 76 Z', horn) +
  path('M45 72 C59 72 67 81 67 91 C67 101.5 57.5 108 45 108 C32.5 108 23.5 101.5 23.5 91 C23.5 81 31 72 45 72 Z', fur) +
  ellipse(43, 99.5, 11, 7.4, snout) +
  nostrils(43, 96.6, 0.75);

const stretchFace =
  line('M30 89 Q34.5 85.5 39 89 M49 89 Q53.5 85.5 58 89', ink, 2.6) +
  path('M38.6 101.4 Q43 109.4 47.4 101.4 Q43 103 38.6 101.4 Z', mouth) +
  path('M41 104.4 Q43 107.2 45 104.4 Q43 105.2 41 104.4 Z', tongue) +
  ellipse(28, 97, 4.4, 2.6, blush, 0.7) +
  ellipse(60, 97, 4.4, 2.6, blush, 0.7);

// --- mid-leap, facing left, wings spread -------------------------------------------------------

const leapTail = line('M112 58 C126 56 138 50 146 41', furFlat, 10) + heartAt(146, 41, 220, 0.9);

const leapBody =
  line('M104 68 L128 86', shade, 10) +
  line('M98 70 L120 92', furFlat, 10) +
  ellipse(122, 93, 6.5, 4.2, furFlat) +
  ellipse(130, 87, 6, 3.8, shade) +
  path('M66 50 Q72 40 78 47.4 Q85 38 90 47 Q97 39 101 49 Q108 42.6 110 53 L88 60 Z', spike) +
  path('M48 56 C60 45 86 44 104 50 C116 54 120 64 113 71 C104 79 80 80 64 76 C52 73 42 65 48 56 Z', fur) +
  path('M60 73.4 C72 77.5 86 78 100 74.6 C92 80 72 81 60 73.4 Z', belly) +
  line('M58 68 L34 76', shade, 9.5) +
  line('M64 71 L40 82', furFlat, 9.5) +
  ellipse(32.5, 76.5, 6, 3.8, shade) +
  ellipse(38.5, 82.5, 6.5, 4, furFlat);

const leapEar = (back: boolean) =>
  back
    ? path('M58 38 C62 32 67.6 28 73 27 C71.6 33 68 38 62.6 41.6 Z', wing)
    : path('M30 45 C23 41 19 34 18.6 28 C25 30 31 34.6 34.4 40 Z', wing);

const leapHead =
  path('M33 35 C29 28 29.4 21 32.6 17 C36 21.6 40.4 26.6 42.4 32.6 Z', horn) +
  path('M53 33.6 C55 26.6 59.6 21.6 64.6 19.6 C64.6 25 61.6 30.6 57.4 35 Z', horn) +
  path('M45 31 C59 31 67 40 67 50 C67 60.5 57.5 67 45 67 C32.5 67 23.5 60.5 23.5 50 C23.5 40 31 31 45 31 Z', fur) +
  ellipse(41, 58.5, 11, 7.4, snout) +
  nostrils(40, 55.6, 0.75);

const leapFace =
  circle(33, 47, 4.8, ink) +
  circle(34.8, 45.2, 1.9, white) +
  circle(51, 47, 4.8, ink) +
  circle(52.8, 45.2, 1.9, white) +
  path('M36 60.6 Q41 66.6 46 60.6 Q41 62.2 36 60.6 Z', mouth) +
  ellipse(27, 56, 4.4, 2.6, blush, 0.75) +
  ellipse(57, 56, 4.4, 2.6, blush, 0.75);

const stretchCentre: [number, number] = [45, 90];
const leapCentre: [number, number] = [45, 49];

export const dragon: PetArt = {
  box: [160, 120],
  defs:
    '<defs><linearGradient id="fur" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#A8DDB8"/><stop offset="1" stop-color="#7DBB93"/></linearGradient></defs>',
  shadow: [80, 114.5, 46, 4.5],
  earMood: { sad: 22, cross: -10 },
  tail: 'sway',

  sit: {
    tail: { svg: sitTail, pivot: [100, 106] },
    wings: [batWing(64, 74, 1, 0.95, 0.4), batWing(96, 74, -1, 0.95, 0.4)],
    body: { svg: sitBody, pivot: [80, 114] },
    ears: [
      { svg: sitEar(1), pivot: [48.5, 42] },
      { svg: sitEar(-1), pivot: [111.5, 42] },
    ],
    head: { svg: sitHead, pivot: [80, 74] },
    front: sitFront,
    faces: {
      content: {
        eyes: eyes(),
        eyesAt: [80, 47],
        rest: line('M75 62.6 Q80 66.4 85 62.6') + cheeks(),
      },
      happy: {
        eyes: line('M60 48.5 Q66 41 72 48.5 M88 48.5 Q94 41 100 48.5', ink, 3.2),
        eyesAt: [80, 46],
        rest:
          path('M73.5 61.6 Q80 71.6 86.5 61.6 Q80 64 73.5 61.6 Z', mouth) +
          path('M76.8 65.4 Q80 69.6 83.2 65.4 Q80 66.6 76.8 65.4 Z', tongue) +
          cheeks(1, 6.5) +
          heartAt(118, 26, 0, 0.6) +
          heartAt(40, 30, 0, 0.45),
      },
      sad: {
        eyes: eyes(2, true),
        eyesAt: [80, 49],
        rest:
          line('M58 40 Q64 39.4 71 35.4 M102 40 Q96 39.4 89 35.4', brow, 2.6) +
          line('M75.5 66 Q80 62.4 84.5 66') +
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
          line('M75.5 65 Q80 62.2 84.5 65') +
          cheeks(0.95, 7.5) +
          // two puffs of steam from its nostrils
          circle(65, 66, 3.4, steam) +
          circle(59.6, 68, 4.2, steam) +
          circle(53.8, 66.6, 3.2, steam) +
          circle(95, 66, 3.4, steam) +
          circle(100.4, 68, 4.2, steam) +
          circle(106.2, 66.6, 3.2, steam),
      },
      yawn: {
        eyes:
          line('M60 46 Q66 50.5 72 46 M88 46 Q94 50.5 100 46', ink, 3) +
          line('M58.6 44.2 L57 42.6 M101.4 44.2 L103 42.6', ink, 1.4),
        eyesAt: [80, 47],
        rest:
          path('M73 60.6 C73 74 87 74 87 60.6 C84 62.4 76 62.4 73 60.6 Z', mouth) +
          path('M75.8 67.6 Q80 73 84.2 67.6 Q80 65.8 75.8 67.6 Z', tongue) +
          path('M75 61.6 L76.4 64.6 L77.8 62 Z M85 61.6 L83.6 64.6 L82.2 62 Z', white) +
          cheeks(0.6),
      },
    },
  },

  sleep: {
    body: { svg: sleepBody, pivot: [86, 113] },
    ears: [
      { svg: sleepEar(true), pivot: [31, 82] },
      { svg: sleepEar(false), pivot: [79, 74] },
    ],
    head: { svg: sleepHead, pivot: [54, 113] },
    face: sleepFace,
    front: sleepFront,
  },

  stretch: {
    tail: { svg: stretchTail, pivot: [121, 62] },
    wings: [batWing(100, 66, 1, 0.85, 2.4), batWing(108, 64, 1, 0.95, 2.8)],
    body: { svg: stretchBody, pivot: [80, 112] },
    ears: [
      { svg: grow(stretchCentre, stretchEar(true)), pivot: grown(stretchCentre, [62, 80]) },
      { svg: grow(stretchCentre, stretchEar(false)), pivot: grown(stretchCentre, [33, 82]) },
    ],
    head: { svg: grow(stretchCentre, stretchHead), pivot: grown(stretchCentre, [52, 104]) },
    face: grow(stretchCentre, stretchFace),
  },

  leap: {
    tail: { svg: leapTail, pivot: [112, 58] },
    wings: [batWing(92, 52, -1, 1.15, 2.2), batWing(84, 54, -1, 1.25, 2.6)],
    body: { svg: leapBody, pivot: [80, 64] },
    ears: [
      { svg: grow(leapCentre, leapEar(true)), pivot: grown(leapCentre, [62, 39]) },
      { svg: grow(leapCentre, leapEar(false)), pivot: grown(leapCentre, [33, 41]) },
    ],
    head: { svg: grow(leapCentre, leapHead), pivot: grown(leapCentre, [52, 64]) },
    face: grow(leapCentre, leapFace),
  },
};
