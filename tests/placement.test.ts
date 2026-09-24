import { describe, expect, it } from 'vitest';
import { DEFAULT_LADDER } from '../src/viewer/perforators/generate';
import { decodePlacement, encodePlacement, placementKey } from '../src/viewer/perforators/placementFile';

describe('the precomputed placement file', () => {
  const placement = {
    tri: Uint32Array.from([5, 9, 123456, 70000]),
    uv: Float32Array.from([0.1, 0.2, 0.5, 0.25, 0, 1, 0.333, 0.666]),
    nMaj: 1,
    nMed: 1,
  };
  const key = placementKey(DEFAULT_LADDER, 42);

  it('round-trips, with barycentrics to within 1/65535', () => {
    const back = decodePlacement(encodePlacement(placement, key), key)!;
    expect(back).not.toBeNull();
    expect(Array.from(back.tri)).toEqual(Array.from(placement.tri));
    expect(back.nMaj).toBe(1);
    expect(back.nMed).toBe(1);
    back.uv.forEach((v, i) => expect(Math.abs(v - placement.uv[i])).toBeLessThan(1 / 65535));
  });

  it('refuses a file made from other inputs', () => {
    const buf = encodePlacement(placement, key);
    expect(decodePlacement(buf, placementKey({ ...DEFAULT_LADDER, seed: 8 }, 42))).toBeNull();
    expect(decodePlacement(buf, placementKey(DEFAULT_LADDER, 43))).toBeNull();
    expect(decodePlacement(new ArrayBuffer(12), key)).toBeNull();
  });
});
