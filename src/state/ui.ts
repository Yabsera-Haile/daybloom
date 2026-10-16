// Screen state shared across the app: which day each tab shows (SH-02: kept when you switch tabs),
// the sheet that is open, and the Undo message.
import { create } from 'zustand';

import type { Undo } from '@/db/types';
import type { EventOccurrence } from '@/planner/events';

export type SheetState =
  /**
   * The "+ Add" chooser (SH-05), for a day or, on Week, for a week. `hour` when opened from an empty
   * hour on Today; `inline` when "To-do" should open Today's inline form.
   */
  | { kind: 'add'; day: string; week?: { start: string; end: string }; hour?: number; inline?: boolean }
  /** New or edited to-do; `scope: 'week'` is a weekly priority dated by the week's first day */
  | { kind: 'task'; day: string; scope: 'day' | 'week'; taskId?: string; dueHour?: number }
  | { kind: 'taskMenu'; taskId: string }
  | { kind: 'event'; occurrence: EventOccurrence }
  | { kind: 'note'; day: string; hour: number; noteId?: string }
  /**
   * New or edited expense (BU-08), dated by `day` when new. `ask`: "What was it for?" about a
   * payment read from a text (BU-11)
   */
  | { kind: 'expense'; day: string; entryId?: string; ask?: boolean };

export type Toast = { message: string; undo?: Undo; id: number };

type UiState = {
  /** null = follow the real today */
  todayDay: string | null;
  weekDay: string | null;
  monthDay: string | null;
  /** Today's inline "Add to-do" form is open */
  addingTask: boolean;
  sheet: SheetState | null;
  toast: Toast | null;
  showDay: (day: string | null) => void;
  showWeek: (day: string | null) => void;
  showMonthDay: (day: string | null) => void;
  setAddingTask: (open: boolean) => void;
  openSheet: (sheet: SheetState) => void;
  closeSheet: () => void;
  showToast: (message: string, undo?: Undo) => void;
  hideToast: () => void;
};

let toastId = 0;

export const useUi = create<UiState>((set) => ({
  todayDay: null,
  weekDay: null,
  monthDay: null,
  addingTask: false,
  sheet: null,
  toast: null,
  showDay: (todayDay) => set({ todayDay }),
  showWeek: (weekDay) => set({ weekDay }),
  showMonthDay: (monthDay) => set({ monthDay }),
  setAddingTask: (addingTask) => set({ addingTask }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  showToast: (message, undo) => set({ toast: { message, undo, id: ++toastId } }),
  hideToast: () => set({ toast: null }),
}));
