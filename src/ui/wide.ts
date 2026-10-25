import { createContext } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';

/**
 * Bigger screens (NFR-14, D20): tablets and unfolded foldables. Phones (under 600dp) keep the phone
 * design; a wider screen keeps pages to a centred column, shows two panes side by side, and from
 * 840dp moves the tabs to a rail down the left. Widths are in dp and, like useNarrow, count text set
 * large in the phone's settings as less room.
 */
export const WIDE = {
  /** Two panes side by side on the tabs; Settings and More in two columns. */
  panes: 720,
  /** The tabs move from the bottom to a rail on the left. */
  rail: 840,
};

/** The widest each kind of content gets, page margins included. */
export const MAX = {
  /** A page, a form, or a tab without a second pane. */
  page: 720,
  /** Two panes together. */
  panes: 1160,
  /** Settings and More in two columns. */
  columns: 1080,
  /** A bottom sheet (Material's widest). */
  sheet: 640,
  /** The first-run pages. */
  firstRun: 560,
  /** Small notes such as "Event deleted · Undo". */
  toast: 560,
};

/** Width of the tab rail, before the side inset. */
export const RAIL = 88;

/** Full width up to `maxWidth`, centred beyond it. On a phone it changes nothing. */
export function centred(maxWidth: number): ViewStyle {
  return { width: '100%', maxWidth, alignSelf: 'center' };
}

/**
 * How wide (dp) the column a part of the screen sits in is, when that's narrower than the window
 * (a pane, a settings column). useNarrow reads it, so a row in a pane stacks like on a small phone.
 */
export const ContentWidth = createContext<number | null>(null);

/** What a wider screen gets: two panes, and the tabs as a rail. */
export function useWide(): { panes: boolean; rail: boolean } {
  const { width, fontScale } = useWindowDimensions();
  const room = width / Math.max(1, fontScale);
  return { panes: room >= WIDE.panes, rail: room >= WIDE.rail };
}
