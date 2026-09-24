import { Color } from 'three';

export type ThemeName = 'paper' | 'night';

/**
 * Colours for the 3D scene. They mirror the CSS tokens in src/styles/tokens.css
 * so the canvas and the page read as one surface.
 *
 * Palette: washi paper and sumi ink, with one accent — shu (朱), the vermilion
 * of a seal — reserved for knots, whatever the hypothesis. Map overlays use traditional Japanese
 * colours (see src/viewer/maps/palette.ts).
 */
export interface SceneTheme {
  name: ThemeName;
  background: Color;
  bodyLight: Color;
  bodyShadow: Color;
  line: Color;
  rim: Color;
  floor: Color;
  floorLine: Color;
  tree: Color;
  point: Color;
  knot: Color;
  knotCore: Color;
  star: Color;
  /** Light climbing a tree after a release. */
  pulse: Color;
  gold: Color;
  halo: Color;
  /** Traditional maps (wisteria): their lines, and their points. */
  map: Color;
  mapPoint: Color;
  /** 0 for paper (ink on light), 1 for ink stone (light on dark). */
  glow: number;
}

const c = (hex: string) => new Color(hex);

/**
 * Earth / wabi-sabi, as in The OM Project: "night" is a cool ink stone — the
 * viewing card in which the figure is made of light, under a moonlit halo;
 * "paper" is rice paper, where the same figure is an ink stipple. Release is
 * jade in both.
 */
export const THEMES: Record<ThemeName, SceneTheme> = {
  paper: {
    name: 'paper',
    background: c('#faf7f2'),
    bodyLight: c('#fcfaf6'),
    bodyShadow: c('#d8cfc2'),
    line: c('#3a3632'),
    rim: c('#6b5d4d'),
    floor: c('#ece3d6'),
    floorLine: c('#a89f94'),
    tree: c('#3f5b78'),
    point: c('#2f2b28'),
    knot: c('#c4452f'),
    knotCore: c('#93301f'),
    star: c('#3f8f73'),
    pulse: c('#3f8f73'),
    gold: c('#9a8a78'),
    halo: c('#eadcc0'),
    map: c('#7a5588'),
    mapPoint: c('#5b3a69'),
    glow: 0,
  },
  night: {
    name: 'night',
    background: c('#1d2226'),
    bodyLight: c('#343b3e'),
    bodyShadow: c('#171b1e'),
    line: c('#b7c1bd'),
    rim: c('#dfe5e1'),
    floor: c('#262c2f'),
    floorLine: c('#66737a'),
    tree: c('#b3c4d2'),
    point: c('#e6dccd'),
    knot: c('#e27b61'),
    knotCore: c('#ffd9c8'),
    star: c('#a8e6cd'),
    pulse: c('#8fd6b9'),
    gold: c('#c9a45f'),
    halo: c('#b4cdcc'),
    map: c('#c3a1d4'),
    mapPoint: c('#f0e2f7'),
    glow: 1,
  },
};

/** The viewer's ground, remembered per browser; ink stone by default. */
export function preferredTheme(): ThemeName {
  try {
    const t = localStorage.getItem('knots-ground');
    if (t === 'paper' || t === 'night') return t;
  } catch {
    /* storage unavailable */
  }
  return 'night';
}

export function rememberTheme(t: ThemeName) {
  try {
    localStorage.setItem('knots-ground', t);
  } catch {
    /* storage unavailable */
  }
}
