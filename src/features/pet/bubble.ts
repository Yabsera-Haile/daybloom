// Keeps the pet's speech bubble on screen (MS-12): it opens beside the pet's face, on the side
// asked for unless that side is too tight, never closer to the screen's edge than the page margin,
// and never wider than the room there, so a long line wraps onto two instead of running off.

/** The widest a bubble gets, and the least room worth opening into. */
export const BUBBLE_MAX = 220;
export const BUBBLE_MIN = 120;

/** Where, across the pet's width, a bubble's edge meets its face: left side, right side. */
const FACE_LEFT = 0.18;
const FACE_RIGHT = 0.82;

export function bubbleFit(
  prefer: 'left' | 'right',
  /** The pet's left edge on screen, once known. */
  petX: number | null,
  petWidth: number,
  screen: number,
  margin: number,
): { side: 'left' | 'right'; width: number } {
  if (petX === null) return { side: prefer, width: Math.min(BUBBLE_MAX, 160) };
  const room = {
    left: petX + petWidth * FACE_LEFT - margin,
    right: screen - (petX + petWidth * FACE_RIGHT) - margin,
  };
  const other = prefer === 'left' ? 'right' : 'left';
  const side = room[prefer] >= BUBBLE_MIN || room[prefer] >= room[other] ? prefer : other;
  return { side, width: Math.max(80, Math.min(BUBBLE_MAX, room[side])) };
}
