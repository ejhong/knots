import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineSegments, NormalBlending, ShaderMaterial, Vector4 } from 'three';
import type { SceneTheme } from '../engine/theme';

/**
 * Where a knot went: a short-lived line from a released knot to the
 * perforator that took up its hold, fading in under a second — so a knot
 * that moves can be seen to move.
 */
export class MoveTrails {
  readonly lines: LineSegments;
  readonly material: ShaderMaterial;
  private pos: Float32Array;
  private age: Float32Array;
  private alpha: Float32Array;
  private next = 0;
  private active = 0;
  static LIFE = 0.8;

  constructor(readonly capacity = 256) {
    this.pos = new Float32Array(capacity * 6);
    this.age = new Float32Array(capacity).fill(MoveTrails.LIFE);
    this.alpha = new Float32Array(capacity * 2);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new BufferAttribute(this.alpha, 1));
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { uColor: { value: new Color() }, uGlowMode: { value: 1 }, uClip: { value: new Vector4() }, uClipOn: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying float vA;
        varying vec3 vClipPos;
        void main() {
          vA = aAlpha;
          vClipPos = position;
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
    this.lines = new LineSegments(g, this.material);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 8;
  }

  add(from: ArrayLike<number>, to: ArrayLike<number>) {
    const k = this.next;
    this.next = (this.next + 1) % this.capacity;
    for (let c = 0; c < 3; c++) {
      this.pos[k * 6 + c] = from[c];
      this.pos[k * 6 + 3 + c] = to[c];
    }
    this.age[k] = 0;
    this.active = MoveTrails.LIFE;
    this.lines.geometry.getAttribute('position').needsUpdate = true;
  }

  update(dt: number) {
    if (this.active <= 0) return;
    this.active -= dt;
    for (let k = 0; k < this.capacity; k++) {
      if (this.age[k] >= MoveTrails.LIFE) {
        this.alpha[k * 2] = this.alpha[k * 2 + 1] = 0;
        continue;
      }
      this.age[k] += dt;
      const f = Math.max(0, 1 - this.age[k] / MoveTrails.LIFE);
      // Brighter where it lands.
      this.alpha[k * 2] = f * f * 0.35;
      this.alpha[k * 2 + 1] = f * f * 0.85;
    }
    this.lines.geometry.getAttribute('aAlpha').needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    this.material.uniforms.uColor.value.copy(t.knot);
    this.material.uniforms.uGlowMode.value = t.glow;
    this.material.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
  }
}
