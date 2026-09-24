import type { LimbSegment, Locator, PointExpr, Vec3 } from '../anchors/locate';

/**
 * Placement in atlas language, shared by the maps and the theories: limbs
 * by proportional inches (cun), the trunk by level and cun from the midline,
 * the head by landmark. Everything is written for the left side; bilateral
 * entries are mirrored. Resolved on the reference adult.
 */
export const limb = (seg: LimbSegment, t: number, deg: number): Locator => ({ limb: seg, t, deg });
/** Forearm: 12 cun from the cubital crease (t = 0) to the wrist crease (t = 1). */
export const fa = (cunAboveWrist: number, deg: number) => limb('forearm', 1 - cunAboveWrist / 12, deg);
/** Upper arm: 9 cun from the anterior axillary fold (about a fifth of the way down) to the cubital crease. */
export const AXILLA_T = 0.18;
export const ua = (cunBelowFold: number, deg: number) => limb('upper-arm', AXILLA_T + (cunBelowFold / 9) * (1 - AXILLA_T), deg);
/** Thigh: 19 cun from the hip to the popliteal crease. */
export const th = (cunAboveKnee: number, deg: number) => limb('thigh', 1 - cunAboveKnee / 19, deg);
/** Leg: 16 cun from the knee crease (t = 0) to the ankle (t = 1). */
export const lg = (cunBelowKnee: number, deg: number) => limb('leg', cunBelowKnee / 16, deg);

/** Reference heights of the midline joints, for trunk levels (metres, reference adult). */
const CHAIN: [string, number][] = [
  ['pelvis', 0.924],
  ['spine-4', 1.011],
  ['spine-3', 1.081],
  ['spine-2', 1.14],
  ['spine-1', 1.275],
  ['neck', 1.482],
  ['head', 1.578],
  ['head-2', 1.734],
];
export function atHeight(y: number, o: Vec3 = [0, 0, 0]): PointExpr {
  if (y <= CHAIN[0][1]) return { j: CHAIN[0][0], o: [o[0], y - CHAIN[0][1] + o[1], o[2]] };
  for (let i = 0; i < CHAIN.length - 1; i++) {
    const [a, ya] = CHAIN[i];
    const [b, yb] = CHAIN[i + 1];
    if (y <= yb) return { lerp: [a, b, (y - ya) / (yb - ya)], o };
  }
  const [a, ya] = CHAIN[CHAIN.length - 1];
  return { j: a, o: [o[0], y - ya + o[1], o[2]] };
}

/** Horizontal cun on the front (nipples 8 cun apart) and the back (scapulae 6 cun apart). */
export const H = 0.024;
export const B = 0.023;
/** The navel, and vertical cun above (8 to the xiphisternal junction) and below it (5 to the pubic symphysis). */
export const NAVEL = 1.058;
export const nav = (cun: number) => NAVEL + (cun >= 0 ? cun * 0.0253 : cun * 0.0286);
/** Intercostal spaces at the midline; the ribs slope down a little laterally. */
export const ICS = [0, 1.408, 1.382, 1.356, 1.33, 1.304, 1.278, 1.252];
export const ics = (k: number, cunLateral: number) => ICS[k] - 0.0045 * cunLateral;
/** Spinous processes; "below" a vertebra is the depression under its process. */
export const SPINE: Record<string, number> = {
  C7: 1.462, T1: 1.438, T2: 1.414, T3: 1.39, T4: 1.366, T5: 1.342, T6: 1.318, T7: 1.294, T8: 1.27, T9: 1.246, T10: 1.222,
  T11: 1.198, T12: 1.174, L1: 1.146, L2: 1.117, L3: 1.088, L4: 1.059, L5: 1.03, S1: 1.0, S2: 0.976, S3: 0.953, S4: 0.93,
};
const ORDER = Object.keys(SPINE);
export const below = (v: string) => {
  const i = ORDER.indexOf(v);
  return (SPINE[v] + (i < ORDER.length - 1 ? SPINE[ORDER[i + 1]] : SPINE[v] - 0.024)) / 2;
};

/** The front of the trunk at a height, so many cun from the midline (reached from outside). */
export const front = (y: number, cun: number, up = 0): Locator => ({ near: atHeight(y, [cun * H, 0, 0]), dir: [0, up, 1] });
/** The back of the trunk. */
export const back = (y: number, cun: number, up = 0): Locator => ({ near: atHeight(y, [cun * B, 0, 0]), dir: [0, up, -1] });
/** The flank, from inside the trunk outward (the arm hangs outside it). */
export const flank = (y: number, forward = 0): Locator => ({ ray: atHeight(y), dir: [1, 0, forward] });
/** A point on the head, neck or face, reached from outside along `dir` (reference coordinates). */
export const at = (x: number, y: number, z: number, dir: Vec3): Locator => ({ near: { j: 'ground', o: [x, y, z] }, dir, reach: 0.15 });
export const face = (x: number, y: number, side = 0) => at(x, y, 0.05, [side, 0, 1]);
/**
 * The scalp: a ray from the centre of the skull, `theta` degrees along the
 * midline arc (0 forward, 90 straight up, 180 back) and `phi` degrees out to
 * the side.
 */
export const scalp = (theta: number, phi: number): Locator => {
  const t = (theta * Math.PI) / 180;
  const p = (phi * Math.PI) / 180;
  return { ray: { mid: ['head', 'head-2'] }, dir: [Math.sin(p), Math.cos(p) * Math.sin(t), Math.cos(p) * Math.cos(t)] };
};
export const near = (j: string, o: Vec3, dir: Vec3): Locator => ({ near: { j, o }, dir, reach: 0.15 });
/** From inside a joint outward, for points facing another limb (the inner ankle, the armpit). */
export const from = (j: string, o: Vec3, dir: Vec3): Locator => ({ ray: { j, o }, dir });

