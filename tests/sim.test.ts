import { describe, expect, it } from 'vitest';
import type { Ladder } from '../src/viewer/perforators/generate';
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

/**
 * A small tree: a major (0) under one root, feeding two mediums (1, 2) and a
 * small (5); medium 1 feeds two smalls (3, 4), medium 2 one (6).
 */
function tree() {
  const ladder = {
    count: 7,
    level: Uint8Array.from([2, 1, 1, 0, 0, 0, 0]),
    parent: Int32Array.from([-1, 0, 0, 1, 1, 0, 2]),
    root: new Int16Array(7),
  } as unknown as Ladder;
  const sim = new KnotSim(ladder, 1, new Float32Array(21), () => 0.5, Float32Array.from([0.5]), new Float32Array(8).fill(0.02));
  sim.settle(46);
  for (let i = 0; i < sim.M; i++) sim.setHold(i, 0);
  return sim;
}

/** The look before the hold moved into the wall: a held knot's brightness at a hold h. */
function shownBefore(h: number) {
  const tone = 0.7 + 0.25 * h;
  const gel = 0.3 + 0.7 * h;
  const k = 0.42 * tone + 0.42 * gel + 0.16 * tone * gel;
  const v = Math.min(1, Math.max(0, (k - 0.42) / 0.45));
  return v * v * (3 - 2 * v);
}

describe('the perforator knots', () => {
  it('look as they did: brightness by how firmly they hold', () => {
    const sim = tree();
    for (const h of [0.2, 0.5, 1]) {
      sim.setHold(1, h);
      sim.computeOutputs();
      expect(sim.knot[1]).toBeCloseTo(shownBefore(h), 5);
    }
  });

  it('hold at rest: the wall holds them, not the sleeve', () => {
    const sim = tree();
    for (const i of [0, 1, 3, 5]) sim.setHold(i, 0.4);
    for (const i of [0, 1, 3, 5]) sim.gel[i] = 0;
    for (let t = 0; t < 60; t += 1 / 30) sim.step(1 / 30);
    for (const i of [0, 1, 3, 5]) expect(sim.stuck[i]).toBe(1);
  });

  it('let go as the press lifts, never under it', () => {
    const sim = tree();
    sim.setHold(1, 0.5);
    let eased = false;
    for (let t = 0; t < 10; t += 1 / 30) {
      sim.applyPress([[1, 1]]);
      sim.step(1 / 30);
      expect(sim.stuck[1]).toBe(1);
      eased ||= sim.canOpen(1);
    }
    expect(eased).toBe(true);
    let t = 0;
    while (sim.stuck[1] && t < 3) {
      sim.step(1 / 30);
      t += 1 / 30;
    }
    expect(sim.stuck[1]).toBe(0);
    expect(t).toBeLessThan(1.5);
  });

  it('pressed on the atlas, ease under the press and let go at the lift', () => {
    const sim = tree();
    sim.setHold(3, 0.5);
    expect(sim.pressKnot(3, 5)).toBe(true);
    expect(sim.stuck[3]).toBe(1);
    expect(sim.lift()).toBe(1);
    expect(sim.stuck[3]).toBe(0);
  });

  it('release runs down a tree: a parent frees the children it holds, a child frees nothing', () => {
    const sim = tree();
    sim.setHold(0, 0.8);
    sim.setHold(1, 0.5);
    sim.setHold(2, 0.9); // held more firmly than its parent: it holds on its own
    sim.setHold(5, 0.3);
    sim.setHold(3, 0.4); // a grandchild: one generation only
    const events: { node: number; frees: number[] }[] = [];
    sim.onRelease((e) => events.push({ node: e.node, frees: e.frees.map((f) => f.node) }));
    sim.pressKnot(0, 20);
    sim.lift();
    expect(events[0]).toEqual({ node: 0, frees: [1, 5] });
    expect(sim.stuck[1]).toBe(1); // not yet: the flow has to reach it
    for (let t = 0; t < 2; t += 1 / 60) sim.tickEffects(1 / 60);
    expect([sim.stuck[1], sim.stuck[5], sim.stuck[2], sim.stuck[3]]).toEqual([0, 0, 1, 1]);

    const up = tree();
    for (const i of [0, 1, 3, 4]) up.setHold(i, 0.6);
    up.setHold(3, 0.3);
    const seen: number[][] = [];
    up.onRelease((e) => seen.push(e.frees.map((f) => f.node)));
    up.pressKnot(3, 20);
    up.lift();
    for (let t = 0; t < 2; t += 1 / 60) up.tickEffects(1 / 60);
    expect(seen).toEqual([[]]);
    expect([up.stuck[1], up.stuck[4], up.stuck[0]]).toEqual([1, 1, 1]);
  });

  it('leave their sleeve jammed when they let go, until the layer is moved', () => {
    const sim = tree();
    sim.setHold(1, 0.8);
    sim.soften([1]);
    sim.step(1 / 30);
    expect(sim.stuck[1]).toBe(0);
    for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
    expect(sim.gel[1]).toBeGreaterThan(0.5);
    for (let t = 0; t < 10; t += 1 / 30) {
      sim.applyShear([[1, 1]]);
      sim.step(1 / 30);
    }
    expect(sim.gel[1]).toBeLessThan(0.5);
  });
});
