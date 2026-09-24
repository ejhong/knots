import { Color } from 'three';

export type ThemeName = 'paper' | 'night';

/**
 * Colours for the 3D scene. They mirror the CSS tokens in src/styles/tokens.css
 * so the canvas and the page read as one surface.
 *
 * Palette: washi paper and sumi ink, with one accent — shu (朱), the vermilion
 * of a seal — reserved for knots. Map overlays use traditional Japanese
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
  gold: Color;
  /** 0 for paper (ink on light), 1 for night (light on ink). */
  glow: number;
}

const c = (hex: string) => new Color(hex);

export const THEMES: Record<ThemeName, SceneTheme> = {
  paper: {
    name: 'paper',
    background: c('#f3f1ec'),
    bodyLight: c('#fbfaf7'),
    bodyShadow: c('#d9d4ca'),
    line: c('#1c1c20'),
    rim: c('#26262b'),
    floor: c('#e6e0d6'),
    floorLine: c('#8d8579'),
    tree: c('#3b3b42'),
    point: c('#2a2a30'),
    knot: c('#c8412b'),
    knotCore: c('#9e2a18'),
    star: c('#c98f2b'),
    gold: c('#b8893a'),
    glow: 0,
  },
  night: {
    name: 'night',
    background: c('#0e0f12'),
    bodyLight: c('#2c2d33'),
    bodyShadow: c('#121316'),
    line: c('#d6d0c4'),
    rim: c('#efe9dc'),
    floor: c('#1b1c21'),
    floorLine: c('#6d6a63'),
    tree: c('#b9b3a6'),
    point: c('#e8e2d4'),
    knot: c('#ff5b3d'),
    knotCore: c('#ffd2b8'),
    star: c('#ffe2a6'),
    gold: c('#e0b566'),
    glow: 1,
  },
};

export function preferredTheme(): ThemeName {
  const attr = document.documentElement.dataset.theme;
  if (attr === 'paper' || attr === 'night') return attr;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'paper';
}
