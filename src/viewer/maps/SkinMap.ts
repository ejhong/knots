import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
  Vector4,
  type PerspectiveCamera,
} from 'three';
import { evalAnchors, type Anchor, type AnchorSet } from '../anchors/anchors';
import type { BodyModel } from '../body/BodyModel';
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from '../body/layerModel';
import type { SceneTheme } from '../engine/theme';

/** A group of a map: a channel, a region — what its chips show alone. */
export interface MapGroup {
  /** Chip label, e.g. "LU". */
  chip: string;
  /** A character or two for the chip, e.g. "肺". */
  cjk?: string;
  name: string;
  hanzi?: string;
  /** Its course or extent, in a sentence. */
  course: string;
}

export interface MapPoint {
  group: number;
  side: 'l' | 'r' | 'm';
  anchor: Anchor;
  kicker: string;
  title: string;
  sub: string;
  where: string;
  /** 0 a ring (a point), 1 a diamond (a knot of the sinews). */
  shape: 0 | 1;
}

export interface MapLine {
  group: number;
  side: 'l' | 'r' | 'm';
  /** Skin anchors along the line, in order (routed along the skin). */
  anchors: Anchor[];
}

export interface MapData {
  id: string;
  title: string;
  groups: MapGroup[];
  points: MapPoint[];
  lines: MapLine[];
  /** Draw lines as broad soft bands (sinews) rather than threads (channels). */
  band?: boolean;
  /** Marker size (1 = acupoint): a sparse map draws its few places larger. */
  pointScale?: number;
}

/** Two passes of corner cutting, as a count: n → 4n − 6 for n ≥ 3. */
const smoothCount = (n: number) => (n < 3 ? n : 4 * n - 6);

/**
 * A map drawn on the skin: its lines as fine threads (or broad soft bands),
 * its places as small rings or diamonds. It rides with the skin in the
 * exploded view and is cut away inside the dissection window. One group can
 * be shown alone (solo), and the hovered place or group brightens.
 */
export class SkinMap {
  readonly points: Points;
  readonly lines: LineSegments;
  readonly bands?: Points;
  readonly pointMaterial: ShaderMaterial;
  readonly lineMaterial: ShaderMaterial;
  readonly bandMaterial?: ShaderMaterial;
  /** Skin positions of the places on the current figure (for picking). */
  readonly pointPos: Float32Array;
  /** Raw skin polylines per line on the current figure, with their normals (for picking). */
  linePos: Float32Array[] = [];
  private lineNrm: Float32Array[] = [];
  /** How far the exploded view lifts each place and each line sample (its lift weight). */
  private pointLift: Float32Array;
  private lineLift: Float32Array[];
  private pointSet: AnchorSet;
  private lineSets: AnchorSet[];
  private pGeo = new BufferGeometry();
  private lGeo = new BufferGeometry();
  private bGeo = new BufferGeometry();
  private pNrm: Float32Array;
  private pHi: Float32Array;
  private lPos: Float32Array;
  private lNrm: Float32Array;
  private lHi: Float32Array;
  private lOwner: Int32Array;
  private bPos?: Float32Array;
  private bNrm?: Float32Array;
  private bHi?: Float32Array;
  private bOwner?: Int32Array;
  /** Per sprite: its share of the band (its spacing along the line), so dense stretches do not glare. */
  private bW?: Float32Array;

  constructor(
    readonly data: MapData,
    triangles: Uint32Array,
    liftWeight: Float32Array,
  ) {
    const { points, lines } = data;
    const P = points.length;
    this.pointSet = toSet(points.map((p) => p.anchor));
    this.pointPos = new Float32Array(P * 3);
    this.pNrm = new Float32Array(P * 3);
    this.pHi = new Float32Array(P);
    const liftOf = (a: Anchor) => liftWeight[triangles[a.tri * 3]];
    this.pGeo.setAttribute('position', new BufferAttribute(new Float32Array(P * 3), 3));
    this.pGeo.setAttribute('normal', new BufferAttribute(this.pNrm, 3));
    this.pGeo.setAttribute('aChannel', new BufferAttribute(Float32Array.from(points, (p) => p.group), 1));
    this.pointLift = Float32Array.from(points, (p) => liftOf(p.anchor));
    this.lineLift = lines.map((l) => Float32Array.from(l.anchors, liftOf));
    this.pGeo.setAttribute('aLiftW', new BufferAttribute(this.pointLift, 1));
    this.pGeo.setAttribute('aHi', new BufferAttribute(this.pHi, 1));
    this.pGeo.setAttribute('aShape', new BufferAttribute(Float32Array.from(points, (p) => p.shape), 1));

    this.lineSets = lines.map((l) => toSet(l.anchors));
    let segs = 0;
    for (const l of lines) segs += Math.max(0, smoothCount(l.anchors.length) - 1);
    this.lPos = new Float32Array(segs * 6);
    this.lNrm = new Float32Array(segs * 6);
    this.lHi = new Float32Array(segs * 2);
    this.lOwner = new Int32Array(segs);
    const lCh = new Float32Array(segs * 2);
    const lLift = new Float32Array(segs * 2);
    let s = 0;
    lines.forEach((l, li) => {
      const lift = smooth(Float32Array.from(l.anchors, liftOf), 1);
      for (let k = 0; k < lift.length - 1; k++, s++) {
        this.lOwner[s] = li;
        lCh[s * 2] = lCh[s * 2 + 1] = l.group;
        lLift[s * 2] = lift[k];
        lLift[s * 2 + 1] = lift[k + 1];
      }
    });
    this.lGeo.setAttribute('position', new BufferAttribute(this.lPos, 3));
    this.lGeo.setAttribute('normal', new BufferAttribute(this.lNrm, 3));
    this.lGeo.setAttribute('aChannel', new BufferAttribute(lCh, 1));
    this.lGeo.setAttribute('aLiftW', new BufferAttribute(lLift, 1));
    this.lGeo.setAttribute('aHi', new BufferAttribute(this.lHi, 1));

    this.pointMaterial = pointMaterial();
    this.pointMaterial.uniforms.uScale.value = data.pointScale ?? 1;
    this.lineMaterial = lineMaterial(data.band ? 0.34 : 0.62);
    this.points = new Points(this.pGeo, this.pointMaterial);
    this.lines = new LineSegments(this.lGeo, this.lineMaterial);
    const objs: Array<Points | LineSegments> = [this.lines, this.points];

    if (data.band) {
      // A soft sprite every smoothed vertex: the lines resampled densely enough
      // that neighbouring sprites merge into a band.
      const B = segs + lines.length;
      this.bPos = new Float32Array(B * 3);
      this.bNrm = new Float32Array(B * 3);
      this.bHi = new Float32Array(B);
      this.bOwner = new Int32Array(B);
      this.bW = new Float32Array(B);
      const bCh = new Float32Array(B);
      const bLift = new Float32Array(B);
      let b = 0;
      lines.forEach((l, li) => {
        const lift = smooth(Float32Array.from(l.anchors, liftOf), 1);
        for (let k = 0; k < lift.length; k++, b++) {
          this.bOwner![b] = li;
          bCh[b] = l.group;
          bLift[b] = lift[k];
        }
      });
      this.bGeo.setAttribute('position', new BufferAttribute(this.bPos, 3));
      this.bGeo.setAttribute('normal', new BufferAttribute(this.bNrm, 3));
      this.bGeo.setAttribute('aChannel', new BufferAttribute(bCh, 1));
      this.bGeo.setAttribute('aLiftW', new BufferAttribute(bLift, 1));
      this.bGeo.setAttribute('aHi', new BufferAttribute(this.bHi, 1));
      this.bGeo.setAttribute('aW', new BufferAttribute(this.bW, 1));
      this.bandMaterial = bandMaterial();
      this.bands = new Points(this.bGeo, this.bandMaterial);
      this.bands.renderOrder = 5;
      objs.push(this.bands);
    }
    for (const o of objs) {
      o.frustumCulled = false;
      o.visible = false;
    }
    this.lines.renderOrder = 6;
    this.points.renderOrder = 7;
  }

  get materials(): ShaderMaterial[] {
    return [this.lineMaterial, this.pointMaterial, ...(this.bandMaterial ? [this.bandMaterial] : [])];
  }

  get objects() {
    return [this.lines, this.points, ...(this.bands ? [this.bands] : [])];
  }

  /** Re-evaluates everything on the current figure. */
  refresh(body: BodyModel) {
    const T = body.triangles;
    const P = body.positions;
    const N = body.normals;
    const pp = this.pGeo.getAttribute('position') as BufferAttribute;
    evalAnchors(this.pointSet, T, P, N, this.pointPos, this.pNrm);
    (pp.array as Float32Array).set(this.pointPos);
    pp.needsUpdate = true;
    this.pGeo.getAttribute('normal').needsUpdate = true;

    let s = 0;
    let b = 0;
    this.lineNrm = [];
    this.linePos = this.lineSets.map((set) => {
      const raw = new Float32Array(set.count * 3);
      const rawN = new Float32Array(set.count * 3);
      evalAnchors(set, T, P, N, raw, rawN);
      this.lineNrm.push(rawN);
      const pos = smooth(raw, 3);
      const nrm = smooth(rawN, 3);
      const n = pos.length / 3;
      for (let k = 0; k < n - 1; k++, s++) {
        this.lPos.set(pos.subarray(k * 3, k * 3 + 6), s * 6);
        this.lNrm.set(nrm.subarray(k * 3, k * 3 + 6), s * 6);
      }
      if (this.bPos) {
        this.bPos.set(pos, b * 3);
        this.bNrm!.set(nrm, b * 3);
        // Each sprite carries its spacing: half the gaps to its neighbours, over 6 mm.
        const gap = (i: number, j: number) => Math.hypot(pos[i * 3] - pos[j * 3], pos[i * 3 + 1] - pos[j * 3 + 1], pos[i * 3 + 2] - pos[j * 3 + 2]);
        for (let k = 0; k < n; k++) {
          const g = ((k > 0 ? gap(k, k - 1) : 0) + (k < n - 1 ? gap(k, k + 1) : 0)) / 2;
          this.bW![b + k] = Math.min(1, g / 0.006);
        }
        b += n;
      }
      return raw;
    });
    this.lGeo.getAttribute('position').needsUpdate = true;
    this.lGeo.getAttribute('normal').needsUpdate = true;
    if (this.bPos) {
      this.bGeo.getAttribute('position').needsUpdate = true;
      this.bGeo.getAttribute('normal').needsUpdate = true;
      this.bGeo.getAttribute('aW').needsUpdate = true;
    }
  }

  /**
   * What the pointer is on, found on screen where the map is drawn (raised
   * with the skin in the exploded view): the nearest place within a
   * fingertip's reach, else the nearest line. Only what faces the camera and
   * is not behind the body counts. `maxDist` is how far the body is under the
   * pointer. Returns −1 for none.
   */
  pick(camera: PerspectiveCamera, width: number, height: number, sx: number, sy: number, maxDist: number, reachPx = 16): { point: number; line: number } {
    const lift = LAYER_UNIFORMS.uLift.value * (LAYER_UNIFORMS.uGapPlane.value + LAYER_UNIFORMS.uGapSat.value);
    const cam = camera.position;
    const v = new Vector3();
    // Screen distance² to the pointer of a raised skin sample, or Infinity if it cannot be seen.
    const seen = (P: Float32Array, N: Float32Array, k: number, w: number, raise: number) => {
      const nx = N[k * 3];
      const ny = N[k * 3 + 1];
      const nz = N[k * 3 + 2];
      const off = lift * w + raise;
      const x = P[k * 3] + nx * off;
      const y = P[k * 3 + 1] + ny * off;
      const z = P[k * 3 + 2] + nz * off;
      const dx = cam.x - x;
      const dy = cam.y - y;
      const dz = cam.z - z;
      const d = Math.hypot(dx, dy, dz);
      if ((nx * dx + ny * dy + nz * dz) / d < 0.08 || d > maxDist + 0.06) return Infinity;
      v.set(x, y, z).project(camera);
      return ((v.x * 0.5 + 0.5) * width - sx) ** 2 + ((-v.y * 0.5 + 0.5) * height - sy) ** 2;
    };
    let point = -1;
    let best = reachPx * reachPx;
    this.data.points.forEach((p, i) => {
      if (!this.visibleGroup(p.group)) return;
      const d2 = seen(this.pointPos, this.pNrm, i, this.pointLift[i], 0.0016);
      if (d2 < best) {
        best = d2;
        point = i;
      }
    });
    if (point >= 0) return { point, line: -1 };
    let line = -1;
    const reachLine = this.data.band ? reachPx : reachPx * 0.6;
    best = reachLine * reachLine;
    this.linePos.forEach((P, li) => {
      if (!this.visibleGroup(this.data.lines[li].group)) return;
      const N = this.lineNrm[li];
      const W = this.lineLift[li];
      for (let k = 0; k < P.length / 3; k++) {
        const d2 = seen(P, N, k, W[k], 0.0012);
        if (d2 < best) {
          best = d2;
          line = li;
        }
      }
    });
    return { point: -1, line };
  }

  private visibleGroup(g: number) {
    const solo = this.lineMaterial.uniforms.uSolo.value as number;
    return solo < 0 || solo === g;
  }

  /** Brightens one place, or one group (both −1 to clear). */
  highlight(point: number, group: number) {
    this.data.points.forEach((p, i) => (this.pHi[i] = i === point ? 1 : group >= 0 && p.group === group ? 0.45 : 0));
    const on = (li: number) => (group >= 0 && this.data.lines[li].group === group ? 1 : 0);
    for (let s = 0; s < this.lOwner.length; s++) this.lHi[s * 2] = this.lHi[s * 2 + 1] = on(this.lOwner[s]);
    if (this.bHi) for (let b = 0; b < this.bOwner!.length; b++) this.bHi[b] = on(this.bOwner![b]);
    this.pGeo.getAttribute('aHi').needsUpdate = true;
    this.lGeo.getAttribute('aHi').needsUpdate = true;
    if (this.bHi) this.bGeo.getAttribute('aHi').needsUpdate = true;
  }

  /** Shows one group alone (−1: all). */
  solo(group: number) {
    for (const m of this.materials) m.uniforms.uSolo.value = group;
  }

  setVisible(on: boolean) {
    for (const o of this.objects) o.visible = on;
  }

  applyTheme(t: SceneTheme) {
    for (const m of this.materials) {
      m.uniforms.uColor.value.copy(t.map);
      m.uniforms.uCore.value.copy(t.mapPoint);
      m.uniforms.uGlowMode.value = t.glow;
      m.blending = t.glow ? AdditiveBlending : NormalBlending;
      m.needsUpdate = true;
    }
  }
}

function toSet(anchors: Anchor[]): AnchorSet {
  const tri = new Uint32Array(anchors.length);
  const uv = new Float32Array(anchors.length * 2);
  anchors.forEach((a, i) => {
    tri[i] = a.tri;
    uv[i * 2] = a.u;
    uv[i * 2 + 1] = a.v;
  });
  return { tri, uv, count: anchors.length };
}

/** Chaikin corner cutting, twice; works for any number of components. */
function smooth(p: Float32Array, dim: number): Float32Array {
  return chaikin(chaikin(p, dim), dim);
}
function chaikin(p: Float32Array, dim: number): Float32Array {
  const n = p.length / dim;
  if (n < 3) return p;
  const out = new Float32Array(2 * (n - 1) * dim);
  let o = 0;
  const put = (i: number, j: number, w: number) => {
    for (let k = 0; k < dim; k++) out[o + k] = p[i * dim + k] * (1 - w) + p[j * dim + k] * w;
    o += dim;
  };
  put(0, 0, 0);
  for (let i = 0; i < n - 1; i++) {
    if (i > 0) put(i, i + 1, 0.25);
    if (i < n - 2) put(i, i + 1, 0.75);
  }
  put(n - 1, n - 1, 0);
  return out.subarray(0, o);
}

const UNIFORMS = () => ({
  ...LAYER_UNIFORMS,
  ...WINDOW_UNIFORMS,
  uColor: { value: new Color() },
  uCore: { value: new Color() },
  uGlowMode: { value: 1 },
  uSolo: { value: -1 },
  uProjScale: { value: 800 },
  uPixelRatio: { value: 1 },
  uClip: { value: new Vector4() },
  uClipOn: { value: 0 },
});

const PLACE = /* glsl */ `
  attribute float aChannel;
  attribute float aLiftW;
  attribute float aHi;
  uniform float uSolo;
  ${LAYERS_GLSL}
  ${WINDOW_GLSL}
  float soloFactor() {
    return (uSolo < -0.5 || abs(aChannel - uSolo) < 0.5) ? 1.0 : 0.07;
  }
`;

function lineMaterial(alpha: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...UNIFORMS(), uAlpha: { value: alpha } },
    vertexShader: /* glsl */ `
      ${PLACE}
      uniform float uAlpha;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = position + n * (skinOffset(aLiftW) + 0.0012);
        vClipPos = p;
        vA = windowR(position) < 1.0 ? 0.0 : uAlpha * soloFactor() * (1.0 + aHi * 0.9);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uCore;
      uniform float uGlowMode;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        if (vA < 0.005) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        vec3 col = mix(uColor, uCore, clamp(vA - 0.62, 0.0, 1.0));
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * vA, 1.0);
        else gl_FragColor = vec4(col, clamp(vA, 0.0, 1.0));
      }
    `,
  });
}

function bandMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: UNIFORMS(),
    vertexShader: /* glsl */ `
      ${PLACE}
      attribute float aW;
      uniform float uProjScale;
      uniform float uPixelRatio;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = position + n * (skinOffset(aLiftW) + 0.0008);
        vClipPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // A band a couple of centimetres wide: the sinews run as sheets of muscle, not threads.
        gl_PointSize = clamp(0.02 * uProjScale / max(0.05, -mv.z), 2.0 * uPixelRatio, 120.0 * uPixelRatio);
        vA = windowR(position) < 1.0 ? 0.0 : soloFactor() * aW * (0.05 + aHi * 0.07);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uGlowMode;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        if (vA < 0.004) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        float a = exp(-r * r * 3.0) * (1.0 - smoothstep(0.8, 1.0, r)) * vA;
        if (uGlowMode > 0.5) gl_FragColor = vec4(uColor * a, 1.0);
        else gl_FragColor = vec4(uColor, a * 1.6);
      }
    `,
  });
}

function pointMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...UNIFORMS(), uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      ${PLACE}
      attribute float aShape;
      uniform float uProjScale;
      uniform float uPixelRatio;
      uniform float uScale;
      varying float vA;
      varying float vHi;
      varying float vShape;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = position + n * (skinOffset(aLiftW) + 0.0016);
        vClipPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (aShape > 0.5 ? 0.011 : 0.0052) * uScale * (1.0 + aHi * 0.8);
        gl_PointSize = clamp(size * uProjScale / max(0.05, -mv.z), 2.0 * uPixelRatio, 34.0 * uPixelRatio);
        vA = windowR(position) < 1.0 ? 0.0 : soloFactor();
        vHi = aHi;
        vShape = aShape;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uCore;
      uniform float uGlowMode;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying float vHi;
      varying float vShape;
      varying vec3 vClipPos;
      void main() {
        if (vA < 0.005) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = length(c);
        if (r > 1.0) discard;
        float a;
        float centre;
        if (vShape > 0.5) {
          // A knot of the sinews (結): a diamond outline with a solid heart.
          float d = abs(c.x) + abs(c.y);
          float px = fwidth(d);
          float edge = 1.0 - smoothstep(0.08, 0.08 + px * 1.5, abs(d - 0.72));
          centre = 1.0 - smoothstep(0.26, 0.26 + px * 2.0, d);
          a = (edge * 0.85 + centre) * vA * (0.8 + vHi * 0.6);
        } else {
          // A point: a ring with a bright centre.
          float px = fwidth(r);
          float ring = 1.0 - smoothstep(0.1, 0.1 + px * 1.5, abs(r - 0.7));
          centre = 1.0 - smoothstep(0.26, 0.26 + px * 2.0, r);
          a = (ring * 0.75 + centre) * vA * (0.8 + vHi * 0.6);
        }
        vec3 col = mix(uColor, uCore, centre);
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else {
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }
      }
    `,
  });
}
