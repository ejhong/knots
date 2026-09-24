import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../src/viewer/anchors/locate';
import { BodyModel, REFERENCE_SHAPE, type BodyMeta } from '../src/viewer/body/BodyModel';
import { perforatorDensity } from '../src/viewer/data/perforatorDensity';
import { ALONG, axisField, stepCost } from '../src/viewer/perforators/axial';

const text = readFileSync('public/models/body.json', 'utf8');
const bin = readFileSync('public/models/body.bin');
const body = BodyModel.fromBuffers(JSON.parse(text) as BodyMeta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer, text);
body.setShape(REFERENCE_SHAPE);
const joint = (n: string) => body.joint(n) as Vec3;

describe('perforator anatomy', () => {
  const d = perforatorDensity({ joint, locate: () => null });
  const head = joint('head');

  it('draws small perforators closer where the skin is tethered, and no more major ones there', () => {
    expect(d.small(0, head[1] + 0.14, head[2] - 0.02)).toBeGreaterThan(1.4); // the crown
    expect(d.small(0, head[1] + 0.02, head[2] + 0.1)).toBeGreaterThan(1.4); // the nose
    expect(d.major(0, head[1] + 0.02, head[2] + 0.1)).toBeCloseTo(1, 6);
    expect(d.small(0.1, 1.2, 0.12)).toBe(1); // the chest
  });

  it('makes territories ovals: along a limb, across the trunk, round on the head', () => {
    const at = axisField(joint);
    const [k, a] = [joint('l-knee'), joint('l-ankle')];
    const leg = at((k[0] + a[0]) / 2, (k[1] + a[1]) / 2, (k[2] + a[2]) / 2);
    expect(leg.mode).toBe(1);
    expect(stepCost(leg.mode, leg.axis, ...leg.axis)).toBeCloseTo(ALONG, 5);
    const trunk = at(0, 1.2, 0.1);
    expect(trunk.mode).toBe(2);
    expect(stepCost(trunk.mode, trunk.axis, 1, 0, 0)).toBeCloseTo(ALONG, 5);
    expect(stepCost(trunk.mode, trunk.axis, 0, 1, 0)).toBeCloseTo(1, 5);
    const face = at(0, head[1] + 0.05, head[2] + 0.08);
    expect(stepCost(face.mode, face.axis, 1, 0, 0)).toBe(1);
  });
});
