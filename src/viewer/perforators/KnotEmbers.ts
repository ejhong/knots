import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial, Vector4 } from 'three';
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from '../body/layerModel';
import type { SceneTheme } from '../engine/theme';
import type { Ladder } from './generate';

/**
 * Knots, drawn where the hypothesis puts them: at the collar where a stuck
 * perforator pierces a fascia — the deep fascia for major perforators, the
 * superficial fascia for the rest. Size follows the rung and how stuck it is.
 */
export class KnotEmbers {
  readonly points: Points;
  readonly material: ShaderMaterial;
  private geo = new BufferGeometry();
  private pos: Float32Array;
  private nrm: Float32Array;
  readonly knot: Float32Array;
  private knotAttr: BufferAttribute;

  constructor(ladder: Ladder, deep: Float32Array, sup: Float32Array, liftWeight: Float32Array) {
    const N = ladder.count;
    this.pos = new Float32Array(N * 3);
    this.nrm = new Float32Array(N * 3);
    this.knot = new Float32Array(N);
    const level = Float32Array.from(ladder.level);
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('normal', new BufferAttribute(this.nrm, 3));
    this.geo.setAttribute('aLevel', new BufferAttribute(level, 1));
    this.geo.setAttribute('aDeep', new BufferAttribute(deep, 1));
    this.geo.setAttribute('aSup', new BufferAttribute(sup, 1));
    this.geo.setAttribute('aLiftW', new BufferAttribute(liftWeight, 1));
    this.knotAttr = new BufferAttribute(this.knot, 1);
    this.geo.setAttribute('aKnot', this.knotAttr);
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        ...LAYER_UNIFORMS,
        ...WINDOW_UNIFORMS,
        uKnot: { value: new Color() },
        uKnotCore: { value: new Color() },
        uProjScale: { value: 800 },
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
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
        uniform float uPixelRatio;
        uniform float uTime;
        ${LAYERS_GLSL}
        ${WINDOW_GLSL}
        varying float vKnot;
        varying float vLevel;
        varying vec3 vClipPos;
        void main() {
          vKnot = aKnot;
          vLevel = aLevel;
          if (aKnot < 0.02 || (aLevel < 0.5 && windowR(position) < SUP_FRAC)) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            return;
          }
          vec3 n = normalize(normal);
          float off = aLevel > 1.5 ? deepOffset(aDeep) + 0.001 : supOffset(aSup, aLiftW) + 0.0005;
          vec3 p = position + n * off;
          vClipPos = p;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          // Rung sets the scale: a small collar is a pinpoint, a major one a coin.
          float base = aLevel > 1.5 ? 0.012 : (aLevel > 0.5 ? 0.0072 : 0.0034);
          float breathe = 1.0 + 0.05 * sin(uTime * 0.9 + position.x * 40.0);
          float px = base * (0.45 + 0.75 * aKnot) * breathe * uProjScale / max(0.05, -mv.z);
          gl_PointSize = clamp(px, 2.2 * uPixelRatio, 80.0 * uPixelRatio);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uKnot;
        uniform vec3 uKnotCore;
        uniform float uGlowMode;
        uniform vec4 uClip;
        uniform float uClipOn;
        varying float vKnot;
        varying float vLevel;
        varying vec3 vClipPos;
        void main() {
          if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
          float r = length(gl_PointCoord * 2.0 - 1.0);
          if (r > 1.0) discard;
          float core = 1.0 - smoothstep(0.22, 0.4, r);
          float halo = exp(-r * r * 4.5);
          float big = vLevel / 2.0;
          vec3 col = mix(uKnot, uKnotCore, core * (0.3 + 0.5 * big));
          // Micro-knots stay quiet: there are thousands of them.
          float rung = vLevel > 0.5 ? 1.0 : 0.66;
          float a = (core * 0.9 + halo * (0.35 + 0.35 * big)) * clamp(vKnot * 1.3, 0.0, 1.0) * rung;
          if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
          else {
            if (a < 0.02) discard;
            gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
          }
        }
      `,
    });
    this.points = new Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  refresh(positions: Float32Array, normals: Float32Array) {
    this.pos.set(positions);
    this.nrm.set(normals);
    (this.geo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('normal') as BufferAttribute).needsUpdate = true;
  }

  setKnots(knot: Float32Array) {
    this.knot.set(knot);
    this.knotAttr.needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    const u = this.material.uniforms;
    u.uKnot.value.copy(t.knot);
    u.uKnotCore.value.copy(t.knotCore);
    u.uGlowMode.value = t.glow;
    this.material.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
  }
}
