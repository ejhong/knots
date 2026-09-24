import { describe, expect, it } from 'vitest';
import { MERIDIANS, MERIDIAN_COUNT, pointName } from '../src/viewer/data/meridians';

describe('the channels of Chinese medicine', () => {
  it('has the 361 standard points, each named once', () => {
    expect(MERIDIANS).toHaveLength(14);
    expect(MERIDIAN_COUNT).toBe(361);
    const codes = MERIDIANS.flatMap((m) => m.points.map((p) => `${m.code}${p.n}`));
    expect(new Set(codes).size).toBe(361);
    for (const c of codes) expect(pointName(c), c).toBeTruthy();
  });

  it('numbers each channel’s points 1…n, and draws lines only through its own points', () => {
    for (const m of MERIDIANS) {
      expect(m.points.map((p) => p.n)).toEqual(m.points.map((_, i) => i + 1));
      const ns = new Set(m.points.map((p) => p.n));
      for (const line of m.lines ?? []) for (const n of line) expect(ns.has(n), `${m.code}${n}`).toBe(true);
    }
  });
});
