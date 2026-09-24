import {
  applySubdivision,
  applySubdivisionScalar,
  buildSubdivision,
  computeNormals,
  quadsToTriangles,
  type Subdivision,
} from './subdivide';

import { bodySourceKey } from '../perforators/placementFile';

/** The reference figure all placement is resolved against. */
export const REFERENCE_SHAPE: Shape = { age: 30, sex: 1, stoop: 0 };

export interface BodyMeta {
  version: number;
  source: string;
  vertexCount: number;
  quadCount: number;
  states: string[];
  deltaScale: number[];
  ageAnchors: Record<'baby' | 'child' | 'young' | 'old', number>;
  joints: { names: string[]; base: number[]; states: Record<string, number[]> };
  layout: Record<string, { offset: number; length: number; type: string }>;
}

export interface Shape {
  /** Age in years, 1–90. */
  age: number;
  /** 0 = female, 1 = male, 0.5 = in between. */
  sex: number;
  /** 0–1: thoracic kyphosis and forward head, independent of the age targets. */
  stoop: number;
}

export const DEFAULT_SHAPE: Shape = { age: 34, sex: 1, stoop: 0 };

/**
 * MakeHuman's age weighting: piecewise-linear between the baby (1 y),
 * child (11 y), young (25 y) and old (90 y) targets.
 */
export function ageWeights(years: number): [baby: number, child: number, young: number, old: number] {
  const y = Math.min(90, Math.max(1, years));
  let s: number;
  if (y < 11) s = ((y - 1) / 10) * 0.1875;
  else if (y < 25) s = 0.1875 + ((y - 11) / 14) * 0.3125;
  else s = 0.5 + ((y - 25) / 65) * 0.5;
  if (s < 0.5) {
    const baby = Math.max(0, 1 - s * 5.333333);
    const young = Math.max(0, (s - 0.1875) * 3.2);
    const child = Math.max(0, Math.min(1, 5.333333 * s) - young);
    return [baby, child, young, 0];
  }
  const old = Math.max(0, s * 2 - 1);
  return [0, 0, 1 - old, old];
}

/**
 * The anatomical figure: a fixed-topology quad mesh morphed by age and sex,
 * smoothed by one Catmull–Clark level. Everything that sits on the body
 * (perforators, maps, knots) is anchored to the fine triangles, so it follows
 * the figure through a whole life without re-placement.
 */
export class BodyModel {
  readonly meta: BodyMeta;
  readonly coarseQuads: Uint16Array;
  readonly subdivision: Subdivision;
  /** Fine triangle indices. */
  readonly triangles: Uint32Array;
  readonly fineCount: number;
  /** Current fine positions / normals (metres, feet on y = 0). */
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  /** Current coarse positions. */
  readonly coarse: Float32Array;
  /** Joint positions for the current shape. */
  joints: Map<string, [number, number, number]> = new Map();
  shape: Shape = { ...DEFAULT_SHAPE };
  /** Increments whenever positions change. */
  version = 0;

  private base: Float32Array;
  private deltas: Float32Array[];
  private jointBase: Float32Array;
  private jointDeltas: Float32Array[];

  private constructor(meta: BodyMeta, buf: ArrayBuffer) {
    this.meta = meta;
    const view = <T>(name: string, Ctor: new (b: ArrayBuffer, o: number, l: number) => T) => {
      const l = meta.layout[name];
      return new Ctor(buf, l.offset, l.length);
    };
    this.base = view('positions', Float32Array);
    this.coarseQuads = view('quads', Uint16Array);
    this.deltas = meta.states.map((s, i) => {
      const q = view(`delta:${s}`, Int16Array);
      const scale = meta.deltaScale[i];
      return Float32Array.from(q, (x) => x * scale);
    });
    this.jointBase = Float32Array.from(meta.joints.base);
    this.jointDeltas = meta.states.map((s) =>
      Float32Array.from(meta.joints.states[s], (x, i) => x - meta.joints.base[i]),
    );

    this.subdivision = buildSubdivision(meta.vertexCount, this.coarseQuads);
    this.triangles = quadsToTriangles(this.subdivision.fineQuads);
    this.fineCount = this.subdivision.fineVertexCount;
    this.coarse = new Float32Array(meta.vertexCount * 3);
    this.positions = new Float32Array(this.fineCount * 3);
    this.normals = new Float32Array(this.fineCount * 3);
    this.setShape(DEFAULT_SHAPE);
  }

  /** A fingerprint of the files this body was built from (for precomputed data). */
  sourceKey = 0;

  /** For tests, workers and build scripts: build from already-loaded data. */
  static fromBuffers(meta: BodyMeta, buf: ArrayBuffer, jsonText?: string): BodyModel {
    const body = new BodyModel(meta, buf);
    if (jsonText !== undefined) body.sourceKey = bodySourceKey(jsonText, buf);
    return body;
  }

  static async load(baseUrl: string): Promise<BodyModel> {
    const [text, buf] = await Promise.all([
      fetch(`${baseUrl}body.json`).then((r) => r.text()),
      fetch(`${baseUrl}body.bin`).then((r) => r.arrayBuffer()),
    ]);
    return BodyModel.fromBuffers(JSON.parse(text) as BodyMeta, buf, text);
  }

  /** Weight of each stored state for a shape (same order as meta.states). */
  stateWeights(shape: Shape): number[] {
    const aw = ageWeights(shape.age);
    const sw = [1 - shape.sex, shape.sex];
    const w: number[] = [];
    for (let s = 0; s < 2; s++) for (let a = 0; a < 4; a++) w.push(sw[s] * aw[a]);
    return w;
  }

  setShape(shape: Partial<Shape>) {
    this.shape = { ...this.shape, ...shape };
    const w = this.stateWeights(this.shape);

    // Joints first (they drive grounding and posture).
    const J = this.jointBase.length / 3;
    const jp = Float32Array.from(this.jointBase);
    w.forEach((wi, s) => {
      if (wi === 0) return;
      const d = this.jointDeltas[s];
      for (let i = 0; i < jp.length; i++) jp[i] += wi * d[i];
    });
    const names = this.meta.joints.names;
    const groundIdx = names.indexOf('ground');
    const groundY = jp[groundIdx * 3 + 1];

    // Coarse positions.
    const c = this.coarse;
    c.set(this.base);
    w.forEach((wi, s) => {
      if (wi === 0) return;
      const d = this.deltas[s];
      for (let i = 0; i < c.length; i++) c[i] += wi * d[i];
    });
    for (let i = 1; i < c.length; i += 3) c[i] -= groundY;
    for (let i = 1; i < jp.length; i += 3) jp[i] -= groundY;

    if (this.shape.stoop > 0) this.applyStoop(c, jp, this.shape.stoop);

    this.joints.clear();
    for (let j = 0; j < J; j++) this.joints.set(names[j], [jp[j * 3], jp[j * 3 + 1], jp[j * 3 + 2]]);

    applySubdivision(this.subdivision, c, this.positions);
    computeNormals(this.positions, this.triangles, this.normals);
    this.version++;
  }

  /**
   * Age posture: a smooth thoracic flexion about the mid-back plus a forward
   * head, blended with height so the pelvis and legs stay put.
   */
  private applyStoop(c: Float32Array, jp: Float32Array, amount: number) {
    const names = this.meta.joints.names;
    const get = (n: string) => {
      const i = names.indexOf(n) * 3;
      return [jp[i], jp[i + 1], jp[i + 2]];
    };
    const pivot = get('spine-2');
    const neck = get('neck');
    const span = Math.max(0.05, neck[1] - pivot[1]);
    const maxAngle = 0.32 * amount; // radians of thoracic flexion at the neck
    const headAngle = 0.22 * amount;
    const bend = (arr: Float32Array, i: number) => {
      const y = arr[i + 1];
      if (y <= pivot[1]) return;
      const t = Math.min(1.6, (y - pivot[1]) / span);
      const a = maxAngle * t * t * 0.62 + (y > neck[1] ? headAngle * Math.min(1, (y - neck[1]) / 0.12) : 0);
      const dy = y - pivot[1];
      const dz = arr[i + 2] - pivot[2];
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      arr[i + 1] = pivot[1] + dy * cs - dz * sn;
      arr[i + 2] = pivot[2] + dy * sn + dz * cs;
      // Lose a little height with the curve.
      arr[i + 1] -= 0.012 * amount * t;
    };
    for (let i = 0; i < c.length; i += 3) bend(c, i);
    for (let i = 0; i < jp.length; i += 3) bend(jp, i);
  }

  /** Scalar field defined on coarse vertices → fine vertices. */
  refineScalar(coarse: ArrayLike<number>): Float32Array {
    const out = new Float32Array(this.fineCount);
    applySubdivisionScalar(this.subdivision, coarse, out);
    return out;
  }

  joint(name: string): [number, number, number] {
    const j = this.joints.get(name);
    if (!j) throw new Error(`unknown joint ${name}`);
    return j;
  }

  /** Approximate standing height (ground to crown). */
  height(): number {
    return this.joint('head-2')[1] + 0.03;
  }
}
