import { BufferAttribute, BufferGeometry, DoubleSide, Ray, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Anchor } from './anchors';

/**
 * Anatomical placement. Map data (roots, gates, acupoints, chakras…) is
 * written against the skeleton rather than raw coordinates, so it reads like
 * an atlas entry and survives changes to the mesh:
 *
 *   { "ray": { "j": "head", "o": [0, -0.02, 0] }, "dir": [0.4, 0.2, -1] }
 *     cast from a point inside the body toward `dir`; the anchor is where the
 *     ray leaves through the skin.
 *   { "near": { "lerp": ["l-elbow", "l-hand", 0.25] }, "dir": [0, 0, 1] }
 *     the closest skin point to a skeletal point (optionally facing `dir`).
 *
 * Axes are figure-relative: +x is the figure's left, +y up, +z the front.
 * Offsets are metres on the reference adult. Anything written for the left
 * side can be mirrored to the right.
 */
export type Vec3 = [number, number, number];

export type PointExpr =
  | string
  | { j: string; o?: Vec3 }
  | { lerp: [string, string, number]; o?: Vec3 }
  | { mid: [string, string]; o?: Vec3 };

/**
 * A limb in its own frame: `t` along the segment (0 at its proximal joint,
 * 1 at its distal one) and `deg` around it — 0 the front (palmar on the
 * forearm and hand; the dorsum on the foot), 90 the lateral side (radial on
 * the forearm and hand), 180 the back, 270 the medial side. A ray leaves the
 * bone's axis in that direction; the anchor is where it meets the skin.
 */
export type LimbSegment =
  | 'upper-arm'
  | 'forearm'
  | 'hand'
  | 'thigh'
  | 'leg'
  | 'foot'
  | 'finger-1'
  | 'finger-2'
  | 'finger-3'
  | 'finger-4'
  | 'finger-5'
  | 'toe-1'
  | 'toe-2'
  | 'toe-3'
  | 'toe-4'
  | 'toe-5';

export type Locator =
  | { ray: PointExpr; dir: Vec3; o?: Vec3 }
  | { near: PointExpr; dir?: Vec3; o?: Vec3; reach?: number }
  | { limb: LimbSegment; t: number; deg: number; side?: 'l' | 'r' };

export type JointLookup = (name: string) => Vec3;

export function mirrorName(name: string): string {
  if (name.startsWith('l-')) return 'r-' + name.slice(2);
  if (name.startsWith('r-')) return 'l-' + name.slice(2);
  return name;
}

const mirrorVec = (v?: Vec3): Vec3 | undefined => (v ? [-v[0], v[1], v[2]] : undefined);

function mirrorPoint(p: PointExpr): PointExpr {
  if (typeof p === 'string') return mirrorName(p);
  if ('j' in p) return { j: mirrorName(p.j), o: mirrorVec(p.o) };
  if ('lerp' in p) return { lerp: [mirrorName(p.lerp[0]), mirrorName(p.lerp[1]), p.lerp[2]], o: mirrorVec(p.o) };
  return { mid: [mirrorName(p.mid[0]), mirrorName(p.mid[1])], o: mirrorVec(p.o) };
}

export function mirrorLocator(l: Locator): Locator {
  if ('limb' in l) return { ...l, side: l.side === 'r' ? 'l' : 'r' };
  if ('ray' in l) return { ray: mirrorPoint(l.ray), dir: mirrorVec(l.dir)!, o: mirrorVec(l.o) };
  return { near: mirrorPoint(l.near), dir: mirrorVec(l.dir), o: mirrorVec(l.o), reach: l.reach };
}

export function evalPoint(p: PointExpr, joint: JointLookup): Vec3 {
  let base: Vec3;
  let o: Vec3 | undefined;
  if (typeof p === 'string') base = joint(p);
  else if ('j' in p) {
    base = joint(p.j);
    o = p.o;
  } else if ('lerp' in p) {
    const a = joint(p.lerp[0]);
    const b = joint(p.lerp[1]);
    const t = p.lerp[2];
    base = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    o = p.o;
  } else {
    const a = joint(p.mid[0]);
    const b = joint(p.mid[1]);
    base = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    o = p.o;
  }
  return o ? [base[0] + o[0], base[1] + o[1], base[2] + o[2]] : base;
}

/**
 * Resolves locators against one mesh state (normally the reference adult).
 * Holds a BVH over the fine triangles; `indirect` keeps triangle order so
 * face indices match the mesh's own.
 */
export class Locator3D {
  private bvh: MeshBVH;
  private geometry: BufferGeometry;
  private ray = new Ray();
  private tmp = new Vector3();

  constructor(
    private positions: Float32Array,
    private normals: Float32Array,
    private triangles: Uint32Array,
    private joint: JointLookup,
  ) {
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setIndex(new BufferAttribute(triangles, 1));
    this.bvh = new MeshBVH(this.geometry, { indirect: true });
  }

  point(p: PointExpr): Vec3 {
    return evalPoint(p, this.joint);
  }

  resolve(l: Locator): Anchor | null {
    if ('limb' in l) {
      const { origin, dir } = limbRay(l, this.joint);
      this.ray.set(origin, dir);
      const hit = this.bvh.raycastFirst(this.ray, DoubleSide);
      if (!hit || hit.faceIndex == null) return null;
      return this.anchorAt(hit.faceIndex, hit.point);
    }
    if ('ray' in l) {
      const o = this.point(l.ray);
      const origin = l.o ? new Vector3(o[0] + l.o[0], o[1] + l.o[1], o[2] + l.o[2]) : new Vector3(...o);
      this.ray.set(origin, new Vector3(...l.dir).normalize());
      const hit = this.bvh.raycastFirst(this.ray, DoubleSide);
      if (!hit || hit.faceIndex == null) return null;
      return this.anchorAt(hit.faceIndex, hit.point);
    }
    const p = this.point(l.near);
    const target = new Vector3(p[0], p[1], p[2]);
    if (l.o) target.add(new Vector3(...l.o));
    if (!l.dir) {
      const hit = this.bvh.closestPointToPoint(target, { point: new Vector3(), distance: 0, faceIndex: 0 });
      if (!hit || hit.faceIndex == null) return null;
      return this.anchorAt(hit.faceIndex, hit.point);
    }
    // Facing constraint: step outward from the target along `dir` and ray back
    // in. `reach` keeps the step short where another limb lies beyond.
    const dir = new Vector3(...l.dir).normalize();
    this.ray.set(target.clone().addScaledVector(dir, l.reach ?? 0.5), dir.clone().negate());
    const hit = this.bvh.raycastFirst(this.ray, DoubleSide);
    if (!hit || hit.faceIndex == null) return null;
    return this.anchorAt(hit.faceIndex, hit.point);
  }

  /** Closest skin anchor to an arbitrary point. */
  closest(p: Vec3): Anchor | null {
    const hit = this.bvh.closestPointToPoint(new Vector3(...p), { point: new Vector3(), distance: 0, faceIndex: 0 });
    if (!hit || hit.faceIndex == null) return null;
    return this.anchorAt(hit.faceIndex, hit.point);
  }

  private anchorAt(tri: number, point: Vector3): Anchor {
    const t = tri * 3;
    const P = this.positions;
    const ia = this.triangles[t] * 3;
    const ib = this.triangles[t + 1] * 3;
    const ic = this.triangles[t + 2] * 3;
    const a = new Vector3(P[ia], P[ia + 1], P[ia + 2]);
    const b = new Vector3(P[ib], P[ib + 1], P[ib + 2]);
    const c = new Vector3(P[ic], P[ic + 1], P[ic + 2]);
    // Barycentric coordinates of point in (a, b, c).
    const v0 = b.clone().sub(a);
    const v1 = c.clone().sub(a);
    const v2 = this.tmp.copy(point).sub(a);
    const d00 = v0.dot(v0);
    const d01 = v0.dot(v1);
    const d11 = v1.dot(v1);
    const d20 = v2.dot(v0);
    const d21 = v2.dot(v1);
    const den = d00 * d11 - d01 * d01 || 1;
    let u = (d11 * d20 - d01 * d21) / den;
    let v = (d00 * d21 - d01 * d20) / den;
    u = Math.min(1, Math.max(0, u));
    v = Math.min(1 - u, Math.max(0, v));
    return { tri, u, v };
  }

  dispose() {
    this.geometry.dispose();
  }
}

const SEGMENTS: Record<LimbSegment, [string, string]> = {
  'upper-arm': ['shoulder', 'elbow'],
  forearm: ['elbow', 'hand'],
  hand: ['hand', 'finger-3-1'],
  thigh: ['upper-leg', 'knee'],
  leg: ['knee', 'ankle'],
  foot: ['ankle', 'foot-1'],
  'finger-1': ['finger-1-2', 'finger-1-4'],
  'finger-2': ['finger-2-1', 'finger-2-4'],
  'finger-3': ['finger-3-1', 'finger-3-4'],
  'finger-4': ['finger-4-1', 'finger-4-4'],
  'finger-5': ['finger-5-1', 'finger-5-4'],
  'toe-1': ['toe-1-1', 'toe-1-3'],
  'toe-2': ['toe-2-1', 'toe-2-4'],
  'toe-3': ['toe-3-1', 'toe-3-4'],
  'toe-4': ['toe-4-1', 'toe-4-4'],
  'toe-5': ['toe-5-1', 'toe-5-4'],
};

/** The limb's own frame at a point on its axis, and the ray for a locator. */
export function limbRay(l: { limb: LimbSegment; t: number; deg: number; side?: 'l' | 'r' }, joint: JointLookup) {
  const s = l.side ?? 'l';
  const j = (n: string) => new Vector3(...joint(`${s}-${n}`));
  const [pa, pb] = SEGMENTS[l.limb];
  const a = j(pa);
  const b = j(pb);
  const axis = b.clone().sub(a).normalize();
  const origin = a.clone().lerp(b, l.t);
  const away = new Vector3(s === 'l' ? 1 : -1, 0, 0);
  const perp = (v: Vector3) => v.clone().addScaledVector(axis, -v.dot(axis)).normalize();
  let front: Vector3;
  let lateral: Vector3;
  const handFrame = () => {
    // Palmar and radial come from the hand itself: the radial side is toward
    // the index knuckle from the little one; the palm faces across them.
    const radial = j('finger-2-1').sub(j('finger-5-1')).normalize();
    const handAxis = j('finger-3-1').sub(j('hand')).normalize();
    const palm = handAxis.clone().cross(radial).normalize().multiplyScalar(s === 'l' ? 1 : -1);
    return { palm, radial };
  };
  const ortho = (f: Vector3, lat: Vector3) => {
    const F = perp(f);
    const L = lat.clone().addScaledVector(axis, -lat.dot(axis));
    L.addScaledVector(F, -L.dot(F)).normalize();
    return [F, L] as const;
  };
  if (l.limb === 'hand' || l.limb.startsWith('finger-')) {
    const { palm, radial } = handFrame();
    [front, lateral] = ortho(palm, radial);
  } else if (l.limb === 'forearm') {
    // The forearm turns between the elbow (front forward, radial side
    // lateral) and the wrist (the hand's own palmar and radial directions).
    const { palm, radial } = handFrame();
    const [fe, le] = ortho(new Vector3(0, 0, 1), away);
    const [fw, lw] = ortho(palm, radial);
    [front, lateral] = ortho(fe.lerp(fw, l.t), le.lerp(lw, l.t));
  } else {
    const up = l.limb === 'foot' || l.limb.startsWith('toe-');
    front = perp(up ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1));
    lateral = axis.clone().cross(front).normalize();
    if (lateral.dot(away) < 0) lateral.negate();
  }
  const r = (l.deg * Math.PI) / 180;
  const dir = front.multiplyScalar(Math.cos(r)).addScaledVector(lateral, Math.sin(r)).normalize();
  return { origin, dir };
}
