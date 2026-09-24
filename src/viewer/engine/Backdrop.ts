import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { mulberry32 } from '../lib/random';
import type { SceneTheme } from './theme';

/**
 * The void and its light. A full-screen backdrop with a faint mandorla — the
 * halo behind a seated figure (kōhai, 光背) — centred on the body, a slow
 * vignette, and film grain; plus a scatter of dust drifting in the dark.
 */
export class Backdrop {
  readonly mesh: Mesh;
  readonly dust: Points;
  private material: ShaderMaterial;
  private dustMaterial: ShaderMaterial;

  constructor() {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.material = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uBg: { value: new Color() },
        uHalo: { value: new Color() },
        uHaloCenter: { value: new Vector2(0.5, 0.55) },
        uHaloSize: { value: new Vector2(0.18, 0.42) },
        uHaloStrength: { value: 0.1 },
        uAspect: { value: 1 },
        uTime: { value: 0 },
        uGrain: { value: 0.03 },
        uVignette: { value: 0.35 },
        uPaper: { value: 0 },
        uBreath: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position.xy, 0.9999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBg;
        uniform vec3 uHalo;
        uniform vec2 uHaloCenter;
        uniform vec2 uHaloSize;
        uniform float uHaloStrength;
        uniform float uAspect;
        uniform float uTime;
        uniform float uGrain;
        uniform float uVignette;
        uniform float uPaper;
        uniform float uBreath;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        void main() {
          vec2 p = vUv - uHaloCenter;
          p.x *= uAspect;
          // Mandorla: a soft vertical almond of light.
          vec2 q = p / uHaloSize;
          float d = length(q);
          float halo = exp(-d * d * 1.6) * (1.0 + 0.06 * uBreath);
          float inner = exp(-d * d * 7.0) * 0.35;
          vec3 col = uBg + uHalo * (halo + inner) * uHaloStrength;
          // Vignette.
          vec2 v = vUv - 0.5;
          v.x *= uAspect;
          col *= 1.0 - uVignette * smoothstep(0.25, 1.1, length(v));
          // Paper fibres (paper theme only).
          if (uPaper > 0.5) {
            vec2 fp = vUv * vec2(uAspect, 1.0) * 900.0;
            float fib = noise(fp * vec2(0.08, 1.3)) * 0.5 + noise(fp * vec2(1.1, 0.07)) * 0.5;
            col -= (fib - 0.5) * 0.018;
          }
          // Grain.
          float gr = hash(vUv * 1000.0 + fract(uTime * 0.37) * 100.0) - 0.5;
          col += gr * uGrain;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;

    // Dust in the void.
    const n = 2600;
    const rng = mulberry32(3);
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = 0.9 + Math.pow(rng(), 0.7) * 4.2;
      const a = rng() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = -0.4 + rng() * 3.4;
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = rng();
    }
    const dg = new BufferGeometry();
    dg.setAttribute('position', new BufferAttribute(pos, 3));
    dg.setAttribute('aSeed', new BufferAttribute(seed, 1));
    this.dustMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: new Color() },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uAlpha: { value: 0.5 },
        uGlowMode: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vA;
        void main() {
          vec3 p = position;
          float t = uTime * (0.012 + aSeed * 0.02);
          p.y = mod(p.y + t + 0.4, 3.4) - 0.4;
          p.x += sin(uTime * 0.07 + aSeed * 30.0) * 0.08;
          p.z += cos(uTime * 0.05 + aSeed * 17.0) * 0.08;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = -mv.z;
          gl_PointSize = clamp((0.9 + aSeed * 1.4) * uPixelRatio * (3.5 / max(dist, 0.5)), 0.6, 3.0 * uPixelRatio);
          float edge = smoothstep(-0.4, 0.2, p.y) * (1.0 - smoothstep(2.6, 3.0, p.y));
          vA = edge * (0.25 + 0.75 * fract(aSeed * 13.7)) * (0.6 + 0.4 * sin(uTime * (0.3 + aSeed) + aSeed * 50.0));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uAlpha;
        uniform float uGlowMode;
        varying float vA;
        void main() {
          float r = length(gl_PointCoord * 2.0 - 1.0);
          float a = (1.0 - smoothstep(0.2, 1.0, r)) * vA * uAlpha;
          if (uGlowMode > 0.5) gl_FragColor = vec4(uColor * a, 1.0);
          else gl_FragColor = vec4(uColor, a * 0.6);
        }
      `,
    });
    this.dust = new Points(dg, this.dustMaterial);
    this.dust.frustumCulled = false;
    this.dust.renderOrder = -1;
  }

  applyTheme(t: SceneTheme) {
    const u = this.material.uniforms;
    u.uBg.value.copy(t.background);
    u.uPaper.value = t.glow ? 0 : 1;
    if (t.glow) {
      u.uHalo.value.copy(t.halo);
      u.uHaloStrength.value = 0.075;
      u.uGrain.value = 0.011;
      u.uVignette.value = 0.5;
    } else {
      u.uHalo.value.copy(t.halo);
      u.uHaloStrength.value = 0.05;
      u.uGrain.value = 0.012;
      u.uVignette.value = 0.12;
    }
    const d = this.dustMaterial.uniforms;
    d.uColor.value.copy(t.point);
    d.uGlowMode.value = t.glow;
    d.uAlpha.value = t.glow ? 0.55 : 0.35;
    this.dustMaterial.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.dustMaterial.needsUpdate = true;
  }

  update(time: number, aspect: number, haloCenter: Vector2, haloScale: number, pixelRatio: number, breath = 0) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uAspect.value = aspect;
    u.uHaloCenter.value.copy(haloCenter);
    u.uHaloSize.value.set(0.16 * haloScale, 0.38 * haloScale);
    u.uBreath.value = breath;
    this.dustMaterial.uniforms.uTime.value = time;
    this.dustMaterial.uniforms.uPixelRatio.value = pixelRatio;
  }
}

/** Projects a world point to [0,1] screen UV. */
export function screenUv(p: Vector3, camera: import('three').Camera, out: Vector2) {
  const v = p.clone().project(camera);
  return out.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
}
