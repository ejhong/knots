import type { Vec3 } from '../anchors/locate';

/**
 * Which way the linking vessels run. Each perforator's territory (its
 * perforasome) is joined to its neighbours by linking vessels, and "vascular
 * axis follows the axiality of linking vessels" (Saint-Cyr et al. 2009):
 * along the limb in the extremities, across the trunk (perpendicular to the
 * midline). A step along the skin in that direction costs less than a step
 * across it, so trees and territories grow into ovals, as surgeons find them.
 * The head, neck, hands and feet are left round.
 *
 * Returns, for a point, 0 (no preferred direction), 1 with the limb's axis,
 * or 2 (across the trunk: horizontal).
 */
export type AxisMode = 0 | 1 | 2;
export type AxisField = (x: number, y: number, z: number) => { mode: AxisMode; axis: Vec3 };

/** Relative cost of a step along the axis (a step across costs 1). */
export const ALONG = 0.7;

export function axisField(joint: (n: string) => Vec3): AxisField {
  interface Seg {
    a: Vec3;
    b: Vec3;
    mode: AxisMode;
    axis: Vec3;
  }
  const segs: Seg[] = [];
  const add = (a: string, b: string, mode: AxisMode) => {
    const A = joint(a);
    const B = joint(b);
    const d: Vec3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const L = Math.hypot(...d) || 1;
    segs.push({ a: A, b: B, mode, axis: [d[0] / L, d[1] / L, d[2] / L] });
  };
  // The trunk, head and neck, as the skeleton segments them.
  const spine = ['pelvis', 'spine-4', 'spine-3', 'spine-2', 'spine-1', 'neck'];
  for (let i = 0; i < spine.length - 1; i++) add(spine[i], spine[i + 1], 2);
  add('neck', 'head', 0);
  add('head', 'head-2', 0);
  for (const s of ['l', 'r']) {
    add('neck', `${s}-clavicle`, 2);
    add(`${s}-clavicle`, `${s}-shoulder`, 2);
    add('pelvis', `${s}-upper-leg`, 2);
    add(`${s}-shoulder`, `${s}-elbow`, 1);
    add(`${s}-elbow`, `${s}-hand`, 1);
    add(`${s}-hand`, `${s}-finger-3-4`, 0);
    add(`${s}-upper-leg`, `${s}-knee`, 1);
    add(`${s}-knee`, `${s}-ankle`, 1);
    add(`${s}-ankle`, `${s}-foot-2`, 0);
  }
  return (x, y, z) => {
    let best = segs[0];
    let bestD = Infinity;
    for (const s of segs) {
      const ab = [s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]];
      const L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((x - s.a[0]) * ab[0] + (y - s.a[1]) * ab[1] + (z - s.a[2]) * ab[2]) / L));
      const d = (s.a[0] + ab[0] * t - x) ** 2 + (s.a[1] + ab[1] * t - y) ** 2 + (s.a[2] + ab[2] * t - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return { mode: best.mode, axis: best.axis };
  };
}

/** The cost of a unit step (dx, dy, dz) under a point's axis. */
export function stepCost(mode: AxisMode, axis: Vec3, dx: number, dy: number, dz: number): number {
  if (mode === 0) return 1;
  const c = mode === 1 ? Math.abs(dx * axis[0] + dy * axis[1] + dz * axis[2]) : Math.min(1, Math.hypot(dx, dz));
  return Math.sqrt(ALONG * ALONG * c * c + (1 - c * c));
}
