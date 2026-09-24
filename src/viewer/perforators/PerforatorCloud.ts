import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
  Vector4,
} from 'three';
import { evalAnchors, type AnchorSet } from '../anchors/anchors';
import type { BodyModel } from '../body/BodyModel';
import type { SceneTheme } from '../engine/theme';
import { hash01 } from '../lib/random';
import type { Ladder } from './generate';
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from '../body/layerModel';

/**
 * The figure as a constellation: every point is a perforator. Points are
 * lit like a relief (brighter where the skin faces the light), so the
 * 100,000 perforators read as the body itself. The rungs share one colour and
 * differ by size and brightness: small ones a faint dust, medium ones clear
 * dots, major ones larger and brighter. (Where each pierces a fascia is drawn
 * as a ring by Stalks.) Knots are drawn separately (KnotEmbers), in the one
 * knot colour; a release flares here as a star.
 */
export class PerforatorCloud {
  readonly points: Points;
  readonly geometry = new BufferGeometry();
  readonly material: ShaderMaterial;
  readonly anchors: AnchorSet;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  /** Knot intensity per perforator (0 open … 1 fully stuck). */
  readonly knot: Float32Array;
  /** Star flash per perforator (decays). */
  readonly flash: Float32Array;
  /** Highlight (hover, territory pulse, selection). */
  readonly glow: Float32Array;
  private knotAttr: BufferAttribute;
  private flashAttr: BufferAttribute;
  private glowAttr: BufferAttribute;
  private posAttr: BufferAttribute;
  private nrmAttr: BufferAttribute;

  constructor(readonly ladder: Ladder) {
    const N = ladder.count;
    this.anchors = { tri: ladder.tri, uv: ladder.uv, count: N };
    this.positions = new Float32Array(N * 3);
    this.normals = new Float32Array(N * 3);
    this.knot = new Float32Array(N);
    this.flash = new Float32Array(N);
    this.glow = new Float32Array(N);
    const seed = new Float32Array(N);
    const level = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      seed[i] = hash01(i * 7919 + 13);
      level[i] = ladder.level[i];
    }
    this.posAttr = new BufferAttribute(this.positions, 3);
    this.nrmAttr = new BufferAttribute(this.normals, 3);
    this.knotAttr = new BufferAttribute(this.knot, 1);
    this.flashAttr = new BufferAttribute(this.flash, 1);
    this.glowAttr = new BufferAttribute(this.glow, 1);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('normal', this.nrmAttr);
    this.geometry.setAttribute('aLevel', new BufferAttribute(level, 1));
    this.geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
    this.geometry.setAttribute('aKnot', this.knotAttr);
    this.geometry.setAttribute('aFlash', this.flashAttr);
    this.geometry.setAttribute('aGlow', this.glowAttr);
    this.geometry.setAttribute('aLift', new BufferAttribute(new Float32Array(N).fill(1), 1));

    this.material = createCloudMaterial();
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  /** Re-evaluates anchor positions after the body changes shape. */
  refresh(body: BodyModel) {
    evalAnchors(this.anchors, body.triangles, body.positions, body.normals, this.positions, this.normals, 0.0004);
    this.posAttr.needsUpdate = true;
    this.nrmAttr.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  /** Per-point lift weight (thin parts lift less). */
  setLiftWeights(w: Float32Array) {
    this.geometry.setAttribute('aLift', new BufferAttribute(w, 1));
  }

  markKnotsDirty() {
    this.knotAttr.needsUpdate = true;
  }
  markFlashDirty() {
    this.flashAttr.needsUpdate = true;
  }
  markGlowDirty() {
    this.glowAttr.needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    const u = this.material.uniforms;
    u.uPoint.value.copy(t.point);
    u.uKnot.value.copy(t.knot);
    u.uKnotCore.value.copy(t.knotCore);
    u.uStar.value.copy(t.star);
    u.uGlowMode.value = t.glow;
    // Light on ink stone can afford a faint dust; ink on paper needs more.
    // Knots are the brightest thing on the body: the major perforators stay below them.
    u.uLevelTone.value.set(t.glow ? 0.34 : 0.62, t.glow ? 0.72 : 0.9, t.glow ? 0.66 : 1);
    this.material.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
  }
}

export function createCloudMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    uniforms: {
      uPoint: { value: new Color() },
      uKnot: { value: new Color() },
      uKnotCore: { value: new Color() },
      uStar: { value: new Color() },
      uLight: { value: new Vector3(-0.4, 0.7, 0.6).normalize() },
      uProjScale: { value: 800 },
      uPixelRatio: { value: 1 },
      uSize: { value: new Vector3(0.0013, 0.0024, 0.0042) },
      uLevelAlpha: { value: new Vector3(1, 1, 1) },
      /** Brightness by rung: small, medium, major. */
      uLevelTone: { value: new Vector3(0.34, 0.8, 1.0) },
      /** 1: draw every perforator; 0: only the small knots (perforators hidden). */
      uPlain: { value: 1 },
      /** Quieting when a traditional map is in front (1 = full). */
      uDim: { value: 1 },
      uKnotDim: { value: 1 },
      uGlowMode: { value: 1 },
      uTime: { value: 0 },
      uBreath: { value: 0 },
      ...LAYER_UNIFORMS,
      ...WINDOW_UNIFORMS,
      uKnotScale: { value: 0 },
      uBrightness: { value: 1 },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aLevel;
      attribute float aSeed;
      attribute float aKnot;
      attribute float aFlash;
      attribute float aGlow;
      attribute float aLift;
      uniform vec3 uLight;
      uniform float uProjScale;
      uniform float uPixelRatio;
      uniform vec3 uSize;
      uniform vec3 uLevelAlpha;
      uniform vec3 uLevelTone;
      uniform float uPlain;
      uniform float uDim;
      uniform float uKnotDim;
      uniform float uTime;
      uniform float uBreath;
      ${LAYERS_GLSL}
      ${WINDOW_GLSL}
      uniform float uKnotScale;
      uniform float uGlowMode;
      varying float vShade;
      varying float vKnot;
      varying float vFlash;
      varying float vGlow;
      varying float vAlpha;
      varying float vLevel;
      varying float vSeed;
      varying float vCore;
      varying vec3 vClipPos;
      void main() {
        if (windowR(position) < 1.0) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }
        vec3 n = normalize(normal);
        vec3 p = position + n * skinOffset(aLift);
        vClipPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        float lvl = aLevel;
        float base = lvl < 0.5 ? uSize.x : (lvl < 1.5 ? uSize.y : uSize.z);
        float la = lvl < 0.5 ? uLevelAlpha.x : (lvl < 1.5 ? uLevelAlpha.y : uLevelAlpha.z);
        la *= lvl < 0.5 ? uLevelTone.x : (lvl < 1.5 ? uLevelTone.y : uLevelTone.z);
        // Small knots are drawn here, as a warm tint on their own dot (there
        // are tens of thousands); medium and major knots are embers (KnotEmbers).
        float k = lvl < 0.5 ? aKnot * uKnotScale : 0.0;
        // With the perforators layer off, only knots (and release stars) remain.
        if (uPlain < 0.5 && k < 0.02 && aFlash < 0.02) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }
        if (uPlain < 0.5) la = mix(0.45, 1.0, k);
        float halo = 1.0 + k * 0.6 + aFlash * (5.0 + lvl * 4.0) + aGlow * 1.5;
        float px = base * halo * uProjScale / max(0.05, -mv.z);
        // Keep distant points as fine dust rather than vanishing.
        float minPx = 1.1 * uPixelRatio;
        float a = la * clamp(px / minPx, 0.25, 1.0);
        gl_PointSize = clamp(max(px, minPx), 1.0, 90.0 * uPixelRatio);
        // Core size relative to sprite (so halos don't swell the dot itself).
        vCore = clamp(1.0 / halo, 0.08, 1.0);

        vec3 N = normalize(mat3(modelMatrix) * n);
        float ndl = dot(N, uLight);
        float sky = 0.5 + 0.5 * N.y;
        vShade = clamp(pow(smoothstep(-0.2, 1.0, ndl), 1.35) * 0.9 + sky * 0.1, 0.0, 1.0);
        // Twinkle: slow, per-point, breath-coupled.
        float tw = 0.88 + 0.12 * sin(uTime * (0.6 + aSeed * 0.8) + aSeed * 40.0);
        vAlpha = a * tw * (0.92 + 0.08 * uBreath) * (1.0 + k * 1.1) * mix(uDim, uKnotDim, clamp(k * 1.5, 0.0, 1.0));
        vKnot = k;
        vFlash = aFlash;
        vGlow = aGlow;
        vLevel = lvl;
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uPoint;
      uniform vec3 uKnot;
      uniform vec3 uKnotCore;
      uniform vec3 uStar;
      uniform float uGlowMode;
      uniform float uBrightness;
      uniform float uPlain;
      varying float vShade;
      varying float vKnot;
      varying float vFlash;
      varying float vGlow;
      varying float vAlpha;
      varying float vLevel;
      varying float vSeed;
      varying float vCore;
      uniform vec4 uClip;
      uniform float uClipOn;
      varying vec3 vClipPos;
      void main() {
        if (uClipOn > 0.5 && dot(vClipPos, uClip.xyz) > uClip.w) discard;
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = length(c);
        if (r > 1.0) discard;
        // Dot core (crisp) plus soft halo for knots and stars.
        float core = 1.0 - smoothstep(vCore * 0.72, vCore, r);
        float halo = exp(-r * r * 5.5) * (1.0 - core);
        // Star rays for a release flash.
        float ang = atan(c.y, c.x);
        float rays = pow(abs(cos(ang * 2.0)), 18.0) + 0.6 * pow(abs(cos(ang * 2.0 + 0.785)), 26.0);
        float star = vFlash * rays * (1.0 - smoothstep(0.0, 1.0, r)) * 1.4;

        float light = mix(0.07, 1.15, vShade);
        vec3 col;
        float alpha;
        if (uGlowMode > 0.5) {
          // Night: luminous dust; knots as embers; releases as stars.
          vec3 dust = uPoint * light * uBrightness;
          float big = vLevel / 2.0;
          vec3 warm = uKnot * (0.75 + 0.5 * light);
          col = mix(dust, warm, uPlain > 0.5 ? clamp(vKnot * 1.2, 0.0, 1.0) : 1.0) * core;
          col += uKnot * halo * vKnot * 0.4;
          col += uStar * (star + halo * vFlash * 1.2 + core * vFlash);
          col += uPoint * halo * vGlow * 0.8;
          alpha = vAlpha;
          gl_FragColor = vec4(col * alpha, 1.0);
        } else {
          // Paper: ink stipple; knots as seal-red dots with a wash.
          float ink = mix(1.0, 0.35, vShade);
          vec3 inkCol = uPoint;
          col = mix(inkCol, uKnot, uPlain > 0.5 ? clamp(vKnot * 1.4, 0.0, 1.0) : 1.0);
          col = mix(col, uStar, clamp(vFlash * 1.2, 0.0, 1.0));
          alpha = core * vAlpha * mix(ink, 1.0, clamp(vKnot + vFlash, 0.0, 1.0));
          alpha += halo * (vKnot * 0.35 + vFlash * 0.6 + vGlow * 0.3);
          alpha += star * 0.8;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        }
      }
    `,
  });
}
