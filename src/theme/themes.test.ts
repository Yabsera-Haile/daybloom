import { seasonShown, themeFor } from '@/features/ThemeProvider';

import { palettes, THEME_NAMES, themes, type ColorName } from '.';

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => linear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Hue in degrees, roughly (HSL): enough to tell colour families apart. */
function hue(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Text on its background, as the screens use them: must reach 4.5:1 (NFR-04). */
const TEXT: [ColorName, ColorName][] = [
  ['onSurface', 'surface'],
  ['onSurface', 'surfaceContainerLowest'],
  ['onSurface', 'surfaceContainerHigh'],
  ['onSurfaceVariant', 'surface'],
  ['onSurfaceVariant', 'surfaceContainer'],
  ['outline', 'surface'],
  ['primary', 'surface'],
  ['primary', 'surfaceContainerLowest'],
  ['onPrimary', 'primary'],
  ['onPrimaryFixed', 'primaryFixed'],
  ['secondary', 'surface'],
  ['onSecondary', 'secondary'],
  ['onSecondaryFixed', 'secondaryFixed'],
  ['tertiary', 'surface'],
  ['onTertiary', 'tertiary'],
  ['onTertiaryFixed', 'tertiaryFixed'],
  ['onPrimaryContainer', 'primaryContainer'],
  ['error', 'surface'],
  // added with the companion, the calendars, the year chart and restore
  ['primary', 'primaryFixed'], // Undo on the sage toast, a date navigator away from today
  ['onSurfaceVariant', 'surfaceContainerLowest'], // card details, chart scale, calendar marks
  ['onSurfaceVariant', 'surfaceContainerLow'], // the chart's month readout
  ['error', 'surfaceContainerLowest'], // over budget
  ['error', 'surfaceContainerLow'],
  ['onSurface', 'surfaceVariant'], // Creative events
  ['onSurfaceVariant', 'surfaceVariant'],
  ['onSecondaryFixed', 'secondaryFixed'], // the over-budget badge
];

/** A colour laid over another at some opacity (event cards are their category colour at 60%). */
function over(top: string, under: string, alpha: number) {
  const ch = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [a, b] = [ch(top), ch(under)];
  return `#${a
    .map((v, i) =>
      Math.round(v * alpha + b[i] * (1 - alpha))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

describe('seasonal themes', () => {
  it.each(THEME_NAMES)('T-NFR04.1 %s keeps every text colour readable (4.5:1)', (name) => {
    const c = palettes[name];
    const failing = TEXT.filter(([fg, bg]) => contrast(c[fg], c[bg]) < 4.5).map(([fg, bg]) => `${fg} on ${bg}`);
    expect(failing).toEqual([]);
  });

  it.each(THEME_NAMES)('T-NFR04.3 %s: event cards keep their titles and details readable (4.5:1)', (name) => {
    const c = palettes[name];
    const look = themes[name].lookFor;
    // the card is its category colour at 60% over a white card; Social and Creative are solid
    const cards: [string, string, string][] = [
      ['wellness', over(c.primaryFixed, c.surfaceContainerLowest, 0.6), 'primary'],
      ['work', over(c.secondaryFixed, c.surfaceContainerLowest, 0.6), 'secondary'],
      ['personal', over(c.tertiaryFixed, c.surfaceContainerLowest, 0.6), 'tertiary'],
      ['creative', c.surfaceVariant, 'creative'],
    ];
    const failing = cards.flatMap(([key, bg]) =>
      (['title', 'detail'] as const)
        .filter((part) => contrast(look(key)[part] as string, bg) < 4.5)
        .map((part) => `${key} ${part}`),
    );
    expect(failing).toEqual([]);
  });

  it('each season looks different, and its color classes get the same variables', () => {
    expect(new Set(THEME_NAMES.map((n) => palettes[n].primary)).size).toBe(4);
    expect(new Set(THEME_NAMES.map((n) => palettes[n].surface)).size).toBe(4);
    expect(Object.keys(palettes.spring)).toEqual(Object.keys(palettes.autumn));
    expect(themes.winter.lookFor('work').dot).toBe(palettes.winter.secondary);
  });

  it('T-ST04.2 spring, summer and winter don’t look like autumn: their main colours are a different family', () => {
    for (const name of ['spring', 'summer', 'winter'] as const) {
      expect(apart(hue(palettes[name].primary), hue(palettes.autumn.primary))).toBeGreaterThan(40);
      expect(apart(hue(palettes[name].primaryFixed), hue(palettes.autumn.primaryFixed))).toBeGreaterThan(40);
    }
    // in spring, Wellness (primary) and Work (secondary) chips stay apart
    expect(apart(hue(palettes.spring.primaryFixed), hue(palettes.spring.secondaryFixed))).toBeGreaterThan(20);
  });

  it('T-ST04.3 the season pictured follows the chosen colours; with Follow the seasons, the real season', () => {
    const october = new Date(2026, 9, 16);
    expect(seasonShown('winter', october, 'north')).toBe('winter');
    expect(seasonShown('spring', october, 'north')).toBe('spring');
    expect(seasonShown('auto', october, 'north')).toBe('autumn');
    expect(seasonShown('auto', october, 'south')).toBe('spring');
  });

  it('"Follow the seasons" picks the season where you live; a chosen season stays', () => {
    expect(themeFor('auto', '2026-10-16', 'south')).toBe('spring');
    expect(themeFor('auto', '2026-10-16', 'north')).toBe('autumn');
    expect(themeFor('auto', '2026-01-10', 'north')).toBe('winter');
    expect(themeFor('auto', '2026-07-01', 'north')).toBe('summer');
    expect(themeFor('winter', '2026-07-01', 'north')).toBe('winter');
  });
});
