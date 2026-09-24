import type { LimbSegment, Locator, Vec3 } from '../anchors/locate';
import { NAVEL } from './place';

/**
 * Where perforators crowd, by size.
 *
 * The large ones follow the connective-tissue framework — "arteries follow
 * closely the connective tissue framework of the body" (Taylor & Palmer
 * 1987) — and pierce the deep fascia "usually at fixed skin sites" (Taylor
 * 2003): in rows beside the spine and the breastbone, below the navel,
 * across the buttock, and along the intermuscular septa of the limbs — in the
 * lower leg, septocutaneous perforators "arranged longitudinally in one to
 * two parallel chains" (Tang et al. 2009), and 70% of those on its outer side
 * septocutaneous (Lykoudis et al. 2011).
 *
 * Their size and spacing follow the skin's mobility: "large and sparse where
 * the skin was mobile and smaller and more densely grouped where the
 * integument was tethered or fixed" (Taylor & Minabe 1992). The scalp and
 * the front of the face are fed by small, densely populated perforators, the
 * side of the face by large, sparse ones (Whetzel & Mathes 1992); the palms
 * and soles are tethered skin too. So those places get no more major
 * perforators than anywhere else, and closer small ones.
 *
 * `major` weights the placement of the major perforators (and, blended with
 * `small`, the medium ones); `small` that of the small ones. Both are
 * relative (1 = the body's average). Positions are metres on the reference
 * adult, +x the figure's left, +z the front.
 */
export interface PerforatorDensity {
  major(x: number, y: number, z: number): number;
  small(x: number, y: number, z: number): number;
}

export interface DensityContext {
  joint: (n: string) => Vec3;
  /** Where a locator lands on the reference skin (null if it misses). */
  locate: (l: Locator) => Vec3 | null;
}

/** A row of perforators along a limb septum: `t` along the segment, `deg` around it (see `limbRay`), turning from the first to the second value. */
interface Septum {
  limb: LimbSegment;
  t: [number, number];
  deg: [number, number];
  w: number;
  /** The septum, and the source vessel of its perforators. */
  what: string;
}

const SEPTA: Septum[] = [
  { limb: 'upper-arm', t: [0.45, 0.95], deg: [100, 100], w: 0.9, what: 'lateral intermuscular septum · radial collateral (profunda brachii)' },
  { limb: 'upper-arm', t: [0.25, 0.9], deg: [265, 265], w: 0.7, what: 'medial intermuscular septum · superior ulnar collateral' },
  { limb: 'forearm', t: [0.1, 0.95], deg: [45, 45], w: 0.9, what: 'between brachioradialis and flexor carpi radialis · radial' },
  { limb: 'forearm', t: [0.15, 0.9], deg: [300, 300], w: 0.7, what: 'beside flexor carpi ulnaris · ulnar' },
  { limb: 'forearm', t: [0.25, 0.85], deg: [195, 195], w: 0.6, what: 'between extensor carpi ulnaris and extensor digiti minimi · posterior interosseous' },
  { limb: 'thigh', t: [0.3, 0.7], deg: [55, 55], w: 1.1, what: 'between rectus femoris and vastus lateralis · lateral circumflex femoral (the ALT)' },
  { limb: 'thigh', t: [0.2, 0.85], deg: [305, 285], w: 0.7, what: 'along sartorius · superficial femoral' },
  { limb: 'thigh', t: [0.1, 0.85], deg: [200, 140], w: 0.8, what: 'ischium to lateral femoral condyle · profunda femoris' },
  { limb: 'leg', t: [0.1, 0.9], deg: [70, 70], w: 0.8, what: 'anterior crural septum · anterior tibial, superficial peroneal' },
  { limb: 'leg', t: [0.15, 0.9], deg: [125, 125], w: 0.9, what: 'posterior crural septum · peroneal' },
  { limb: 'leg', t: [0.2, 0.9], deg: [250, 250], w: 0.9, what: 'behind the medial border of the tibia · posterior tibial' },
  { limb: 'leg', t: [0.05, 0.45], deg: [180, 180], w: 0.5, what: 'calf midline · sural' },
];

/** A row on the trunk, as rays cast out through the skin from inside the body (written for the left side). */
interface TrunkRow {
  from: [Vec3, Vec3];
  to: [Vec3, Vec3];
  w: number;
  what: string;
}

/** The trunk's rows, each from [ray origin, direction] to [origin, direction], cast out through the skin. */
function trunkRows(J: (n: string) => Vec3): TrunkRow[] {
  const add = (a: Vec3, o: Vec3): Vec3 => [a[0] + o[0], a[1] + o[1], a[2] + o[2]];
  const pelvis = J('pelvis');
  const hip = J('l-upper-leg');
  const s2 = J('spine-2');
  const s1 = J('spine-1');
  return [
    // Superior gluteal perforators: beside the medial two-thirds of the line from the posterior superior iliac spine to the greater trochanter (Ahmadzadeh et al. 2007).
    { from: [add(pelvis, [0.045, 0.034, -0.02]), [0.1, 0, -1]], to: [add(hip, [0.02, -0.005, -0.02]), [0.7, 0, -1]], w: 0.9, what: 'superior gluteal' },
    // Inferior gluteal perforators: along a line in the middle third of the buttock, above the gluteal crease (ibid.).
    { from: [add(hip, [-0.05, -0.075, -0.02]), [0, -0.1, -1]], to: [add(hip, [0.015, -0.065, -0.02]), [0.3, -0.1, -1]], w: 0.9, what: 'inferior gluteal' },
    // The costal perforators of the posterior intercostal arteries, within 2 cm of the midscapular line, lower thorax (Prasad et al. 2012).
    { from: [add(s2, [0.095, -0.02, 0]), [0.15, 0, -1]], to: [add(s1, [0.095, -0.015, 0]), [0.15, 0, -1]], w: 0.7, what: 'posterior intercostal, costal segment' },
    // Lateral cutaneous branches of the intercostal vessels, at the mid-axillary line.
    { from: [add(s2, [0.05, -0.02, 0.03]), [1, 0, 0]], to: [add(s1, [0.05, 0.005, 0.03]), [1, 0, 0]], w: 0.7, what: 'lateral intercostal' },
  ];
}

interface Line {
  pts: Vec3[];
  w: number;
  /** Bounding box, grown by the reach. */
  lo: Vec3;
  hi: Vec3;
}

/** Width (σ, m) of a row of perforators across its line. */
const ROW_SIGMA = 0.018;

export function perforatorDensity({ joint: J, locate }: DensityContext): PerforatorDensity {
  const lines: Line[] = [];
  const addLine = (pts: Vec3[], w: number) => {
    if (pts.length < 2) return;
    const reach = ROW_SIGMA * 3;
    const lo: Vec3 = [Infinity, Infinity, Infinity];
    const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const p of pts)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[k] - reach);
        hi[k] = Math.max(hi[k], p[k] + reach);
      }
    lines.push({ pts, w, lo, hi });
  };
  const STEPS = 16;
  for (const side of ['l', 'r'] as const) {
    for (const s of SEPTA) {
      const pts: Vec3[] = [];
      for (let k = 0; k <= STEPS; k++) {
        const f = k / STEPS;
        const p = locate({ limb: s.limb, side, t: s.t[0] + (s.t[1] - s.t[0]) * f, deg: s.deg[0] + (s.deg[1] - s.deg[0]) * f });
        if (p) pts.push(p);
      }
      addLine(pts, s.w);
    }
    for (const r of trunkRows(J)) {
      const pts: Vec3[] = [];
      const m = side === 'l' ? 1 : -1;
      for (let k = 0; k <= STEPS; k++) {
        const f = k / STEPS;
        const o = r.from[0].map((v, i) => (v + (r.to[0][i] - v) * f) * (i === 0 ? m : 1)) as Vec3;
        const d = r.from[1].map((v, i) => (v + (r.to[1][i] - v) * f) * (i === 0 ? m : 1)) as Vec3;
        const p = locate({ ray: { j: 'pelvis', o: [o[0] - J('pelvis')[0], o[1] - J('pelvis')[1], o[2] - J('pelvis')[2]] }, dir: d });
        if (p) pts.push(p);
      }
      addLine(pts, r.w);
    }
  }

  const gauss = (d2: number, r: number) => Math.exp(-d2 / (2 * r * r));
  const segDist2 = (p: Vec3, a: Vec3, b: Vec3) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L));
    return (a[0] + ab[0] * t - p[0]) ** 2 + (a[1] + ab[1] * t - p[1]) ** 2 + (a[2] + ab[2] * t - p[2]) ** 2;
  };
  const lineDist2 = (p: Vec3, l: Line) => {
    let best = Infinity;
    for (let i = 0; i < l.pts.length - 1; i++) best = Math.min(best, segDist2(p, l.pts[i], l.pts[i + 1]));
    return best;
  };

  const pelvis = J('pelvis');
  const neck = J('neck');
  const head = J('head');
  const s1 = J('spine-1');

  const major = (x: number, y: number, z: number): number => {
    const p: Vec3 = [x, y, z];
    let d = 1;
    const ax = Math.abs(x);
    const onTorso = y > pelvis[1] - 0.12 && y < neck[1] && ax < 0.2;
    // The back: the medial row within 5 cm of the spinous processes (dorsal intercostal, Minabe & Harii 2007)
    // and the lateral row about 7–9 cm out (lumbar, Sommeling et al. 2017).
    if (onTorso && z < s1[2]) d += 1.1 * gauss((ax - 0.03) ** 2, 0.012) + 1.0 * gauss((ax - 0.08) ** 2, 0.015);
    // Parasternal: the internal mammary perforators, the second usually the largest.
    if (y > s1[1] - 0.05 && y < neck[1] - 0.02 && z > s1[2]) d += 1.1 * gauss((ax - 0.03) ** 2, 0.012);
    // Deep inferior epigastric perforators, through the rectus sheath on each side, within 8 cm below the navel (Heitmann et al. 2000).
    if (z > 0) d += 1.6 * gauss((ax - 0.035) ** 2 / (0.035 / 0.05) ** 2 + (y - (NAVEL - 0.03)) ** 2, 0.05);
    // Rows along the limb septa and across the buttock, back and flank.
    for (const l of lines) {
      if (x < l.lo[0] || x > l.hi[0] || y < l.lo[1] || y > l.hi[1] || z < l.lo[2] || z > l.hi[2]) continue;
      d += l.w * gauss(lineDist2(p, l), ROW_SIGMA);
    }
    return d;
  };

  // Tethered skin: small perforators closer together.
  const faceFront = head[2] + 0.045;
  const hands = (['l', 'r'] as const).map((s) => {
    const j = (n: string) => J(`${s}-${n}`);
    const [h, f2, f5, f3, f3tip] = [j('hand'), j('finger-2-1'), j('finger-5-1'), j('finger-3-1'), j('finger-3-4')];
    const radial = norm(sub(f2, f5));
    const axis = norm(sub(f3, h));
    const palm = scale(norm(cross(axis, radial)), s === 'l' ? 1 : -1);
    return { h, tip: f3tip, palm, centre: mid(h, f3) };
  });
  const feet = (['l', 'r'] as const).map((s) => [J(`${s}-ankle`), J(`${s}-foot-1`), J(`${s}-foot-2`)] as const);

  const small = (x: number, y: number, z: number): number => {
    const p: Vec3 = [x, y, z];
    // Head: the scalp, and the front of the face (not its sides).
    if (y > head[1] - 0.04 && Math.hypot(x, z - head[2]) < 0.14) {
      const face = z > faceFront && y < head[1] + 0.13;
      if (!face) return 1.5;
      return Math.abs(x) < 0.045 ? 1.6 : 1;
    }
    // Palms and the palmar side of the fingers.
    for (const h of hands) {
      if (segDist2(p, h.h, h.tip) > 0.05 ** 2) continue;
      return dot(sub(p, h.centre), h.palm) > 0 ? 1.6 : 1;
    }
    // Soles.
    for (const [ankle, f1, f2] of feet) {
      if (y < 0.015 && Math.min(segDist2(p, ankle, f1), segDist2(p, f1, f2)) < 0.07 ** 2) return 1.6;
    }
    return 1;
  };

  return { major, small };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(...a) || 1));
