import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  Points,
  ShaderMaterial,
} from 'three';
import type { SceneTheme } from '../engine/theme';

/**
 * Roots as small open rings — the gates where a trunk enters the sheet.
 * A stuck root fills with an ember; a released root flares.
 */
export class RootMarkers {
  readonly points: Points;
  readonly geometry = new BufferGeometry();
  readonly material: ShaderMaterial;
  readonly positions: Float32Array;
  readonly knot: Float32Array;
  readonly flash: Float32Array;
  readonly hover: Float32Array;
  private attrs: BufferAttribute[];

  constructor(readonly count: number) {
    this.positions = new Float32Array(count * 3);
    this.knot = new Float32Array(count);
    this.flash = new Float32Array(count);
    this.hover = new Float32Array(count);
    this.attrs = [
      new BufferAttribute(this.positions, 3),
      new BufferAttribute(this.knot, 1),
      new BufferAttribute(this.flash, 1),
      new BufferAttribute(this.hover, 1),
    ];
    this.geometry.setAttribute('position', this.attrs[0]);
    this.geometry.setAttribute('aKnot', this.attrs[1]);
    this.geometry.setAttribute('aFlash', this.attrs[2]);
    this.geometry.setAttribute('aHover', this.attrs[3]);
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      uniforms: {
        uRing: { value: new Color() },
        uKnot: { value: new Color() },
        uStar: { value: new Color() },
        uProjScale: { value: 800 },
        uSize: { value: 0.011 },
        uAlpha: { value: 0.7 },
        uGlowMode: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aKnot;
        attribute float aFlash;
        attribute float aHover;
        uniform float uProjScale;
        uniform float uSize;
        varying float vKnot;
        varying float vFlash;
        varying float vHover;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_Position.z -= 0.0004 * gl_Position.w;
          float s = uSize * (1.0 + aFlash * 2.5 + aHover * 0.5);
          gl_PointSize = clamp(s * uProjScale / max(0.05, -mv.z), 3.0, 120.0);
          vKnot = aKnot;
          vFlash = aFlash;
          vHover = aHover;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uRing;
        uniform vec3 uKnot;
        uniform vec3 uStar;
        uniform float uAlpha;
        uniform float uGlowMode;
        uniform float uTime;
        varying float vKnot;
        varying float vFlash;
        varying float vHover;
        void main() {
          vec2 c = gl_PointCoord * 2.0 - 1.0;
          float r = length(c);
          if (r > 1.0) discard;
          float px = fwidth(r);
          float ring = 1.0 - smoothstep(0.0, px * 1.5, abs(r - 0.62));
          float core = (1.0 - smoothstep(0.26, 0.26 + px * 2.0, r)) * vKnot;
          float pulse = 0.85 + 0.15 * sin(uTime * 1.3);
          float glow = exp(-r * r * 6.0) * (vKnot * 0.5 * pulse + vFlash);
          vec3 col = uRing * ring * (0.55 + vHover * 0.45) + uKnot * (core + glow * 0.6) + uStar * vFlash * (ring + glow);
          float a = max(max(ring * (0.55 + vHover * 0.45), core), glow) * uAlpha;
          if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
          else {
            if (a < 0.01) discard;
            gl_FragColor = vec4(mix(uRing, uKnot, clamp(core + glow, 0.0, 1.0)), a);
          }
        }
      `,
    });
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
  }

  update() {
    for (const a of this.attrs) a.needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    const u = this.material.uniforms;
    u.uRing.value.copy(t.tree);
    u.uKnot.value.copy(t.knot);
    u.uStar.value.copy(t.star);
    u.uGlowMode.value = t.glow;
    this.material.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
  }
}
