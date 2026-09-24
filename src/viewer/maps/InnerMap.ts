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
import type { BodyModel } from '../body/BodyModel';
import type { SceneTheme } from '../engine/theme';
import { placeBound, type Bound } from '../data/bind';
import type { AtlasMap, MapData, MapPlace } from './SkinMap';

export interface InnerPlace extends MapPlace {
  at: Bound;
}

export interface InnerLine {
  group: number;
  side: 'l' | 'r' | 'm';
  /** Points along the line, bound to the skeleton. */
  path: Bound[];
  /** The place this line draws (a lotus's rim and petals): hovering it shows that place. */
  point?: number;
}

export type InnerMapData = MapData<InnerPlace, InnerLine>;

/**
 * A map inside the body — the subtle body of the contemplative traditions:
 * channels, lotuses and wheels, knots and fields, bound to the skeleton so
 * they follow the figure, and seen through it (they are drawn over the
 * body, softly). Same colour, hover and solo behaviour as the skin maps.
 */
export class InnerMap implements AtlasMap {
  readonly points: Points;
  readonly lines: LineSegments;
  readonly pointMaterial: ShaderMaterial;
  readonly lineMaterial: ShaderMaterial;
  readonly pointPos: Float32Array;
  private linePos: Float32Array[] = [];
  private pGeo = new BufferGeometry();
  private lGeo = new BufferGeometry();
  private pHi: Float32Array;
  private lPos: Float32Array;
  private lHi: Float32Array;
  private lOwner: Int32Array;
  private refHeight: number;

  constructor(
    readonly data: InnerMapData,
    body: BodyModel,
  ) {
    this.refHeight = body.height();
    const P = data.points.length;
    this.pointPos = new Float32Array(P * 3);
    this.pHi = new Float32Array(P);
    this.pGeo.setAttribute('position', new BufferAttribute(new Float32Array(P * 3), 3));
    this.pGeo.setAttribute('aChannel', new BufferAttribute(Float32Array.from(data.points, (p) => p.group), 1));
    this.pGeo.setAttribute('aShape', new BufferAttribute(Float32Array.from(data.points, (p) => p.shape), 1));
    this.pGeo.setAttribute('aHi', new BufferAttribute(this.pHi, 1));

    let segs = 0;
    for (const l of data.lines) segs += Math.max(0, l.path.length - 1);
    this.lPos = new Float32Array(segs * 6);
    this.lHi = new Float32Array(segs * 2);
    this.lOwner = new Int32Array(segs);
    const lCh = new Float32Array(segs * 2);
    let s = 0;
    data.lines.forEach((l, li) => {
      for (let k = 0; k < l.path.length - 1; k++, s++) {
        this.lOwner[s] = li;
        lCh[s * 2] = lCh[s * 2 + 1] = l.group;
      }
    });
    this.lGeo.setAttribute('position', new BufferAttribute(this.lPos, 3));
    this.lGeo.setAttribute('aChannel', new BufferAttribute(lCh, 1));
    this.lGeo.setAttribute('aHi', new BufferAttribute(this.lHi, 1));

    this.pointMaterial = pointMaterial();
    this.lineMaterial = lineMaterial();
    this.points = new Points(this.pGeo, this.pointMaterial);
    this.lines = new LineSegments(this.lGeo, this.lineMaterial);
    for (const o of [this.lines, this.points]) {
      o.frustumCulled = false;
      o.visible = false;
    }
    this.lines.renderOrder = 9;
    this.points.renderOrder = 10;
  }

  get materials() {
    return [this.lineMaterial, this.pointMaterial];
  }

  get objects() {
    return [this.lines, this.points];
  }

  refresh(body: BodyModel) {
    const joint = (n: string) => body.joint(n);
    const k = body.height() / this.refHeight;
    this.data.points.forEach((p, i) => placeBound(p.at, joint, k, this.pointPos, i));
    (this.pGeo.getAttribute('position').array as Float32Array).set(this.pointPos);
    this.pGeo.getAttribute('position').needsUpdate = true;
    let s = 0;
    this.linePos = this.data.lines.map((l) => {
      const pos = new Float32Array(l.path.length * 3);
      l.path.forEach((b, i) => placeBound(b, joint, k, pos, i));
      for (let q = 0; q < l.path.length - 1; q++, s++) this.lPos.set(pos.subarray(q * 3, q * 3 + 6), s * 6);
      return pos;
    });
    this.lGeo.getAttribute('position').needsUpdate = true;
  }

  /** The nearest place on screen within reach, else the nearest line (inside the body: seen through it). */
  pick(camera: PerspectiveCamera, width: number, height: number, sx: number, sy: number, _maxDist: number, reachPx = 16): { point: number; line: number } {
    const v = new Vector3();
    const d2 = (P: Float32Array, i: number) => {
      v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).project(camera);
      if (v.z > 1) return Infinity;
      return ((v.x * 0.5 + 0.5) * width - sx) ** 2 + ((-v.y * 0.5 + 0.5) * height - sy) ** 2;
    };
    let point = -1;
    let best = reachPx * reachPx;
    this.data.points.forEach((p, i) => {
      if (!this.visibleGroup(p.group)) return;
      const d = d2(this.pointPos, i);
      if (d < best) {
        best = d;
        point = i;
      }
    });
    if (point >= 0) return { point, line: -1 };
    let line = -1;
    best = (reachPx * 0.6) ** 2;
    this.linePos.forEach((P, li) => {
      if (!this.visibleGroup(this.data.lines[li].group)) return;
      for (let i = 0; i < P.length / 3; i++) {
        const d = d2(P, i);
        if (d < best) {
          best = d;
          line = li;
        }
      }
    });
    return { point: line >= 0 ? (this.data.lines[line].point ?? -1) : -1, line };
  }

  private visibleGroup(g: number) {
    const solo = this.lineMaterial.uniforms.uSolo.value as number;
    return solo < 0 || solo === g;
  }

  highlight(point: number, group: number) {
    this.data.points.forEach((p, i) => (this.pHi[i] = i === point ? 1 : group >= 0 && p.group === group ? 0.45 : 0));
    for (let s = 0; s < this.lOwner.length; s++) {
      const l = this.data.lines[this.lOwner[s]];
      const on = (group >= 0 && l.group === group) || (point >= 0 && l.point === point) ? 1 : 0;
      this.lHi[s * 2] = this.lHi[s * 2 + 1] = on;
    }
    this.pGeo.getAttribute('aHi').needsUpdate = true;
    this.lGeo.getAttribute('aHi').needsUpdate = true;
  }

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

const UNIFORMS = () => ({
  uColor: { value: new Color() },
  uCore: { value: new Color() },
  uGlowMode: { value: 1 },
  uSolo: { value: -1 },
  uProjScale: { value: 800 },
  uPixelRatio: { value: 1 },
  uClip: { value: new Vector4() },
  uClipOn: { value: 0 },
});

const SOLO = /* glsl */ `
  attribute float aChannel;
  attribute float aHi;
  uniform float uSolo;
  float soloFactor() {
    return (uSolo < -0.5 || abs(aChannel - uSolo) < 0.5) ? 1.0 : 0.07;
  }
`;

function lineMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: UNIFORMS(),
    vertexShader: /* glsl */ `
      ${SOLO}
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vClipPos = position;
        vA = 0.72 * soloFactor() * (1.0 + aHi * 0.7);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
        vec3 col = mix(uColor, uCore, clamp(vA - 0.72, 0.0, 1.0));
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
    depthTest: false,
    uniforms: UNIFORMS(),
    vertexShader: /* glsl */ `
      ${SOLO}
      attribute float aShape;
      uniform float uProjScale;
      uniform float uPixelRatio;
      varying float vA;
      varying float vHi;
      varying float vShape;
      varying vec3 vClipPos;
      void main() {
        vClipPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (aShape > 1.5 ? 0.05 : aShape > 0.5 ? 0.012 : 0.008) * (1.0 + aHi * 0.6);
        gl_PointSize = clamp(size * uProjScale / max(0.05, -mv.z), 2.0 * uPixelRatio, 160.0 * uPixelRatio);
        vA = soloFactor();
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
        if (vShape > 1.5) {
          // A field: a soft sphere of light.
          centre = exp(-r * r * 6.0);
          a = (exp(-r * r * 2.6) * 0.42 + centre * 0.3) * vA * (0.8 + vHi * 0.6);
        } else if (vShape > 0.5) {
          // A knot: a diamond outline with a solid heart.
          float d = abs(c.x) + abs(c.y);
          float px = fwidth(d);
          float edge = 1.0 - smoothstep(0.08, 0.08 + px * 1.5, abs(d - 0.72));
          centre = 1.0 - smoothstep(0.26, 0.26 + px * 2.0, d);
          a = (edge * 0.85 + centre) * vA * (0.8 + vHi * 0.6);
        } else {
          // A centre: a small bright point in a faint ring.
          float px = fwidth(r);
          float ring = 1.0 - smoothstep(0.1, 0.1 + px * 1.5, abs(r - 0.7));
          centre = 1.0 - smoothstep(0.3, 0.3 + px * 2.0, r);
          a = (ring * 0.6 + centre) * vA * (0.8 + vHi * 0.6);
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
