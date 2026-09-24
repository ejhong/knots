import type { Vec3 } from '../anchors/locate';
import { mulberry32 } from '../lib/random';

/**
 * Where else, inside the body, smooth muscle wraps a tube and could latch —
 * for Johnson's view, which puts latches in vascular smooth muscle anywhere
 * and in the walls of hollow organs. The organs themselves are not drawn:
 * only sites along the great arteries of the trunk and limbs and on the
 * heart's surface (its coronary vessels), and in the walls of the airways,
 * the gullet, stomach, intestines and bladder. The brain is left out.
 *
 * Paths and volumes are written in reference-adult coordinates (metres; +x
 * the figure's left, +y up, +z front) and then bound to the skeleton, so the
 * sites follow the body as it grows and changes form.
 */
export interface InteriorSite {
  /** The point is lerp(joint a, joint b, t) + o, with o scaled by body size. */
  a: string;
  b: string;
  t: number;
  o: Vec3;
  /** 0 artery · 1 heart · 2 airway · 3 gut · 4 bladder. */
  kind: number;
}

/** Reference joint positions (see public/models/body.json), for binding. */
const REF: Record<string, Vec3> = {
  pelvis: [0, 0.924, 0.003],
  'spine-4': [0, 1.011, -0.029],
  'spine-3': [0, 1.081, -0.02],
  'spine-2': [0, 1.14, -0.03],
  'spine-1': [0, 1.275, -0.051],
  neck: [0, 1.482, 0.011],
  head: [0, 1.578, 0.046],
  'l-shoulder': [0.186, 1.378, 0.017],
  'l-elbow': [0.351, 1.189, 0.016],
  'l-hand': [0.484, 1.062, 0.206],
  'l-upper-leg': [0.109, 0.917, -0.008],
  'l-knee': [0.151, 0.506, 0.027],
  'l-ankle': [0.196, 0.071, 0.014],
  'l-foot-1': [0.2, 0.008, 0.139],
};
const CHAINS: Record<string, string[]> = {
  trunk: ['pelvis', 'spine-4', 'spine-3', 'spine-2', 'spine-1', 'neck', 'head'],
  arm: ['l-shoulder', 'l-elbow', 'l-hand'],
  leg: ['l-upper-leg', 'l-knee', 'l-ankle', 'l-foot-1'],
};

/** Binds a reference point to the nearest segment of a chain of joints. */
function bind(p: Vec3, chain: string, kind: number): InteriorSite {
  const js = CHAINS[chain];
  let best: InteriorSite | null = null;
  let bestD = Infinity;
  for (let i = 0; i < js.length - 1; i++) {
    const A = REF[js[i]];
    const B = REF[js[i + 1]];
    const ab: Vec3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
    const t = Math.max(0, Math.min(1, ((p[0] - A[0]) * ab[0] + (p[1] - A[1]) * ab[1] + (p[2] - A[2]) * ab[2]) / L2));
    const q: Vec3 = [A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (d < bestD) {
      bestD = d;
      best = { a: js[i], b: js[i + 1], t, o: [p[0] - q[0], p[1] - q[1], p[2] - q[2]], kind };
    }
  }
  return best!;
}

const mirror = (s: InteriorSite): InteriorSite => ({
  ...s,
  a: s.a.replace(/^l-/, 'r-'),
  b: s.b.replace(/^l-/, 'r-'),
  o: [-s.o[0], s.o[1], s.o[2]],
});

/** Sites along a polyline, `per` per centimetre, jittered within `r` metres of it. */
function along(path: Vec3[], per: number, r: number, rng: () => number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [A, B] = [path[i], path[i + 1]];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    const n = Math.max(1, Math.round(len * 100 * per));
    for (let k = 0; k < n; k++) {
      const f = (k + rng()) / n;
      out.push([
        A[0] + (B[0] - A[0]) * f + (rng() - 0.5) * 2 * r,
        A[1] + (B[1] - A[1]) * f + (rng() - 0.5) * 2 * r,
        A[2] + (B[2] - A[2]) * f + (rng() - 0.5) * 2 * r,
      ]);
    }
  }
  return out;
}

/** Sites in an ellipsoid: its surface (a wall) or its volume. */
function blob(c: Vec3, r: Vec3, n: number, rng: () => number, surface: boolean): Vec3[] {
  const out: Vec3[] = [];
  while (out.length < n) {
    const v: Vec3 = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
    const l = Math.hypot(...v);
    if (l > 1 || l < 1e-3) continue;
    const s = surface ? 1 / l : 1;
    out.push([c[0] + v[0] * s * r[0], c[1] + v[1] * s * r[1], c[2] + v[2] * s * r[2]]);
  }
  return out;
}

export function interiorSites(seed = 31): InteriorSite[] {
  const rng = mulberry32(seed);
  const sites: InteriorSite[] = [];
  const trunk = (pts: Vec3[], kind: number) => pts.forEach((p) => sites.push(bind(p, 'trunk', kind)));
  const limb = (pts: Vec3[], chain: 'arm' | 'leg', kind: number) =>
    pts.forEach((p) => {
      const s = bind(p, chain, kind);
      sites.push(s, mirror(s));
    });
  const both = (pts: Vec3[], kind: number) =>
    pts.forEach((p) => {
      sites.push(bind(p, 'trunk', kind), bind([-p[0], p[1], p[2]], 'trunk', kind));
    });

  // The aorta: up from the heart, over the arch, down in front of the spine to its fork at L4.
  trunk(along([[0.01, 1.29, 0.04], [0.0, 1.37, 0.025], [0.018, 1.365, -0.01], [0.015, 1.3, -0.012], [0.01, 1.16, -0.005], [0.0, 1.06, 0.01]], 1.6, 0.004, rng), 0);
  // The carotids, up the neck (they end, for us, below the skull).
  both(along([[0.012, 1.37, 0.025], [0.022, 1.45, 0.03], [0.03, 1.52, 0.035]], 1.4, 0.003, rng), 0);
  // The renal arteries.
  both(along([[0.008, 1.16, -0.004], [0.055, 1.16, -0.025]], 1.4, 0.003, rng), 0);
  // The iliac arteries to the groin.
  both(along([[0.0, 1.06, 0.01], [0.045, 1.0, 0.025], [0.085, 0.93, 0.045], [0.093, 0.905, 0.06]], 1.4, 0.003, rng), 0);
  // Subclavian and axillary arteries to the armpit.
  both(along([[0.012, 1.37, 0.02], [0.05, 1.405, 0.02], [0.1, 1.405, 0.018], [0.16, 1.35, 0.0]], 1.4, 0.003, rng), 0);
  // The arm: brachial down the inner upper arm; radial and ulnar in the forearm.
  limb(along([[0.17, 1.33, 0.0], [0.26, 1.26, 0.0], [0.345, 1.185, 0.03]], 1.4, 0.003, rng), 'arm', 0);
  limb(along([[0.345, 1.185, 0.03], [0.41, 1.12, 0.12], [0.47, 1.06, 0.215]], 1.2, 0.003, rng), 'arm', 0);
  limb(along([[0.345, 1.185, 0.03], [0.425, 1.115, 0.1], [0.5, 1.04, 0.19]], 1.2, 0.003, rng), 'arm', 0);
  // The leg: femoral down the front and inside of the thigh, popliteal behind the knee, tibial arteries below.
  limb(along([[0.093, 0.905, 0.06], [0.1, 0.78, 0.04], [0.12, 0.62, 0.0], [0.145, 0.52, -0.025]], 1.2, 0.003, rng), 'leg', 0);
  limb(along([[0.145, 0.52, -0.025], [0.165, 0.3, -0.025], [0.18, 0.09, -0.012]], 1.1, 0.003, rng), 'leg', 0);
  limb(along([[0.155, 0.46, 0.02], [0.18, 0.25, 0.03], [0.195, 0.09, 0.035], [0.2, 0.05, 0.1]], 1.1, 0.003, rng), 'leg', 0);

  // The heart's surface, where the coronary vessels run.
  trunk(blob([0.022, 1.29, 0.045], [0.05, 0.048, 0.038], 180, rng, true), 1);
  // The airways: windpipe, bronchi, and the small airways through both lungs.
  trunk(along([[0.0, 1.47, 0.035], [0.0, 1.37, 0.028]], 1.5, 0.004, rng), 2);
  both(along([[0.0, 1.37, 0.028], [0.05, 1.33, 0.012]], 1.5, 0.004, rng), 2);
  both(blob([0.075, 1.32, 0.0], [0.05, 0.075, 0.055], 320, rng, false), 2);
  // The gut: the gullet down behind the windpipe, the stomach, the small intestine, the colon's frame, and the rectum.
  trunk(along([[0.0, 1.47, 0.008], [0.004, 1.37, 0.0], [0.02, 1.22, 0.02], [0.04, 1.2, 0.035]], 1.4, 0.003, rng), 3);
  trunk(blob([0.06, 1.18, 0.05], [0.05, 0.038, 0.034], 260, rng, true), 3);
  trunk(blob([0.0, 1.03, 0.055], [0.075, 0.055, 0.035], 700, rng, false), 3);
  trunk(
    along([[-0.08, 0.98, 0.04], [-0.085, 1.12, 0.03], [0.0, 1.13, 0.08], [0.085, 1.14, 0.03], [0.085, 0.99, 0.03], [0.04, 0.95, 0.03], [0.0, 0.93, -0.03], [0.0, 0.88, -0.04]], 1.6, 0.012, rng),
    3,
  );
  // The bladder.
  trunk(blob([0.0, 0.925, 0.07], [0.035, 0.03, 0.03], 110, rng, true), 4);
  return sites;
}
