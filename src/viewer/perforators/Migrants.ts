import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineSegments, NormalBlending, Points, ShaderMaterial, Vector4 } from 'three';
import type { SceneTheme } from '../engine/theme';

export interface Arrival {
  to: number;
  hold: number;
}

/**
 * Knots on the move: an ember gliding from the perforator a knot has left
 * to the one taking it up, for a fraction of a second, with a fading streak
 * behind it — so knots moving in to fill a released area can be seen moving.
 */
export class Migrants {
  readonly points: Points;
  readonly material: ShaderMaterial;
  readonly streaks: LineSegments;
  readonly streakMaterial: ShaderMaterial;
  private sGeo = new BufferGeometry();
  private sPos: Float32Array;
  private sA: Float32Array;
  private geo = new BufferGeometry();
  private pos: Float32Array;
  private hold: Float32Array;
  private level: Float32Array;
  private from: Float32Array;
  private to: Float32Array;
  private t: Float32Array;
  private dur: Float32Array;
  private target: Int32Array;
  private live: Uint8Array;
  private count = 0;

  constructor(readonly capacity = 1024) {
    this.pos = new Float32Array(capacity * 3);
    this.hold = new Float32Array(capacity);
    this.level = new Float32Array(capacity);
    this.from = new Float32Array(capacity * 3);
    this.to = new Float32Array(capacity * 3);
    this.t = new Float32Array(capacity);
    this.dur = new Float32Array(capacity);
    this.target = new Int32Array(capacity).fill(-1);
    this.live = new Uint8Array(capacity);
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aHold', new BufferAttribute(this.hold, 1));
    this.geo.setAttribute('aLevel', new BufferAttribute(this.level, 1));
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uKnot: { value: new Color() },
        uKnotCore: { value: new Color() },
        uGlowMode: { value: 1 },
        uProjScale: { value: 800 },
        uPixelRatio: { value: 1 },
        uDim: { value: 1 },
        uClip: { value: new Vector4() },
        uClipOn: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aHold;
        attribute float aLevel;
        uniform float uProjScale;
        uniform float uPixelRatio;
        varying float vA;
        varying float vLevel;
        varying vec3 vClipPos;
        void main() {
          vClipPos = position;
          if (aHold <= 0.0) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            vA = 0.0;
            return;
          }
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float base = aLevel > 1.5 ? 0.012 : (aLevel > 0.5 ? 0.0056 : 0.0034);
          gl_PointSize = clamp(base * (0.45 + 0.9 * aHold) * uProjScale / max(0.05, -mv.z), 2.0 * uPixelRatio, 80.0 * uPixelRatio);
          vA = clamp(aHold * 1.3, 0.0, 1.0);
          vLevel = aLevel;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uKnot;
        uniform vec3 uKnotCore;
        uniform float uGlowMode;
        uniform float uDim;
        uniform vec4 uClip;
        uniform float uClipOn;
        varying float vA;
        varying float vLevel;
        varying vec3 vClipPos;
        void main() {
          if (vA < 0.01) discard;
          if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
          float r = length(gl_PointCoord * 2.0 - 1.0);
          if (r > 1.0) discard;
          float core = 1.0 - smoothstep(0.22, 0.4, r);
          float halo = exp(-r * r * 4.5);
          vec3 col = mix(uKnot, uKnotCore, core * 0.5);
          float a = (core * 0.9 + halo * 0.55) * vA * uDim;
          if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
          else {
            if (a < 0.02) discard;
            gl_FragColor = vec4(col, a);
          }
        }
      `,
    });
    this.points = new Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;

    this.sPos = new Float32Array(capacity * 6);
    this.sA = new Float32Array(capacity * 2);
    this.sGeo.setAttribute('position', new BufferAttribute(this.sPos, 3));
    this.sGeo.setAttribute('aA', new BufferAttribute(this.sA, 1));
    this.streakMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { uKnot: { value: new Color() }, uGlowMode: { value: 1 }, uDim: { value: 1 }, uClip: { value: new Vector4() }, uClipOn: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aA;
        varying float vA;
        varying vec3 vClipPos;
        void main() {
          vA = aA;
          vClipPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uKnot;
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
          if (uGlowMode > 0.5) gl_FragColor = vec4(uKnot * a, 1.0);
          else gl_FragColor = vec4(uKnot, a);
        }
      `,
    });
    this.streaks = new LineSegments(this.sGeo, this.streakMaterial);
    this.streaks.frustumCulled = false;
    this.streaks.renderOrder = 6;
  }

  get active() {
    return this.count > 0;
  }

  /** Sends a knot of `hold` from one point to another over `duration` seconds. */
  spawn(from: ArrayLike<number>, to: ArrayLike<number>, hold: number, level: number, duration: number, target: number) {
    let k = -1;
    for (let i = 0; i < this.capacity; i++)
      if (!this.live[i]) {
        k = i;
        break;
      }
    if (k < 0) return false;
    this.live[k] = 1;
    this.count++;
    for (let c = 0; c < 3; c++) {
      this.from[k * 3 + c] = from[c];
      this.to[k * 3 + c] = to[c];
      this.pos[k * 3 + c] = from[c];
    }
    this.hold[k] = hold;
    this.level[k] = level;
    this.t[k] = 0;
    this.dur[k] = duration;
    this.target[k] = target;
    return true;
  }

  /** Advances every glide; returns the knots that have arrived. */
  update(dt: number): Arrival[] {
    if (!this.count) return [];
    const out: Arrival[] = [];
    for (let k = 0; k < this.capacity; k++) {
      if (!this.live[k]) continue;
      this.t[k] += dt / this.dur[k];
      const f = Math.min(1, this.t[k]);
      const e = f * f * (3 - 2 * f);
      // The streak runs from where it left to where it is now, brightest at the head.
      const tail = Math.max(0, e - 0.55);
      for (let c = 0; c < 3; c++) {
        const a = this.from[k * 3 + c];
        const b = this.to[k * 3 + c];
        this.pos[k * 3 + c] = a + (b - a) * e;
        this.sPos[k * 6 + c] = a + (b - a) * tail;
        this.sPos[k * 6 + 3 + c] = this.pos[k * 3 + c];
      }
      this.sA[k * 2] = 0;
      this.sA[k * 2 + 1] = 0.7 * Math.min(1, this.hold[k] * 1.4) * (1 - f * f);
      if (f >= 1) {
        out.push({ to: this.target[k], hold: this.hold[k] });
        this.live[k] = 0;
        this.hold[k] = 0;
        this.sA[k * 2 + 1] = 0;
        this.count--;
      }
    }
    this.geo.getAttribute('position').needsUpdate = true;
    this.geo.getAttribute('aHold').needsUpdate = true;
    this.geo.getAttribute('aLevel').needsUpdate = true;
    this.sGeo.getAttribute('position').needsUpdate = true;
    this.sGeo.getAttribute('aA').needsUpdate = true;
    return out;
  }

  clear() {
    this.live.fill(0);
    this.hold.fill(0);
    this.sA.fill(0);
    this.count = 0;
    this.geo.getAttribute('aHold').needsUpdate = true;
    this.sGeo.getAttribute('aA').needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    const u = this.material.uniforms;
    u.uKnot.value.copy(t.knot);
    u.uKnotCore.value.copy(t.knotCore);
    u.uGlowMode.value = t.glow;
    this.material.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
    this.streakMaterial.uniforms.uKnot.value.copy(t.knot);
    this.streakMaterial.uniforms.uGlowMode.value = t.glow;
    this.streakMaterial.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.streakMaterial.needsUpdate = true;
  }
}
