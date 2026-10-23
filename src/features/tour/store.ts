// Whether the tour is showing, and which step (ON-02). It starts after the first-run pages and from
// Settings › Take the tour again; finishing or skipping it is remembered.
import { create } from 'zustand';

import { db } from '@/db/client';
import { saveFlag } from '@/settings';

type TourState = {
  /** The step showing; null = no tour */
  step: number | null;
  start: () => void;
  go: (step: number) => void;
  /** Ends the tour (finished or skipped) */
  stop: () => void;
};

export const TOUR_FLAG = 'tourSeen';

export const useTour = create<TourState>()((set) => ({
  step: null,
  start: () => set({ step: 0 }),
  go: (step) => set({ step }),
  stop: () => {
    saveFlag(db, TOUR_FLAG, true);
    set({ step: null });
  },
}));
