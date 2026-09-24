import type { Vec3 } from '../anchors/locate';

/**
 * Binding points inside the body to the skeleton: a point is written as a
 * place on a segment between two joints plus an offset, so it follows the
 * figure as it grows and changes form. Offsets scale with standing height.
 */
export interface Bound {
  a: string;
  b: string;
  t: number;
  o: Vec3;
}

/** Reference joint positions (see public/models/body.json). */
export const REF_JOINTS: Record<string, Vec3> = {
  pelvis: [0, 0.924, 0.003],
  'spine-4': [0, 1.011, -0.029],
  'spine-3': [0, 1.081, -0.02],
  'spine-2': [0, 1.14, -0.03],
  'spine-1': [0, 1.275, -0.051],
  neck: [0, 1.482, 0.011],
  head: [0, 1.578, 0.046],
  'head-2': [0, 1.734, 0.041],
  'l-shoulder': [0.186, 1.378, 0.017],
  'l-elbow': [0.351, 1.189, 0.016],
  'l-hand': [0.484, 1.062, 0.206],
  'l-upper-leg': [0.109, 0.917, -0.008],
  'l-knee': [0.151, 0.506, 0.027],
  'l-ankle': [0.196, 0.071, 0.014],
  'l-foot-1': [0.2, 0.008, 0.139],
};

export const CHAINS: Record<string, string[]> = {
  trunk: ['pelvis', 'spine-4', 'spine-3', 'spine-2', 'spine-1', 'neck', 'head'],
  axis: ['pelvis', 'spine-4', 'spine-3', 'spine-2', 'spine-1', 'neck', 'head', 'head-2'],
  arm: ['l-shoulder', 'l-elbow', 'l-hand'],
  leg: ['l-upper-leg', 'l-knee', 'l-ankle', 'l-foot-1'],
};

/** Binds a reference point to the nearest segment of a chain of joints. */
export function bindPoint(p: Vec3, chain: keyof typeof CHAINS | string = 'axis'): Bound {
  const js = CHAINS[chain];
  let best: Bound | null = null;
  let bestD = Infinity;
  for (let i = 0; i < js.length - 1; i++) {
    const A = REF_JOINTS[js[i]];
    const B = REF_JOINTS[js[i + 1]];
    const ab: Vec3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
    const t = Math.max(0, Math.min(1, ((p[0] - A[0]) * ab[0] + (p[1] - A[1]) * ab[1] + (p[2] - A[2]) * ab[2]) / L2));
    const q: Vec3 = [A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (d < bestD) {
      bestD = d;
      best = { a: js[i], b: js[i + 1], t, o: [p[0] - q[0], p[1] - q[1], p[2] - q[2]] };
    }
  }
  return best!;
}

/** Where a bound point is on the current figure (`scale`: its height over the reference's). */
export function placeBound(s: Bound, joint: (n: string) => Vec3, scale: number, out: Float32Array, i: number) {
  const a = joint(s.a);
  const b = joint(s.b);
  for (let c = 0; c < 3; c++) out[i * 3 + c] = a[c] + (b[c] - a[c]) * s.t + s.o[c] * scale;
}
