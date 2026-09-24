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
import { evalAnchors, type Anchor, type AnchorSet } from '../anchors/anchors';
import type { Vec3 } from '../anchors/locate';
import type { BodyModel } from '../body/BodyModel';
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from '../body/layerModel';
import type { SceneTheme } from '../engine/theme';
import { hash01 } from '../lib/random';
import { KnotSim } from '../sim/KnotSim';

/** The layer a theory puts its knots in. */
export type SiteMode = 'muscle' | 'plane' | 'deep' | 'sup' | 'skin';
const MODE: Record<SiteMode, number> = { muscle: 0, plane: 1, deep: 2, sup: 3, skin: 4 };

export interface KnotSite {
  anchor: Anchor;
  mode: SiteMode;
  /** Depth below the deep fascia, for muscle (m). */
  extra?: number;
  /** A taut band along the surface: the fibre direction (figure coordinates). */
  band?: Vec3;
  /** A nerve rising through the layers at this site. */
  nerve?: boolean;
  /** Susceptibility, 0…1: higher holds earlier in life. */
  weight: number;
}

export interface SiteStyle {
  /** World size of a full knot (m). */
  size: number;
  /** A soft patch rather than an ember (a region, not a point). */
  patch?: boolean;
  /** Percepts: each site comes and goes. */
  twinkle?: boolean;
  /** Half the length of a taut band (m). */
  band?: number;
}

/**
 * Knots for the theories that place them at sites: trigger points in taut
 * bands of muscle, densified patches in the gliding plane, sensitised nerves
 * where they pierce the fascia, and percepts on the skin. The knot is the
 * same ember as everywhere else — only its place (and, for a patch, its
 * spread) changes. Sites hold on the same age curve as the perforator knots
 * and grow with the years they have held.
 */
export class SiteKnots {
  readonly points: Points;
  readonly lines: LineSegments;
  readonly pointMaterial: ShaderMaterial;
  readonly lineMaterial: ShaderMaterial;
  readonly count: number;
  readonly knot: Float32Array;
  private set: AnchorSet;
  private pos: Float32Array;
  private nrm: Float32Array;
  private weight: Float32Array;
  private personal: Float32Array;
  private onset?: Float32Array;
  private pGeo = new BufferGeometry();
  private lGeo = new BufferGeometry();
  /** Line vertices: which site each belongs to. */
  private lSite: Int32Array;
  private lKnot: Float32Array;
  private lTan: Float32Array;

  constructor(
    readonly sites: KnotSite[],
    readonly style: SiteStyle,
    triangles: Uint32Array,
    deep: Float32Array,
    sup: Float32Array,
    lift: Float32Array,
  ) {
    const n = sites.length;
    this.count = n;
    this.knot = new Float32Array(n);
    this.weight = Float32Array.from(sites, (s) => s.weight);
    this.personal = Float32Array.from(sites, (_, i) => hash01(i * 7919 + 71));
    const tri = Uint32Array.from(sites, (s) => s.anchor.tri);
    const uv = new Float32Array(n * 2);
    sites.forEach((s, i) => {
      uv[i * 2] = s.anchor.u;
      uv[i * 2 + 1] = s.anchor.v;
    });
    this.set = { tri, uv, count: n };
    this.pos = new Float32Array(n * 3);
    this.nrm = new Float32Array(n * 3);
    const v0 = (i: number) => triangles[sites[i].anchor.tri * 3];
    const attrs = (count: number, of: (k: number) => number) => {
      const mode = new Float32Array(count);
      const aDeep = new Float32Array(count);
      const aSup = new Float32Array(count);
      const aLift = new Float32Array(count);
      const aExtra = new Float32Array(count);
      for (let k = 0; k < count; k++) {
        const i = of(k);
        const v = v0(i);
        mode[k] = MODE[sites[i].mode];
        aDeep[k] = deep[v];
        aSup[k] = sup[v];
        aLift[k] = lift[v];
        aExtra[k] = sites[i].extra ?? 0;
      }
      return { mode, aDeep, aSup, aLift, aExtra };
    };

    const pa = attrs(n, (k) => k);
    this.pGeo.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    this.pGeo.setAttribute('normal', new BufferAttribute(new Float32Array(n * 3), 3));
    this.pGeo.setAttribute('aKnot', new BufferAttribute(this.knot, 1));
    this.pGeo.setAttribute('aMode', new BufferAttribute(pa.mode, 1));
    this.pGeo.setAttribute('aDeep', new BufferAttribute(pa.aDeep, 1));
    this.pGeo.setAttribute('aSup', new BufferAttribute(pa.aSup, 1));
    this.pGeo.setAttribute('aLiftW', new BufferAttribute(pa.aLift, 1));
    this.pGeo.setAttribute('aExtra', new BufferAttribute(pa.aExtra, 1));
    this.pGeo.setAttribute('aPhase', new BufferAttribute(Float32Array.from(this.personal), 1));

    // Bands and nerves: two vertices per site that has one.
    const withLine = sites.map((s, i) => (s.band || s.nerve ? i : -1)).filter((i) => i >= 0);
    const L = withLine.length * 2;
    this.lSite = Int32Array.from({ length: L }, (_, k) => withLine[k >> 1]);
    this.lKnot = new Float32Array(L);
    this.lTan = new Float32Array(L * 3);
    const la = attrs(L, (k) => this.lSite[k]);
    this.lGeo.setAttribute('position', new BufferAttribute(new Float32Array(L * 3), 3));
    this.lGeo.setAttribute('normal', new BufferAttribute(new Float32Array(L * 3), 3));
    this.lGeo.setAttribute('aKnot', new BufferAttribute(this.lKnot, 1));
    this.lGeo.setAttribute('aMode', new BufferAttribute(la.mode, 1));
    this.lGeo.setAttribute('aDeep', new BufferAttribute(la.aDeep, 1));
    this.lGeo.setAttribute('aSup', new BufferAttribute(la.aSup, 1));
    this.lGeo.setAttribute('aLiftW', new BufferAttribute(la.aLift, 1));
    this.lGeo.setAttribute('aExtra', new BufferAttribute(la.aExtra, 1));
    this.lGeo.setAttribute('aEnd', new BufferAttribute(Float32Array.from({ length: L }, (_, k) => k & 1), 1));
    this.lGeo.setAttribute('aNerve', new BufferAttribute(Float32Array.from({ length: L }, (_, k) => (sites[this.lSite[k]].nerve ? 1 : 0)), 1));
    this.lGeo.setAttribute('aTan', new BufferAttribute(this.lTan, 3));

    this.pointMaterial = pointMaterial(style);
    this.lineMaterial = lineMaterial();
    this.points = new Points(this.pGeo, this.pointMaterial);
    this.lines = new LineSegments(this.lGeo, this.lineMaterial);
    for (const o of [this.lines, this.points]) {
      o.frustumCulled = false;
      o.visible = false;
    }
    this.lines.renderOrder = 5;
    this.points.renderOrder = 5;
  }

  refresh(body: BodyModel) {
    evalAnchors(this.set, body.triangles, body.positions, body.normals, this.pos, this.nrm);
    (this.pGeo.getAttribute('position').array as Float32Array).set(this.pos);
    (this.pGeo.getAttribute('normal').array as Float32Array).set(this.nrm);
    this.pGeo.getAttribute('position').needsUpdate = true;
    this.pGeo.getAttribute('normal').needsUpdate = true;
    const lp = this.lGeo.getAttribute('position').array as Float32Array;
    const ln = this.lGeo.getAttribute('normal').array as Float32Array;
    const half = this.style.band ?? 0.015;
    const n = new Vector3();
    const d = new Vector3();
    for (let k = 0; k < this.lSite.length; k++) {
      const i = this.lSite[k];
      for (let c = 0; c < 3; c++) {
        lp[k * 3 + c] = this.pos[i * 3 + c];
        ln[k * 3 + c] = this.nrm[i * 3 + c];
      }
      const band = this.sites[i].band;
      if (band) {
        // The fibre direction laid into the surface.
        n.fromArray(this.nrm, i * 3);
        d.set(band[0], band[1], band[2]);
        d.addScaledVector(n, -d.dot(n)).normalize().multiplyScalar(half);
        this.lTan.set([d.x, d.y, d.z], k * 3);
      }
    }
    this.lGeo.getAttribute('position').needsUpdate = true;
    this.lGeo.getAttribute('normal').needsUpdate = true;
    this.lGeo.getAttribute('aTan').needsUpdate = true;
  }

  /** Which sites a life has held by this age, and how long (same curve as the perforator knots). */
  settle(age: number) {
    if (!this.onset) {
      const risk = Float32Array.from(this.weight, (w, i) => 0.7 * w + 0.3 * this.personal[i]);
      const order = Array.from({ length: this.count }, (_, i) => i).sort((a, b) => risk[b] - risk[a]);
      this.onset = new Float32Array(this.count);
      order.forEach((i, r) => (this.onset![i] = KnotSim.onsetAge((r + 0.5) / this.count)));
    }
    for (let i = 0; i < this.count; i++) {
      const years = age - this.onset[i];
      this.knot[i] = years < 0 ? 0 : (0.2 + 0.8 * (1 - Math.exp(-years / 14))) * (0.8 + 0.2 * this.weight[i]);
    }
    for (let k = 0; k < this.lSite.length; k++) this.lKnot[k] = this.knot[this.lSite[k]];
    this.pGeo.getAttribute('aKnot').needsUpdate = true;
    this.lGeo.getAttribute('aKnot').needsUpdate = true;
  }

  census(): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (this.knot[i] > 0) n++;
    return n;
  }

  setVisible(on: boolean) {
    this.points.visible = on;
    this.lines.visible = on;
  }

  applyTheme(t: SceneTheme) {
    const pu = this.pointMaterial.uniforms;
    pu.uColor.value.copy(t.knot);
    pu.uCore.value.copy(t.knotCore);
    const lu = this.lineMaterial.uniforms;
    lu.uBand.value.copy(t.glow ? new Color('#a8948a') : new Color('#8a7468'));
    lu.uNerve.value.copy(t.glow ? new Color('#ece2bf') : new Color('#8c7a3e'));
    for (const m of [this.pointMaterial, this.lineMaterial]) {
      m.uniforms.uGlowMode.value = t.glow;
      m.blending = t.glow ? AdditiveBlending : NormalBlending;
      m.needsUpdate = true;
    }
  }
}

const UNIFORMS = () => ({
  ...LAYER_UNIFORMS,
  ...WINDOW_UNIFORMS,
  uColor: { value: new Color() },
  uCore: { value: new Color() },
  uBand: { value: new Color() },
  uNerve: { value: new Color() },
  uGlowMode: { value: 1 },
  uDim: { value: 1 },
  uTime: { value: 0 },
  uProjScale: { value: 800 },
  uPixelRatio: { value: 1 },
  uClip: { value: new Vector4() },
  uClipOn: { value: 0 },
});

/** Where a site sits in depth, in the exploded view or true. */
const PLACE = /* glsl */ `
  attribute float aMode;
  attribute float aDeep;
  attribute float aSup;
  attribute float aLiftW;
  attribute float aExtra;
  attribute float aKnot;
  ${LAYERS_GLSL}
  ${WINDOW_GLSL}
  float depthOffset() {
    if (aMode < 0.5) return -(aDeep + aExtra);
    if (aMode < 1.5) return 0.5 * (supOffset(aSup, aLiftW) + deepOffset(aDeep));
    if (aMode < 2.5) return deepOffset(aDeep) + 0.001;
    if (aMode < 3.5) return supOffset(aSup, aLiftW) + 0.0008;
    return skinOffset(aLiftW) + 0.0015;
  }
  /** The dissection window removes skin and superficial fascia, and what lies in them. */
  bool cutAway() {
    float r = windowR(position);
    return (aMode > 3.5 && r < 1.0) || (aMode > 2.5 && aMode < 3.5 && r < SUP_FRAC);
  }
`;

function pointMaterial(style: SiteStyle) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: { ...UNIFORMS(), uSize: { value: style.size }, uPatch: { value: style.patch ? 1 : 0 }, uTwinkle: { value: style.twinkle ? 1 : 0 } },
    vertexShader: /* glsl */ `
      ${PLACE}
      attribute float aPhase;
      uniform float uSize;
      uniform float uPatch;
      uniform float uTwinkle;
      uniform float uTime;
      uniform float uProjScale;
      uniform float uPixelRatio;
      uniform float uDim;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = position + n * depthOffset();
        vClipPos = p;
        float facing = dot(n, normalize(cameraPosition - p));
        if (aKnot < 0.02 || facing < 0.05 || cutAway()) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          vA = 0.0;
          return;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float grow = uPatch > 0.5 ? 0.6 + 0.6 * aKnot : 0.35 + 0.95 * aKnot;
        gl_PointSize = clamp(uSize * grow * uProjScale / max(0.05, -mv.z), 1.5 * uPixelRatio, 90.0 * uPixelRatio);
        // A percept comes and goes: each site shows now and then, somewhere else next.
        float tw = uTwinkle > 0.5 ? smoothstep(0.5, 1.0, sin(uTime * (0.22 + aPhase * 0.35) + aPhase * 47.0)) : 1.0;
        vA = clamp(aKnot * aKnot * 1.3, 0.0, 1.0) * smoothstep(0.05, 0.35, facing) * tw * uDim;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uCore;
      uniform float uGlowMode;
      uniform float uPatch;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        if (vA < 0.004) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        float a;
        vec3 col;
        if (uPatch > 0.5) {
          // A soft patch: thickened ground, not a point.
          a = exp(-r * r * 3.6) * (1.0 - smoothstep(0.85, 1.0, r)) * 0.3 * vA;
          col = uColor;
        } else {
          float core = 1.0 - smoothstep(0.22, 0.4, r);
          float halo = exp(-r * r * 4.5);
          col = mix(uColor, uCore, core * 0.55);
          a = (core * 0.9 + halo * 0.5) * vA;
        }
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else {
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
        }
      }
    `,
  });
}

function lineMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: UNIFORMS(),
    vertexShader: /* glsl */ `
      ${PLACE}
      attribute float aEnd;
      attribute float aNerve;
      attribute vec3 aTan;
      uniform float uDim;
      varying float vA;
      varying float vNerve;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = aNerve > 0.5
          // A nerve: from under the deep fascia up through it to the superficial fascia.
          ? position + n * mix(deepOffset(aDeep) - 0.004, supOffset(aSup, aLiftW), aEnd)
          // A taut band along the muscle's fibres.
          : position + n * depthOffset() + aTan * (aEnd * 2.0 - 1.0);
        vClipPos = p;
        float facing = dot(n, normalize(cameraPosition - p));
        vA = aKnot < 0.02 || cutAway() ? 0.0 : (aNerve > 0.5 ? 0.14 + 0.22 * aKnot : 0.25 + 0.45 * aKnot) * smoothstep(0.05, 0.35, facing) * uDim;
        vNerve = aNerve;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBand;
      uniform vec3 uNerve;
      uniform float uGlowMode;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying float vNerve;
      varying vec3 vClipPos;
      void main() {
        if (vA < 0.01) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        vec3 col = vNerve > 0.5 ? uNerve : uBand;
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * vA, 1.0);
        else gl_FragColor = vec4(col, vA);
      }
    `,
  });
}
