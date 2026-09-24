import { DoubleSide, FrontSide, Vector2, Vector3 } from 'three';
import { Locator3D, mirrorLocator, type Locator, type Vec3 } from './anchors/locate';
import type { Anchor } from './anchors/anchors';
import { anchorVertex } from './anchors/anchors';
import { BodyLayers } from './body/BodyLayers';
import { BodyModel, type Shape } from './body/BodyModel';
import { Backdrop } from './engine/Backdrop';
import { Engine } from './engine/Engine';
import type { ThemeName } from './engine/theme';
import { majorDensity } from './data/perforatorDensity';
import { ROOTS, type RootDef } from './data/roots';
import { buildLadder, DEFAULT_LADDER, withDiagonals, type Ladder, type LadderParams } from './perforators/generate';
import { buildMeshGraph, dijkstra, makePathfinder, tracePath, type MeshGraph } from './lib/graph';
import { Channels, type ChannelInstance } from './body/Channels';
import { CHANNELS } from './data/channels';
import { LatchKnots } from './hypotheses/LatchKnots';
import { PerforatorCloud } from './perforators/PerforatorCloud';
import { KNOT_ZONES } from './data/zones';
import { PointGrid } from './lib/spatial';
import { KnotSim } from './sim/KnotSim';
import { evalAnchors } from './anchors/anchors';
import { Picker } from './interaction/Picker';
import { Interaction } from './interaction/Interaction';
import { Pulses } from './perforators/Pulses';
import { RootMarkers } from './perforators/RootMarkers';
import { Stalks } from './perforators/Stalks';
import {
  EXPLODE_WEIGHT,
  REGIONS,
  segmentBody,
  smoothField,
  SUBCUTANEOUS_DEPTH,
  SUPERFICIAL_FASCIA_FRACTION,
  type Segmentation,
} from './body/skeleton';
import { LAYER_UNIFORMS, WINDOW_UNIFORMS } from './body/layerModel';
import { KnotEmbers } from './perforators/KnotEmbers';
import { MERIDIANS, ORGAN, pointName } from './data/meridians';
import { SINEWS } from './data/sinew';
import { interiorSites } from './data/viscera';
import { TRIGGER_CLUSTERS, TRIGGER_REGIONS } from './data/triggerPoints';
import { SiteKnots, type KnotSite, type SiteStyle } from './hypotheses/SiteKnots';
import { mulberry32 } from './lib/random';

/** Theories whose knots sit at sites, and how each is drawn. */
const SITE_STYLES: Record<string, SiteStyle> = {
  'trigger-point': { size: 0.0095, band: 0.016 },
  densification: { size: 0.036, patch: true },
  nerve: { size: 0.0095 },
  central: { size: 0.011, twinkle: true },
};
import { SkinMap, type MapData, type MapLine, type MapPoint } from './maps/SkinMap';

/** The maps the atlas can draw, one at a time. */
export type MapId = 'meridians' | 'sinew' | 'trigger-points';
import { TreeLines } from './perforators/TreeLines';

export interface RootInstance {
  def: RootDef;
  side: 'l' | 'r' | 'm';
  anchor: Anchor;
  vertex: number;
}

/** The reference figure all placement is resolved against. */
export const REFERENCE_SHAPE: Shape = { age: 30, sex: 1, stoop: 0 };

/**
 * Assembles the atlas: engine, figure, fascial layers, the perforator
 * ladder and its trees. Systems that add behaviour (simulation, maps,
 * hypotheses, UI) receive this object and hang their own layers on it.
 */
export class AtlasScene {
  readonly engine: Engine;
  body!: BodyModel;
  layers!: BodyLayers;
  ladder!: Ladder;
  cloud!: PerforatorCloud;
  trees!: TreeLines;
  roots: RootInstance[] = [];
  sim!: KnotSim;
  picker!: Picker;
  interaction!: Interaction;
  pulses!: Pulses;
  rootMarkers!: RootMarkers;
  stalks!: Stalks;
  embers!: KnotEmbers;
  channels!: Channels;
  graph!: MeshGraph;
  latch!: LatchKnots;
  /** Knots of the site theories (trigger points, densification, nerves, perception), built when first chosen. */
  theories: Partial<Record<string, SiteKnots>> = {};
  /** Traditional (and clinical) maps, each built the first time it is shown. */
  maps: Partial<Record<MapId, SkinMap>> = {};
  activeMapId: MapId | null = null;
  /** Skin positions of the reference figure (where every locator is resolved). */
  private refSkin!: Float32Array;
  /** A traditional map in front: the anatomy recedes, except the layers being compared. */
  private quiet = false;
  private compare = new Set<string>();
  /** Susceptibility of a skin point to holding knots (the stress zones). */
  zoneField!: (x: number, y: number, z: number) => number;
  /** The hypothesis whose knots are drawn. */
  hypothesis = 'perforator';
  private knotsOn = true;
  private perforatorsOn = true;
  segmentation!: Segmentation;
  /** Per-fine-vertex depth of the deep fascia and of the superficial fascia (m), and explode weight. */
  depth!: Float32Array;
  supDepth!: Float32Array;
  liftWeight!: Float32Array;
  /** The same, per perforator. */
  perfDepth!: Float32Array;
  perfSup!: Float32Array;
  perfLift!: Float32Array;
  /** Spatial index over current perforator positions. */
  grid!: PointGrid;
  /** Reference positions of perforators (placement space). */
  refPositions!: Float32Array;
  /** Knot zones resolved on the reference figure. */
  zoneCenters: { id: string; name: string; p: Vec3; r: number; w: number; nodes: Int32Array; weights: Float32Array }[] = [];
  private simAccumulator = 0;
  simRunning = true;
  readonly backdrop = new Backdrop();
  private haloCenter = new Vector2(0.5, 0.55);
  private tmp = new Vector3();
  locator!: Locator3D;
  readonly ready: Promise<void>;
  private shapeListeners = new Set<() => void>();
  private lightView = new Vector3(-0.72, 0.5, 0.48).normalize();
  private lightWorld = new Vector3();
  private size = new Vector2();
  /** 0 = anatomical depths, 1 = exploded (the default). */
  lift = 1;
  /** The dissection window, pinned to the skin. */
  window: { anchor: Anchor; radius: number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    opts: { theme?: ThemeName; modelBase: string; ladder?: Partial<LadderParams> } ,
  ) {
    this.engine = new Engine(canvas, opts.theme ?? 'night');
    this.engine.scene.add(this.backdrop.mesh, this.backdrop.dust);
    this.engine.onTheme((t) => this.backdrop.applyTheme(t));
    this.ready = this.init(opts.modelBase, { ...DEFAULT_LADDER, ...opts.ladder });
  }

  private async init(modelBase: string, ladderParams: LadderParams) {
    const body = await BodyModel.load(modelBase);
    this.body = body;
    body.setShape(REFERENCE_SHAPE);

    this.refSkin = Float32Array.from(body.positions);
    this.locator = new Locator3D(
      this.refSkin,
      Float32Array.from(body.normals),
      body.triangles,
      (n) => body.joint(n),
    );

    // Regions, fascial depth and lift weights (reference shape).
    this.segmentation = segmentBody(body);
    const V = body.meta.vertexCount;
    const coarseDepth = new Float32Array(V);
    const coarseSup = new Float32Array(V);
    const coarseLift = new Float32Array(V);
    for (let v = 0; v < V; v++) {
      const region = REGIONS[this.segmentation.region[v]];
      coarseDepth[v] = SUBCUTANEOUS_DEPTH[region];
      coarseSup[v] = SUBCUTANEOUS_DEPTH[region] * SUPERFICIAL_FASCIA_FRACTION[region];
      const r = this.segmentation.radius[v];
      coarseLift[v] = Math.min(1, Math.max(0.1, (r - 0.007) / 0.04)) * EXPLODE_WEIGHT[region];
    }
    this.depth = body.refineScalar(smoothField(coarseDepth, body.coarseQuads, 6));
    this.supDepth = body.refineScalar(smoothField(coarseSup, body.coarseQuads, 6));
    this.liftWeight = body.refineScalar(smoothField(coarseLift, body.coarseQuads, 4));

    // Roots.
    for (const def of ROOTS) {
      const sides: Array<['l' | 'r' | 'm', typeof def.at]> = def.bilateral
        ? [
            ['l', def.at],
            ['r', mirrorLocator(def.at)],
          ]
        : [['m', def.at]];
      for (const [side, loc] of sides) {
        const anchor = this.locator.resolve(loc);
        if (!anchor) {
          console.warn('root did not resolve', def.id, side);
          continue;
        }
        this.roots.push({ def, side, anchor, vertex: anchorVertex(anchor, body.triangles) });
      }
    }

    const t0 = performance.now();
    this.ladder = buildLadder(
      {
        positions: body.positions,
        normals: body.normals,
        triangles: body.triangles,
        fineQuads: body.subdivision.fineQuads,
        rootVertices: Int32Array.from(this.roots.map((r) => r.vertex)),
        majorDensity: majorDensity((n) => body.joint(n) as Vec3),
      },
      ladderParams,
    );
    console.info(`ladder: ${this.ladder.count} perforators in ${(performance.now() - t0).toFixed(0)} ms`);

    // Reference positions for fields defined in placement space.
    this.refPositions = new Float32Array(this.ladder.count * 3);
    evalAnchors(
      { tri: this.ladder.tri, uv: this.ladder.uv, count: this.ladder.count },
      body.triangles,
      body.positions,
      null,
      this.refPositions,
    );
    this.sim = this.createSim();

    this.layers = new BodyLayers(body);
    this.layers.inset.set(this.depth);
    this.layers.sup.set(this.supDepth);
    this.layers.liftWeight.set(this.liftWeight);
    this.perfDepth = Float32Array.from(this.ladder.vertex, (v) => this.depth[v]);
    this.perfSup = Float32Array.from(this.ladder.vertex, (v) => this.supDepth[v]);
    this.perfLift = Float32Array.from(this.ladder.vertex, (v) => this.liftWeight[v]);
    this.cloud = new PerforatorCloud(this.ladder);
    this.cloud.setLiftWeights(this.perfLift);
    this.stalks = new Stalks(this.ladder, this.perfDepth, this.perfSup, this.perfLift);
    this.embers = new KnotEmbers(this.ladder, this.perfDepth, this.perfSup, this.perfLift);
    this.graph = buildMeshGraph(body.positions, withDiagonals(body.triangles, body.subdivision.fineQuads));
    const radiusFine = body.refineScalar(this.segmentation.radius);
    this.latch = new LatchKnots(body, 20000, this.zoneField, this.depth, (v) => radiusFine[v], this.liftWeight, interiorSites());
    this.channels = new Channels(this.resolveChannels());
    this.trees = new TreeLines(this.ladder);
    this.rootMarkers = new RootMarkers(this.roots.length);
    this.picker = new Picker(this.layers.floorGeometry, body.normals, body.triangles);
    this.pulses = new Pulses(this.ladder, this.trees, () => this.body.positions);
    this.sim.onRelease((e) => {
      if (e.node < this.ladder.count) {
        const lvl = e.level;
        if (lvl >= 1 || Math.random() < 0.25) this.pulses.emit(e.node, lvl === 2 ? 1 : lvl === 1 ? 0.8 : 0.5);
      }
    });
    const scene = this.engine.scene;
    scene.add(
      this.layers.floor,
      this.channels.lines,
      this.channels.beads,
      this.trees.lines,
      this.stalks.lines,
      this.cloud.points,
      this.stalks.collars,
      this.embers.points,
      this.rootMarkers.points,
      this.layers.sheet,
      this.latch.lines,
      this.latch.points,
    );
    this.layers.sheet.visible = true;
    this.trees.setInsets(this.depth);
    this.interaction = new Interaction(this);

    this.engine.onTheme((t) => {
      this.layers.applyTheme(t);
      this.cloud.applyTheme(t);
      this.trees.applyTheme(t);
      this.rootMarkers.applyTheme(t);
      this.stalks.applyTheme(t);
      this.embers.applyTheme(t);
      this.channels.applyTheme(t);
      this.latch.applyTheme(t);
      for (const m of Object.values(this.maps)) m!.applyTheme(t);
      for (const k of Object.values(this.theories)) k!.applyTheme(t);
    });
    this.engine.onFrame(({ time, dt }) => {
      this.interaction.update(dt);
      this.stepSim(dt);
      this.pulses.update(dt);
      this.frame(time);
    });
    // A dissection window on the upper back, between the shoulder blades.
    const w = this.locator.resolve({ ray: { j: 'spine-1', o: [0.035, 0.07, 0] }, dir: [0.12, 0.08, -1] });
    if (w) this.window = { anchor: w, radius: 0.085 };
    this.refreshShape();
    this.setLift(this.lift);
    this.syncKnots();
    this.applyKnotVisibility();
  }

  /** Resolves the deep channels' landmark paths into skin paths (reference shape). */
  private resolveChannels(): ChannelInstance[] {
    const out: ChannelInstance[] = [];
    const T = this.body.triangles;
    const P = this.body.positions;
    for (const def of CHANNELS) {
      const variants: Array<['l' | 'r' | 'm', typeof def.path]> = def.bilateral
        ? [
            ['l', def.path],
            ['r', def.path.map((l) => mirrorLocator(l))],
          ]
        : [['m', def.path]];
      for (const [side, locs] of variants) {
        const verts: number[] = [];
        for (const l of locs) {
          const a = this.locator.resolve(l);
          if (a) verts.push(anchorVertex(a, T));
          else console.warn('channel waypoint did not resolve', def.id, side);
        }
        if (verts.length < 2) continue;
        const path: number[] = [verts[0]];
        for (let i = 1; i < verts.length; i++) {
          const s = verts[i - 1];
          const t = verts[i];
          const d = Math.hypot(P[s * 3] - P[t * 3], P[s * 3 + 1] - P[t * 3 + 1], P[s * 3 + 2] - P[t * 3 + 2]);
          const res = dijkstra(this.graph, [s], { maxDist: d * 1.8 + 0.02 });
          const seg = res.dist[t] < Infinity ? tracePath(res.pred, t).reverse() : [s, t];
          for (let k = 1; k < seg.length; k++) path.push(seg[k]);
        }
        out.push({ def, side, path });
      }
    }
    return out;
  }

  /** Places the dissection window at a skin point (triangle + position). */
  setWindowAt(tri: number, point: Vector3, radius = this.window?.radius ?? 0.085) {
    const T = this.body.triangles;
    const P = this.body.positions;
    const a = new Vector3().fromArray(P, T[tri * 3] * 3);
    const b = new Vector3().fromArray(P, T[tri * 3 + 1] * 3);
    const c = new Vector3().fromArray(P, T[tri * 3 + 2] * 3);
    const v0 = b.clone().sub(a);
    const v1 = c.clone().sub(a);
    const v2 = point.clone().sub(a);
    const d00 = v0.dot(v0);
    const d01 = v0.dot(v1);
    const d11 = v1.dot(v1);
    const d20 = v2.dot(v0);
    const d21 = v2.dot(v1);
    const den = d00 * d11 - d01 * d01 || 1;
    const u = Math.min(1, Math.max(0, (d11 * d20 - d01 * d21) / den));
    const v = Math.min(1 - u, Math.max(0, (d00 * d21 - d01 * d20) / den));
    this.window = { anchor: { tri, u, v }, radius };
    this.updateWindow();
  }

  setWindowOn(on: boolean) {
    WINDOW_UNIFORMS.uWindowOn.value = on && this.window ? 1 : 0;
  }

  private updateWindow() {
    if (!this.window) return;
    const a = this.window.anchor;
    const T = this.body.triangles;
    const P = this.body.positions;
    const w = 1 - a.u - a.v;
    const idx = [T[a.tri * 3] * 3, T[a.tri * 3 + 1] * 3, T[a.tri * 3 + 2] * 3];
    const p = [0, 1, 2].map((k) => P[idx[0] + k] * w + P[idx[1] + k] * a.u + P[idx[2] + k] * a.v);
    // Scale the window with the figure (an infant's back is smaller).
    const r = this.window.radius * (this.body.height() / 1.75);
    WINDOW_UNIFORMS.uWindow.value.set(p[0], p[1], p[2], r);
  }

  /** Sets the history for an age and shows it. */
  settle(age: number) {
    this.sim.settle(age);
    this.latch.settle(age);
    for (const t of Object.values(this.theories)) t!.settle(age);
    this.syncKnots();
  }

  /** Chooses whose knots are drawn: a theory's id (see src/data/hypotheses.ts). */
  setHypothesis(id: string) {
    this.hypothesis = id;
    if (SITE_STYLES[id]) this.ensureTheory(id);
    this.applyKnotVisibility();
  }

  /** Builds a site theory's knots: sampled where that theory says knots are. */
  private ensureTheory(id: string): SiteKnots {
    const built = this.theories[id];
    if (built) return built;
    const k = new SiteKnots(this.theorySites(id), SITE_STYLES[id], this.body.triangles, this.depth, this.supDepth, this.liftWeight);
    k.refresh(this.body);
    k.settle(this.sim.age);
    k.applyTheme(this.engine.theme);
    this.engine.scene.add(k.lines, k.points);
    this.theories[id] = k;
    this.applyQuiet();
    return k;
  }

  private theorySites(id: string): KnotSite[] {
    const zone = (p: Vec3) => this.zoneField(p[0], p[1], p[2]);
    switch (id) {
      case 'trigger-point': {
        // Travell and Simons' muscles: candidate sites scattered around each
        // muscle's usual region, each with its taut band along the fibres.
        const rng = mulberry32(41);
        const sites: KnotSite[] = [];
        for (const c of TRIGGER_CLUSTERS)
          for (const side of ['l', 'r'] as const) {
            const a = this.locator.resolve(side === 'r' ? mirrorLocator(c.at) : c.at);
            if (!a) {
              console.warn('trigger point did not resolve', c.muscle, side);
              continue;
            }
            const { p, n } = this.refPoint(a);
            const u = new Vector3(0, 1, 0).cross(n);
            if (u.lengthSq() < 1e-4) u.set(1, 0, 0).cross(n);
            u.normalize();
            const v = n.clone().cross(u).normalize();
            const dir: Vec3 = side === 'r' ? [-c.dir[0], c.dir[1], c.dir[2]] : c.dir;
            for (let k = 0; k < c.n; k++) {
              const r = Math.sqrt(rng()) * c.spread;
              const t = rng() * Math.PI * 2;
              const q = p.clone().addScaledVector(u, Math.cos(t) * r).addScaledVector(v, Math.sin(t) * r);
              const anchor = this.locator.closest([q.x, q.y, q.z]);
              if (anchor) sites.push({ anchor, mode: 'muscle', extra: c.deep, band: dir, weight: 0.35 + 0.65 * zone([q.x, q.y, q.z]) });
            }
          }
        return sites;
      }
      case 'densification':
        // Patches of thickened hyaluronan in the gliding plane, gathered where stress is held.
        return this.sampleSkin(900, 43, (p) => 0.15 + 0.85 * zone(p)).map(({ anchor, w }) => ({ anchor, mode: 'plane' as const, weight: w }));
      case 'nerve': {
        // The nerve of every medium and major perforator, where it pierces its fascia.
        const L = this.ladder;
        const sites: KnotSite[] = [];
        for (let i = 0; i < L.count; i++) {
          if (L.level[i] < 1) continue;
          sites.push({
            anchor: { tri: L.tri[i], u: L.uv[i * 2], v: L.uv[i * 2 + 1] },
            mode: L.level[i] === 2 ? 'deep' : 'sup',
            // The nerve drawn rising through the deep fascia at the major sites only.
            nerve: L.level[i] === 2,
            weight: this.sim.susc[i],
          });
        }
        return sites;
      }
      default:
        // Percepts on the skin, nothing beneath: where attention and threat gather.
        return this.sampleSkin(2600, 47, (p) => 0.2 + 0.8 * zone(p)).map(({ anchor, w }) => ({ anchor, mode: 'skin' as const, weight: w }));
    }
  }

  /** A reference-figure position and surface normal for an anchor. */
  private refPoint(a: Anchor): { p: Vector3; n: Vector3 } {
    const T = this.body.triangles;
    const R = this.refSkin;
    const A = new Vector3().fromArray(R, T[a.tri * 3] * 3);
    const Bv = new Vector3().fromArray(R, T[a.tri * 3 + 1] * 3);
    const C = new Vector3().fromArray(R, T[a.tri * 3 + 2] * 3);
    const w = 1 - a.u - a.v;
    const p = A.clone().multiplyScalar(w).addScaledVector(Bv, a.u).addScaledVector(C, a.v);
    const n = Bv.clone().sub(A).cross(C.clone().sub(A)).normalize();
    return { p, n };
  }

  /** Skin anchors spread by area and kept with probability `weight`. */
  private sampleSkin(count: number, seed: number, weight: (p: Vec3) => number): { anchor: Anchor; w: number }[] {
    const T = this.body.triangles;
    const R = this.refSkin;
    const nt = T.length / 3;
    const cdf = new Float64Array(nt);
    let acc = 0;
    const e1 = new Vector3();
    const e2 = new Vector3();
    for (let t = 0; t < nt; t++) {
      const a = new Vector3().fromArray(R, T[t * 3] * 3);
      e1.fromArray(R, T[t * 3 + 1] * 3).sub(a);
      e2.fromArray(R, T[t * 3 + 2] * 3).sub(a);
      acc += 0.5 * e1.cross(e2).length();
      cdf[t] = acc;
    }
    const rng = mulberry32(seed);
    const out: { anchor: Anchor; w: number }[] = [];
    for (let tries = 0; out.length < count && tries < count * 40; tries++) {
      const r = rng() * acc;
      let lo = 0;
      let hi = nt - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      const r1 = Math.sqrt(rng());
      const r2 = rng();
      const anchor = { tri: lo, u: r1 * (1 - r2), v: r1 * r2 };
      const { p } = this.refPoint(anchor);
      const w = weight([p.x, p.y, p.z]);
      if (rng() < w) out.push({ anchor, w });
    }
    return out;
  }

  private zeroKnots?: Float32Array;

  private applyKnotVisibility() {
    const perf = this.hypothesis === 'perforator';
    // Stalks and collars show the perforator knots only in that view, and
    // only while knots are shown: otherwise every perforator is plain.
    if (!this.zeroKnots) this.zeroKnots = new Float32Array(this.ladder.count);
    this.stalks.setKnots(this.knotsOn && perf ? this.sim.knot : this.zeroKnots);
    this.cloud.material.uniforms.uKnotScale.value = this.knotsOn && perf ? 1 : 0;
    // Small knots are drawn by the cloud, so it stays up for them even when
    // the perforators themselves are hidden.
    this.cloud.points.visible = this.perforatorsOn || (this.knotsOn && perf);
    this.embers.points.visible = this.knotsOn && perf;
    for (const [id, t] of Object.entries(this.theories)) t!.setVisible(this.knotsOn && this.hypothesis === id);
    this.rootMarkers.material.uniforms.uKnotAlpha.value = this.knotsOn && perf ? 1 : 0;
    this.latch.setVisible(this.knotsOn && this.hypothesis === 'latch');
  }

  /** Pushes the simulation's knot state to every layer that draws it. */
  syncKnots() {
    this.cloud.knot.set(this.sim.knot);
    this.cloud.flash.set(this.sim.flash);
    this.cloud.markKnotsDirty();
    this.cloud.markFlashDirty();
    this.embers.setKnots(this.sim.knot);
    const perf = this.hypothesis === 'perforator';
    if (!this.zeroKnots) this.zeroKnots = new Float32Array(this.ladder.count);
    this.stalks.setKnots(this.knotsOn && perf ? this.sim.knot : this.zeroKnots);
    this.rootMarkers.knot.set(this.sim.rootKnot);
    this.rootMarkers.flash.set(this.sim.rootFlash);
    this.rootMarkers.update();
  }

  private createSim(): KnotSim {
    const body = this.body;
    // Zone field: max of Gaussian bumps centred on the skin.
    const centres: { id: string; name: string; p: Vec3; r: number; w: number }[] = [];
    for (const z of KNOT_ZONES) {
      const locs = z.bilateral ? [z.at, mirrorLocator(z.at)] : [z.at];
      for (const l of locs) {
        const a = this.locator.resolve(l);
        if (!a) {
          console.warn('zone did not resolve', z.id);
          continue;
        }
        const t = a.tri * 3;
        const P = body.positions;
        const T = body.triangles;
        const w = 1 - a.u - a.v;
        const p = [0, 1, 2].map((k) => P[T[t] * 3 + k] * w + P[T[t + 1] * 3 + k] * a.u + P[T[t + 2] * 3 + k] * a.v) as Vec3;
        centres.push({ id: z.id, name: z.name, p, r: z.r, w: z.w });
      }
    }
    const field = (x: number, y: number, z: number) => {
      let m = 0;
      for (const c of centres) {
        const d2 = (x - c.p[0]) ** 2 + (y - c.p[1]) ** 2 + (z - c.p[2]) ** 2;
        const v = c.w * Math.exp(-d2 / (2 * c.r * c.r));
        if (v > m) m = v;
      }
      return m;
    };
    const rootSusc = Float32Array.from(this.roots, (r) => {
      const p = this.rootPosition(r);
      return Math.min(1, 0.35 + field(p[0], p[1], p[2]) * 0.7 + (r.def.gate ? 0.2 : 0));
    });
    // Tree distance to parent.
    const L = this.ladder;
    const dist = new Float32Array(L.count + this.roots.length);
    const P = this.refPositions;
    for (let i = 0; i < L.count; i++) {
      if (L.level[i] === 2) dist[i] = L.trunkDist[L.vertex[i]];
      else if (L.level[i] === 1) dist[i] = L.branchDist[L.vertex[i]];
      else {
        const q = L.parent[i];
        dist[i] = Math.hypot(P[i * 3] - P[q * 3], P[i * 3 + 1] - P[q * 3 + 1], P[i * 3 + 2] - P[q * 3 + 2]);
      }
    }
    this.zoneField = field;
    const sim = new KnotSim(L, this.roots.length, P, field, rootSusc, dist);
    sim.settle(34);
    // Per-zone node lists (reference space) for scenarios.
    this.zoneCenters = centres.map((c) => {
      const nodes: number[] = [];
      const weights: number[] = [];
      const R = c.r * 1.9;
      for (let i = 0; i < L.count; i++) {
        const d2 = (P[i * 3] - c.p[0]) ** 2 + (P[i * 3 + 1] - c.p[1]) ** 2 + (P[i * 3 + 2] - c.p[2]) ** 2;
        if (d2 < R * R) {
          nodes.push(i);
          weights.push(Math.exp(-d2 / (2 * c.r * c.r)));
        }
      }
      this.roots.forEach((r, k) => {
        const q = this.rootPosition(r);
        const d2 = (q[0] - c.p[0]) ** 2 + (q[1] - c.p[1]) ** 2 + (q[2] - c.p[2]) ** 2;
        if (d2 < R * R) {
          nodes.push(L.count + k);
          weights.push(Math.exp(-d2 / (2 * c.r * c.r)));
        }
      });
      return { ...c, nodes: Int32Array.from(nodes), weights: Float32Array.from(weights) };
    });
    return sim;
  }

  setShape(shape: Partial<Shape>) {
    this.body.setShape(shape);
    this.refreshShape();
  }

  private refreshShape() {
    this.layers.refresh();
    this.cloud.refresh(this.body);
    if (this.grid) this.grid.rebuild(this.cloud.positions);
    else this.grid = new PointGrid(this.cloud.positions, 0.012);
    this.picker?.refit();
    this.stalks?.refresh(this.cloud.positions, this.cloud.normals);
    this.embers?.refresh(this.cloud.positions, this.cloud.normals);
    if (this.rootMarkers) {
      // Roots sit where the source vessel meets the deep fascia.
      this.roots.forEach((r, i) => {
        const p = this.rootPosition(r);
        const n = this.body.normals;
        const v = r.vertex * 3;
        const off = -this.depth[r.vertex] + 0.0015;
        for (let k = 0; k < 3; k++) this.rootMarkers.positions[i * 3 + k] = p[k] + n[v + k] * off;
      });
      this.rootMarkers.update();
    }
    this.trees.refresh(this.body);
    this.channels?.refresh(this.body, this.depth);
    this.latch?.refresh(this.body);
    for (const m of Object.values(this.maps)) m!.refresh(this.body);
    for (const k of Object.values(this.theories)) k!.refresh(this.body);
    this.updateWindow();
    for (const cb of this.shapeListeners) cb();
  }

  onShape(cb: () => void) {
    this.shapeListeners.add(cb);
    return () => this.shapeListeners.delete(cb);
  }

  private stepSim(dt: number) {
    if (!this.simRunning) return;
    this.simAccumulator += dt;
    if (this.simAccumulator < 1 / 30) return;
    const step = this.simAccumulator;
    this.simAccumulator = 0;
    this.sim.step(step);
    this.syncKnots();
  }

  /**
   * Section cut: hides everything on the positive side of a plane
   * (normal · p > d), revealing the layers in cross-section. Pass null to
   * clear.
   */
  setClip(plane: { normal: [number, number, number]; d: number } | null) {
    const mats = [
      this.cloud.material,
      this.embers.material,
      this.channels.lineMaterial,
      this.channels.beadMaterial,
      this.latch.pointMaterial,
      this.latch.lineMaterial,
      this.trees.material,
      this.stalks.lineMaterial,
      this.stalks.collarMaterial,
      this.rootMarkers.material,
      this.layers.floorMaterial,
      this.layers.sheetMaterial,
      ...Object.values(this.maps).flatMap((m) => m!.materials),
      ...Object.values(this.theories).flatMap((k) => [k!.pointMaterial, k!.lineMaterial]),
    ];
    for (const m of mats) {
      m.uniforms.uClipOn.value = plane ? 1 : 0;
      if (plane) m.uniforms.uClip.value.set(...plane.normal, plane.d);
    }
    this.layers.floorMaterial.side = plane ? DoubleSide : FrontSide;
    this.layers.floorMaterial.needsUpdate = true;
  }

  /** Layers: 0 = anatomical depths, 1 = exploded. */
  setLift(v: number) {
    this.lift = v;
    LAYER_UNIFORMS.uLift.value = v;
  }

  /** Shows or hides a family of layers. */
  setVisible(layer: 'perforators' | 'knots' | 'fascia' | 'vessels' | 'territories' | 'channels', on: boolean) {
    switch (layer) {
      case 'perforators':
        this.perforatorsOn = on;
        this.cloud.material.uniforms.uPlain.value = on ? 1 : 0;
        this.stalks.lines.visible = on;
        this.stalks.collars.visible = on;
        this.applyKnotVisibility();
        break;
      case 'knots':
        this.knotsOn = on;
        this.applyKnotVisibility();
        break;
      case 'fascia':
        this.layers.sheet.visible = on;
        this.layers.floorMaterial.uniforms.uLineAlpha.value = on ? 0.45 : 0.12;
        break;
      case 'vessels':
        this.trees.lines.visible = on;
        this.rootMarkers.points.visible = on;
        break;
      case 'territories':
        this.layers.floorMaterial.uniforms.uTerritory.value = on ? 1 : 0;
        break;
      case 'channels':
        this.channels.setVisible(on);
        break;
    }
  }

  private frame(time: number) {
    const cam = this.engine.camera;
    this.lightWorld.copy(this.lightView).applyQuaternion(cam.quaternion).normalize();
    this.engine.renderer.getDrawingBufferSize(this.size);
    const projScale = this.size.y / (2 * Math.tan((cam.fov * Math.PI) / 360));
    const pr = this.engine.renderer.getPixelRatio();

    // Mandorla follows the figure's chest; scales with its projected height.
    const h = this.body.height();
    const chest = this.tmp.set(0, h * 0.58, 0).project(cam);
    this.haloCenter.set(chest.x * 0.5 + 0.5, chest.y * 0.5 + 0.5);
    const top = new Vector3(0, h, 0).project(cam);
    const foot = new Vector3(0, 0, 0).project(cam);
    const span = Math.max(0.2, Math.abs(top.y - foot.y) * 0.5);
    this.backdrop.update(time, this.size.x / this.size.y, this.haloCenter, span * 1.25, pr);
    this.trees.material.uniforms.uTime.value = time;
    const ru = this.rootMarkers.material.uniforms;
    ru.uProjScale.value = projScale;
    ru.uTime.value = time;

    const cu = this.cloud.material.uniforms;
    cu.uLight.value.copy(this.lightWorld);
    cu.uProjScale.value = projScale;
    cu.uPixelRatio.value = pr;
    cu.uTime.value = time;
    const fu = this.layers.floorMaterial.uniforms;
    fu.uLight.value.copy(this.lightWorld);
    fu.uInsetScale.value = 1;
    const su = this.layers.sheetMaterial.uniforms;
    su.uLight.value.copy(this.lightWorld);
    su.uTime.value = time;
    su.uOpacity.value = 0.3;
    this.stalks.collarMaterial.uniforms.uProjScale.value = projScale;
    const eu = this.embers.material.uniforms;
    eu.uProjScale.value = projScale;
    eu.uPixelRatio.value = pr;
    eu.uTime.value = time;
    this.trees.material.uniforms.uInsetScale.value = 1;
    this.channels.beadMaterial.uniforms.uProjScale.value = projScale;
    this.latch.pointMaterial.uniforms.uProjScale.value = projScale;
    this.latch.pointMaterial.uniforms.uPixelRatio.value = pr;
    this.channels.beadMaterial.uniforms.uPixelRatio.value = pr;
    for (const m of Object.values(this.maps))
      for (const mat of m!.materials) {
        mat.uniforms.uProjScale.value = projScale;
        mat.uniforms.uPixelRatio.value = pr;
      }
    for (const k of Object.values(this.theories)) {
      const tu = k!.pointMaterial.uniforms;
      tu.uProjScale.value = projScale;
      tu.uPixelRatio.value = pr;
      tu.uTime.value = time;
    }
  }

  /** The map on show, if any. */
  get activeMap(): SkinMap | null {
    return this.activeMapId ? (this.maps[this.activeMapId] ?? null) : null;
  }

  /** Shows one map (or none), quieting the anatomy while a map is on. */
  setMap(id: MapId | null) {
    for (const m of Object.values(this.maps)) m!.setVisible(false);
    this.activeMapId = id;
    if (id) this.ensureMap(id).setVisible(true);
    this.quiet = !!id;
    this.applyQuiet();
  }

  ensureMap(id: MapId): SkinMap {
    const built = this.maps[id];
    if (built) return built;
    const data = id === 'meridians' ? this.meridianData() : id === 'sinew' ? this.sinewData() : this.triggerMapData();
    const map = new SkinMap(data, this.body.triangles, this.liftWeight);
    map.refresh(this.body);
    map.applyTheme(this.engine.theme);
    this.engine.scene.add(...map.objects);
    this.maps[id] = map;
    return map;
  }

  /** Resolves a map locator on one side (bilateral entries are written for the left). */
  private place(at: Locator, side: 'l' | 'r' | 'm'): Anchor | null {
    return this.locator.resolve(side === 'r' ? mirrorLocator(at) : at);
  }

  private routeCache?: (stops: Anchor[]) => Anchor[];
  /**
   * Joins stops by the shortest path along the skin (so a line from the chest
   * to the arm goes over the shoulder, never across the gap under the arm).
   */
  private route(stops: Anchor[]): Anchor[] {
    if (!this.routeCache) {
      const T = this.body.triangles;
      const R = this.refSkin;
      const posOf = (a: Anchor): Vec3 => {
        const t = a.tri * 3;
        const w = 1 - a.u - a.v;
        return [0, 1, 2].map((k) => R[T[t] * 3 + k] * w + R[T[t + 1] * 3 + k] * a.u + R[T[t + 2] * 3 + k] * a.v) as Vec3;
      };
      // A skin anchor for every mesh vertex (a corner of one of its triangles).
      const V = R.length / 3;
      const vTri = new Int32Array(V).fill(-1);
      const vCorner = new Uint8Array(V);
      for (let t = 0; t < T.length / 3; t++)
        for (let c = 0; c < 3; c++) {
          const v = T[t * 3 + c];
          if (vTri[v] < 0) {
            vTri[v] = t;
            vCorner[v] = c;
          }
        }
      const vertexAnchor = (v: number): Anchor => ({ tri: vTri[v], u: vCorner[v] === 1 ? 1 : 0, v: vCorner[v] === 2 ? 1 : 0 });
      const path = makePathfinder(this.graph);
      this.routeCache = (stops) => {
        const out: Anchor[] = [];
        for (const a of stops) {
          if (out.length) {
            const prev = out[out.length - 1];
            const p0 = posOf(prev);
            const p1 = posOf(a);
            const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
            const way = path(anchorVertex(prev, T), anchorVertex(a, T), d * 2.4 + 0.05);
            if (way) for (let k = 1; k < way.length - 1; k++) out.push(vertexAnchor(way[k]));
          }
          out.push(a);
        }
        return out;
      };
    }
    return this.routeCache(stops);
  }

  /** Chinese medicine's fourteen channels and 361 points (WHO 2008). */
  private meridianData(): MapData {
    const points: MapPoint[] = [];
    const lines: MapLine[] = [];
    MERIDIANS.forEach((m, g) => {
      for (const side of (m.bilateral ? ['l', 'r'] : ['m']) as Array<'l' | 'r' | 'm'>) {
        const byN = new Map<number, Anchor>();
        for (const p of m.points) {
          const a = this.place(p.at, side);
          if (!a) {
            console.warn('acupoint did not resolve', `${m.code}${p.n}`, side);
            continue;
          }
          byN.set(p.n, a);
          const [han, pinyin, english] = pointName(`${m.code}${p.n}`) ?? ['', `${m.code}${p.n}`, ''];
          points.push({
            group: g,
            side,
            anchor: a,
            kicker: `${m.code} ${p.n} · ${m.name.split(',')[0]}`,
            title: `${pinyin.replace(/^\p{L}/u, (c) => c.toUpperCase())}  ${han}`,
            sub: english,
            where: `${p.where}.`,
            shape: 0,
          });
        }
        for (const spec of m.lines ?? [m.points.map((p) => p.n)]) {
          const stops = spec.map((n) => byN.get(n)).filter((a): a is Anchor => !!a);
          if (stops.length >= 2) lines.push({ group: g, side, anchors: this.route(stops) });
        }
      }
    });
    return {
      id: 'meridians',
      title: 'Channels and points',
      groups: MERIDIANS.map((m) => ({ chip: m.code, cjk: ORGAN[m.code], name: m.name, hanzi: m.hanzi, course: m.course })),
      points,
      lines,
    };
  }

  /** The twelve sinew channels of the Ling Shu, with the places they bind (結). */
  private sinewData(): MapData {
    const points: MapPoint[] = [];
    const lines: MapLine[] = [];
    SINEWS.forEach((m, g) => {
      for (const side of ['l', 'r'] as const) {
        const seen = new Set<string>();
        for (const stops of m.lines) {
          const anchors: Anchor[] = [];
          for (const st of stops) {
            const a = this.place(st.at, side);
            if (!a) {
              console.warn('sinew stop did not resolve', m.code, side);
              continue;
            }
            anchors.push(a);
            if (st.knot && !seen.has(st.knot)) {
              seen.add(st.knot);
              points.push({
                group: g,
                side,
                anchor: a,
                kicker: `${m.code} sinew channel · a knot 結`,
                title: st.knot,
                sub: m.hanzi,
                where: `One of the places where this sinew channel binds.${st.note ? ` ${st.note}` : ''}`,
                shape: 1,
              });
            }
          }
          if (anchors.length >= 2) lines.push({ group: g, side, anchors: this.route(anchors) });
        }
      }
    });
    return {
      id: 'sinew',
      title: 'Sinew channels',
      groups: SINEWS.map((m) => ({ chip: m.code, cjk: ORGAN[m.code], name: m.name, hanzi: m.hanzi, course: m.course })),
      points,
      lines,
      band: true,
    };
  }

  /** The usual trigger-point regions of the muscles, after Travell and Simons. */
  private triggerMapData(): MapData {
    const points: MapPoint[] = [];
    for (const c of TRIGGER_CLUSTERS)
      for (const side of ['l', 'r'] as const) {
        const a = this.place(c.at, side);
        if (!a) continue;
        points.push({
          group: c.region,
          side,
          anchor: a,
          kicker: `trigger points · ${TRIGGER_REGIONS[c.region].toLowerCase()}`,
          title: c.muscle,
          sub: c.refers ? `refers pain to ${c.refers}` : '',
          where: 'A usual trigger-point region of this muscle, after Travell and Simons.',
          shape: 0,
        });
      }
    return {
      id: 'trigger-points',
      title: 'Trigger points',
      groups: TRIGGER_REGIONS.map((r, i) => ({
        chip: r.toLowerCase(),
        name: r,
        course: `${TRIGGER_CLUSTERS.filter((c) => c.region === i).length} muscles: ${TRIGGER_CLUSTERS.filter((c) => c.region === i)
          .map((c) => c.muscle.toLowerCase())
          .join(', ')}.`,
      })),
      points,
      lines: [],
    };
  }

  /** Brings one anatomical layer back to full strength while a map is on. */
  setCompare(layer: 'knots' | 'perforators' | 'vessels' | 'channels', on: boolean) {
    if (on) this.compare.add(layer);
    else this.compare.delete(layer);
    this.applyQuiet();
  }

  private applyQuiet() {
    const d = (layer: string, q: number) => (!this.quiet || this.compare.has(layer) ? 1 : q);
    const perforators = d('perforators', 0.3);
    const knots = d('knots', 0.28);
    const vessels = d('vessels', 0.12);
    const channels = d('channels', 0.14);
    const u = (m: { uniforms: Record<string, { value: unknown }> }, v: number) => (m.uniforms.uDim.value = v);
    u(this.cloud.material, perforators);
    this.cloud.material.uniforms.uKnotDim.value = knots;
    u(this.stalks.lineMaterial, perforators);
    u(this.stalks.collarMaterial, perforators);
    u(this.embers.material, knots);
    u(this.latch.pointMaterial, knots);
    u(this.latch.lineMaterial, knots);
    u(this.trees.material, vessels);
    u(this.rootMarkers.material, vessels);
    u(this.channels.lineMaterial, channels);
    u(this.channels.beadMaterial, channels);
    for (const k of Object.values(this.theories)) {
      u(k!.pointMaterial, knots);
      u(k!.lineMaterial, knots);
    }
  }

  /** Where a root sits on the current figure. */
  rootPosition(r: RootInstance): Vec3 {
    const t = r.anchor.tri * 3;
    const P = this.body.positions;
    const T = this.body.triangles;
    const w = 1 - r.anchor.u - r.anchor.v;
    const a = T[t] * 3;
    const b = T[t + 1] * 3;
    const c = T[t + 2] * 3;
    return [0, 1, 2].map((k) => P[a + k] * w + P[b + k] * r.anchor.u + P[c + k] * r.anchor.v) as Vec3;
  }
}
