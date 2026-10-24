import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { logoSvg, stickerSvgs, type StickerName } from './generated/stickers';

export type { StickerName };

type StickerProps = {
  name: StickerName;
  size?: number;
  /** A small tilt makes stickers feel hand-placed, like stationery. */
  rotate?: number;
};

/** Decorative illustration; hidden from screen readers. */
export function Sticker({ name, size = 80, rotate = 0 }: StickerProps) {
  return (
    <View style={{ transform: [{ rotate: `${rotate}deg` }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={stickerSvgs[name]} width={size} height={size} />
    </View>
  );
}

/** The Daybloom mark; `round` crops its rounded square to a circle, to sit among the stickers. */
export function Logo({ size = 32, round = false }: { size?: number; round?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={round ? { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' } : undefined}>
      <SvgXml xml={logoSvg} width={size} height={size} />
    </View>
  );
}
