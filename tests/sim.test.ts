import { describe, expect, it } from 'vitest';
import { KnotSim } from '../src/viewer/sim/KnotSim';

describe('knots across a life', () => {
  it('none in infancy, rising monotonically toward nine in ten', () => {
    expect(KnotSim.heldFraction(1)).toBe(0);
    let prev = -1;
    for (let a = 1; a <= 90; a++) {
      const f = KnotSim.heldFraction(a);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(KnotSim.heldFraction(35)).toBeGreaterThan(0.15);
    expect(KnotSim.heldFraction(35)).toBeLessThan(0.3);
    expect(KnotSim.heldFraction(57)).toBeGreaterThan(0.6);
    expect(KnotSim.heldFraction(90)).toBeGreaterThan(0.85);
    expect(KnotSim.heldFraction(90)).toBeLessThan(0.9);
  });

  it('onset age inverts the held fraction', () => {
    for (const age of [10, 25, 40, 57, 75]) {
      expect(KnotSim.onsetAge(KnotSim.heldFraction(age))).toBeCloseTo(age, 6);
    }
    expect(KnotSim.onsetAge(0.95)).toBe(Infinity);
  });
});
