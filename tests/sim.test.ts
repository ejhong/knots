import { describe, expect, it } from 'vitest';
import { KnotSim } from '../src/viewer/sim/KnotSim';

describe('knot burden across a life', () => {
  it('is nearly zero in infancy and rises monotonically', () => {
    expect(KnotSim.burden(1)).toBeLessThan(0.01);
    let prev = -1;
    for (let a = 1; a <= 90; a++) {
      const b = KnotSim.burden(a);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
    expect(KnotSim.burden(90)).toBeGreaterThan(0.9);
  });
});
