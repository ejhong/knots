import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ageWeights, BodyModel, type BodyMeta } from '../src/viewer/body/BodyModel';
import { buildSubdivision } from '../src/viewer/body/subdivide';

describe('age weights (MakeHuman)', () => {
  it('sum to one and hit the anchors', () => {
    for (let a = 1; a <= 90; a += 0.5) {
      const w = ageWeights(a);
      expect(w.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 5);
      for (const x of w) expect(x).toBeGreaterThanOrEqual(0);
    }
    expect(ageWeights(1)[0]).toBeCloseTo(1, 3);
    expect(ageWeights(11)[1]).toBeCloseTo(1, 3);
    expect(ageWeights(25)[2]).toBeCloseTo(1, 3);
    expect(ageWeights(90)[3]).toBeCloseTo(1, 3);
  });
});

describe('Catmull–Clark stencil', () => {
  it('subdivides a cube to V + E + F vertices with rows summing to one', () => {
    // A cube: 8 vertices, 6 quads, 12 edges.
    const quads = [0, 3, 2, 1, 4, 5, 6, 7, 0, 1, 5, 4, 1, 2, 6, 5, 2, 3, 7, 6, 3, 0, 4, 7];
    const s = buildSubdivision(8, quads);
    expect(s.fineVertexCount).toBe(8 + 12 + 6);
    expect(s.fineQuads.length).toBe(6 * 4 * 4);
    for (let r = 0; r < s.fineVertexCount; r++) {
      let sum = 0;
      for (let j = s.rowPtr[r]; j < s.rowPtr[r + 1]; j++) sum += s.weights[j];
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});

describe('body model', () => {
  const meta = JSON.parse(readFileSync('public/models/body.json', 'utf8')) as BodyMeta;
  const bin = readFileSync('public/models/body.bin');
  const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const body = BodyModel.fromBuffers(meta, buf);

  it('stands on the ground at a plausible height across a life', () => {
    for (const [age, lo, hi] of [
      [1, 0.5, 0.95],
      [25, 1.5, 1.9],
      [90, 1.45, 1.9],
    ]) {
      body.setShape({ age, sex: 0.5, stoop: 0 });
      let minY = Infinity;
      for (let i = 1; i < body.positions.length; i += 3) minY = Math.min(minY, body.positions[i]);
      expect(Math.abs(minY)).toBeLessThan(0.03);
      const h = body.height();
      expect(h).toBeGreaterThan(lo);
      expect(h).toBeLessThan(hi);
    }
  });
});
