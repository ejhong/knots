import { DoubleSide, FrontSide, Vector2, Vector3 } from 'three';
import { Locator3D, mirrorLocator, type Vec3 } from './anchors/locate';
import type { Anchor } from './anchors/anchors';
import { anchorVertex } from './anchors/anchors';
import { BodyLayers } from './body/BodyLayers';
import { BodyModel, type Shape } from './body/BodyModel';
import { Backdrop } from './engine/Backdrop';
import { Engine } from './engine/Engine';
import type { ThemeName } from './engine/theme';
import { majorDensity } from './data/perforatorDensity';
import { ROOTS, type RootDef } from './data/roots';
import { buildLadder, DEFAULT_LADDER, type Ladder, type LadderParams } from './perforators/generate';
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
import { Interstitium } from './body/Interstitium';
import { segmentBody, smoothField, REGIONS, SUBCUTANEOUS_DEPTH, type Segmentation } from './body/skeleton';
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
  interstitium!: Interstitium;
  segmentation!: Segmentation;
  /** Per-fine-vertex subcutaneous depth (m) and lift weight. */
  depth!: Float32Array;
  liftWeight!: Float32Array;
  /** Per-perforator depth and lift weight. */
  perfDepth!: Float32Array;
  perfLift!: Float32Array;
  /** Exaggerated lift of the sheet at lift = 1 (m). */
  maxLift = 0.032;
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
  lift = 0;

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

    this.locator = new Locator3D(
      Float32Array.from(body.positions),
      Float32Array.from(body.normals),
      body.triangles,
      (n) => body.joint(n),
    );

    // Regions, fascial depth and lift weights (reference shape).
    this.segmentation = segmentBody(body);
    const V = body.meta.vertexCount;
    const coarseDepth = new Float32Array(V);
    const coarseLift = new Float32Array(V);
    for (let v = 0; v < V; v++) {
      coarseDepth[v] = SUBCUTANEOUS_DEPTH[REGIONS[this.segmentation.region[v]]];
      const r = this.segmentation.radius[v];
      coarseLift[v] = Math.min(1, Math.max(0.1, (r - 0.007) / 0.04));
    }
    this.depth = body.refineScalar(smoothField(coarseDepth, body.coarseQuads, 6));
    this.liftWeight = body.refineScalar(smoothField(coarseLift, body.coarseQuads, 3));

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
    this.layers.liftWeight.set(this.liftWeight);
    this.perfDepth = Float32Array.from(this.ladder.vertex, (v) => this.depth[v]);
    this.perfLift = Float32Array.from(this.ladder.vertex, (v) => this.liftWeight[v]);
    this.cloud = new PerforatorCloud(this.ladder);
    this.cloud.setLiftWeights(this.perfLift);
    this.stalks = new Stalks(this.ladder, this.perfDepth, this.perfLift);
    const refGrid = new PointGrid(this.refPositions, 0.012);
    this.interstitium = new Interstitium(
      body,
      window.matchMedia?.('(max-width: 760px)').matches ? 14000 : 36000,
      (x, y, z) => {
        const j = refGrid.nearest(x, y, z, 0.03);
        return j < 0 ? 0 : j;
      },
      this.ladder.count,
      this.depth,
      this.liftWeight,
    );
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
      this.trees.lines,
      this.interstitium.points,
      this.stalks.lines,
      this.cloud.points,
      this.stalks.collars,
      this.rootMarkers.points,
      this.layers.sheet,
    );
    this.trees.setInsets(this.depth);
    this.interaction = new Interaction(this);

    this.engine.onTheme((t) => {
      this.layers.applyTheme(t);
      this.cloud.applyTheme(t);
      this.trees.applyTheme(t);
      this.rootMarkers.applyTheme(t);
      this.stalks.applyTheme(t);
      this.interstitium.applyTheme(t);
    });
    this.engine.onFrame(({ time, dt }) => {
      this.interaction.update(dt);
      this.stepSim(dt);
      this.pulses.update(dt);
      this.frame(time);
    });
    this.refreshShape();
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
    this.interstitium?.refresh(this.body, this.cloud.positions);
    if (this.rootMarkers) {
      this.roots.forEach((r, i) => {
        const p = this.rootPosition(r);
        const n = this.body.normals;
        const v = r.vertex * 3;
        for (let k = 0; k < 3; k++) this.rootMarkers.positions[i * 3 + k] = p[k] + n[v + k] * 0.0015;
      });
      this.rootMarkers.update();
    }
    this.trees.refresh(this.body);
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
    this.cloud.knot.set(this.sim.knot);
    this.cloud.flash.set(this.sim.flash);
    this.cloud.markKnotsDirty();
    this.cloud.markFlashDirty();
    if (this.lift > 0.01) {
      this.stalks.setKnots(this.sim.knot);
      this.interstitium.setKnots(this.sim.knot);
    }
    this.rootMarkers.knot.set(this.sim.rootKnot);
    this.rootMarkers.flash.set(this.sim.rootFlash);
    this.rootMarkers.update();
  }

  /**
   * Section cut: hides everything on the positive side of a plane
   * (normal · p > d), revealing the layers in cross-section. Pass null to
   * clear.
   */
  setClip(plane: { normal: [number, number, number]; d: number } | null) {
    const mats = [
      this.cloud.material,
      this.trees.material,
      this.stalks.lineMaterial,
      this.stalks.collarMaterial,
      this.interstitium.material,
      this.rootMarkers.material,
      this.layers.floorMaterial,
      this.layers.sheetMaterial,
    ];
    for (const m of mats) {
      m.uniforms.uClipOn.value = plane ? 1 : 0;
      if (plane) m.uniforms.uClip.value.set(...plane.normal, plane.d);
    }
    this.layers.floorMaterial.side = plane ? DoubleSide : FrontSide;
    this.layers.floorMaterial.needsUpdate = true;
  }

  /** Lifts the sheet off the floor: 0 = true anatomy, 1 = exaggerated. */
  setLift(v: number) {
    const was = this.lift;
    this.lift = v;
    this.stalks.setLift(v, this.maxLift);
    this.interstitium.setLift(v, this.maxLift);
    this.layers.sheet.visible = v > 0.01;
    if (was <= 0.01 && v > 0.01) {
      this.stalks.setKnots(this.sim.knot);
      this.interstitium.setKnots(this.sim.knot);
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
    cu.uLift.value = this.lift * this.maxLift;
    const lk = this.lift <= 0 ? 0 : this.lift >= 1 ? 1 : this.lift * this.lift * (3 - 2 * this.lift);
    const insetScale = 0.55 + 0.45 * lk;
    const fu = this.layers.floorMaterial.uniforms;
    fu.uLight.value.copy(this.lightWorld);
    fu.uInsetScale.value = insetScale;
    fu.uLineAlpha.value = 0.22 + 0.4 * lk;
    const su = this.layers.sheetMaterial.uniforms;
    su.uLight.value.copy(this.lightWorld);
    su.uTime.value = time;
    su.uLift.value = this.lift * this.maxLift;
    su.uOpacity.value = 0.32 * lk;
    this.stalks.lineMaterial.uniforms.uInsetScale.value = insetScale;
    this.stalks.collarMaterial.uniforms.uProjScale.value = projScale;
    const iu = this.interstitium.material.uniforms;
    iu.uTime.value = time;
    iu.uProjScale.value = projScale;
    iu.uPixelRatio.value = pr;
    this.trees.material.uniforms.uInsetScale.value = insetScale * lk;
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
