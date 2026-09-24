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
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from '../body/layerModel';
import type { SceneTheme } from '../engine/theme';
import { hash01, mulberry32 } from '../lib/random';
import { KnotSim } from '../sim/KnotSim';
import type { InteriorSite } from '../data/viscera';

/**
 * Johnson's vascular latch, in the body. He places latches in vascular
 * smooth muscle wherever it wraps a vessel (and in hollow organs), with the
 * brain at the centre of his account, and does not pin them to one tissue.
 * The atlas shows two vessel beds, so it draws latched arterioles in both:
 * the small arteries of the skin (half the sites, at 1.5–3.5 mm) and those
 * inside the muscle beneath the deep fascia (the other half). Drawn as knot
 * embers — the same colour and form as every other view's knots — on short
 * arteriole segments in the vessel colour. The sites gather in the same
 * stress zones, and follow the same age curve, as the perforator knots.
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
  /** All sites; the first `surface` ride the skin and muscle, the rest are inside. */
  readonly count: number;
  readonly surface: number;
  private interior: InteriorSite[];
  private refHeight: number;

  constructor(
    body: BodyModel,
    count: number,
    zoneField: (x: number, y: number, z: number) => number,
    deepDepth: Float32Array,
    radius: (fineVertex: number) => number,
    /** Per fine vertex: how far the layers open in the exploded view. */
    liftWeight: Float32Array,
    /** Sites inside the body: great arteries and the walls of hollow organs. */
    interior: InteriorSite[] = [],
    seed = 23,
  ) {
    this.surface = count;
    this.interior = interior;
    this.count = count + interior.length;
    this.refHeight = body.height();
    const total = this.count;
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
    this.weight = new Float32Array(total);
    this.personal = new Float32Array(total);
    this.depthBelow = new Float32Array(count);
    const bed = new Float32Array(total);
    const liftW = new Float32Array(total);
    // Inside the body: neither skin nor muscle; seen through the figure.
    for (let i = count; i < total; i++) {
      bed[i] = 2;
      this.personal[i] = hash01(i * 7331 + 101);
      this.weight[i] = 0.45;
    }
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
      liftW[i] = liftWeight[v0];
      if (i % 2 === 0) {
        // The skin's own small arteries, 1.5–3.5 mm down (they lift with the skin).
        bed[i] = 1;
        this.depthBelow[i] = 0.0015 + rng() * 0.002;
      } else {
        // In the muscle: 5–14 mm under the deep fascia, never through a limb.
        const extra = 0.005 + rng() * 0.009;
        this.depthBelow[i] = Math.min(deepDepth[v0] + extra, radius(v0) * 0.5);
      }
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
    this.knot = new Float32Array(total);

    // Points (embers).
    this.pGeo.setAttribute('position', new BufferAttribute(new Float32Array(total * 3), 3));
    this.pGeo.setAttribute('normal', new BufferAttribute(new Float32Array(total * 3), 3));
    this.pGeo.setAttribute('aKnot', new BufferAttribute(this.knot, 1));
    this.pGeo.setAttribute('aBed', new BufferAttribute(bed, 1));
    this.pGeo.setAttribute('aLiftW', new BufferAttribute(liftW, 1));
    this.pointMaterial = createPointMaterial();
    this.points = new Points(this.pGeo, this.pointMaterial);
    // Arteriole segments.
    this.lPos = new Float32Array(count * 6);
    this.lKnot = new Float32Array(count * 2);
    this.lGeo.setAttribute('position', new BufferAttribute(this.lPos, 3));
    this.lGeo.setAttribute('normal', new BufferAttribute(new Float32Array(count * 6), 3));
    this.lGeo.setAttribute('aKnot', new BufferAttribute(this.lKnot, 1));
    this.lGeo.setAttribute('aBed', new BufferAttribute(Float32Array.from({ length: count * 2 }, (_, k) => bed[k >> 1]), 1));
    // (Interior sites have no arteriole segment; the lines cover the surface sites only.)
    this.lGeo.setAttribute('aLiftW', new BufferAttribute(Float32Array.from({ length: count * 2 }, (_, k) => liftW[k >> 1]), 1));
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
    for (let i = 0; i < this.surface; i++) {
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
    // Inside: from the skeleton, with offsets scaled to the body's size.
    const k = body.height() / this.refHeight;
    this.interior.forEach((site, j) => {
      const a = body.joint(site.a);
      const b = body.joint(site.b);
      const o = (this.surface + j) * 3;
      for (let c = 0; c < 3; c++) {
        P[o + c] = a[c] + (b[c] - a[c]) * site.t + site.o[c] * k;
        PN[o + c] = 0;
      }
    });
    pp.needsUpdate = true;
    pn.needsUpdate = true;
    ln.needsUpdate = true;
    (this.lGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
  }

  /** Onset ages, on the same held-fraction curve as the perforator knots. */
  private onset?: Float32Array;

  settle(age: number) {
    if (!this.onset) {
      const risk = Float32Array.from(this.weight, (w, i) => 0.7 * w + 0.3 * this.personal[i]);
      const order = Array.from({ length: this.count }, (_, i) => i).sort((a, b) => risk[b] - risk[a]);
      this.onset = new Float32Array(this.count);
      order.forEach((i, r) => (this.onset![i] = KnotSim.onsetAge((r + 0.5) / this.count)));
    }
    for (let i = 0; i < this.count; i++) {
      const years = age - this.onset[i];
      // Young latches are small and faint; old ones full.
      this.knot[i] = years < 0 ? 0 : (0.2 + 0.8 * (1 - Math.exp(-years / 14))) * (0.8 + 0.2 * this.weight[i]);
      if (i < this.surface) this.lKnot[i * 2] = this.lKnot[i * 2 + 1] = this.knot[i];
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
    this.pointMaterial.uniforms.uColor.value.copy(t.knot);
    this.pointMaterial.uniforms.uCore.value.copy(t.knotCore);
    this.lineMaterial.uniforms.uColor.value.copy(t.tree);
    for (const m of [this.pointMaterial, this.lineMaterial]) {
      m.uniforms.uGlowMode.value = t.glow;
      m.blending = t.glow ? AdditiveBlending : NormalBlending;
      m.needsUpdate = true;
    }
  }
}

const COMMON_UNIFORMS = () => ({
  uColor: { value: new Color() },
  uCore: { value: new Color() },
  uDim: { value: 1 },
  uGlowMode: { value: 1 },
  uProjScale: { value: 800 },
  uPixelRatio: { value: 1 },
  uClip: { value: new Vector4() },
  uClipOn: { value: 0 },
  ...LAYER_UNIFORMS,
  ...WINDOW_UNIFORMS,
});

/** Skin-bed latches ride with the skin in the exploded view, and go with it inside the window. */
const PLACE_GLSL = /* glsl */ `
  attribute float aBed;
  attribute float aLiftW;
  ${LAYERS_GLSL}
  ${WINDOW_GLSL}
  vec3 placeLatch(vec3 pos, vec3 n) {
    return pos + n * (aBed > 0.5 && aBed < 1.5 ? skinOffset(aLiftW) : 0.0);
  }
  bool cutAway(vec3 pos) {
    return aBed > 0.5 && aBed < 1.5 && windowR(pos) < 1.0;
  }
`;

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
      ${PLACE_GLSL}
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        bool inside = aBed > 1.5;
        vec3 n = inside ? vec3(0.0, 1.0, 0.0) : normalize(normal);
        vec3 p = placeLatch(position, n);
        vClipPos = p;
        vec3 viewDir = normalize(cameraPosition - p);
        // Sites inside the body are seen through it from every side.
        float facing = inside ? 1.0 : dot(n, viewDir);
        if (aKnot < 0.02 || facing < 0.05 || cutAway(position)) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          vA = 0.0;
          return;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // A young latch is a faint point; an old one a full ember.
        gl_PointSize = clamp(0.0078 * (inside ? 0.8 : 1.0) * (0.35 + 0.95 * aKnot) * uProjScale / max(0.05, -mv.z), 1.5 * uPixelRatio, 40.0 * uPixelRatio);
        // Deep sites read quieter, as if seen through the body.
        vA = clamp(aKnot * aKnot * 1.3, 0.0, 1.0) * smoothstep(0.05, 0.35, facing) * (inside ? 0.5 : 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uCore;
      uniform float uGlowMode;
      uniform float uDim;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        // The same ember as a perforator knot: a bright core in a soft halo.
        float core = 1.0 - smoothstep(0.22, 0.4, r);
        float halo = exp(-r * r * 4.5);
        vec3 col = mix(uColor, uCore, core * 0.55);
        float a = (core * 0.9 + halo * 0.5) * vA * uDim;
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else {
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
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
      ${PLACE_GLSL}
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        vec3 n = normalize(normal);
        vec3 p = placeLatch(position, n);
        vClipPos = p;
        vec3 viewDir = normalize(cameraPosition - p);
        float facing = dot(n, viewDir);
        vA = aKnot < 0.02 || cutAway(position) ? 0.0 : clamp(aKnot, 0.0, 1.0) * smoothstep(0.05, 0.35, facing) * 0.45;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uGlowMode;
      uniform float uDim;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying float vA;
      varying vec3 vClipPos;
      void main() {
        if (vA < 0.01) discard;
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        float a = vA * uDim;
        if (uGlowMode > 0.5) gl_FragColor = vec4(uColor * a, 1.0);
        else gl_FragColor = vec4(uColor, a);
      }
    `,
  });
}
