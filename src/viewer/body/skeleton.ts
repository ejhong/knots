import type { BodyModel } from './BodyModel';

/**
 * A stick skeleton from MakeHuman's joint landmarks, used to segment the
 * skin into regions and to estimate local radius (how thick the body is at a
 * point). Regions give each place its fascial depth; radius keeps lifted
 * layers from colliding between fingers and in the armpit.
 */
export type Region =
  | 'head'
  | 'face'
  | 'neck'
  | 'chest'
  | 'upper-back'
  | 'abdomen'
  | 'lower-back'
  | 'pelvis'
  | 'buttock'
  | 'upper-arm'
  | 'forearm'
  | 'hand'
  | 'thigh'
  | 'leg'
  | 'foot';

export const REGIONS: Region[] = [
  'head',
  'face',
  'neck',
  'chest',
  'upper-back',
  'abdomen',
  'lower-back',
  'pelvis',
  'buttock',
  'upper-arm',
  'forearm',
  'hand',
  'thigh',
  'leg',
  'foot',
];

/**
 * Typical thickness (m) of the subcutaneous layer — skin to deep fascia —
 * for a lean adult. Scalp and face are thin and dense; the trunk, abdomen
 * and buttock carry the thickest superficial fascia and fat.
 */
export const SUBCUTANEOUS_DEPTH: Record<Region, number> = {
  head: 0.0055,
  face: 0.004,
  neck: 0.006,
  chest: 0.011,
  'upper-back': 0.01,
  abdomen: 0.018,
  'lower-back': 0.014,
  pelvis: 0.016,
  buttock: 0.022,
  'upper-arm': 0.009,
  forearm: 0.0055,
  hand: 0.003,
  thigh: 0.013,
  leg: 0.007,
  foot: 0.004,
};

/**
 * Where the superficial fascia (the membranous layer) lies within the
 * subcutaneous tissue, as a fraction of skin-to-deep-fascia depth. On the
 * trunk and limbs it divides superficial from deep fat, nearer the skin; on
 * the scalp the galea lies beneath the dense vascular layer; on the face the
 * SMAS sits about midway. Rough, for a lean adult.
 */
export const SUPERFICIAL_FASCIA_FRACTION: Record<Region, number> = {
  head: 0.7,
  face: 0.5,
  neck: 0.45,
  chest: 0.42,
  'upper-back': 0.42,
  abdomen: 0.4,
  'lower-back': 0.4,
  pelvis: 0.38,
  buttock: 0.35,
  'upper-arm': 0.45,
  forearm: 0.5,
  hand: 0.55,
  thigh: 0.42,
  leg: 0.5,
  foot: 0.55,
};

/** How far each region may be exploded (keeps the head and hands from ballooning). */
export const EXPLODE_WEIGHT: Record<Region, number> = {
  head: 0.55,
  face: 0.45,
  neck: 0.75,
  chest: 1,
  'upper-back': 1,
  abdomen: 1,
  'lower-back': 1,
  pelvis: 1,
  buttock: 1,
  'upper-arm': 0.85,
  forearm: 0.7,
  hand: 0.3,
  thigh: 1,
  leg: 0.85,
  foot: 0.35,
};

interface Segment {
  a: string;
  b: string;
  /** Region for vertices nearest this segment; `split` refines by side. */
  region: Region | 'torso';
}

const SEGMENTS: Segment[] = [
  { a: 'head', b: 'head-2', region: 'head' },
  { a: 'neck', b: 'head', region: 'neck' },
  { a: 'spine-1', b: 'neck', region: 'torso' },
  { a: 'spine-2', b: 'spine-1', region: 'torso' },
  { a: 'spine-3', b: 'spine-2', region: 'torso' },
  { a: 'spine-4', b: 'spine-3', region: 'torso' },
  { a: 'pelvis', b: 'spine-4', region: 'torso' },
  ...(['l', 'r'] as const).flatMap((s) => [
    { a: 'neck', b: `${s}-clavicle`, region: 'torso' as const },
    { a: `${s}-clavicle`, b: `${s}-shoulder`, region: 'torso' as const },
    { a: `${s}-shoulder`, b: `${s}-elbow`, region: 'upper-arm' as const },
    { a: `${s}-elbow`, b: `${s}-hand`, region: 'forearm' as const },
    { a: `${s}-hand`, b: `${s}-hand-3`, region: 'hand' as const },
    ...[1, 2, 3, 4, 5].map((f) => ({ a: `${s}-finger-${f}-1`, b: `${s}-finger-${f}-4`, region: 'hand' as const })),
    { a: 'pelvis', b: `${s}-upper-leg`, region: 'torso' as const },
    { a: `${s}-upper-leg`, b: `${s}-knee`, region: 'thigh' as const },
    { a: `${s}-knee`, b: `${s}-ankle`, region: 'leg' as const },
    { a: `${s}-ankle`, b: `${s}-foot-1`, region: 'foot' as const },
    { a: `${s}-foot-1`, b: `${s}-foot-2`, region: 'foot' as const },
  ]),
];

export interface Segmentation {
  region: Uint8Array; // index into REGIONS, per coarse vertex
  radius: Float32Array; // distance to nearest bone segment, per coarse vertex
}

function segDist(p: number[], a: number[], b: number[]) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-9;
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L));
  return Math.hypot(a[0] + ab[0] * t - p[0], a[1] + ab[1] * t - p[1], a[2] + ab[2] * t - p[2]);
}

/** Segments the coarse mesh at the body's current shape (use the reference). */
export function segmentBody(body: BodyModel): Segmentation {
  const V = body.meta.vertexCount;
  const C = body.coarse;
  const has = (n: string) => body.joints.has(n);
  const segs = SEGMENTS.filter((s) => has(s.a) && has(s.b)).map((s) => ({
    ...s,
    A: body.joint(s.a),
    B: body.joint(s.b),
  }));
  const region = new Uint8Array(V);
  const radius = new Float32Array(V);
  const neck = body.joint('neck');
  const head = body.joint('head');
  const spine1 = body.joint('spine-1');
  const spine3 = body.joint('spine-3');
  const pelvis = body.joint('pelvis');
  for (let v = 0; v < V; v++) {
    const p = [C[v * 3], C[v * 3 + 1], C[v * 3 + 2]];
    let best = Infinity;
    let bestSeg = segs[0];
    for (const s of segs) {
      const d = segDist(p, s.A, s.B);
      if (d < best) {
        best = d;
        bestSeg = s;
      }
    }
    radius[v] = best;
    let r: Region;
    if (bestSeg.region === 'torso') {
      const front = p[2] > spine1[2] + 0.02;
      if (p[1] > (spine1[1] + neck[1]) / 2 - 0.08) r = front ? 'chest' : 'upper-back';
      else if (p[1] > spine3[1] - 0.02) r = front ? 'chest' : 'upper-back';
      else if (p[1] > pelvis[1] + 0.05) r = front ? 'abdomen' : 'lower-back';
      else r = front ? 'pelvis' : 'buttock';
    } else if (bestSeg.region === 'head') {
      // Face: the front of the head below the brow line.
      r = p[2] > head[2] + 0.045 && p[1] < head[1] + 0.13 ? 'face' : 'head';
    } else r = bestSeg.region;
    region[v] = REGIONS.indexOf(r);
  }
  return { region, radius };
}

/** Laplacian smoothing of a per-vertex field over the coarse quads. */
export function smoothField(field: Float32Array, quads: ArrayLike<number>, iterations = 4): Float32Array {
  const V = field.length;
  let cur = Float32Array.from(field);
  const nb: number[][] = Array.from({ length: V }, () => []);
  for (let q = 0; q < quads.length; q += 4)
    for (let k = 0; k < 4; k++) {
      const a = quads[q + k];
      const b = quads[q + ((k + 1) & 3)];
      nb[a].push(b);
      nb[b].push(a);
    }
  for (let it = 0; it < iterations; it++) {
    const next = new Float32Array(V);
    for (let v = 0; v < V; v++) {
      let s = cur[v];
      for (const u of nb[v]) s += cur[u];
      next[v] = s / (nb[v].length + 1);
    }
    cur = next;
  }
  return cur;
}
