// Tailwind (NativeWind) theme built from the single source of truth: design/tokens.json.
// Class names match the v2 HTML designs in design/daybloom (e.g. bg-surface-container-low, p-space-md).
const tokens = require('./design/tokens.json');

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const px = (n) => `${n}px`;

// Theme colours are CSS variables (r g b), so the seasonal themes can switch them at runtime
// (src/theme: ThemeProvider sets them with NativeWind's vars()); autumn is the default.
const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
const colors = Object.fromEntries(
  Object.keys(tokens.color).map((k) => [kebab(k), `rgb(var(--color-${kebab(k)}) / <alpha-value>)`]),
);
const themeDefaults = Object.fromEntries(
  Object.entries(tokens.color).map(([k, v]) => [`--color-${kebab(k)}`, channels(v)]),
);
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
  plugins: [({ addBase }) => addBase({ ":root": themeDefaults })],
};
