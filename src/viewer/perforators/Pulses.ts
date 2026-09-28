import type { Ladder } from './generate';
import type { TreeLines } from './TreeLines';

interface Pulse {
  path: number[];
  cum: Float32Array;
  s: number;
  strength: number;
  /** m per real second: set so the bead arrives when its child lets go. */
  speed: number;
}

/**
 * Light running down a tree: the flow returning as a vessel opens. A
 * release sends a bead of light from the vessel along its drawn branches
 * to each held child it frees, arriving as that one lets go, fading as it
 * goes. (A child's release sends nothing back up: release runs down a
 * tree, not up. Twigs to the small perforators are not drawn, so a small
 * child only lights where it is.)
 */
export class Pulses {
  private active: Pulse[] = [];
  trail = 0.035;
  maxActive = 90;

  constructor(
    private ladder: Ladder,
    private trees: TreeLines,
    private positions: () => Float32Array,
  ) {}

  /** Starts a bead from a vessel (a perforator, or a root at count + r) down its tree to one of its children, arriving in `duration` s. */
  emitDown(from: number, to: number, strength: number, duration: number) {
    const L = this.ladder;
    if (to >= L.count) return;
    // The drawn paths: a root's trunk to a major, a major's branch to a medium.
    const lvl = L.level[to];
    const pred = lvl === 2 ? L.trunkPred : lvl === 1 ? L.branchPred : null;
    if (!pred || (from >= L.count) !== (lvl === 2)) return;
    const end = from >= L.count ? -1 : L.vertex[from];
    // Up from the child to the vessel that feeds it, then reversed.
    const path: number[] = [];
    let v = L.vertex[to];
    let guard = 0;
    while (v >= 0 && guard++ < 4000) {
      path.push(v);
      if (v === end) break;
      v = pred[v];
    }
    if (path.length < 2 || (end >= 0 && path[path.length - 1] !== end)) return;
    path.reverse();
    const P = this.positions();
    const cum = new Float32Array(path.length);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1] * 3;
      const b = path[i] * 3;
      cum[i] = cum[i - 1] + Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]);
    }
    if (this.active.length >= this.maxActive) this.active.shift();
    this.active.push({ path, cum, s: 0, strength, speed: cum[cum.length - 1] / Math.max(0.05, duration) });
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
      p.s += p.speed * dt;
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
