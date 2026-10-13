// Tailwind (NativeWind) theme built from the single source of truth: design/tokens.json.
// Class names match the v2 HTML designs in design/daybloom (e.g. bg-surface-container-low, p-space-md).
const tokens = require('./design/tokens.json');

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const px = (n) => `${n}px`;

const colors = Object.fromEntries(Object.entries(tokens.color).map(([k, v]) => [kebab(k), v]));
const social = tokens.categoryColor.social;
colors.social = social.accent;
colors['social-container'] = social.container;
colors['on-social-container'] = social.onContainer;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      spacing: Object.fromEntries(Object.entries(tokens.spacing).map(([k, v]) => [kebab(k), px(v)])),
      borderRadius: {
        DEFAULT: px(tokens.radius.sm),
        md: px(tokens.radius.md),
        lg: px(tokens.radius.lg),
        xl: px(tokens.radius.xl),
        '2xl': px(tokens.radius['2xl']),
        full: '9999px',
      },
      minHeight: { touch: px(tokens.layout.minTouchTarget), dense: px(tokens.layout.minTouchTargetDenseGrid) },
      minWidth: { touch: px(tokens.layout.minTouchTarget), dense: px(tokens.layout.minTouchTargetDenseGrid) },
    },
  },
  plugins: [],
};
