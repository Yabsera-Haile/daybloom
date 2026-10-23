// Whether the tour is showing, which one, and which step (ON-02). The whole tour starts after the
// first-run pages and from Settings or More › Take the tour; the bank-texts part from that screen's
// "How it works". Finishing or skipping the whole tour is remembered.
import { create } from 'zustand';

import { db } from '@/db/client';
import { saveFlag } from '@/settings';

import type { TourPart } from './steps';

type TourState = {
  /** The step showing; null = no tour */
  step: number | null;
  part: TourPart;
  start: (part?: TourPart) => void;
  go: (step: number) => void;
  /** Ends the tour (finished or skipped) */
  stop: () => void;
};

export const TOUR_FLAG = 'tourSeen';

export const useTour = create<TourState>()((set, get) => ({
  step: null,
  part: 'app',
  start: (part = 'app') => set({ step: 0, part }),
  go: (step) => set({ step }),
  stop: () => {
    if (get().part === 'app') saveFlag(db, TOUR_FLAG, true);
    set({ step: null });
  },
}));
