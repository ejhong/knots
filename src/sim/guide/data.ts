/**
 * The field guide's data (docs/SIMULATION.md): the index, imported at build time (src/data/sim/guide.json), and one film
 * per scene, fetched as it is chosen (public/sim/guide/<scene>.json). Both are written by `uv run python -m
 * knots_sim.guide`; nothing here is edited by hand.
 */

export type Trait = {
  id: string;
  group: string;
  label: string;
  text: string;
  cell: string;
  mark: 'all' | 'some' | 'none' | 'silent' | 'not';
  often?: string;
  k?: number;
  n?: number;
  depends?: string;
};

export type Layout = {
  n: number;
  pos: [number, number][];
  kind: string[];
  parent: number[];
  note: string;
  focal: number;
  felt_along?: number[];
  felt_across?: number[];
  territory_along?: number[];
  territory_across?: number[];
  zone_x?: number;
  nodule?: [number, number];
  spacing?: number;
  branch?: number[];
};

export type TheoryIndex = {
  id: string;
  key: string;
  name: string;
  glyph: string;
  typical: number;
  layout: Layout;
  traits: Trait[];
  counts: number[];
};

export type PatchIndex = {
  size: number;
  spot: [number, number];
  hand_r: number;
  sham: [number, number];
  roi_r: number;
  roll: [[number, number], [number, number]];
  share: number[][];
};

export type SceneIndex = { id: string; name: string; what: string; duration: number; frame: number; film: boolean };

export type GuideIndex = {
  run: { inputs: string; settings: number; seed: number; commit?: string };
  patch: PatchIndex;
  scenes: SceneIndex[];
  theories: TheoryIndex[];
  not_yet: { id: string; key: string; name: string; glyph: string; why: string }[];
};

export type FilmTheory = {
  setting: number;
  target: number;
  cells: string;
  events: [number, number, string, number][];
  focal: Record<string, (number | null)[]>;
  inst: Record<string, (number | null)[]>;
  stress: (number | null)[];
  hand: number[];
  captions: [number, string][];
};

export type Film = {
  run: string;
  scene: string;
  duration: number;
  frame: number;
  frames: number;
  breath: (number | null)[];
  attend: number[];
  roll: number[];
  theories: Record<string, FilmTheory>;
};

/** A theory's run of one scene, decoded: per frame and unit, held, active, tenderness (1 = tender) and the felt bump
 * (1 = the edge of touch). */
export class Cells {
  readonly frames: number;
  readonly n: number;
  private bytes: Uint8Array;

  constructor(b64: string, frames: number, n: number) {
    const bin = atob(b64);
    this.bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) this.bytes[i] = bin.charCodeAt(i);
    this.frames = frames;
    this.n = n;
  }

  private at(f: number, j: number): number {
    return (Math.min(Math.max(f, 0), this.frames - 1) * this.n + j) * 2;
  }
  held(f: number, j: number): boolean {
    return (this.bytes[this.at(f, j)] & 128) !== 0;
  }
  active(f: number, j: number): boolean {
    return (this.bytes[this.at(f, j)] & 64) !== 0;
  }
  tender(f: number, j: number): number {
    return ((this.bytes[this.at(f, j)] & 63) / 63) * 2;
  }
  bump(f: number, j: number): number {
    return (this.bytes[this.at(f, j) + 1] / 255) * 4;
  }
  count(f: number): number {
    let c = 0;
    for (let j = 0; j < this.n; j++) if (this.held(f, j)) c++;
    return c;
  }
}

const cache = new Map<string, Promise<Film>>();

export function loadFilm(base: string, scene: string): Promise<Film> {
  if (!cache.has(scene)) {
    cache.set(
      scene,
      fetch(`${base}/sim/guide/${scene}.json`).then((r) => {
        if (!r.ok) throw new Error(`film ${scene}: ${r.status}`);
        return r.json() as Promise<Film>;
      }),
    );
  }
  return cache.get(scene)!;
}
