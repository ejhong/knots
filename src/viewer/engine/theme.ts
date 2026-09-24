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
  /** 0 for paper (ink on light), 1 for ink stone (light on dark). */
  glow: number;
}

const c = (hex: string) => new Color(hex);

/**
 * Earth / wabi-sabi, as in The OM Project: "night" is ink stone — the
 * viewing card in which the figure is made of light; "paper" is rice paper,
 * where the same figure is an ink stipple.
 */
export const THEMES: Record<ThemeName, SceneTheme> = {
  paper: {
    name: 'paper',
    background: c('#faf7f2'),
    bodyLight: c('#fcfaf6'),
    bodyShadow: c('#e0dbd4'),
    line: c('#3a3632'),
    rim: c('#6b5d4d'),
    floor: c('#eee8df'),
    floorLine: c('#a89f94'),
    tree: c('#5d7284'),
    point: c('#3a3632'),
    knot: c('#c87868'),
    knotCore: c('#9d5746'),
    star: c('#b8903f'),
    pulse: c('#5f935f'),
    gold: c('#9a8a78'),
    halo: c('#ffffff'),
    glow: 0,
  },
  night: {
    name: 'night',
    background: c('#262422'),
    bodyLight: c('#3a3733'),
    bodyShadow: c('#1d1b19'),
    line: c('#c4b8a8'),
    rim: c('#e6ded2'),
    floor: c('#2c2926'),
    floorLine: c('#6f665c'),
    tree: c('#b3c4d2'),
    point: c('#e6dccd'),
    knot: c('#e27b61'),
    knotCore: c('#ffd9c8'),
    star: c('#ecd6a4'),
    pulse: c('#9dcc9a'),
    gold: c('#c9a45f'),
    halo: c('#c4b8a8'),
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
