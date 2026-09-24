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
import type { Ladder } from './generate';

/**
 * Perforators seen from the side: when the sheet is lifted off the floor,
 * each staple becomes a stalk crossing the interstitial plane — major ones
 * bright, medium quieter, the hundred thousand small ones a fine rain — with
 * a collar where it pierces the sheet. A stuck staple's stalk and collar
 * burn vermilion.
 */
export class Stalks {
  readonly lines: LineSegments;
  readonly collars: Points;
  private lineGeo = new BufferGeometry();
  private collarGeo = new BufferGeometry();
  readonly lineMaterial: ShaderMaterial;
  readonly collarMaterial: ShaderMaterial;
  private pos: Float32Array;
  private nrm: Float32Array;
  private knot: Float32Array;
  private knotAttr: BufferAttribute;
  private cPos: Float32Array;
  private cNrm: Float32Array;
  private cKnot: Float32Array;
  private cIdx: Int32Array;
  private cKnotAttr: BufferAttribute;

  constructor(
    readonly ladder: Ladder,
    /** Per-perforator floor depth (m) and lift weight. */
    readonly inset: Float32Array,
    readonly liftWeight: Float32Array,
  ) {
    const N = ladder.count;
    this.pos = new Float32Array(N * 6);
    this.nrm = new Float32Array(N * 6);
    this.knot = new Float32Array(N * 2);
    const end = new Float32Array(N * 2);
    const level = new Float32Array(N * 2);
    const ins = new Float32Array(N * 2);
    const lw = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      end[i * 2 + 1] = 1;
      level[i * 2] = level[i * 2 + 1] = ladder.level[i];
      ins[i * 2] = ins[i * 2 + 1] = inset[i];
      lw[i * 2] = lw[i * 2 + 1] = liftWeight[i];
    }
    this.lineGeo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.lineGeo.setAttribute('normal', new BufferAttribute(this.nrm, 3));
    this.lineGeo.setAttribute('aEnd', new BufferAttribute(end, 1));
    this.lineGeo.setAttribute('aLevel', new BufferAttribute(level, 1));
    this.lineGeo.setAttribute('aInset', new BufferAttribute(ins, 1));
    this.lineGeo.setAttribute('aLiftW', new BufferAttribute(lw, 1));
    this.knotAttr = new BufferAttribute(this.knot, 1);
    this.lineGeo.setAttribute('aKnot', this.knotAttr);
    this.lineMaterial = createStalkMaterial();
    this.lines = new LineSegments(this.lineGeo, this.lineMaterial);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 2;

    // Collars on major and medium perforators.
    const idx: number[] = [];
    for (let i = 0; i < N; i++) if (ladder.level[i] >= 1) idx.push(i);
    this.cIdx = Int32Array.from(idx);
    const M = idx.length;
    this.cPos = new Float32Array(M * 3);
    this.cNrm = new Float32Array(M * 3);
    this.cKnot = new Float32Array(M);
    const cLevel = new Float32Array(M);
    const cLw = new Float32Array(M);
    idx.forEach((i, k) => {
      cLevel[k] = ladder.level[i];
      cLw[k] = liftWeight[i];
    });
    this.collarGeo.setAttribute('position', new BufferAttribute(this.cPos, 3));
    this.collarGeo.setAttribute('normal', new BufferAttribute(this.cNrm, 3));
    this.collarGeo.setAttribute('aLevel', new BufferAttribute(cLevel, 1));
    this.collarGeo.setAttribute('aLiftW', new BufferAttribute(cLw, 1));
    this.cKnotAttr = new BufferAttribute(this.cKnot, 1);
    this.collarGeo.setAttribute('aKnot', this.cKnotAttr);
    this.collarMaterial = createCollarMaterial();
    this.collars = new Points(this.collarGeo, this.collarMaterial);
    this.collars.frustumCulled = false;
    this.collars.renderOrder = 3;
  }

  /** Positions/normals of perforators on the current figure. */
  refresh(positions: Float32Array, normals: Float32Array) {
    const N = this.ladder.count;
    for (let i = 0; i < N; i++)
      for (let k = 0; k < 3; k++) {
        const p = positions[i * 3 + k];
        const n = normals[i * 3 + k];
        this.pos[i * 6 + k] = p;
        this.pos[i * 6 + 3 + k] = p;
        this.nrm[i * 6 + k] = n;
        this.nrm[i * 6 + 3 + k] = n;
      }
    (this.lineGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.lineGeo.getAttribute('normal') as BufferAttribute).needsUpdate = true;
    this.cIdx.forEach((i, k) => {
      for (let c = 0; c < 3; c++) {
        this.cPos[k * 3 + c] = positions[i * 3 + c];
        this.cNrm[k * 3 + c] = normals[i * 3 + c];
      }
    });
    (this.collarGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.collarGeo.getAttribute('normal') as BufferAttribute).needsUpdate = true;
  }

  setKnots(knot: Float32Array) {
    const N = this.ladder.count;
    for (let i = 0; i < N; i++) this.knot[i * 2] = this.knot[i * 2 + 1] = knot[i];
    this.knotAttr.needsUpdate = true;
    this.cIdx.forEach((i, k) => (this.cKnot[k] = knot[i]));
    this.cKnotAttr.needsUpdate = true;
  }

  setLift(lift: number, maxLift: number) {
    for (const m of [this.lineMaterial, this.collarMaterial]) {
      m.uniforms.uLift.value = lift;
      m.uniforms.uMaxLift.value = maxLift;
    }
    const visible = lift > 0.01;
    this.lines.visible = visible;
    this.collars.visible = visible;
  }

  applyTheme(t: SceneTheme) {
    for (const m of [this.lineMaterial, this.collarMaterial]) {
      m.uniforms.uColor.value.copy(t.point);
      m.uniforms.uKnot.value.copy(t.knot);
      m.uniforms.uGlowMode.value = t.glow;
      m.blending = t.glow ? AdditiveBlending : NormalBlending;
      m.needsUpdate = true;
    }
  }
}

function createStalkMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color() },
      uKnot: { value: new Color() },
      uLift: { value: 0 },
      uMaxLift: { value: 0.03 },
      uInsetScale: { value: 1 },
      uGlowMode: { value: 1 },
      uAlpha: { value: new Color(0.028, 0.13, 0.42) },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      attribute float aLevel;
      attribute float aInset;
      attribute float aLiftW;
      attribute float aKnot;
      uniform float uLift;
      uniform float uMaxLift;
      uniform float uInsetScale;
      uniform vec3 uAlpha;
      varying float vA;
      varying float vKnot;
      varying float vEnd;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        float out_ = uLift * uMaxLift * aLiftW;
        vec3 p = position + n * mix(-aInset * uInsetScale, out_, aEnd);
        vClipPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        float la = aLevel < 0.5 ? uAlpha.x : (aLevel < 1.5 ? uAlpha.y : uAlpha.z);
        vA = la * smoothstep(0.0, 0.25, uLift);
        vKnot = aKnot;
        vEnd = aEnd;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uKnot;
      uniform float uGlowMode;
      varying float vA;
      varying float vKnot;
      varying float vEnd;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying vec3 vClipPos;
      void main() {
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        // Brighter where it meets the sheet; a stuck staple burns.
        float a = vA * mix(0.25, 1.0, vEnd);
        vec3 col = mix(uColor, uKnot, clamp(vKnot * 1.3, 0.0, 1.0));
        a *= 1.0 + vKnot * 1.2;
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
  });
}

function createCollarMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color() },
      uKnot: { value: new Color() },
      uLift: { value: 0 },
      uMaxLift: { value: 0.03 },
      uProjScale: { value: 800 },
      uGlowMode: { value: 1 },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aLevel;
      attribute float aLiftW;
      attribute float aKnot;
      uniform float uLift;
      uniform float uMaxLift;
      uniform float uProjScale;
      varying float vA;
      varying float vKnot;
      varying float vLevel;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = position + n * uLift * uMaxLift * aLiftW;
        vClipPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (aLevel > 1.5 ? 0.0075 : 0.0042) * (1.0 + aKnot * 0.6);
        gl_PointSize = clamp(size * uProjScale / max(0.05, -mv.z), 2.0, 64.0);
        vA = smoothstep(0.1, 0.4, uLift);
        vKnot = aKnot;
        vLevel = aLevel;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uKnot;
      uniform float uGlowMode;
      varying float vA;
      varying float vKnot;
      varying float vLevel;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying vec3 vClipPos;
      void main() {
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = length(c);
        if (r > 1.0) discard;
        float px = fwidth(r);
        // Open: a thin ring. Stuck: the collar thickens and fills — gelled.
        float width = mix(0.07, 0.34, vKnot);
        float ring = 1.0 - smoothstep(width, width + px * 1.5, abs(r - 0.66));
        float fill = (1.0 - smoothstep(0.62, 0.66, r)) * vKnot * 0.35;
        vec3 col = mix(uColor, uKnot, vKnot);
        float a = (ring * (vLevel > 1.5 ? 0.9 : 0.6) + fill) * vA;
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else {
          if (a < 0.01) discard;
          gl_FragColor = vec4(col, a);
        }
      }
    `,
  });
}
