import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  FloatType,
  NormalBlending,
  Points,
  RedFormat,
  ShaderMaterial,
  Vector4,
} from 'three';
import { evalAnchors, type AnchorSet } from '../anchors/anchors';
import { LAYERS_GLSL, LAYER_UNIFORMS } from './layerModel';
import type { SceneTheme } from '../engine/theme';
import { mulberry32 } from '../lib/random';
import type { BodyModel } from './BodyModel';

/**
 * The interstitial plane between the sheet and the floor — loose areolar
 * tissue, rich in hyaluronan: the glide layer, and the “danger area” where
 * anything introduced spreads. Drawn as a drifting mist of hyaluronan that
 * gathers and brightens around a stuck staple: the gelled collar.
 */
export class Interstitium {
  readonly points: Points;
  readonly material: ShaderMaterial;
  private geo = new BufferGeometry();
  private anchors: AnchorSet;
  private pos: Float32Array;
  private nrm: Float32Array;
  private perfPos: Float32Array;
  readonly knotTex: DataTexture;
  private texData: Float32Array;
  private perf: Int32Array;

  constructor(
    body: BodyModel,
    count: number,
    /** Nearest perforator for a reference-space point. */
    nearestPerforator: (x: number, y: number, z: number) => number,
    perforatorCount: number,
    inset: Float32Array,
    sup: Float32Array,
    liftWeight: Float32Array,
    seed = 17,
  ) {
    const rng = mulberry32(seed);
    const T = body.triangles;
    const P = body.positions;
    // Area-weighted sampling on the fine mesh (reference shape).
    const nt = T.length / 3;
    const cdf = new Float64Array(nt);
    let acc = 0;
    for (let t = 0; t < nt; t++) {
      const a = T[t * 3] * 3;
      const b = T[t * 3 + 1] * 3;
      const c = T[t * 3 + 2] * 3;
      const ux = P[b] - P[a];
      const uy = P[b + 1] - P[a + 1];
      const uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a];
      const vy = P[c + 1] - P[a + 1];
      const vz = P[c + 2] - P[a + 2];
      acc += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      cdf[t] = acc;
    }
    const tri = new Uint32Array(count);
    const uv = new Float32Array(count * 2);
    const depth = new Float32Array(count);
    const seedA = new Float32Array(count);
    const ins = new Float32Array(count);
    const sp = new Float32Array(count);
    const lw = new Float32Array(count);
    this.perf = new Int32Array(count);
    const perfIdx = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = rng() * acc;
      let lo = 0;
      let hi = nt - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      const r1 = Math.sqrt(rng());
      const r2 = rng();
      tri[i] = lo;
      uv[i * 2] = r1 * (1 - r2);
      uv[i * 2 + 1] = r1 * r2;
      depth[i] = rng();
      seedA[i] = rng();
      const v0 = T[lo * 3];
      ins[i] = inset[v0];
      sp[i] = sup[v0];
      lw[i] = liftWeight[v0];
    }
    this.anchors = { tri, uv, count };
    this.pos = new Float32Array(count * 3);
    this.nrm = new Float32Array(count * 3);
    this.perfPos = new Float32Array(count * 3);
    evalAnchors(this.anchors, T, P, body.normals, this.pos, this.nrm);
    for (let i = 0; i < count; i++) {
      const j = nearestPerforator(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      this.perf[i] = j;
      perfIdx[i] = j;
    }

    const W = 1024;
    const H = Math.ceil(perforatorCount / W);
    this.texData = new Float32Array(W * H);
    this.knotTex = new DataTexture(this.texData, W, H, RedFormat, FloatType);
    this.knotTex.needsUpdate = true;

    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('normal', new BufferAttribute(this.nrm, 3));
    this.geo.setAttribute('aPerfPos', new BufferAttribute(this.perfPos, 3));
    this.geo.setAttribute('aDepth', new BufferAttribute(depth, 1));
    this.geo.setAttribute('aSeed', new BufferAttribute(seedA, 1));
    this.geo.setAttribute('aInset', new BufferAttribute(ins, 1));
    this.geo.setAttribute('aSup', new BufferAttribute(sp, 1));
    this.geo.setAttribute('aLiftW', new BufferAttribute(lw, 1));
    this.geo.setAttribute('aPerf', new BufferAttribute(perfIdx, 1));
    this.material = createMaterial(this.knotTex, W);
    this.points = new Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
  }

  refresh(body: BodyModel, perforatorPositions: Float32Array) {
    evalAnchors(this.anchors, body.triangles, body.positions, body.normals, this.pos, this.nrm);
    for (let i = 0; i < this.perf.length; i++) {
      const j = this.perf[i];
      for (let k = 0; k < 3; k++) this.perfPos[i * 3 + k] = perforatorPositions[j * 3 + k];
    }
    for (const n of ['position', 'normal', 'aPerfPos']) (this.geo.getAttribute(n) as BufferAttribute).needsUpdate = true;
  }

  setKnots(knot: Float32Array) {
    this.texData.set(knot.subarray(0, Math.min(knot.length, this.texData.length)));
    this.knotTex.needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    const u = this.material.uniforms;
    u.uColor.value.copy(t.mist);
    u.uGel.value.copy(t.gel);
    u.uGlowMode.value = t.glow;
    this.material.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
  }
}

function createMaterial(tex: DataTexture, width: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color() },
      uGel: { value: new Color() },
      uKnots: { value: tex },
      uTexWidth: { value: width },
      ...LAYER_UNIFORMS,
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uProjScale: { value: 800 },
      uGlowMode: { value: 1 },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aPerfPos;
      attribute float aDepth;
      attribute float aSeed;
      attribute float aInset;
      attribute float aSup;
      attribute float aLiftW;
      attribute float aPerf;
      uniform sampler2D uKnots;
      uniform float uTexWidth;
      ${LAYERS_GLSL}
      uniform float uTime;
      uniform float uProjScale;
      uniform float uPixelRatio;
      varying float vA;
      varying float vGel;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        int idx = int(aPerf + 0.5);
        int w = int(uTexWidth);
        float knot = texelFetch(uKnots, ivec2(idx - (idx / w) * w, idx / w), 0).r;
        float lo = deepOffset(aInset);
        float hi = supOffset(aSup, aLiftW);
        // Depth within the gliding plane drifts slowly.
        float d = clamp(aDepth + 0.08 * sin(uTime * (0.2 + aSeed * 0.3) + aSeed * 31.0), 0.03, 0.97);
        vec3 p = position + n * mix(lo, hi, d);
        // Tangential drift.
        vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
        vec3 t2 = cross(n, t1);
        p += (t1 * sin(uTime * 0.13 + aSeed * 50.0) + t2 * cos(uTime * 0.11 + aSeed * 70.0)) * 0.0035;
        // Gel: hyaluronan gathers around a stuck staple — the collar.
        vec3 axis = aPerfPos + n * mix(lo, hi, d);
        p = mix(p, axis, knot * 0.62);
        vClipPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (0.0011 + knot * 0.0012) * uProjScale / max(0.05, -mv.z);
        gl_PointSize = clamp(size, 1.0 * uPixelRatio, 7.0 * uPixelRatio);
        vA = (0.35 + 0.65 * fract(aSeed * 7.3)) * (1.0 + knot * 1.4);
        vGel = knot;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uGel;
      uniform float uGlowMode;
      varying float vA;
      varying float vGel;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying vec3 vClipPos;
      void main() {
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float r = length(gl_PointCoord * 2.0 - 1.0);
        float a = (1.0 - smoothstep(0.3, 1.0, r)) * vA * 0.55;
        vec3 col = mix(uColor, uGel, vGel);
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else {
          if (a < 0.01) discard;
          gl_FragColor = vec4(col, a);
        }
      }
    `,
  });
}
