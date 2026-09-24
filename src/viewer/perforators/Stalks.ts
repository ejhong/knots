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
} from 'three';
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from '../body/layerModel';
import type { SceneTheme } from '../engine/theme';
import type { Ladder } from './generate';

/**
 * The perforators seen from the side, each at its true depth:
 *   major  — up from the source vessel in muscle, through the deep fascia,
 *            to the superficial fascia (a collar at the deep fascia);
 *   medium — from the plexus above the deep fascia, across the gliding
 *            plane, through the superficial fascia (a collar there);
 *   small  — from the plexus under the superficial fascia up through the
 *            superficial fat to the skin (the fine rain).
 * A stuck perforator's stalk and collar burn terracotta.
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
    /** Per-perforator depth of the deep and superficial fascia (m), and explode weight. */
    deep: Float32Array,
    sup: Float32Array,
    liftWeight: Float32Array,
  ) {
    const N = ladder.count;
    this.pos = new Float32Array(N * 6);
    this.nrm = new Float32Array(N * 6);
    this.knot = new Float32Array(N * 2);
    const end = new Float32Array(N * 2);
    const level = new Float32Array(N * 2);
    const dDeep = new Float32Array(N * 2);
    const dSup = new Float32Array(N * 2);
    const lw = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      end[i * 2 + 1] = 1;
      level[i * 2] = level[i * 2 + 1] = ladder.level[i];
      dDeep[i * 2] = dDeep[i * 2 + 1] = deep[i];
      dSup[i * 2] = dSup[i * 2 + 1] = sup[i];
      lw[i * 2] = lw[i * 2 + 1] = liftWeight[i];
    }
    const g = this.lineGeo;
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new BufferAttribute(this.nrm, 3));
    g.setAttribute('aEnd', new BufferAttribute(end, 1));
    g.setAttribute('aLevel', new BufferAttribute(level, 1));
    g.setAttribute('aDeep', new BufferAttribute(dDeep, 1));
    g.setAttribute('aSup', new BufferAttribute(dSup, 1));
    g.setAttribute('aLiftW', new BufferAttribute(lw, 1));
    this.knotAttr = new BufferAttribute(this.knot, 1);
    g.setAttribute('aKnot', this.knotAttr);
    this.lineMaterial = createStalkMaterial();
    this.lines = new LineSegments(g, this.lineMaterial);
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
    const cDeep = new Float32Array(M);
    const cSup = new Float32Array(M);
    idx.forEach((i, k) => {
      cLevel[k] = ladder.level[i];
      cLw[k] = liftWeight[i];
      cDeep[k] = deep[i];
      cSup[k] = sup[i];
    });
    const cg = this.collarGeo;
    cg.setAttribute('position', new BufferAttribute(this.cPos, 3));
    cg.setAttribute('normal', new BufferAttribute(this.cNrm, 3));
    cg.setAttribute('aLevel', new BufferAttribute(cLevel, 1));
    cg.setAttribute('aLiftW', new BufferAttribute(cLw, 1));
    cg.setAttribute('aDeep', new BufferAttribute(cDeep, 1));
    cg.setAttribute('aSup', new BufferAttribute(cSup, 1));
    this.cKnotAttr = new BufferAttribute(this.cKnot, 1);
    cg.setAttribute('aKnot', this.cKnotAttr);
    this.collarMaterial = createCollarMaterial();
    this.collars = new Points(cg, this.collarMaterial);
    this.collars.frustumCulled = false;
    this.collars.renderOrder = 3;
  }

  /** Skin positions/normals of perforators on the current figure. */
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

  applyTheme(t: SceneTheme) {
    for (const m of [this.lineMaterial, this.collarMaterial]) {
      m.uniforms.uColor.value.copy(t.point);
      m.uniforms.uKnot.value.copy(t.knot);
      m.uniforms.uGlowMode.value = t.glow;
      m.blending = t.glow ? AdditiveBlending : NormalBlending;
      m.needsUpdate = true;
    }
    const a = t.glow ? [0.034, 0.16, 0.5] : [0.05, 0.2, 0.55];
    this.lineMaterial.uniforms.uAlpha.value.set(a[0], a[1], a[2]);
  }
}

function createStalkMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...LAYER_UNIFORMS,
      ...WINDOW_UNIFORMS,
      uColor: { value: new Color() },
      uKnot: { value: new Color() },
      uGlowMode: { value: 1 },
      uAlpha: { value: new Vector3(0.034, 0.16, 0.5) },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      attribute float aLevel;
      attribute float aDeep;
      attribute float aSup;
      attribute float aLiftW;
      attribute float aKnot;
      uniform vec3 uAlpha;
      ${LAYERS_GLSL}
      ${WINDOW_GLSL}
      varying float vA;
      varying float vKnot;
      varying float vEnd;
      varying vec3 vClipPos;
      void main() {
        if (aLevel < 0.5 && windowR(position) < SUP_FRAC) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        vec3 n = normalize(normal);
        float deep = deepOffset(aDeep);
        float sup = supOffset(aSup, aLiftW);
        float skin = skinOffset(aLiftW);
        float lo;
        float hi;
        if (aLevel > 1.5) { lo = deep - 0.006; hi = sup; }
        else if (aLevel > 0.5) { lo = deep + 0.0005; hi = sup + 0.0015; }
        else { lo = sup; hi = skin; }
        vec3 p = position + n * mix(lo, hi, aEnd);
        vClipPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        vA = aLevel < 0.5 ? uAlpha.x : (aLevel < 1.5 ? uAlpha.y : uAlpha.z);
        vKnot = aKnot;
        vEnd = aEnd;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uKnot;
      uniform float uGlowMode;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying float vKnot;
      varying float vEnd;
      varying vec3 vClipPos;
      void main() {
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float a = vA * mix(0.45, 1.0, vEnd) * (1.0 + vKnot * 1.4);
        vec3 col = mix(uColor, uKnot, clamp(vKnot * 1.3, 0.0, 1.0));
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
      ...LAYER_UNIFORMS,
      ...WINDOW_UNIFORMS,
      uColor: { value: new Color() },
      uKnot: { value: new Color() },
      uProjScale: { value: 800 },
      uGlowMode: { value: 1 },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aLevel;
      attribute float aDeep;
      attribute float aSup;
      attribute float aLiftW;
      attribute float aKnot;
      uniform float uProjScale;
      ${LAYERS_GLSL}
      ${WINDOW_GLSL}
      varying float vKnot;
      varying float vLevel;
      varying vec3 vClipPos;
      void main() {
        if (uWindowOn > 0.5 && windowR(position) > 1.0) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }
        vec3 n = normalize(normal);
        float off = aLevel > 1.5 ? deepOffset(aDeep) + 0.0006 : supOffset(aSup, aLiftW);
        vec3 p = position + n * off;
        vClipPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (aLevel > 1.5 ? 0.0075 : 0.0042) * (1.0 + aKnot * 0.6);
        gl_PointSize = clamp(size * uProjScale / max(0.05, -mv.z), 2.0, 64.0);
        vKnot = aKnot;
        vLevel = aLevel;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uKnot;
      uniform float uGlowMode;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vKnot;
      varying float vLevel;
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
        float a = ring * (vLevel > 1.5 ? 0.85 : 0.5) + fill;
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else {
          if (a < 0.01) discard;
          gl_FragColor = vec4(col, a);
        }
      }
    `,
  });
}
