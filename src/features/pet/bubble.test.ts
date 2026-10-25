import { BUBBLE_MAX, bubbleFit } from './bubble';

describe('the speech bubble stays on screen (MS-12)', () => {
  it('T-MS12.4 opens on the side asked for, as wide as the room there, a page margin from the edge', () => {
    // a Galaxy S24 Ultra: the cat between ‹ Today › and the season picture
    expect(bubbleFit('left', 208, 96, 412, 20)).toEqual({ side: 'left', width: 205.28 });
    // a big tablet: no wider than the most a bubble gets
    expect(bubbleFit('left', 900, 96, 1280, 20).width).toBe(BUBBLE_MAX);
  });

  it('T-MS12.5 too tight on that side: it opens on the other; never off the screen', () => {
    // a 320dp phone, the pet near the left edge (Month's first days): the bubble opens to the right
    const fit = bubbleFit('left', 24, 80, 320, 20);
    expect(fit.side).toBe('right');
    expect(24 + 80 * 0.82 + fit.width).toBeLessThanOrEqual(320 - 20);
    // and near the right edge, to the left
    const near = bubbleFit('right', 220, 80, 320, 20);
    expect(near.side).toBe('left');
    expect(220 + 80 * 0.18 - near.width).toBeGreaterThanOrEqual(20);
  });

  it('before it knows where the pet is, a narrow bubble on the side asked for', () => {
    expect(bubbleFit('right', null, 96, 412, 20)).toEqual({ side: 'right', width: 160 });
  });
});
