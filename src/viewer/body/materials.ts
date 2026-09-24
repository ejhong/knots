import { AdditiveBlending, Color, DoubleSide, FrontSide, NormalBlending, ShaderMaterial, Vector3, Vector4, type Side } from 'three';
import type { SceneTheme } from '../engine/theme';
import { LAYERS_GLSL, LAYER_UNIFORMS, WINDOW_GLSL, WINDOW_UNIFORMS } from './layerModel';

/**
 * Shared GLSL helpers: anti-aliased iso-lines with density fade, so the
 * engraving stays crisp at any zoom without moiré.
 */
export const GLSL_LINES = /* glsl */ `
float isoLine(float f, float widthPx) {
  float w = fwidth(f);
  float d = abs(fract(f + 0.5) - 0.5);
  float px = d / max(w, 1e-6);
  float m = 1.0 - smoothstep(widthPx * 0.5 - 0.6, widthPx * 0.5 + 0.6, px);
  return m * (1.0 - smoothstep(0.22, 0.42, w));
}
`;

/**
 * The veil: the superficial fascia, drawn as an engraving — horizontal
 * contour lines like raked gravel, which can turn into concentric rings
 * around a major perforator, the way a rake circles a stone.
 */
export function createSheetMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: FrontSide as Side,
    uniforms: {
      uLight: { value: new Vector3(-0.4, 0.7, 0.6).normalize() },
      uBodyLight: { value: new Color() },
      uBodyShadow: { value: new Color() },
      uLine: { value: new Color() },
      uRim: { value: new Color() },
      uSpacing: { value: 0.0105 },
      uLineWidth: { value: 0.9 },
      uLineAlpha: { value: 0.5 },
      uRingRadius: { value: 0.026 },
      uRingSpacing: { value: 0.0042 },
      uRingAlpha: { value: 0.0 },
      uRimAlpha: { value: 0.55 },
      uOpacity: { value: 1 },
      uGlow: { value: 0 },
      uLens: { value: new Vector4(0, 0, 0, 0) },
      uTime: { value: 0 },
      ...LAYER_UNIFORMS,
      ...WINDOW_UNIFORMS,
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aStone;
      attribute float aStoneWeight;
      attribute float aLift;
      attribute float aSup;
      ${LAYERS_GLSL}
      varying vec3 vSkin;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vStone;
      varying float vStoneWeight;
      void main() {
        vSkin = position;
        vec3 p = position + normal * supOffset(aSup, aLift);
        vec4 w = modelMatrix * vec4(p, 1.0);
        vWorld = w.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vStone = (modelMatrix * vec4(aStone, 1.0)).xyz;
        vStoneWeight = aStoneWeight;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLight;
      uniform vec3 uBodyLight;
      uniform vec3 uBodyShadow;
      uniform vec3 uLine;
      uniform vec3 uRim;
      uniform float uSpacing;
      uniform float uLineWidth;
      uniform float uLineAlpha;
      uniform float uRingRadius;
      uniform float uRingSpacing;
      uniform float uRingAlpha;
      uniform float uRimAlpha;
      uniform float uOpacity;
      uniform float uGlow;
      uniform vec4 uLens;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vStone;
      varying float vStoneWeight;
      varying vec3 vSkin;
      uniform vec4 uClip;
      uniform float uClipOn;
      ${WINDOW_GLSL}
      ${GLSL_LINES}
      void main() {
        if (uClipOn > 0.5 && dot(vWorld, uClip.xyz) > uClip.w) discard;
        float wr = windowR(vSkin);
        if (wr < SUP_FRAC) discard;
        vec3 N = normalize(vNormal);
        if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vWorld);
        float ndl = dot(N, uLight);
        float tone = smoothstep(-0.35, 1.0, ndl);
        tone = mix(tone, 1.0, 0.08);
        vec3 col = mix(uBodyShadow, uBodyLight, tone);
        float shade = 1.0 - tone;

        // Engraving: lines swell in shadow, thin to hairlines in light.
        float lw = uLineWidth * mix(0.65, 1.55, shade);
        float horiz = isoLine(vWorld.y / uSpacing, lw);
        float d = distance(vWorld, vStone);
        float ringW = (1.0 - smoothstep(uRingRadius * 0.45, uRingRadius, d)) * vStoneWeight * uRingAlpha;
        float rings = isoLine(d / uRingSpacing - 0.5, lw * 0.9);
        float lines = mix(horiz, rings, clamp(ringW, 0.0, 1.0));
        float ink = lines * uLineAlpha * mix(0.45, 1.0, shade);
        col = mix(col, uLine, ink);

        // Silhouette: ink on paper, moonlight on night.
        float fres = 1.0 - clamp(abs(dot(N, V)), 0.0, 1.0);
        float rim = smoothstep(0.62, 0.98, fres);
        col = mix(col, uRim, rim * uRimAlpha);

        float alpha = uOpacity;
        // The cut edges — fascia inside, skin outside — drawn like lines on a plate.
        float edge = max(1.0 - smoothstep(0.0, 0.035, abs(wr - SUP_FRAC - 0.01)),
                         0.7 * (1.0 - smoothstep(0.0, 0.03, abs(wr - 1.0))));
        col = mix(col, uRim, edge * 0.8);
        alpha = max(alpha, edge * 0.8);
        if (uLens.w > 0.0) {
          float dl = distance(vWorld, uLens.xyz);
          float edge = smoothstep(uLens.w * 0.9, uLens.w, dl);
          if (edge < 0.02) discard;
          alpha *= edge;
          float ringEdge = 1.0 - smoothstep(0.0, 0.0025, abs(dl - uLens.w));
          col = mix(col, uLine, ringEdge * 0.55);
        }
        if (uGlow > 0.5) gl_FragColor = vec4(col * alpha, 1.0);
        else gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * The floor: deep fascia. Finer, crossed lines like woven aponeurosis, darker
 * and quieter than the veil. Seen through the veil, or where it is cut away.
 */
export function createFloorMaterial() {
  return new ShaderMaterial({
    transparent: false,
    side: FrontSide as Side,
    uniforms: {
      uLight: { value: new Vector3(-0.4, 0.7, 0.6).normalize() },
      uFloor: { value: new Color() },
      uShadow: { value: new Color() },
      uLine: { value: new Color() },
      uSpacing: { value: 0.0045 },
      uLineAlpha: { value: 0.35 },
      uGlow: { value: 0 },
      uTerritory: { value: 0 },
      uInsetScale: { value: 0.55 },
      uClip: { value: new Vector4() },
      uClipOn: { value: 0 },
      uInterior: { value: new Color() },
      uPearl: { value: new Color() },
      ...WINDOW_UNIFORMS,
    },
    vertexShader: /* glsl */ `
      attribute float aInset;
      attribute vec3 aTerritory;
      uniform float uInsetScale;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vTerritory;
      varying vec3 vSkin;
      void main() {
        vSkin = position;
        vec3 p = position - normal * aInset * uInsetScale;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vWorld = w.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vTerritory = aTerritory;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLight;
      uniform vec3 uFloor;
      uniform vec3 uShadow;
      uniform vec3 uLine;
      uniform float uSpacing;
      uniform float uLineAlpha;
      uniform float uTerritory;
      uniform vec4 uClip;
      uniform float uClipOn;
      uniform vec3 uInterior;
      uniform vec3 uPearl;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vTerritory;
      varying vec3 vSkin;
      ${WINDOW_GLSL}
      ${GLSL_LINES}
      void main() {
        if (uClipOn > 0.5 && dot(vWorld, uClip.xyz) > uClip.w) discard;
        if (!gl_FrontFacing) {
          // The cut face: flesh beneath the deep fascia, hatched like a plate.
          float h = isoLine((vWorld.x * 0.7 + vWorld.y + vWorld.z * 0.4) / 0.0035, 0.9);
          gl_FragColor = vec4(mix(uInterior, uInterior * 1.6, h * 0.6), 1.0);
          return;
        }
        vec3 N = normalize(vNormal);
        float tone = smoothstep(-0.4, 1.0, dot(N, uLight));
        vec3 col = mix(uShadow, uFloor, tone);
        col = mix(col, vTerritory, uTerritory * 0.55);
        // Inside the dissection window the deep fascia is exposed: pearly,
        // its crossed collagen fibres visible.
        float wr = windowR(vSkin);
        float exposed = 1.0 - smoothstep(SUP_FRAC - 0.04, SUP_FRAC + 0.02, wr);
        col = mix(col, uPearl * mix(0.55, 1.0, tone), exposed * 0.75);
        // crossed fibres
        float a = isoLine((vWorld.x + vWorld.y) / uSpacing, 0.8);
        float b = isoLine((vWorld.y - vWorld.x + vWorld.z * 0.5) / uSpacing, 0.8);
        float la = uLineAlpha * (1.0 + exposed * 1.2);
        col = mix(col, uLine, max(a, b) * la * mix(0.5, 1.0, 1.0 - tone));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function applySheetTheme(m: ShaderMaterial, t: SceneTheme) {
  m.blending = t.glow ? AdditiveBlending : NormalBlending;
  m.needsUpdate = true;
  m.uniforms.uBodyLight.value.copy(t.bodyLight);
  m.uniforms.uBodyShadow.value.copy(t.bodyShadow);
  m.uniforms.uLine.value.copy(t.line);
  m.uniforms.uRim.value.copy(t.rim);
  m.uniforms.uGlow.value = t.glow;
  m.uniforms.uLineAlpha.value = t.glow ? 0.34 : 0.42;
  m.uniforms.uRimAlpha.value = t.glow ? 0.5 : 0.6;
}

export function applyFloorTheme(m: ShaderMaterial, t: SceneTheme) {
  m.uniforms.uPearl.value.copy(t.glow ? new Color('#6f675e') : new Color('#f4efe6'));
  m.uniforms.uInterior.value.copy(t.glow ? new Color('#2a1714') : new Color('#d9c4b8'));
  m.uniforms.uFloor.value.copy(t.floor);
  m.uniforms.uShadow.value.copy(t.bodyShadow).lerp(t.floor, 0.4);
  m.uniforms.uLine.value.copy(t.floorLine);
  m.uniforms.uGlow.value = t.glow;
}

export { DoubleSide };
