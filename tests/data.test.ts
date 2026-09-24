import { describe, expect, it } from 'vitest';
import { REFERENCES, refById } from '../src/data/references';
import { HYPOTHESES } from '../src/data/hypotheses';
import { TIMELINE } from '../src/data/timeline';
import { MAP_GROUPS } from '../src/data/mapIndex';
import { ROOTS } from '../src/viewer/data/roots';
import { KNOT_ZONES } from '../src/viewer/data/zones';

describe('library', () => {
  it('has unique reference ids', () => {
    const ids = REFERENCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('resolves every citation from hypotheses and the timeline', () => {
    const missing: string[] = [];
    for (const h of HYPOTHESES) for (const r of h.refs) if (!refById(r)) missing.push(`${h.id} → ${r}`);
    for (const m of TIMELINE) if (m.ref && !refById(m.ref)) missing.push(`timeline ${m.year} → ${m.ref}`);
    expect(missing).toEqual([]);
  });
  it('gives every reference a note and a tag', () => {
    for (const r of REFERENCES) {
      expect(r.note.length, r.id).toBeGreaterThan(10);
      expect(r.tags.length, r.id).toBeGreaterThan(0);
    }
  });
});

describe('registries', () => {
  it('has unique hypothesis, map, root and zone ids', () => {
    const uniq = (xs: string[]) => new Set(xs).size === xs.length;
    expect(uniq(HYPOTHESES.map((h) => h.id))).toBe(true);
    expect(uniq(MAP_GROUPS.flatMap((g) => g.maps.map((m) => m.id)))).toBe(true);
    expect(uniq(ROOTS.map((r) => r.id))).toBe(true);
    expect(uniq(KNOT_ZONES.map((z) => z.id))).toBe(true);
  });
});
