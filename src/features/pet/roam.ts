import { create } from 'zustand';

/** The nap spots, one on each tab (MS-12): somewhere with room, covering no buttons. */
export type Spot = 'today' | 'week' | 'month' | 'habits' | 'budget';
/** In the tab bar's order, left to right. */
export const SPOTS: Spot[] = ['today', 'week', 'month', 'habits', 'budget'];

interface Roam {
  /** Where the pet is now; every app start it's on Today. */
  spot: Spot;
  /** Where it was before (it comes in from that side). */
  from: Spot;
  /** It's jumping in to `spot` right now (landing), rather than already napping there. */
  landing: boolean;
  moveTo: (spot: Spot, landing: boolean) => void;
  landed: () => void;
  /** How many things done today the pet has already cheered for (one cheer, whichever tab saw it). */
  cheered: number | null;
  cheer: (done: number) => void;
  /** The day it last celebrated every habit done (once a day, MS-04). */
  celebrated: string | null;
  celebrate: (day: string) => void;
  /** When it last told you, coming over, what's slipping (so it doesn't on every tab). */
  grumbled: number | null;
  grumble: (at: number) => void;
}

export const useRoam = create<Roam>((set) => ({
  spot: 'today',
  from: 'today',
  landing: false,
  moveTo: (spot, landing) => set((s) => ({ spot, from: s.spot, landing })),
  landed: () => set({ landing: false }),
  cheered: null,
  cheer: (done) => set({ cheered: done }),
  celebrated: null,
  celebrate: (day) => set({ celebrated: day }),
  grumbled: null,
  grumble: (at) => set({ grumbled: at }),
}));

/** Which side of the screen it comes in from: the side its last tab is on in the tab bar. */
export function enterSide(from: Spot, to: Spot): 'left' | 'right' {
  return SPOTS.indexOf(from) < SPOTS.indexOf(to) ? 'left' : 'right';
}
