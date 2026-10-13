// Typed access to the design tokens (design/tokens.json is the single source of truth).
// Layout and colors are usually applied with NativeWind classes (see tailwind.config.js);
// this module covers what classes can't: typography with real font files, shadows, and raw values.
import tokens from '../../design/tokens.json';

export const colors = tokens.color;
export type ColorName = keyof typeof colors;

export type CategoryKey = 'wellness' | 'work' | 'personal' | 'social' | 'creative';
export type CategoryColor = { label: string; container: string; onContainer: string; accent: string };
export const categoryColors: Record<CategoryKey, CategoryColor> = {
  wellness: tokens.categoryColor.wellness,
  work: tokens.categoryColor.work,
  personal: tokens.categoryColor.personal,
  social: tokens.categoryColor.social,
  creative: tokens.categoryColor.creative,
};

/** How each category looks on timeline cards and choice chips (design/daybloom/today, event). */
export type CategoryLook = {
  /** Card background class */
  card: string;
  /** Selected choice chip classes */
  chipOn: string;
  dot: string;
  title: string;
  detail: string;
  icon: IconNameForCategory;
};
type IconNameForCategory = 'spa' | 'laptop_mac' | 'event' | 'groups' | 'brush';
const c = tokens.color;
export const categoryLooks: Record<CategoryKey, CategoryLook> = {
  wellness: {
    card: 'bg-primary-fixed/60',
    chipOn: 'border-primary bg-primary-fixed',
    dot: c.primary,
    title: c.onPrimaryFixed,
    detail: c.primary,
    icon: 'spa',
  },
  work: {
    card: 'bg-secondary-fixed/60',
    chipOn: 'border-secondary bg-secondary-fixed',
    dot: c.secondary,
    title: c.onSecondaryFixed,
    detail: c.secondary,
    icon: 'laptop_mac',
  },
  personal: {
    card: 'bg-tertiary-fixed/60',
    chipOn: 'border-tertiary bg-tertiary-fixed',
    dot: c.tertiary,
    title: c.onTertiaryFixed,
    detail: c.tertiary,
    icon: 'event',
  },
  social: {
    card: 'bg-social-container',
    chipOn: 'border-social bg-social-container',
    dot: tokens.categoryColor.social.accent,
    title: tokens.categoryColor.social.onContainer,
    detail: tokens.categoryColor.social.onContainer,
    icon: 'groups',
  },
  creative: {
    card: 'bg-surface-variant',
    chipOn: 'border-on-surface-variant bg-surface-variant',
    dot: c.onSurfaceVariant,
    title: c.onSurface,
    detail: c.onSurfaceVariant,
    icon: 'brush',
  },
};

/** A stored color key, or Personal's look if it's unknown. */
export function lookFor(colorKey: string | null | undefined): CategoryLook {
  return categoryLooks[(colorKey ?? 'personal') as CategoryKey] ?? categoryLooks.personal;
}

export const spacing = tokens.spacing;
export const radius = tokens.radius;
export const layout = tokens.layout;
export const doneTextOpacity = tokens.opacity.doneText;

// Warm umber shadows from DESIGN.md. React Native 0.76+ supports CSS box-shadow on iOS and Android.
export const shadows = {
  card: { boxShadow: '0px 4px 16px -2px rgba(45, 41, 38, 0.06), 0px 2px 6px -1px rgba(45, 41, 38, 0.03)' },
  float: { boxShadow: '0px 8px 24px -4px rgba(45, 41, 38, 0.16), 0px 2px 8px -2px rgba(45, 41, 38, 0.06)' },
} as const;

// Custom fonts need one font file per weight (Android ignores fontWeight for custom families).
type Weight = '400' | '500' | '600' | '700';
export const fontFiles = {
  serif: {
    '400': 'Literata_400Regular',
    '500': 'Literata_500Medium',
    '600': 'Literata_600SemiBold',
    '700': 'Literata_700Bold',
    italic: 'Literata_400Regular_Italic',
  },
  sans: {
    '400': 'PlusJakartaSans_400Regular',
    '500': 'PlusJakartaSans_500Medium',
    '600': 'PlusJakartaSans_600SemiBold',
    '700': 'PlusJakartaSans_700Bold',
    italic: 'PlusJakartaSans_400Regular_Italic',
  },
} as const;

export function fontFamilyFor(font: 'serif' | 'sans', weight: Weight, italic = false): string {
  return italic ? fontFiles[font].italic : fontFiles[font][weight];
}

export const typography = tokens.typography as Record<
  keyof typeof tokens.typography,
  { font: 'serif' | 'sans'; size: number; lineHeight: number; weight: Weight; letterSpacing?: number }
>;
export type TypographyVariant = keyof typeof typography;
