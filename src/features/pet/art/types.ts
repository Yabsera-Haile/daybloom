import type { Expression } from '@/pet/mood';

/**
 * A pet drawn as layers in one box (MS-08: a new pet is drawings plus a message file, no code).
 * Every part is SVG markup in the same `box`, so parts stack exactly; the animation moves each
 * part around its `pivot` (in the box's units): a tail sways, ears twitch or droop, the body
 * breathes, the head tilts with its face, wings flap. `defs` (gradients) are shared by all parts.
 */
export interface PetArt {
  /** viewBox width and height. */
  box: [number, number];
  /** Gradients and the like, available to every part. */
  defs: string;
  /** A soft shadow on the ground under every pose: an oval's centre and radii, [cx, cy, rx, ry]. */
  shadow: [number, number, number, number];
  /**
   * How far the ears turn (degrees, the right ear's way) when sad and when cross: a cat's droop
   * outwards, a puppy's floppy ears hang closer.
   */
  earMood: { sad: number; cross: number };
  /** Happy tail: a slow sway, or a quick wag (puppies). */
  tail: 'sway' | 'wag';
  /** Sitting up, facing you: its face shows how it feels, a yawn, or a beam (eyes squeezed shut with joy, for a moment). */
  sit: Pose & { faces: Record<FaceName, Face> };
  /** Curled up asleep. */
  sleep: Pose & { face: string };
  /** A long stretch on waking: front down, back up. */
  stretch: Pose & { face: string };
  /** Mid-leap, for jumping off somewhere else and landing again. */
  leap: Pose & { face: string };
  /** Where seasonal outfits sit in each pose (MS-13; drawn in art/outfits.ts). */
  fits: Record<PoseName, Fit>;
}

/** A spot in the box to dress: x, y, size (1 for a head about 74 wide) and turn (degrees). */
export type Place = [x: number, y: number, size: number, turn: number];

export interface Fit {
  /** The top of the head, where a hat sits. */
  hat: Place;
  /** Just under the chin, for a scarf; none where the neck can't be seen. */
  neck?: Place;
  /** The scarf goes behind the head (curled up asleep, side views) rather than over the collar. */
  neckBehind?: boolean;
}

export type FaceName = Expression | 'yawn' | 'beam';
export type PoseName = 'sit' | 'sleep' | 'stretch' | 'leap';

export interface Part {
  svg: string;
  pivot: [number, number];
}

export interface Pose {
  /** Behind the body, swaying from its pivot. */
  tail?: Part;
  /** Wings flap from their pivots (birds, dragons, fairies). */
  wings?: [Part, Part];
  /** Breathes: stretches a little upwards from its pivot. */
  body: Part;
  /** Turn with the head, behind it. */
  ears?: [Part, Part];
  /** Tilts and nods from its pivot; the face and ears move with it. */
  head: Part;
  /** In front of everything: paws, a collar, a tail wrapped round the front. */
  front?: string;
  /** Drawn again over a hat that covers the top of the head, so they poke through it (a dragon's horns). */
  horns?: string;
}

export interface Face {
  /** Blinks by squashing towards `eyesAt`. */
  eyes: string;
  eyesAt: [number, number];
  /** Mouth, brows, blush, a tear, a cross mark: whatever else the face shows. */
  rest: string;
}
