import { Vector4 } from 'three';

/**
 * The layer model shared by every visual that sits in the skin's depth.
 *
 *   skin                 offset  lift·(gapPlane + gapSat)·w
 *   superficial fat      (small perforators rise through it)
 *   superficial fascia   offset −dSup + lift·gapPlane·w   ← small perforators pierce it
 *   interstitial plane   (loose, hyaluronan-rich; the gliding layer)
 *   deep fascia          offset −dDeep                    ← major perforators pierce it
 *   muscle
 *
 * dDeep and dSup are anatomical depths below the skin for each region;
 * lift = 0 draws them true, lift = 1 opens the plane and the superficial fat
 * by fixed gaps (weighted per region, `w`) so the layers can be seen.
 * The uniforms are shared objects: set them once and every material follows.
 */
export const LAYER_UNIFORMS = {
  uLift: { value: 1 },
  uGapPlane: { value: 0.016 },
  uGapSat: { value: 0.01 },
};

export const LAYERS_GLSL = /* glsl */ `
uniform float uLift;
uniform float uGapPlane;
uniform float uGapSat;
float skinOffset(float w) { return uLift * (uGapPlane + uGapSat) * w; }
float supOffset(float dSup, float w) { return -dSup + uLift * uGapPlane * w; }
float deepOffset(float dDeep) { return -dDeep; }
`;

/**
 * The dissection window: a region, measured on the skin, where the skin is
 * cut back (radius R) and, inside it, the superficial fascia is removed
 * (radius R·supFrac) — so one looks down through the layers to the deep
 * fascia, as in an anatomical plate.
 */
export const WINDOW_UNIFORMS = {
  uWindow: { value: new Vector4(0, 0, 0, 0) },
  uWindowOn: { value: 0 },
};

export const WINDOW_GLSL = /* glsl */ `
uniform vec4 uWindow;
uniform float uWindowOn;
// 0 outside; >0 inside, as distance / radius from the window's centre.
float windowR(vec3 skinPos) {
  if (uWindowOn < 0.5 || uWindow.w <= 0.0) return 9.0;
  return distance(skinPos, uWindow.xyz) / uWindow.w;
}
const float SUP_FRAC = 0.7;
`;

/** CPU mirror of the GLSL, for placing markers. */
export function layerOffsets(dDeep: number, dSup: number, w: number) {
  const L = LAYER_UNIFORMS.uLift.value;
  const g1 = LAYER_UNIFORMS.uGapPlane.value;
  const g2 = LAYER_UNIFORMS.uGapSat.value;
  return { skin: L * (g1 + g2) * w, sup: -dSup + L * g1 * w, deep: -dDeep };
}
