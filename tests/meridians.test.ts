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

import { SINEWS } from '../src/viewer/data/sinew';
import { TRIGGER_CLUSTERS } from '../src/viewer/data/triggerPoints';

describe('the sinew channels', () => {
  it('has the twelve, each binding somewhere, all on known landmarks', () => {
    // Every stop resolves to a known point (the data module throws otherwise).
    expect(SINEWS.map((s) => s.code)).toEqual(['LU', 'LI', 'ST', 'SP', 'HT', 'SI', 'BL', 'KI', 'PC', 'TE', 'GB', 'LR']);
    for (const s of SINEWS) {
      const knots = s.lines.flat().filter((st) => st.knot);
      expect(knots.length, s.code).toBeGreaterThanOrEqual(3);
      for (const line of s.lines) expect(line.length, s.code).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('the trigger-point map', () => {
  it('names where each muscle refers pain, in four regions', () => {
    expect(TRIGGER_CLUSTERS.length).toBe(45);
    for (const c of TRIGGER_CLUSTERS) {
      expect(c.refers, c.muscle).toBeTruthy();
      expect(c.region).toBeGreaterThanOrEqual(0);
      expect(c.region).toBeLessThanOrEqual(3);
    }
  });
});
