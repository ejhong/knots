import type { Ladder } from '../perforators/generate';
import { hash01, noise3 } from '../lib/random';
import { Breath } from './Breath';

/**
 * The first family: knots as stuck perforators.
 *
 * Each perforator (and each root trunk) carries three coupled states at
 * three timescales — a composite memory element:
 *   tone   the arteriole's constriction (seconds; sympathetic, breath-gated)
 *   gel    the hyaluronan collar around the bundle (minutes; gels when the
 *          vessel starves its own tissue acid and cool, melts with warmth,
 *          washout and shear)
 *   nerve  compression of the cutaneous nerve in the collar (tenderness)
 * The loop — constriction → ischemia → gelled collar → tether → constriction
 * — makes each site bistable: open, or stuck. A knot is a stuck state, not a
 * structure; the perforator stays either way.
 *
 * Trees couple the sites: a tight trunk holds its branches, and a dilation
 * conducts upstream toward the root.
 */
export interface ReleaseEvent {
  node: number;
  /** Size class: 0 small, 1 medium, 2 major, 3 root. */
  level: number;
}

export interface SimParams {
  /** Sim seconds per real second. */
  timeScale: number;
  /** Conducted vasodilation speed along the tree (m per sim second). */
  conductionSpeed: number;
}

export class KnotSim {
  readonly N: number;
  readonly R: number;
  readonly M: number;
  readonly parent: Int32Array;
  readonly level: Uint8Array;
  readonly susc: Float32Array;
  readonly tone: Float32Array;
  readonly gel: Float32Array;
  readonly nerve: Float32Array;
  readonly drive: Float32Array;
  /** Extra drive from aggravation (scenarios, the stress brush). */
  readonly stress: Float32Array;
  readonly press: Float32Array;
  readonly shear: Float32Array;
  readonly stuck: Uint8Array;
  /** Output: knot intensity (length N) and star flash (length N). */
  readonly knot: Float32Array;
  readonly flash: Float32Array;
  readonly rootKnot: Float32Array;
  readonly rootFlash: Float32Array;
  /**
   * How firmly each site holds (0 open … 1 a full, long-held knot) — the
   * quantity pressure works against and that passes to a neighbour when a
   * knot lets go. Set by settle; changed by pressKnot and setHold.
   */
  readonly hold: Float32Array;
  /** Pressure still needed before a knot lets go (−1: untouched). */
  readonly resist: Float32Array;
  /** A brief brightening where a knot has just arrived (decays). */
  readonly arrive: Float32Array;
  readonly personal: Float32Array;
  /** Age at which each site first holds (Infinity: never, within 90 years). */
  readonly onset: Float32Array;
  readonly breath = new Breath();
  params: SimParams = { timeScale: 6, conductionSpeed: 0.03 };
  /** Global modifiers. */
  warmth = 0;
  globalStress = 0;
  age = 34;
  /** Time since the last release per node (for queue visuals). */
  releases: ReleaseEvent[] = [];
  private pendingConduction: { node: number; at: number; amount: number }[] = [];
  private time = 0;
  private listeners = new Set<(e: ReleaseEvent) => void>();

  constructor(
    readonly ladder: Ladder,
    rootCount: number,
    /** Reference positions of perforators (for susceptibility fields). */
    positions: Float32Array,
    zoneField: (x: number, y: number, z: number) => number,
    rootSusceptibility: Float32Array,
    /** Tree distance from each node to its parent (m). */
    readonly parentDistance: Float32Array,
  ) {
    const N = ladder.count;
    this.N = N;
    this.R = rootCount;
    this.M = N + rootCount;
    const M = this.M;
    this.parent = new Int32Array(M).fill(-1);
    this.level = new Uint8Array(M);
    for (let i = 0; i < N; i++) {
      this.level[i] = ladder.level[i];
      this.parent[i] = ladder.parent[i] >= 0 ? ladder.parent[i] : N + ladder.root[i];
    }
    for (let r = 0; r < rootCount; r++) this.level[N + r] = 3;

    this.susc = new Float32Array(M);
    this.personal = new Float32Array(M);
    for (let i = 0; i < N; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const zone = zoneField(x, y, z);
      const n = noise3(x * 9, y * 9, z * 9, 11);
      const lvl = this.level[i];
      this.susc[i] = Math.max(0, Math.min(1, zone * 0.95 + (n - 0.5) * 0.22 + lvl * 0.06));
      this.personal[i] = hash01(i * 2654435761);
    }
    for (let r = 0; r < rootCount; r++) {
      this.susc[N + r] = rootSusceptibility[r];
      this.personal[N + r] = hash01(r * 97 + 5);
    }

    // Onset: within each size of vessel, every site ranks by how exposed it
    // is — the stress zones first, then a person's own history (personal),
    // and a held trunk dragging its branches (the tree term, applied
    // top-down) — and the rank is read off the held-fraction curve as an age.
    // Larger vessels begin a few years earlier: they are the gates.
    const risk = new Float32Array(M);
    this.onset = new Float32Array(M);
    for (let lvl = 3; lvl >= 0; lvl--) {
      const ids: number[] = [];
      for (let i = 0; i < M; i++) {
        if (this.level[i] !== lvl) continue;
        const p = this.parent[i];
        risk[i] = 0.62 * this.susc[i] + 0.26 * this.personal[i] + (p >= 0 ? 0.14 * risk[p] : 0);
        ids.push(i);
      }
      ids.sort((a, b) => risk[b] - risk[a]);
      const lead = lvl >= 2 ? 3 : lvl === 1 ? 1.5 : 0;
      ids.forEach((i, r) => (this.onset[i] = KnotSim.onsetAge((r + 0.5) / ids.length) - lead));
    }

    this.tone = new Float32Array(M).fill(0.2);
    this.gel = new Float32Array(M);
    this.nerve = new Float32Array(M);
    this.drive = new Float32Array(M);
    this.stress = new Float32Array(M);
    this.press = new Float32Array(M);
    this.shear = new Float32Array(M);
    this.stuck = new Uint8Array(M);
    this.knot = new Float32Array(N);
    this.flash = new Float32Array(N);
    this.rootKnot = new Float32Array(rootCount);
    this.rootFlash = new Float32Array(rootCount);
    this.hold = new Float32Array(M);
    this.resist = new Float32Array(M).fill(-1);
    this.arrive = new Float32Array(N);
  }

  onRelease(cb: (e: ReleaseEvent) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * The share of perforators held — a knot you could feel — at an age. None in
   * infancy; about a fifth in the mid-thirties; two-thirds by the late fifties;
   * approaching, never reaching, nine in ten. Resting sympathetic tone rises
   * and the skin's small vessels respond less with age, all over the body, so
   * the curve is body-wide; where it bites first is set by the stress zones.
   * A prediction: no census has been taken.
   */
  static heldFraction(age: number): number {
    const lo = KnotSim.sig(-4.5);
    return Math.max(0, (KnotSim.MAX_HELD * (KnotSim.sig((age - 46) / 10) - lo)) / (1 - lo));
  }

  /** The age at which the site of rank r (0 = first to hold) begins to hold. */
  static onsetAge(r: number): number {
    const lo = KnotSim.sig(-4.5);
    const q = (r / KnotSim.MAX_HELD) * (1 - lo) + lo;
    if (q >= 0.999) return Infinity;
    return 46 + 10 * Math.log(q / (1 - q));
  }

  private static MAX_HELD = 0.9;
  private static sig = (x: number) => 1 / (1 + Math.exp(-x));

  /**
   * Sets the figure's history for an age. A site holds from its onset age on,
   * and its hold deepens with the years: a young knot is small and mostly
   * vessel tone (it comes and goes), an old one has grown a gelled collar and
   * persists. The pattern is deterministic for a person and only grows.
   */
  settle(age: number) {
    this.age = age;
    const body = KnotSim.heldFraction(age) / KnotSim.MAX_HELD;
    const M = this.M;
    for (let i = 0; i < M; i++) {
      const s = this.susc[i];
      this.drive[i] = 0.1 + 0.3 * body * (0.4 + s);
      const years = age - this.onset[i];
      this.setHold(i, years >= 0 ? (0.2 + 0.8 * (1 - Math.exp(-years / 14))) * (0.8 + 0.2 * s) : 0);
      this.press[i] = 0;
      this.shear[i] = 0;
      this.stress[i] = 0;
    }
    this.pendingConduction.length = 0;
    this.arrive.fill(0);
    this.flash.fill(0);
    this.rootFlash.fill(0);
    this.computeOutputs();
  }

  /** Sets how firmly a site holds, with its vessel, collar and nerve to match (0 opens it). */
  setHold(i: number, h: number) {
    this.hold[i] = h;
    this.resist[i] = -1;
    if (h > 0) {
      this.tone[i] = 0.7 + 0.25 * h;
      this.gel[i] = 0.3 + 0.7 * h;
      this.nerve[i] = this.tone[i] * this.gel[i];
      this.stuck[i] = 1;
    } else {
      this.tone[i] = 0.2 + this.drive[i] * 0.4;
      this.gel[i] = 0;
      this.nerve[i] = 0;
      this.stuck[i] = 0;
    }
  }

  /** Pressure a knot takes before it lets go, by rung, growing with how firmly it holds. */
  private static RESIST = [0.4, 1.3, 2.8, 4];

  /**
   * Pressure on a knot (1 ≈ one click at its centre). Small knots let go at
   * once; medium ones take a few presses; major, long-held ones need
   * holding. Returns the hold it let go of (0 if it holds on).
   */
  pressKnot(i: number, amount: number): number {
    const h = this.hold[i];
    if (h <= 0) return 0;
    if (this.resist[i] < 0) this.resist[i] = KnotSim.RESIST[this.level[i]] * (0.6 + 0.6 * h);
    this.resist[i] -= amount;
    if (this.resist[i] > 0) return 0;
    this.setHold(i, 0);
    this.release(i);
    return h;
  }

  /** Decays stars and arrivals when the full dynamics are not running; true while any show. */
  tickEffects(realDt: number): boolean {
    const fk = Math.exp(-realDt / 0.55);
    const ak = Math.exp(-realDt / 0.35);
    let active = false;
    for (let i = 0; i < this.N; i++) {
      if (this.flash[i] > 0.001) {
        this.flash[i] *= fk;
        active = true;
      } else this.flash[i] = 0;
      if (this.arrive[i] > 0.001) {
        this.arrive[i] *= ak;
        active = true;
      } else this.arrive[i] = 0;
    }
    for (let r = 0; r < this.R; r++) if (this.rootFlash[r] > 0.001) (this.rootFlash[r] *= fk), (active = true);
    if (active) this.computeOutputs();
    return active;
  }

  /** Current knot count by level [small, medium, major, root]. */
  census(): [number, number, number, number] {
    const c: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < this.M; i++) if (this.stuck[i]) c[this.level[i]]++;
    return c;
  }

  /** Real-time step (dt in real seconds). */
  step(realDt: number) {
    const dt = realDt * this.params.timeScale;
    this.time += dt;
    this.breath.update(realDt);
    const b = this.breath.sympathetic;
    const open = this.breath.openness;
    const M = this.M;
    const N = this.N;
    const kTone = 1 - Math.exp(-dt / 2.0);
    const warmth = this.warmth;

    // Conducted vasodilation arriving upstream.
    if (this.pendingConduction.length) {
      const keep = [];
      for (const c of this.pendingConduction) {
        if (c.at <= this.time) {
          this.tone[c.node] = Math.max(0, this.tone[c.node] - c.amount);
          this.gel[c.node] = Math.max(0, this.gel[c.node] - c.amount * 0.12);
        } else keep.push(c);
      }
      this.pendingConduction = keep;
    }

    for (let i = 0; i < M; i++) {
      const p = this.parent[i];
      const parentHold = p >= 0 ? 0.5 * Math.max(0, this.tone[p] - 0.55) : 0;
      const drive = this.drive[i] + this.stress[i] + this.globalStress * 0.35;
      // Pressure is the address; the exhale is the permission.
      const relief = this.press[i] * (0.15 + 1.1 * open) + warmth * 0.45;
      const target = 0.12 + 0.75 * drive + 0.6 * this.gel[i] + parentHold + 0.12 * b - relief;
      const T = target < 0 ? 0 : target > 1 ? 1 : target;
      const tone0 = this.tone[i];
      const tone = tone0 + (T - tone0) * kTone;
      this.tone[i] = tone;

      // The collar: gels with ischemia, melts with flow, warmth and shear.
      const isch = tone <= 0.5 ? 0 : tone >= 0.8 ? 1 : ((tone - 0.5) / 0.3) ** 2 * (3 - 2 * ((tone - 0.5) / 0.3));
      const g = this.gel[i];
      const form = (isch * (1 - g)) / 70;
      const melt = ((1 - tone) * (0.25 + warmth * 1.5 + this.shear[i] * 3 + this.press[i] * open * 2.2) * g) / 26;
      this.gel[i] = Math.min(1, Math.max(0, g + (form - melt) * dt));

      // The nerve in the collar.
      const nTarget = tone * this.gel[i] * 1.1 + drive * 0.15;
      this.nerve[i] += (nTarget - this.nerve[i]) * (1 - Math.exp(-dt / 12));

      // State change → release event (star) or a new knot.
      const k = 0.42 * tone + 0.42 * this.gel[i] + 0.16 * this.nerve[i];
      if (this.stuck[i] && k < 0.36 && tone < 0.45) {
        this.stuck[i] = 0;
        this.release(i);
      } else if (!this.stuck[i] && k > 0.6 && this.gel[i] > 0.35) {
        this.stuck[i] = 1;
      }

      // Pressure and shear fade unless re-applied.
      this.press[i] *= 0.9;
      this.shear[i] *= 0.85;
    }

    // Flash decay (real time).
    const fk = Math.exp(-realDt / 0.55);
    for (let i = 0; i < N; i++) if (this.flash[i] > 0.001) this.flash[i] *= fk;
    for (let r = 0; r < this.R; r++) if (this.rootFlash[r] > 0.001) this.rootFlash[r] *= fk;
    this.computeOutputs();
  }

  private release(i: number) {
    const lvl = this.level[i];
    if (i < this.N) this.flash[i] = 1;
    else this.rootFlash[i - this.N] = 1;
    // The dilation conducts upstream.
    const p = this.parent[i];
    if (p >= 0) {
      const delay = this.parentDistance[i] / this.params.conductionSpeed;
      const amount = lvl === 0 ? 0.06 : lvl === 1 ? 0.14 : 0.22;
      this.pendingConduction.push({ node: p, at: this.time + delay, amount });
    }
    const e = { node: i, level: lvl };
    for (const cb of this.listeners) cb(e);
  }

  computeOutputs() {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const k = 0.42 * this.tone[i] + 0.42 * this.gel[i] + 0.16 * this.nerve[i];
      const v = (k - 0.42) / 0.45;
      const base = v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
      // A knot that has just arrived shows a moment brighter.
      this.knot[i] = this.arrive[i] > 0 && base > 0 ? Math.min(1, base + this.arrive[i] * 0.35) : base;
    }
    for (let r = 0; r < this.R; r++) {
      const i = N + r;
      const k = 0.42 * this.tone[i] + 0.42 * this.gel[i] + 0.16 * this.nerve[i];
      const v = (k - 0.42) / 0.45;
      this.rootKnot[r] = v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
    }
  }

  /** Pressure at a site (called every frame while held). */
  applyPress(nodes: Iterable<[number, number]>, strength = 1) {
    for (const [i, w] of nodes) this.press[i] = Math.max(this.press[i], w * strength);
  }

  applyShear(nodes: Iterable<[number, number]>, strength = 1) {
    for (const [i, w] of nodes) {
      this.shear[i] = Math.max(this.shear[i], w * strength);
      this.press[i] = Math.max(this.press[i], w * strength * 0.6);
    }
  }

  /**
   * A slow, relaxing breath reaching these sites: the vessel opens and the
   * collar thins, so each lets go on the next step (with its spark).
   */
  soften(nodes: Iterable<number>) {
    for (const i of nodes) {
      this.tone[i] = Math.min(this.tone[i], 0.22);
      this.gel[i] *= 0.1;
      this.nerve[i] *= 0.4;
    }
  }

  /** Hydrodissection: fluid frees the collar mechanically — no breath needed. */
  hydrodissect(nodes: Iterable<[number, number]>) {
    for (const [i, w] of nodes) {
      this.gel[i] *= 1 - w;
      this.nerve[i] *= 1 - w * 0.8;
      this.press[i] = Math.max(this.press[i], w * 0.4);
    }
  }

  /** Adds aggravation drive to nodes (stress brush / scenario). */
  aggravate(nodes: Iterable<[number, number]>, amount: number) {
    for (const [i, w] of nodes) this.stress[i] = Math.min(0.9, Math.max(0, this.stress[i] + w * amount));
  }

  clearStress() {
    this.stress.fill(0);
    this.globalStress = 0;
  }
}
