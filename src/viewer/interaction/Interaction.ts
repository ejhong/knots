import { Vector3 } from 'three';
import type { AtlasScene } from '../AtlasScene';
import type { SurfaceHit } from './Picker';

export type Tool = 'look' | 'press' | 'roll' | 'hydro' | 'stress';

export interface HoverInfo {
  hit: SurfaceHit;
  /** Nearest perforator (index) or -1. */
  node: number;
  /** Nearest root (index into scene.roots) or -1. */
  root: number;
  screen: { x: number; y: number };
}

/**
 * Pointer → body. Hovering finds the nearest perforator; pressing applies the
 * chosen tool where the finger lands. Dragging off the body orbits.
 */
export class Interaction {
  tool: Tool = 'press';
  hover: HoverInfo | null = null;
  pressing = false;
  /** Radius of a fingertip (m). */
  radius = 0.016;
  private pointer = { x: 0, y: 0, inside: false };
  private lastHit: Vector3 | null = null;
  private listeners = new Set<(h: HoverInfo | null) => void>();
  private pointerId = -1;

  constructor(private scene: AtlasScene) {
    const el = scene.engine.canvas;
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('pointerleave', () => {
      this.pointer.inside = false;
      this.setHover(null);
    });
  }

  onHover(cb: (h: HoverInfo | null) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private rel(e: PointerEvent) {
    const r = this.scene.engine.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  private cast(x: number, y: number, w: number, h: number) {
    return this.scene.picker.pick(x, y, w, h, this.scene.engine.camera);
  }

  private onMove = (e: PointerEvent) => {
    const p = this.rel(e);
    this.pointer = { x: p.x, y: p.y, inside: true };
    this.scene.engine.poke();
  };

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 || this.tool === 'look') return;
    const p = this.rel(e);
    const hit = this.cast(p.x, p.y, p.w, p.h);
    if (!hit) return;
    this.pressing = true;
    this.pointerId = e.pointerId;
    this.scene.engine.controls.enabled = false;
    this.scene.engine.canvas.setPointerCapture(e.pointerId);
    this.lastHit = hit.point.clone();
    if (this.tool === 'hydro') this.applyAt(hit, 0);
  };

  private onUp = (e: PointerEvent) => {
    if (!this.pressing) return;
    this.pressing = false;
    this.scene.engine.controls.enabled = true;
    if (this.pointerId >= 0) this.scene.engine.canvas.releasePointerCapture(this.pointerId);
    this.pointerId = -1;
    this.lastHit = null;
    void e;
  };

  private setHover(h: HoverInfo | null) {
    const prev = this.hover;
    this.hover = h;
    const glow = this.scene.cloud.glow;
    if (prev && prev.node >= 0) glow[prev.node] = 0;
    if (h && h.node >= 0) glow[h.node] = 1;
    this.scene.cloud.markGlowDirty();
    this.scene.rootMarkers.hover.fill(0);
    if (h && h.root >= 0) this.scene.rootMarkers.hover[h.root] = 1;
    for (const cb of this.listeners) cb(h);
  }

  /** Called every frame by the scene. */
  update(dt: number) {
    if (!this.pointer.inside && !this.pressing) return;
    const r = this.scene.engine.canvas.getBoundingClientRect();
    const hit = this.cast(this.pointer.x, this.pointer.y, r.width, r.height);
    if (!hit) {
      if (this.hover) this.setHover(null);
      return;
    }
    const node = this.nearestNode(hit.point);
    const root = this.nearestRoot(hit.point);
    this.setHover({ hit, node, root, screen: { x: this.pointer.x, y: this.pointer.y } });
    if (this.pressing) this.applyAt(hit, dt);
  }

  private nearestNode(p: Vector3): number {
    const L = this.scene.ladder;
    let best = this.scene.grid.nearest(p.x, p.y, p.z, 0.02, (i) => L.level[i] >= 1);
    if (best < 0) best = this.scene.grid.nearest(p.x, p.y, p.z, 0.008);
    return best;
  }

  private nearestRoot(p: Vector3): number {
    let best = -1;
    let bestD = 0.018;
    const P = this.scene.rootMarkers.positions;
    for (let r = 0; r < this.scene.roots.length; r++) {
      const d = Math.hypot(P[r * 3] - p.x, P[r * 3 + 1] - p.y, P[r * 3 + 2] - p.z);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    return best;
  }

  private nodesNear(p: Vector3, radius: number): [number, number][] {
    const out: [number, number][] = [];
    this.scene.grid.query(p.x, p.y, p.z, radius, (i, d) => out.push([i, Math.pow(1 - d / radius, 1.3)]));
    // Roots within reach are pressed too.
    const N = this.scene.ladder.count;
    const P = this.scene.rootMarkers.positions;
    for (let r = 0; r < this.scene.roots.length; r++) {
      const d = Math.hypot(P[r * 3] - p.x, P[r * 3 + 1] - p.y, P[r * 3 + 2] - p.z);
      if (d < radius * 1.2) out.push([N + r, 1 - d / (radius * 1.2)]);
    }
    return out;
  }

  private applyAt(hit: SurfaceHit, dt: number) {
    const sim = this.scene.sim;
    const p = hit.point;
    switch (this.tool) {
      case 'press':
        sim.applyPress(this.nodesNear(p, this.radius), 1);
        break;
      case 'roll': {
        const moved = this.lastHit ? this.lastHit.distanceTo(p) : 0;
        const speed = dt > 0 ? moved / dt : 0;
        sim.applyShear(this.nodesNear(p, this.radius * 1.6), Math.min(1, 0.35 + speed * 4));
        break;
      }
      case 'hydro':
        sim.hydrodissect(this.nodesNear(p, this.radius * 0.7));
        break;
      case 'stress':
        sim.aggravate(this.nodesNear(p, this.radius * 2.4), dt * 0.9);
        break;
    }
    this.lastHit = p.clone();
  }

  dispose() {
    const el = this.scene.engine.canvas;
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointercancel', this.onUp);
  }
}
