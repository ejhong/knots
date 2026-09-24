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
import type { SceneTheme } from '../engine/theme';
import type { BodyModel } from './BodyModel';
import type { ChannelDef } from '../data/channels';

export interface ChannelInstance {
  def: ChannelDef;
  side: 'l' | 'r' | 'm';
  /** Fine-mesh vertices along the channel, in order. */
  path: number[];
}

/**
 * The deep channels drawn on the deep fascia: a hairline with small beads,
 * in a warm gold — septa, raphes and neurovascular sheaths.
 */
export class Channels {
  readonly lines: LineSegments;
  readonly beads: Points;
  readonly lineMaterial: ShaderMaterial;
  readonly beadMaterial: ShaderMaterial;
  private lineGeo = new BufferGeometry();
  private beadGeo = new BufferGeometry();
  private linePos: Float32Array;
  private beadPos: Float32Array;
  private lineHi: Float32Array;
  private beadHi: Float32Array;
  /** Smoothed polyline per channel (current figure), on the deep fascia. */
  polylines: Float32Array[] = [];
  /** The same paths on the skin, for hover queries. */
  skinLines: Float32Array[] = [];
  private segOwner: Int32Array;
  private beadOwner: Int32Array;

  constructor(readonly channels: ChannelInstance[]) {
    let segs = 0;
    let beads = 0;
    for (const c of channels) {
      const n = smoothCount(c.path.length);
      segs += n - 1;
      beads += Math.ceil(n / 2);
    }
    this.linePos = new Float32Array(segs * 6);
    this.lineHi = new Float32Array(segs * 2);
    this.segOwner = new Int32Array(segs);
    this.beadPos = new Float32Array(beads * 3);
    this.beadHi = new Float32Array(beads);
    this.beadOwner = new Int32Array(beads);
    let s = 0;
    let b = 0;
    channels.forEach((c, ci) => {
      const n = smoothCount(c.path.length);
      for (let k = 0; k < n - 1; k++) this.segOwner[s++] = ci;
      for (let k = 0; k < n; k += 2) this.beadOwner[b++] = ci;
    });
    this.lineGeo.setAttribute('position', new BufferAttribute(this.linePos, 3));
    this.lineGeo.setAttribute('aHi', new BufferAttribute(this.lineHi, 1));
    this.beadGeo.setAttribute('position', new BufferAttribute(this.beadPos, 3));
    this.beadGeo.setAttribute('aHi', new BufferAttribute(this.beadHi, 1));
    this.lineMaterial = material(false);
    this.beadMaterial = material(true);
    this.lines = new LineSegments(this.lineGeo, this.lineMaterial);
    this.beads = new Points(this.beadGeo, this.beadMaterial);
    for (const o of [this.lines, this.beads]) {
      o.frustumCulled = false;
      o.renderOrder = 1;
    }
  }

  /** Re-evaluates the channels on the current figure, on the deep fascia. */
  refresh(body: BodyModel, depth: Float32Array) {
    const P = body.positions;
    const N = body.normals;
    this.polylines = this.channels.map((c) => {
      const raw = new Float32Array(c.path.length * 3);
      c.path.forEach((v, i) => {
        const off = -depth[v] + 0.0008;
        for (let k = 0; k < 3; k++) raw[i * 3 + k] = P[v * 3 + k] + N[v * 3 + k] * off;
      });
      return chaikin(chaikin(raw));
    });
    this.skinLines = this.channels.map((c) => {
      const raw = new Float32Array(c.path.length * 3);
      c.path.forEach((v, i) => {
        for (let k = 0; k < 3; k++) raw[i * 3 + k] = P[v * 3 + k];
      });
      return raw;
    });
    let s = 0;
    let b = 0;
    for (const pl of this.polylines) {
      const n = pl.length / 3;
      for (let k = 0; k < n - 1; k++, s++) {
        this.linePos.set(pl.subarray(k * 3, k * 3 + 6), s * 6);
      }
      for (let k = 0; k < n; k += 2, b++) this.beadPos.set(pl.subarray(k * 3, k * 3 + 3), b * 3);
    }
    (this.lineGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.beadGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
  }

  /** Nearest channel to a point, within `radius` metres. */
  nearest(x: number, y: number, z: number, radius = 0.008): number {
    let best = -1;
    let bestD = radius * radius;
    this.skinLines.forEach((pl, ci) => {
      for (let i = 0; i < pl.length; i += 3) {
        const d = (pl[i] - x) ** 2 + (pl[i + 1] - y) ** 2 + (pl[i + 2] - z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = ci;
        }
      }
    });
    return best;
  }

  highlight(ci: number) {
    for (let s = 0; s < this.segOwner.length; s++) this.lineHi[s * 2] = this.lineHi[s * 2 + 1] = this.segOwner[s] === ci ? 1 : 0;
    for (let b = 0; b < this.beadOwner.length; b++) this.beadHi[b] = this.beadOwner[b] === ci ? 1 : 0;
    (this.lineGeo.getAttribute('aHi') as BufferAttribute).needsUpdate = true;
    (this.beadGeo.getAttribute('aHi') as BufferAttribute).needsUpdate = true;
  }

  setVisible(on: boolean) {
    this.lines.visible = on;
    this.beads.visible = on;
  }

  applyTheme(t: SceneTheme) {
    for (const m of [this.lineMaterial, this.beadMaterial]) {
      m.uniforms.uColor.value.copy(t.glow ? new Color('#d8b775') : new Color('#a2792f'));
      m.uniforms.uGlowMode.value = t.glow;
      m.blending = t.glow ? AdditiveBlending : NormalBlending;
      m.needsUpdate = true;
    }
  }
}

const smoothCount = (n: number) => (n < 3 ? n : ((n - 2) * 2 + 2 - 2) * 2 + 2);

/** One Chaikin corner-cutting pass (keeps the endpoints). */
function chaikin(p: Float32Array): Float32Array {
  const n = p.length / 3;
  if (n < 3) return p;
  const out = new Float32Array(((n - 1) * 2) * 3);
  let o = 0;
  for (let k = 0; k < 3; k++) out[o + k] = p[k];
  o += 3;
  for (let i = 0; i < n - 1; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    if (i > 0) {
      for (let k = 0; k < 3; k++) out[o + k] = 0.75 * p[a + k] + 0.25 * p[b + k];
      o += 3;
    }
    if (i < n - 2) {
      for (let k = 0; k < 3; k++) out[o + k] = 0.25 * p[a + k] + 0.75 * p[b + k];
      o += 3;
    }
  }
  for (let k = 0; k < 3; k++) out[o + k] = p[(n - 1) * 3 + k];
  o += 3;
  return out.subarray(0, o);
}

function material(points: boolean) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color() },
      uGlowMode: { value: 1 },
      uProjScale: { value: 800 },
      uPixelRatio: { value: 1 },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aHi;
      uniform float uProjScale;
      uniform float uPixelRatio;
      varying float vHi;
      varying vec3 vClipPos;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vHi = aHi;
        vClipPos = position;
        ${points ? 'gl_PointSize = clamp(0.0024 * (1.0 + aHi) * uProjScale / max(0.05, -mv.z), 1.2 * uPixelRatio, 7.0 * uPixelRatio);' : ''}
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uGlowMode;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vHi;
      varying vec3 vClipPos;
      void main() {
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        ${points ? 'float r = length(gl_PointCoord * 2.0 - 1.0); if (r > 1.0) discard; float a = (1.0 - smoothstep(0.35, 1.0, r)) * (0.55 + vHi * 0.45);' : 'float a = 0.38 + vHi * 0.6;'}
        if (uGlowMode > 0.5) gl_FragColor = vec4(uColor * a, 1.0);
        else gl_FragColor = vec4(uColor, a);
      }
    `,
  });
}
