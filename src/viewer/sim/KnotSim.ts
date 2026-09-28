import type { Ladder } from '../perforators/generate';
import { hash01, noise3 } from '../lib/random';
import { Breath } from './Breath';

/**
 * The first family: knots as perforators held shut.
 *
 * Each perforator (and each root trunk) is a small artery whose wall is a
 * switch, stable open or shut: it shuts when its tone rises past its band,
 * and stays shut until its tone falls well below the level that closed it.
 * Three states at three timescales:
 *   tone   the wall's tone (seconds; sympathetic, breath-gated). It is the
 *          hold: shut, the wall holds its vessel at the tone it has come to,
 *          deeper the longer it has held (as smooth muscle held at a new
 *          length adapts to it).
 *   gel    the sleeve of sliding tissue where the bundle passes the fascia
 *          (minutes): a shut vessel dries it and it jams, pinning the layers
 *          there (stiffness). It does not hold the vessel: once the vessel
 *          opens, a jammed sleeve stays until the layer is moved (shear).
 *   nerve  tenderness: the patch the shut vessel starves. It fades over a
 *          minute or so once blood returns.
 * A press holds a vessel shut while it lasts, and its squeezing eases the
 * wall, most on the out-breath: an eased knot lets go as the press lifts,
 * never under it. A knot is a shut state, not a structure; the perforator
 * stays either way.
 *
 * Trees couple the sites one way. A shut parent starves its children of
 * pressure; when it opens, the held children it was holding (those held
 * less firmly than itself) go with it a moment later, down the tree. A
 * child's release frees neither its parent nor a sibling, and the children
 * freed free nothing more: one generation, as in the simulation's trees.
 */
export interface ReleaseEvent {
  node: number;
  /** Size class: 0 small, 1 medium, 2 major, 3 root. */
  level: number;
  /** The held children its release frees, each letting go after `delay` real seconds (none if a parent freed it). */
  frees: { node: number; delay: number }[];
}

export interface SimParams {
  /** Sim seconds per real second. */
  timeScale: number;
  /** How fast a release frees a vessel's children down its tree (m per real second, as drawn). */
  treeSpeed: number;
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
  /** How far squeezing has eased each wall's muscle (recovers over seconds). */
  readonly weak: Float32Array;
  readonly stuck: Uint8Array;
  /** Output: knot intensity (length N) and star flash (length N). */
  readonly knot: Float32Array;
  readonly flash: Float32Array;
  readonly rootKnot: Float32Array;
  readonly rootFlash: Float32Array;
  /**
   * How firmly each site holds (0 open … 1 a full, long-held knot) — the
   * quantity pressure works against and that passes to a neighbour when a
   * knot lets go. Set by settle; changed by pressKnot, lift and setHold.
   */
  readonly hold: Float32Array;
  /** Pressure still needed before a knot has eased (−1: untouched). */
  readonly resist: Float32Array;
  /** Knots a press has eased: they let go when it lifts. */
  readonly eased: Uint8Array;
  /** A brief brightening where a knot has just arrived (decays). */
  readonly arrive: Float32Array;
  readonly personal: Float32Array;
  /** Age at which each site first holds (Infinity: never, within 90 years). */
  readonly onset: Float32Array;
  readonly breath = new Breath();
  params: SimParams = { timeScale: 6, treeSpeed: 0.06 };
  /** Global modifiers. */
  warmth = 0;
  globalStress = 0;
  age = 34;
  /** Each site's children, as a range of childList (childStart[i] … childStart[i + 1]). */
  private childStart: Int32Array;
  private childList: Int32Array;
  private easedList: number[] = [];
  /** Children a release has freed, letting go when the flow reaches them (real seconds). */
  private pendingFree: { node: number; at: number }[] = [];
  /** Open sites whose tenderness is still fading, while the dynamics are not running. */
  private fading: number[] = [];
  private clock = 0;
  private listeners = new Set<(e: ReleaseEvent) => void>();

  /** The switch's band: a shut vessel opens below OPEN_BELOW (once nothing presses it shut); an open one shuts above SHUT_ABOVE. */
  static readonly OPEN_BELOW = 0.45;
  static readonly SHUT_ABOVE = 0.8;
  /** Pressure under which a vessel is no longer pressed shut. */
  private static PRESSED = 0.25;
  /** A sleeve this dry has jammed: it stays when its vessel opens, until the layer is moved. */
  private static JAM = 0.5;
  /** The tone at which a shut vessel's wall holds it, at a hold h. */
  static heldTone = (h: number) => 0.7 + 0.25 * h;

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
    this.childStart = new Int32Array(M + 1);
    for (let i = 0; i < M; i++) if (this.parent[i] >= 0) this.childStart[this.parent[i] + 1]++;
    for (let i = 0; i < M; i++) this.childStart[i + 1] += this.childStart[i];
    this.childList = new Int32Array(this.childStart[M]);
    const fill = this.childStart.slice(0, M);
    for (let i = 0; i < M; i++) if (this.parent[i] >= 0) this.childList[fill[this.parent[i]]++] = i;

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
    this.weak = new Float32Array(M);
    this.stuck = new Uint8Array(M);
    this.knot = new Float32Array(N);
    this.flash = new Float32Array(N);
    this.rootKnot = new Float32Array(rootCount);
    this.rootFlash = new Float32Array(rootCount);
    this.hold = new Float32Array(M);
    this.resist = new Float32Array(M).fill(-1);
    this.eased = new Uint8Array(M);
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
   * and its hold deepens with the years: a young knot is shallow (a little
   * easing lets it go), an old one's wall has come to its tone and its sleeve
   * has jammed. The pattern is deterministic for a person and only grows.
   */
  settle(age: number) {
    this.age = age;
    const body = KnotSim.heldFraction(age) / KnotSim.MAX_HELD;
    const M = this.M;
    for (let i = 0; i < M; i++) {
      const s = this.susc[i];
      this.drive[i] = 0.1 + 0.3 * body * (0.4 + s);
      this.gel[i] = 0;
      this.weak[i] = 0;
      const years = age - this.onset[i];
      this.setHold(i, years >= 0 ? (0.2 + 0.8 * (1 - Math.exp(-years / 14))) * (0.8 + 0.2 * s) : 0);
      this.press[i] = 0;
      this.shear[i] = 0;
      this.stress[i] = 0;
    }
    this.pendingFree.length = 0;
    this.easedList.length = 0;
    this.fading.length = 0;
    this.arrive.fill(0);
    this.flash.fill(0);
    this.rootFlash.fill(0);
    this.computeOutputs();
  }

  /**
   * Sets how firmly a site holds, with its wall, sleeve and nerve to match.
   * 0 opens it quietly (no star, nothing freed), leaving its sleeve as it was.
   */
  setHold(i: number, h: number) {
    this.hold[i] = h;
    this.resist[i] = -1;
    this.eased[i] = 0;
    if (h > 0) {
      this.tone[i] = KnotSim.heldTone(h);
      this.gel[i] = 0.3 + 0.7 * h;
      this.nerve[i] = this.tone[i] * this.gel[i];
      this.stuck[i] = 1;
    } else {
      this.tone[i] = 0.2 + this.drive[i] * 0.4;
      this.nerve[i] = 0;
      this.stuck[i] = 0;
    }
  }

  /** Pressure a knot takes before its wall has eased, by rung, growing with how firmly it holds. */
  private static RESIST = [0.4, 1.3, 2.8, 4];

  /**
   * Pressure on a knot (1 ≈ one click at its centre). Its wall eases as the
   * pressure adds up — small knots at once, medium ones over a few presses,
   * major, long-held ones only when held — but a pressed vessel stays shut:
   * it lets go when the press lifts (lift). Returns whether it has eased.
   */
  pressKnot(i: number, amount: number): boolean {
    const h = this.hold[i];
    if (h <= 0) return false;
    const full = KnotSim.RESIST[this.level[i]] * (0.6 + 0.6 * h);
    if (this.resist[i] < 0) this.resist[i] = full;
    this.resist[i] = Math.max(0, this.resist[i] - amount);
    const held = KnotSim.heldTone(h);
    this.tone[i] = held - (held - KnotSim.OPEN_BELOW + 0.05) * (1 - this.resist[i] / full);
    if (this.resist[i] > 0) return false;
    if (!this.eased[i]) {
      this.eased[i] = 1;
      this.easedList.push(i);
    }
    return true;
  }

  /** The press lifts: every knot it eased lets go now. Returns how many. */
  lift(): number {
    let n = 0;
    for (const i of this.easedList) {
      if (!this.eased[i] || !this.stuck[i]) continue;
      this.letGo(i);
      n++;
    }
    this.easedList.length = 0;
    return n;
  }

  /** Seconds until the last child a release has freed lets go (0 if none is on its way). */
  freeing(): number {
    let t = 0;
    for (const f of this.pendingFree) t = Math.max(t, f.at - this.clock);
    return t;
  }

  /** Whether a knot's wall has eased below its band (it lets go once nothing presses it shut). */
  canOpen(i: number): boolean {
    return this.tone[i] < KnotSim.OPEN_BELOW;
  }

  /** Stars, arrivals, freed children and fading tenderness when the full dynamics are not running; true while any show. */
  tickEffects(realDt: number): boolean {
    this.clock += realDt;
    let active = this.freeDue();
    if (this.fading.length) {
      const k = Math.exp(-(realDt * this.params.timeScale) / 60);
      const keep: number[] = [];
      for (const i of this.fading) {
        if (this.stuck[i]) continue;
        this.nerve[i] *= k;
        if (this.nerve[i] > 0.01) keep.push(i);
        else this.nerve[i] = 0;
      }
      this.fading = keep;
    }
    const fk = Math.exp(-realDt / 0.55);
    const ak = Math.exp(-realDt / 0.35);
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
    this.clock += realDt;
    // The dynamics fade every site's tenderness themselves.
    this.fading.length = 0;
    this.breath.update(realDt);
    const b = this.breath.sympathetic;
    const open = this.breath.openness;
    const M = this.M;
    const N = this.N;
    const kTone = 1 - Math.exp(-dt / 2.0);
    const kWeak = 1 - Math.exp(-dt / 30);
    const warmth = this.warmth;
    this.freeDue();

    for (let i = 0; i < M; i++) {
      const shut = this.stuck[i] === 1;
      const p = this.parent[i];
      const extra = this.stress[i] + this.globalStress * 0.35;
      // Squeezing eases the wall's muscle — pressure is the address, the
      // exhale the permission — and it recovers over seconds.
      const w0 = this.weak[i];
      const w = w0 + (this.press[i] * (0.2 + open) * (1 - w0) * dt) / 4 - w0 * kWeak;
      this.weak[i] = w < 0 ? 0 : w > 1 ? 1 : w;
      // Shut, the wall holds its vessel at the tone it has come to; open, its
      // tone follows its drive, and a shut parent starves it toward shutting.
      const level = shut
        ? KnotSim.heldTone(this.hold[i]) + 0.3 * extra
        : 0.12 + 0.75 * (this.drive[i] + extra) + (p >= 0 && this.stuck[p] ? 0.2 : 0);
      const target = level + 0.12 * b - this.weak[i] - warmth * 0.45;
      const T = target < 0 ? 0 : target > 1 ? 1 : target;
      const tone = this.tone[i] + (T - this.tone[i]) * kTone;
      this.tone[i] = tone;

      // The sleeve: dries while its vessel is shut, to a jam that deepens with
      // the years; wets again once it opens, unless jammed. Moving the layer
      // (shear) or warmth frees it.
      const g = this.gel[i];
      const dry = shut ? (0.3 + 0.7 * this.hold[i] - g) / 240 : g < KnotSim.JAM ? -g / 60 : 0;
      const free = (g * (this.shear[i] * 3 + warmth * 0.5)) / 26;
      this.gel[i] = Math.min(1, Math.max(0, g + (dry - free) * dt));

      // Tenderness: the starved patch while shut; it fades once blood returns.
      const nT = shut ? KnotSim.heldTone(this.hold[i]) * this.gel[i] : 0;
      this.nerve[i] += (nT - this.nerve[i]) * (1 - Math.exp(-dt / (shut ? 12 : 60)));

      // The switch.
      if (shut && tone < KnotSim.OPEN_BELOW && this.press[i] < KnotSim.PRESSED) this.letGo(i);
      else if (!shut && tone > KnotSim.SHUT_ABOVE) {
        this.hold[i] = 0.15;
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

  /**
   * A shut vessel opens: its knot lets go with a star, and unless its parent
   * freed it, the held children it was holding follow as the flow reaches them.
   */
  private letGo(i: number, byParent = false) {
    const held = byParent ? [] : this.holding(i);
    this.hold[i] = 0;
    this.stuck[i] = 0;
    this.resist[i] = -1;
    this.eased[i] = 0;
    this.tone[i] = Math.min(this.tone[i], 0.2 + this.drive[i] * 0.4);
    this.fading.push(i);
    if (i < this.N) this.flash[i] = 1;
    else this.rootFlash[i - this.N] = 1;
    const frees = held.map((c) => {
      const d = this.parentDistance[c];
      const delay = (Number.isFinite(d) ? d : 0.01) / this.params.treeSpeed + 0.12 * this.personal[c];
      this.pendingFree.push({ node: c, at: this.clock + delay });
      return { node: c, delay };
    });
    const e = { node: i, level: this.level[i], frees };
    for (const cb of this.listeners) cb(e);
  }

  /** The held children a site is holding — those held less firmly than itself: its release frees them. */
  holding(i: number): number[] {
    const out: number[] = [];
    for (let k = this.childStart[i]; k < this.childStart[i + 1]; k++) {
      const c = this.childList[k];
      if (this.stuck[c] && this.hold[c] <= this.hold[i]) out.push(c);
    }
    return out;
  }

  /** Lets go the freed children the flow has reached; true if any did. */
  private freeDue(): boolean {
    if (!this.pendingFree.length) return false;
    let any = false;
    const keep: { node: number; at: number }[] = [];
    for (const f of this.pendingFree) {
      if (f.at > this.clock) keep.push(f);
      else if (this.stuck[f.node]) {
        this.letGo(f.node, true);
        any = true;
      }
    }
    this.pendingFree = keep;
    return any;
  }

  computeOutputs() {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const base = this.shown(i);
      // A knot that has just arrived shows a moment brighter.
      this.knot[i] = this.arrive[i] > 0 && base > 0 ? Math.min(1, base + this.arrive[i] * 0.35) : base;
    }
    for (let r = 0; r < this.R; r++) this.rootKnot[r] = this.shown(N + r);
  }

  /**
   * How brightly a site shows as a knot: a shut vessel by how firmly it holds,
   * its sleeve and its patch's tenderness, dimming a little as its wall eases;
   * an open one not at all.
   */
  private shown(i: number): number {
    if (!this.stuck[i]) return 0;
    const held = KnotSim.heldTone(this.hold[i]);
    const k = 0.42 * held + 0.42 * this.gel[i] + 0.16 * this.nerve[i];
    const v = (k - 0.42) / 0.45;
    const base = v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
    const ease = (held - this.tone[i]) / (held - KnotSim.OPEN_BELOW);
    return base * (1 - 0.45 * (ease <= 0 ? 0 : ease >= 1 ? 1 : ease));
  }

  /** Pressure at a site (called every frame while held). */
  applyPress(nodes: Iterable<[number, number]>, strength = 1) {
    for (const [i, w] of nodes) this.press[i] = Math.max(this.press[i], w * strength);
  }

  /** A roller: it shears the sleeves it passes and presses their vessels shut while it is over them. */
  applyShear(nodes: Iterable<[number, number]>, strength = 1) {
    for (const [i, w] of nodes) {
      this.shear[i] = Math.max(this.shear[i], w * strength);
      this.press[i] = Math.max(this.press[i], w * strength * 0.6);
    }
  }

  /**
   * A slow, relaxing breath reaching these sites: each wall eases below its
   * band, so each lets go on the next step (with its spark).
   */
  soften(nodes: Iterable<number>) {
    for (const i of nodes) this.tone[i] = Math.min(this.tone[i], 0.22);
  }

  /** Hydrodissection: fluid frees the sleeve mechanically; the vessel stays as it was. */
  hydrodissect(nodes: Iterable<[number, number]>) {
    for (const [i, w] of nodes) {
      this.gel[i] *= 1 - w;
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
