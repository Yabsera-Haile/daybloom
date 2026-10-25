import { useContext } from 'react';
import { useWindowDimensions } from 'react-native';

import { ContentWidth } from './wide';

/**
 * A narrow screen: under `below` dp wide (400 by default: most small and mid-size phones; a Galaxy
 * S24 Ultra is 412dp), counting text set large in the phone's settings as less room. Rows that put a
 * value or tag beside a title stack them instead, so titles don't wrap a word at a time. In a pane on
 * a tablet, the pane's width counts (ContentWidth).
 */
export function useNarrow(below = 400): boolean {
  const { width, fontScale } = useWindowDimensions();
  const column = useContext(ContentWidth);
  return (column ?? width) / Math.max(1, fontScale) < below;
}
