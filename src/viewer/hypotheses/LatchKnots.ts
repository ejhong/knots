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
import { evalAnchors, type AnchorSet } from '../anchors/anchors';
import type { BodyModel } from '../body/BodyModel';
import type { SceneTheme } from '../engine/theme';
import { hash01, mulberry32 } from '../lib/random';
import { KnotSim } from '../sim/KnotSim';

/**
 * Johnson's vascular latch, in the body: knots as latched arterioles inside
 * skeletal muscle — beneath the deep fascia, where the original essay placed
 * the latch. Drawn as lavender embers on short arteriole segments, seen
 * through the fascia. The sites gather in the same stress zones, and follow
 * the same age curve, as the perforator knots, so the two can be compared.
 */
export class LatchKnots {
  readonly points: Points;
  readonly lines: LineSegments;
  readonly pointMaterial: ShaderMaterial;
  readonly lineMaterial: ShaderMaterial;
  private anchors: AnchorSet;
  private pos: Float32Array;
  private nrm: Float32Array;
  private tangent: Float32Array;
  private weight: Float32Array;
  private personal: Float32Array;
  private depthBelow: Float32Array;
  readonly knot: Float32Array;
  private pGeo = new BufferGeometry();
  private lGeo = new BufferGeometry();
  private lPos: Float32Array;
  private lKnot: Float32Array;
  readonly count: number;

  constructor(
    body: BodyModel,
    count: number,
    zoneField: (x: number, y: number, z: number) => number,
    deepDepth: Float32Array,
    radius: (fineVertex: number) => number,
    seed = 23,
  ) {
    this.count = count;
    const rng = mulberry32(seed);
    const T = body.triangles;
    const P = body.positions;
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
    this.weight = new Float32Array(count);
    this.personal = new Float32Array(count);
    this.depthBelow = new Float32Array(count);
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
      this.personal[i] = hash01(i * 7331 + 101);
      const v0 = T[lo * 3];
      // In the muscle: 5–14 mm under the deep fascia, never through a limb.
      const extra = 0.005 + rng() * 0.009;
      this.depthBelow[i] = Math.min(deepDepth[v0] + extra, radius(v0) * 0.5);
    }
    this.anchors = { tri, uv, count };
    this.pos = new Float32Array(count * 3);
    this.nrm = new Float32Array(count * 3);
    evalAnchors(this.anchors, T, P, body.normals, this.pos, this.nrm);
    for (let i = 0; i < count; i++) {
      const w = zoneField(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      this.weight[i] = w;
    }
    // A random tangent per site for its arteriole segment.
    this.tangent = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      this.tangent[i * 3] = Math.cos(a);
      this.tangent[i * 3 + 1] = rng() - 0.5;
      this.tangent[i * 3 + 2] = Math.sin(a);
    }
    this.knot = new Float32Array(count);

    // Points (embers).
    this.pGeo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    this.pGeo.setAttribute('normal', new BufferAttribute(new Float32Array(count * 3), 3));
    this.pGeo.setAttribute('aKnot', new BufferAttribute(this.knot, 1));
    this.pointMaterial = createPointMaterial();
    this.points = new Points(this.pGeo, this.pointMaterial);
    // Arteriole segments.
    this.lPos = new Float32Array(count * 6);
    this.lKnot = new Float32Array(count * 2);
    this.lGeo.setAttribute('position', new BufferAttribute(this.lPos, 3));
    this.lGeo.setAttribute('normal', new BufferAttribute(new Float32Array(count * 6), 3));
    this.lGeo.setAttribute('aKnot', new BufferAttribute(this.lKnot, 1));
    this.lineMaterial = createLineMaterial();
    this.lines = new LineSegments(this.lGeo, this.lineMaterial);
    for (const o of [this.points, this.lines]) {
      o.frustumCulled = false;
      o.renderOrder = 5;
      o.visible = false;
    }
  }

  refresh(body: BodyModel) {
    evalAnchors(this.anchors, body.triangles, body.positions, body.normals, this.pos, this.nrm);
    const pp = this.pGeo.getAttribute('position') as BufferAttribute;
    const pn = this.pGeo.getAttribute('normal') as BufferAttribute;
    const ln = this.lGeo.getAttribute('normal') as BufferAttribute;
    const P = pp.array as Float32Array;
    const PN = pn.array as Float32Array;
    const LN = ln.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      const nx = this.nrm[o];
      const ny = this.nrm[o + 1];
      const nz = this.nrm[o + 2];
      const d = this.depthBelow[i];
      const x = this.pos[o] - nx * d;
      const y = this.pos[o + 1] - ny * d;
      const z = this.pos[o + 2] - nz * d;
      P[o] = x;
      P[o + 1] = y;
      P[o + 2] = z;
      PN[o] = nx;
      PN[o + 1] = ny;
      PN[o + 2] = nz;
      // Tangent segment ~9 mm, projected off the normal.
      let tx = this.tangent[o];
      let ty = this.tangent[o + 1];
      let tz = this.tangent[o + 2];
      const dot = tx * nx + ty * ny + tz * nz;
      tx -= dot * nx;
      ty -= dot * ny;
      tz -= dot * nz;
      const l = Math.hypot(tx, ty, tz) || 1;
      const h = 0.0045 / l;
      this.lPos.set([x - tx * h, y - ty * h, z - tz * h, x + tx * h, y + ty * h, z + tz * h], i * 6);
      LN.set([nx, ny, nz, nx, ny, nz], i * 6);
    }
    pp.needsUpdate = true;
    pn.needsUpdate = true;
    ln.needsUpdate = true;
    (this.lGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
  }

  /** Which arterioles a life has latched by this age (same curve as the perforator knots). */
  settle(age: number) {
    const F = KnotSim.burden(age);
    for (let i = 0; i < this.count; i++) {
      const w = Math.min(1, Math.pow(0.2 + 0.8 * this.weight[i], 1.35) * 1.1);
      const q = F * w;
      const p = this.personal[i];
      this.knot[i] = q > p ? Math.min(1, (q - p) / (0.3 * q + 0.04)) : 0;
      this.lKnot[i * 2] = this.lKnot[i * 2 + 1] = this.knot[i];
    }
    (this.pGeo.getAttribute('aKnot') as BufferAttribute).needsUpdate = true;
    (this.lGeo.getAttribute('aKnot') as BufferAttribute).needsUpdate = true;
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
    for (const m of [this.pointMaterial, this.lineMaterial]) {
      m.uniforms.uColor.value.copy(t.glow ? new Color('#b9a5e0') : new Color('#7f68b4'));
      m.uniforms.uGlowMode.value = t.glow;
      m.blending = t.glow ? AdditiveBlending : NormalBlending;
      m.needsUpdate = true;
    }
  }
}

const COMMON_UNIFORMS = () => ({
  uColor: { value: new Color() },
  uGlowMode: { value: 1 },
  uProjScale: { value: 800 },
  uPixelRatio: { value: 1 },
  uClip: { value: new Vector4() },
  uClipOn: { value: 0 },
});

function createPointMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: COMMON_UNIFORMS(),
    vertexShader: /* glsl */ `
      attribute float aKnot;
      uniform float uProjScale;
      uniform float uPixelRatio;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vClipPos = position;
        vec3 n = normalize(normal);
        vec3 viewDir = normalize(cameraPosition - position);
        float facing = dot(n, viewDir);
        if (aKnot < 0.02 || facing < 0.05) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          vA = 0.0;
          return;
        }
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.0105 * (0.55 + 0.7 * aKnot) * uProjScale / max(0.05, -mv.z), 2.5 * uPixelRatio, 44.0 * uPixelRatio);
        vA = clamp(aKnot * 1.2, 0.0, 1.0) * smoothstep(0.05, 0.35, facing);
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
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        // A small diamond core — a latched ring of smooth muscle — in a soft halo.
        vec2 q = abs(gl_PointCoord * 2.0 - 1.0);
        float core = 1.0 - smoothstep(0.32, 0.42, q.x + q.y);
        float halo = exp(-r * r * 4.0);
        float a = (core * 0.9 + halo * 0.4) * vA;
        if (uGlowMode > 0.5) gl_FragColor = vec4(uColor * a, 1.0);
        else {
          if (a < 0.02) discard;
          gl_FragColor = vec4(uColor, a);
        }
      }
    `,
  });
}

function createLineMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: COMMON_UNIFORMS(),
    vertexShader: /* glsl */ `
      attribute float aKnot;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vClipPos = position;
        vec3 viewDir = normalize(cameraPosition - position);
        float facing = dot(normalize(normal), viewDir);
        vA = aKnot < 0.02 ? 0.0 : clamp(aKnot, 0.0, 1.0) * smoothstep(0.05, 0.35, facing) * 0.55;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
        if (vA < 0.01) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        if (uGlowMode > 0.5) gl_FragColor = vec4(uColor * vA, 1.0);
        else gl_FragColor = vec4(uColor, vA);
      }
    `,
  });
}
