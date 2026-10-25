// The things the first-run tour points at (ON-02, src/features/tour): each registers how to find itself on screen, and how to
// bring itself into view if it can be scrolled off. Several screens can register the same thing
// (every tab has a header with ≡); the tour uses the one that is on screen.
import { useEffect, useRef } from 'react';
import type { View } from 'react-native';

export type TargetId =
  'tab-index' | 'tab-week' | 'tab-month' | 'tab-habits' | 'tab-budget' | 'add' | 'menu' | 'search' | 'savings' | 'pet';

export type Rect = { x: number; y: number; width: number; height: number };

type Target = { measure: () => Promise<Rect | null>; reveal?: () => void };

const targets = new Map<TargetId, Set<Target>>();

/** Where a target is on screen, or null when none is showing (another tab, or not drawn). */
export async function findTarget(id: TargetId): Promise<Rect | null> {
  for (const target of targets.get(id) ?? []) {
    const rect = await target.measure();
    if (rect && rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

/** Scrolls a target into view, if it knows how. */
export function revealTarget(id: TargetId): boolean {
  let revealed = false;
  for (const target of targets.get(id) ?? []) {
    if (target.reveal) {
      target.reveal();
      revealed = true;
    }
  }
  return revealed;
}

/** Marks a view as something the tour can point at: put the returned ref on it. */
export function useTourTarget<T extends View>(id: TargetId, reveal?: () => void) {
  const ref = useRef<T>(null);
  const revealRef = useRef(reveal);
  useEffect(() => {
    revealRef.current = reveal;
  });
  useEffect(() => {
    const target: Target = {
      measure: () =>
        new Promise((resolve) => {
          const view = ref.current;
          if (!view) return resolve(null);
          view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
        }),
      reveal: () => revealRef.current?.(),
    };
    if (!reveal) delete target.reveal;
    const set = targets.get(id) ?? new Set<Target>();
    set.add(target);
    targets.set(id, set);
    return () => {
      set.delete(target);
    };
    // the reveal function may change each render; revealRef keeps the latest
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!reveal]);
  return ref;
}
