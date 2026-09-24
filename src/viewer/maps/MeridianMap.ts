import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector4,
} from 'three';
import { evalAnchors, type Anchor, type AnchorSet } from '../anchors/anchors';
import type { BodyModel } from '../body/BodyModel';
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from '../body/layerModel';
import type { SceneTheme } from '../engine/theme';

export interface MapPoint {
  code: string;
  channel: number;
  n: number;
  side: 'l' | 'r' | 'm';
  anchor: Anchor;
  where: string;
}

export interface MapLine {
  channel: number;
  side: 'l' | 'r' | 'm';
  /** Skin anchors along the line, in order (points and the samples between them). */
  anchors: Anchor[];
}

/** Two passes of corner cutting, as a count: n → 4n − 6 for n ≥ 3. */
const smoothCount = (n: number) => (n < 3 ? n : 4 * n - 6);

/**
 * A traditional map drawn on the skin: channels as fine lines, points as
 * small rings. Everything rides with the skin in the exploded view and is cut
 * away inside the dissection window. One channel can be shown alone (solo),
 * and the hovered point or channel brightens.
 */
export class MeridianMap {
  readonly points: Points;
  readonly lines: LineSegments;
  readonly pointMaterial: ShaderMaterial;
  readonly lineMaterial: ShaderMaterial;
  /** Skin positions of the points on the current figure (for picking). */
  readonly pointPos: Float32Array;
  /** Skin polylines per line on the current figure (for picking). */
  linePos: Float32Array[] = [];
  private pointSet: AnchorSet;
  private lineSets: AnchorSet[];
  private pGeo = new BufferGeometry();
  private lGeo = new BufferGeometry();
  private pNrm: Float32Array;
  private pHi: Float32Array;
  private lPos: Float32Array;
  private lNrm: Float32Array;
  private lHi: Float32Array;
  private lOwner: Int32Array;

  constructor(
    readonly mapPoints: MapPoint[],
    readonly mapLines: MapLine[],
    triangles: Uint32Array,
    liftWeight: Float32Array,
  ) {
    const P = mapPoints.length;
    this.pointSet = toSet(mapPoints.map((p) => p.anchor));
    this.pointPos = new Float32Array(P * 3);
    this.pNrm = new Float32Array(P * 3);
    this.pHi = new Float32Array(P);
    const pCh = Float32Array.from(mapPoints, (p) => p.channel);
    const pLift = Float32Array.from(mapPoints, (p) => liftWeight[triangles[p.anchor.tri * 3]]);
    this.pGeo.setAttribute('position', new BufferAttribute(new Float32Array(P * 3), 3));
    this.pGeo.setAttribute('normal', new BufferAttribute(this.pNrm, 3));
    this.pGeo.setAttribute('aChannel', new BufferAttribute(pCh, 1));
    this.pGeo.setAttribute('aLiftW', new BufferAttribute(pLift, 1));
    this.pGeo.setAttribute('aHi', new BufferAttribute(this.pHi, 1));

    this.lineSets = mapLines.map((l) => toSet(l.anchors));
    let segs = 0;
    for (const l of mapLines) segs += Math.max(0, smoothCount(l.anchors.length) - 1);
    this.lPos = new Float32Array(segs * 6);
    this.lNrm = new Float32Array(segs * 6);
    this.lHi = new Float32Array(segs * 2);
    this.lOwner = new Int32Array(segs);
    const lCh = new Float32Array(segs * 2);
    const lLift = new Float32Array(segs * 2);
    let s = 0;
    mapLines.forEach((l, li) => {
      const lift = smooth(Float32Array.from(l.anchors, (a) => liftWeight[triangles[a.tri * 3]]), 1);
      const n = lift.length;
      for (let k = 0; k < n - 1; k++, s++) {
        this.lOwner[s] = li;
        lCh[s * 2] = lCh[s * 2 + 1] = l.channel;
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
    this.lineMaterial = lineMaterial();
    this.points = new Points(this.pGeo, this.pointMaterial);
    this.lines = new LineSegments(this.lGeo, this.lineMaterial);
    for (const o of [this.lines, this.points]) {
      o.frustumCulled = false;
      o.visible = false;
    }
    this.lines.renderOrder = 6;
    this.points.renderOrder = 7;
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
    (this.pGeo.getAttribute('normal') as BufferAttribute).needsUpdate = true;

    let s = 0;
    this.linePos = this.lineSets.map((set) => {
      const raw = new Float32Array(set.count * 3);
      const rawN = new Float32Array(set.count * 3);
      evalAnchors(set, T, P, N, raw, rawN);
      const pos = smooth(raw, 3);
      const nrm = smooth(rawN, 3);
      const n = pos.length / 3;
      for (let k = 0; k < n - 1; k++, s++) {
        this.lPos.set(pos.subarray(k * 3, k * 3 + 6), s * 6);
        this.lNrm.set(nrm.subarray(k * 3, k * 3 + 6), s * 6);
      }
      return raw;
    });
    (this.lGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.lGeo.getAttribute('normal') as BufferAttribute).needsUpdate = true;
  }

  /** The nearest point to a skin position, within `radius` metres (−1 if none). */
  nearestPoint(x: number, y: number, z: number, radius = 0.009): number {
    let best = -1;
    let bestD = radius * radius;
    const P = this.pointPos;
    for (let i = 0; i < this.mapPoints.length; i++) {
      const d = (P[i * 3] - x) ** 2 + (P[i * 3 + 1] - y) ** 2 + (P[i * 3 + 2] - z) ** 2;
      if (d < bestD && this.visibleChannel(this.mapPoints[i].channel)) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  /** The nearest line to a skin position, within `radius` metres (−1 if none). */
  nearestLine(x: number, y: number, z: number, radius = 0.006): number {
    let best = -1;
    let bestD = radius * radius;
    this.linePos.forEach((pl, li) => {
      if (!this.visibleChannel(this.mapLines[li].channel)) return;
      for (let i = 0; i < pl.length; i += 3) {
        const d = (pl[i] - x) ** 2 + (pl[i + 1] - y) ** 2 + (pl[i + 2] - z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = li;
        }
      }
    });
    return best;
  }

  private visibleChannel(ch: number) {
    const solo = this.lineMaterial.uniforms.uSolo.value as number;
    return solo < 0 || solo === ch;
  }

  /** Brightens one point, or one channel's lines (both −1 to clear). */
  highlight(point: number, channel: number) {
    this.mapPoints.forEach((p, i) => (this.pHi[i] = i === point ? 1 : channel >= 0 && p.channel === channel ? 0.45 : 0));
    for (let s = 0; s < this.lOwner.length; s++) {
      const on = channel >= 0 && this.mapLines[this.lOwner[s]].channel === channel ? 1 : 0;
      this.lHi[s * 2] = this.lHi[s * 2 + 1] = on;
    }
    (this.pGeo.getAttribute('aHi') as BufferAttribute).needsUpdate = true;
    (this.lGeo.getAttribute('aHi') as BufferAttribute).needsUpdate = true;
  }

  /** Shows one channel alone (−1: all). */
  solo(channel: number) {
    this.lineMaterial.uniforms.uSolo.value = channel;
    this.pointMaterial.uniforms.uSolo.value = channel;
  }

  setVisible(on: boolean) {
    this.lines.visible = on;
    this.points.visible = on;
  }

  applyTheme(t: SceneTheme) {
    for (const m of [this.lineMaterial, this.pointMaterial]) {
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
  const out = new Float32Array((2 * (n - 1)) * dim);
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

function lineMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: UNIFORMS(),
    vertexShader: /* glsl */ `
      ${PLACE}
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = position + n * (skinOffset(aLiftW) + 0.0012);
        vClipPos = p;
        vA = windowR(position) < 1.0 ? 0.0 : 0.62 * soloFactor() * (1.0 + aHi * 0.9);
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

function pointMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: UNIFORMS(),
    vertexShader: /* glsl */ `
      ${PLACE}
      uniform float uProjScale;
      uniform float uPixelRatio;
      varying float vA;
      varying float vHi;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = position + n * (skinOffset(aLiftW) + 0.0016);
        vClipPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = 0.0052 * (1.0 + aHi * 0.8);
        gl_PointSize = clamp(size * uProjScale / max(0.05, -mv.z), 2.0 * uPixelRatio, 28.0 * uPixelRatio);
        vA = windowR(position) < 1.0 ? 0.0 : soloFactor();
        vHi = aHi;
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
      varying vec3 vClipPos;
      void main() {
        if (vA < 0.005) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        float px = fwidth(r);
        // A ring with a bright centre: the point, and the place around it.
        float ring = 1.0 - smoothstep(0.1, 0.1 + px * 1.5, abs(r - 0.7));
        float dot = 1.0 - smoothstep(0.26, 0.26 + px * 2.0, r);
        float a = (ring * 0.75 + dot) * vA * (0.8 + vHi * 0.6);
        vec3 col = mix(uColor, uCore, dot);
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else {
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }
      }
    `,
  });
}
