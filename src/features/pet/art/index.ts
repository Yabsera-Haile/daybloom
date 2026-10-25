import type { PetKind } from '@/pet/mood';

import { cat } from './cat';
import { dog } from './dog';
import { dragon } from './dragon';
import type { PetArt } from './types';

/** Every companion's drawings (MS-08: a new pet is its art file, added here, plus its words). */
export const arts: Partial<Record<PetKind, PetArt>> = { cat, dog, dragon };
