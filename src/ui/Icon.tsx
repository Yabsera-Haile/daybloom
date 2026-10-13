import Svg, { Path } from 'react-native-svg';

import { colors, type ColorName } from '@/theme';

import { filledIconPaths, iconPaths, type IconName } from './generated/icons';

export type { IconName };

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorName;
  filled?: boolean;
  /** Only for icons that carry meaning on their own; decorative icons stay silent. */
  accessibilityLabel?: string;
};

export function Icon({ name, size = 24, color = 'onSurfaceVariant', filled = false, accessibilityLabel }: IconProps) {
  const d = (filled && filledIconPaths[name]) || iconPaths[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <Path d={d} fill={colors[color]} />
    </Svg>
  );
}
