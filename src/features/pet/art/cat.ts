import type { PetArt } from './types';

// A ginger cat in the stickers' flat style (butterscotch, cream, blush, warm brown).
const fur = '#E3A857';
const stripe = '#C98A3E';
const cream = '#FFDDB5';
const paw = '#F3C58A';
const pink = '#F2B8A8';
const nose = '#E08D79';
const blush = '#F0A69A';
const ink = '#3B2A22';
const shine = '#FFF8F5';
const brow = '#8F4B3B';

const line = (d: string, color = ink, width = 1.8) =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

const cheeks = (opacity = 0.75, rx = 5) =>
  `<ellipse cx="60" cy="57" rx="${rx}" ry="3.2" fill="${blush}" opacity="${opacity}"/>` +
  `<ellipse cx="100" cy="57" rx="${rx}" ry="3.2" fill="${blush}" opacity="${opacity}"/>`;

const roundEyes = (dy = 0) =>
  `<circle cx="68" cy="${47 + dy}" r="4.8" fill="${ink}"/><circle cx="92" cy="${47 + dy}" r="4.8" fill="${ink}"/>` +
  `<circle cx="69.7" cy="${45.3 + dy}" r="1.7" fill="${shine}"/><circle cx="93.7" cy="${45.3 + dy}" r="1.7" fill="${shine}"/>`;

export const cat: PetArt = {
  box: [160, 120],

  awake: {
    tail: {
      svg:
        line('M100 106 C122 108 132 92 126 78 C122 69 128 60 136 62', fur, 11) +
        line('M130 63.5 C132 62.2 134 61.8 136 62', stripe, 11),
      pivot: [100, 106],
    },
    body: {
      svg:
        `<path d="M80 60 C98 60 108 80 109 96 C110 108 100 114 80 114 C60 114 50 108 51 96 C52 80 62 60 80 60 Z" fill="${fur}"/>` +
        `<path d="M80 78 C90 78 95 90 95 100 C95 108 88 112 80 112 C72 112 65 108 65 100 C65 90 70 78 80 78 Z" fill="${cream}"/>` +
        line(
          'M55 87 C59 87 62 89 63 91 M53 97 C57 97 60 99 61 101 M105 87 C101 87 98 89 97 91 M107 97 C103 97 100 99 99 101',
          stripe,
          3,
        ),
      pivot: [80, 114],
    },
    ears: [
      {
        svg:
          `<path d="M52 36 C49 24 52 13 56 10 C62 13 70 20 73 26 Z" fill="${fur}"/>` +
          `<path d="M56.5 17 C61 20 64.5 23 66.5 27 L57.5 31 C55.5 26 55.5 21 56.5 17 Z" fill="${pink}"/>`,
        pivot: [62, 30],
      },
      {
        svg:
          `<path d="M108 36 C111 24 108 13 104 10 C98 13 90 20 87 26 Z" fill="${fur}"/>` +
          `<path d="M103.5 17 C99 20 95.5 23 93.5 27 L102.5 31 C104.5 26 104.5 21 103.5 17 Z" fill="${pink}"/>`,
        pivot: [98, 30],
      },
    ],
    head: {
      svg:
        `<path d="M80 20 C102 20 113 34 113 48 C113 64 99 72 80 72 C61 72 47 64 47 48 C47 34 58 20 80 20 Z" fill="${fur}"/>` +
        line('M73 23 L75 31 M80 21 L80 30 M87 23 L85 31', stripe, 3) +
        `<ellipse cx="80" cy="59" rx="12" ry="8.5" fill="${cream}"/>` +
        `<path d="M76.5 54 Q80 53 83.5 54 Q82 57.5 80 58 Q78 57.5 76.5 54 Z" fill="${nose}"/>` +
        line('M58 57 L45 54 M58 61 L45 62 M102 57 L115 54 M102 61 L115 62', stripe, 1.6),
      pivot: [80, 72],
    },
    front:
      `<ellipse cx="70" cy="112" rx="8.5" ry="5" fill="${paw}"/><ellipse cx="90" cy="112" rx="8.5" ry="5" fill="${paw}"/>` +
      line('M67 110 L67 113 M73 110 L73 113 M87 110 L87 113 M93 110 L93 113', '#D9A866', 1.5),
    faces: {
      content: {
        eyes: roundEyes(),
        eyesAt: [80, 47],
        rest: line('M75 61.5 Q77.5 64.5 80 61.5 Q82.5 64.5 85 61.5') + cheeks(),
      },
      happy: {
        eyes: line('M63 48.5 Q68 42 73 48.5 M87 48.5 Q92 42 97 48.5', ink, 3),
        eyesAt: [80, 46],
        rest:
          `<path d="M74.5 61 Q80 70 85.5 61 Q80 63 74.5 61 Z" fill="#8F4B3B"/>` +
          `<path d="M77.6 64.6 Q80 68 82.4 64.6 Q80 65.6 77.6 64.6 Z" fill="${nose}"/>` +
          cheeks(1),
      },
      sad: {
        eyes: roundEyes(2),
        eyesAt: [80, 49],
        rest:
          line('M61 41 Q66 40.5 72 37 M99 41 Q94 40.5 88 37', brow, 2.4) +
          line('M76 63.5 Q80 60.5 84 63.5') +
          cheeks(0.5),
      },
      cross: {
        eyes:
          `<path d="M63.2 46 L72.8 46 A4.8 4.8 0 0 1 63.2 46 Z" fill="${ink}"/>` +
          `<path d="M87.2 46 L96.8 46 A4.8 4.8 0 0 1 87.2 46 Z" fill="${ink}"/>`,
        eyesAt: [80, 47],
        rest:
          line('M61 38 L73 42.5 M99 38 L87 42.5', brow, 2.6) +
          line('M76 62 Q80 60.5 84 62') +
          cheeks(0.95, 6.5) +
          `<g transform="translate(108 20)">${line('M-5 -2 Q-2 -2 -2 -5 M2 -5 Q2 -2 5 -2 M5 2 Q2 2 2 5 M-2 5 Q-2 2 -5 2', nose, 2.2)}</g>`,
      },
    },
  },

  asleep: {
    body: {
      svg:
        `<path d="M44 113 C30 113 26 101 32 91 C40 76 62 68 92 68 C122 68 138 82 138 97 C138 108 130 113 118 113 Z" fill="${fur}"/>` +
        line('M92 70 C95 76 94 81 90 85 M106 72 C109 78 108 83 104 87 M119 77 C121 82 120 87 116 90', stripe, 3.2),
      pivot: [85, 113],
    },
    ears: [
      {
        svg:
          `<path d="M28 82 C24 72 25 63 28 59 C34 61 41 66 45 72 Z" fill="${fur}"/>` +
          `<path d="M29.5 65 C33.5 67 37 70 39 73 L31 77 C29.5 73 29 69 29.5 65 Z" fill="${pink}"/>`,
        pivot: [36, 76],
      },
      {
        svg:
          `<path d="M63 69 C66 60 71 54 75 52 C78 57 79 66 78 74 Z" fill="${fur}"/>` +
          `<path d="M73.5 57 C74.8 61 75 65 74.5 69 L67 69 C68.5 64.5 70.5 60 73.5 57 Z" fill="${pink}"/>`,
        pivot: [70, 70],
      },
    ],
    head: {
      svg:
        `<path d="M54 67 C72 67 84 77 84 90 C84 104 71 113 54 113 C37 113 24 104 24 90 C24 77 36 67 54 67 Z" fill="${fur}"/>` +
        line('M48 69 L49 76 M55 68 L55 75 M62 69 L60.5 76', stripe, 3) +
        `<ellipse cx="54" cy="101" rx="11" ry="7.5" fill="${cream}"/>` +
        `<path d="M51 97 Q54 96 57 97 Q55.8 100 54 100.4 Q52.2 100 51 97 Z" fill="${nose}"/>`,
      pivot: [54, 113],
    },
    face:
      line('M37 91 Q42 95.5 47 91 M61 91 Q66 95.5 71 91', ink, 2.4) +
      line('M51.5 103.5 Q54 105.5 56.5 103.5', ink, 1.6) +
      `<ellipse cx="33" cy="99" rx="4.5" ry="2.8" fill="${blush}" opacity="0.75"/>` +
      `<ellipse cx="75" cy="99" rx="4.5" ry="2.8" fill="${blush}" opacity="0.75"/>`,
    front:
      `<ellipse cx="74" cy="111" rx="9" ry="4.5" fill="${paw}"/>` +
      line('M132 103 C124 116 94 118 72 113', '#D9963F', 11) +
      line('M78 114.3 C75.5 113.9 73.6 113.4 72 113', stripe, 11),
  },
};
