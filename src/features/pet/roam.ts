import { create } from 'zustand';

/** The naps spots, one on each tab (MS-12): somewhere with room, covering no buttons. */
export type Spot = 'today' | 'week' | 'month' | 'habits' | 'budget';
export const SPOTS: Spot[] = ['today', 'week', 'month', 'habits', 'budget'];

interface Roam {
  /** Where the pet is now; every app start it's on Today. */
  spot: Spot;
  /** It's jumping in to `spot` right now (landing), rather than already napping there. */
  landing: boolean;
  moveTo: (spot: Spot, landing: boolean) => void;
  landed: () => void;
  /** How many things done today the pet has already cheered for (one cheer, whichever tab saw it). */
  cheered: number | null;
  cheer: (done: number) => void;
  /** The spots on screens that have been opened (and have room just now): where it can go. */
  open: Spot[];
  offer: (spot: Spot) => void;
  withdraw: (spot: Spot) => void;
}

export const useRoam = create<Roam>((set) => ({
  spot: 'today',
  landing: false,
  moveTo: (spot, landing) => set({ spot, landing }),
  landed: () => set({ landing: false }),
  cheered: null,
  cheer: (done) => set({ cheered: done }),
  open: [],
  offer: (spot) => set((s) => (s.open.includes(spot) ? s : { open: [...s.open, spot] })),
  withdraw: (spot) => set((s) => ({ open: s.open.filter((x) => x !== spot) })),
}));

/** Somewhere else to nap, picked at random from the spots on hand; null when there's nowhere. */
export function elsewhere(from: Spot, random = Math.random): Spot | null {
  const others = useRoam.getState().open.filter((s) => s !== from);
  return others.length ? others[Math.floor(random() * others.length)] : null;
}
