import { arts } from './art';
import { dress, outfits } from './art/outfits';
import type { PoseName } from './art/types';
import { outfitFor } from './season';

const POSES: PoseName[] = ['sit', 'sleep', 'stretch', 'leap'];
const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const;

describe('seasonal outfits', () => {
  it('T-MS13.1 it dresses for the season the app pictures, and not at all with season pictures off', () => {
    const north = { seasons: true, theme: 'auto', hemisphere: 'north' } as const;
    expect(outfitFor(north, '2026-01-15')).toBe('winter');
    expect(outfitFor({ ...north, hemisphere: 'south' }, '2026-01-15')).toBe('summer');
    expect(outfitFor({ ...north, theme: 'spring' }, '2026-01-15')).toBe('spring');
    expect(outfitFor({ ...north, seasons: false }, '2026-01-15')).toBeNull();
  });

  it('T-MS13.2 every pet wears every season in every pose; horns poke through a beanie; scarves where a neck shows', () => {
    for (const [kind, art] of Object.entries(arts)) {
      for (const pose of POSES) {
        expect(dress(art, pose, null)).toEqual({});
        for (const season of SEASONS) {
          const worn = dress(art, pose, season);
          expect(worn.hat).toContain(outfits[season].hat);
          // only a hat that covers the head brings the horns over it, and only a pet with horns has any
          expect(Boolean(worn.over)).toBe(Boolean(outfits[season].covers && kind === 'dragon'));
          expect(Boolean(worn.neck)).toBe(Boolean(outfits[season].neck && art.fits[pose].neck));
        }
      }
    }
  });
});
