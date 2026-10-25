import type { Expression } from '@/pet/mood';

/**
 * A pet drawn as layers in one box (MS-08: a new pet is drawings plus a message file, no code).
 * Every part is SVG markup in the same `box`, so parts stack exactly; the animation moves each
 * part around its `pivot` (in the box's units): a tail sways, ears twitch or droop, the body
 * breathes, the head tilts with its face, wings flap.
 */
export interface PetArt {
  /** viewBox width and height. */
  box: [number, number];
  /** Curled up asleep on a card. */
  asleep: Pose & { face: string };
  /** Awake and sitting, with a face for each mood. */
  awake: Pose & { faces: Record<Expression, Face> };
}

export interface Part {
  svg: string;
  pivot: [number, number];
}

export interface Pose {
  /** Behind the body, swaying from its pivot. */
  tail?: Part;
  /** Breathes: stretches a little upwards from its pivot. */
  body: Part;
  /** Turns with the head, behind it. */
  ears?: [Part, Part];
  /** Wings flap from their pivots (birds, dragons, fairies). */
  wings?: [Part, Part];
  /** Tilts and nods from its pivot; the face and ears move with it. */
  head: Part;
  /** In front of everything: paws, a tail wrapped round the front. */
  front?: string;
}

export interface Face {
  /** Blinks by squashing towards `eyesAt`. */
  eyes: string;
  eyesAt: [number, number];
  /** Mouth, brows, blush, a cross mark: whatever else the mood shows. */
  rest: string;
}
