import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../src/viewer/anchors/locate';
import { REF_JOINTS, bindPoint, placeBound } from '../src/viewer/data/bind';
import { daoistMap, tibetanMap, yogaMap } from '../src/viewer/data/subtle';
import type { InnerMapData } from '../src/viewer/maps/InnerMap';
import { MAP_GROUPS } from '../src/data/mapIndex';

const ref = (n: string) => REF_JOINTS[n];

/** A stand-in orbit: up the back midline, down the front. */
const back: Vec3[] = [0.88, 1.1, 1.3, 1.5, 1.7].map((y) => [0, y, -0.05]);
const front: Vec3[] = [1.55, 1.3, 1.1, 0.88].map((y) => [0, y, 0.1]);
const MAPS: InnerMapData[] = [yogaMap(), tibetanMap(), daoistMap(back, front)];

describe('the subtle-body maps', () => {
  it('bind points to the skeleton and place them back where they were', () => {
    const out = new Float32Array(3);
    for (const p of [[0, 1.32, -0.045], [0.024, 1.6, 0.1], [0, 0.87, -0.02], [0, 1.74, 0.045]] as Vec3[]) {
      placeBound(bindPoint(p, 'axis'), ref, 1, out, 0);
      for (let c = 0; c < 3; c++) expect(out[c]).toBeCloseTo(p[c], 5);
    }
  });

  it('are well formed: groups, lines, places and their joints', () => {
    for (const m of MAPS) {
      expect(m.inner, m.id).toBe(true);
      const G = m.groups.length;
      for (const p of m.points) {
        expect(p.group, m.id).toBeLessThan(G);
        expect(REF_JOINTS[p.at.a] && REF_JOINTS[p.at.b], `${m.id} ${p.title}`).toBeTruthy();
        expect(p.at.o.every(Number.isFinite)).toBe(true);
      }
      for (const l of m.lines) {
        expect(l.group, m.id).toBeLessThan(G);
        expect(l.path.length, m.id).toBeGreaterThan(1);
        if (l.point !== undefined) expect(m.points[l.point], m.id).toBeDefined();
        for (const b of l.path) expect(REF_JOINTS[b.a] && REF_JOINTS[b.b] && b.o.every(Number.isFinite)).toBeTruthy();
      }
      // Every group has something to show.
      for (let g = 0; g < G; g++) expect(m.lines.some((l) => l.group === g) || m.points.some((p) => p.group === g), `${m.id} group ${g}`).toBe(true);
    }
  });

  it('place the seven cakras in order from the root to the crown', () => {
    const out = new Float32Array(3);
    const ys = yogaMap()
      .points.filter((p) => p.kicker.startsWith('cakra'))
      .map((p) => (placeBound(p.at, ref, 1, out, 0), out[1]));
    expect(ys).toHaveLength(7);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it('give the orbit the three dantian as its only places', () => {
    expect(daoistMap(back, front).points.map((p) => p.shape)).toEqual([2, 2, 2]);
  });

  it('are offered, with an intro, in the map index', () => {
    const ready = MAP_GROUPS.flatMap((g) => g.maps).filter((m) => m.ready);
    for (const m of MAPS) expect(ready.find((r) => r.id === m.id)?.intro, m.id).toBeTruthy();
  });
});
