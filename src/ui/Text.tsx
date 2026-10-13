import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fontFamilyFor, typography, type ColorName, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  /** Type style from the design tokens (default bodyMd). */
  variant?: TypographyVariant;
  color?: ColorName;
  weight?: '400' | '500' | '600' | '700';
  italic?: boolean;
  /** Done items: strikethrough + 75% opacity (keeps contrast >= 4.5:1). */
  done?: boolean;
  className?: string;
};

export function Text({ variant = 'bodyMd', color = 'onSurface', weight, italic, done, style, ...rest }: TextProps) {
  const t = typography[variant];
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: fontFamilyFor(t.font, weight ?? t.weight, italic),
          fontSize: t.size,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing ?? 0,
          color: colors[color],
        },
        done && { textDecorationLine: 'line-through', opacity: 0.75 },
        style,
      ]}
    />
  );
}
