import type { Ladder } from './generate';
import type { TreeLines } from './TreeLines';

interface Pulse {
  path: number[];
  cum: Float32Array;
  s: number;
  strength: number;
}

/**
 * Light running up the tree: conducted vasodilation made visible. A
 * release sends a bead of light from the perforator along the skin toward
 * its parent and on to the root, fading as it climbs.
 */
export class Pulses {
  private active: Pulse[] = [];
  /** Display speed (m per real second); the sim carries the true rate. */
  speed = 0.09;
  trail = 0.035;
  maxActive = 90;

  constructor(
    private ladder: Ladder,
    private trees: TreeLines,
    private positions: () => Float32Array,
  ) {}

  /** Starts a pulse from a perforator toward its root. */
  emit(node: number, strength = 1) {
    const L = this.ladder;
    if (node >= L.count) return;
    let start = L.vertex[node];
    if (L.level[node] === 0) {
      const p = L.parent[node];
      if (p < 0) return;
      start = L.vertex[p];
      strength *= 0.5;
    }
    // Branch (to the major) then trunk (to the root).
    const path: number[] = [];
    let v = start;
    let guard = 0;
    if (L.level[node] <= 1) {
      while (v >= 0 && guard++ < 4000) {
        path.push(v);
        const p = L.branchPred[v];
        if (p < 0) break;
        v = p;
      }
    }
    guard = 0;
    while (v >= 0 && guard++ < 4000) {
      if (path[path.length - 1] !== v) path.push(v);
      const p = L.trunkPred[v];
      if (p < 0) break;
      v = p;
    }
    if (path.length < 2) return;
    const P = this.positions();
    const cum = new Float32Array(path.length);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1] * 3;
      const b = path[i] * 3;
      cum[i] = cum[i - 1] + Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]);
    }
    if (this.active.length >= this.maxActive) this.active.shift();
    this.active.push({ path, cum, s: 0, strength });
  }

  get busy() {
    return this.active.length > 0;
  }

  update(dt: number) {
    const pulse = this.trees.pulse;
    if (!this.active.length) {
      if (pulse.some((x) => x > 0)) {
        pulse.fill(0);
        this.trees.markPulseDirty();
      }
      return;
    }
    pulse.fill(0);
    const trail = this.trail;
    const keep: Pulse[] = [];
    for (const p of this.active) {
      p.s += this.speed * dt;
      const total = p.cum[p.cum.length - 1];
      const fade = p.strength * Math.max(0, 1 - p.s / (total + trail * 3)) ** 0.6;
      for (let i = 0; i < p.path.length; i++) {
        const d = p.s - p.cum[i];
        if (d < -0.004 || d > trail * 3) continue;
        const w = fade * Math.exp(-((d / trail) ** 2));
        const slots = this.trees.edgeOfVertex.get(p.path[i]);
        if (slots) for (const sl of slots) if (w > pulse[sl]) pulse[sl] = w;
      }
      if (p.s < total + trail * 3) keep.push(p);
    }
    this.active = keep;
    this.trees.markPulseDirty();
  }

  clear() {
    this.active = [];
  }
}
