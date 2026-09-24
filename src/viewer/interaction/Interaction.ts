import { Vector3 } from 'three';
import type { AtlasScene } from '../AtlasScene';
import type { SurfaceHit } from './Picker';

export type Tool = 'look' | 'release' | 'press' | 'roll' | 'hydro' | 'stress';

export interface HoverInfo {
  hit: SurfaceHit;
  /** Nearest perforator (index) or -1. */
  node: number;
  /** Nearest root (index into scene.roots) or -1. */
  root: number;
  screen: { x: number; y: number };
}

/**
 * Pointer → body. Hovering finds the nearest perforator. With the release
 * tool: a click (a tap) selects — the place stays inspected, which is how a
 * phone, with no hover, inspects; a double-click releases the knots under
 * the pointer, and holding still keeps pressing; dragging turns the body as
 * usual; a shift-click places the dissection window. (The older tools press,
 * roll, hydrodissect or aggravate while the pointer is down.)
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
  /** A press that has not (yet) become a drag. */
  private down: { x: number; y: number; t: number; still: boolean; place: boolean; double: boolean } | null = null;
  private releaseListeners = new Set<() => void>();
  private placeListeners = new Set<(hit: SurfaceHit) => void>();
  private selectListeners = new Set<(h: HoverInfo | null) => void>();
  /** The last plain click, to recognise a second one as a double-click. */
  private lastClick: { x: number; y: number; t: number } | null = null;
  /** Touch has no hover: a finger only inspects where it taps. */
  private hoverOn = true;
  /** A press held this long without moving keeps releasing (ms). */
  private static HOLD_MS = 450;
  /** A second press this soon after a click's lift, and this near it, makes a double-click (ms, px). */
  private static DOUBLE_MS = 420;

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

  /** Called whenever knots are pressed with the release tool. */
  onRelease(cb: () => void) {
    this.releaseListeners.add(cb);
    return () => this.releaseListeners.delete(cb);
  }

  /** Called on a click: the place selected, or null for a click off the body. */
  onSelect(cb: (h: HoverInfo | null) => void) {
    this.selectListeners.add(cb);
    return () => this.selectListeners.delete(cb);
  }

  /** Called on a shift-click on the body (to place the dissection window). */
  onPlace(cb: (hit: SurfaceHit) => void) {
    this.placeListeners.add(cb);
    return () => this.placeListeners.delete(cb);
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
    this.hoverOn = e.pointerType !== 'touch';
    this.pointer = { x: p.x, y: p.y, inside: true };
    if (this.down && this.down.still && Math.hypot(p.x - this.down.x, p.y - this.down.y) > 6) {
      // It became a drag: whatever was selected is let go.
      this.down.still = false;
      for (const cb of this.selectListeners) cb(null);
    }
    this.scene.engine.poke();
  };

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 || this.tool === 'look') return;
    if (this.tool === 'release') {
      const p = this.rel(e);
      // The event's own time: a busy frame must not stretch a quick gesture.
      const now = e.timeStamp || performance.now();
      this.hoverOn = e.pointerType !== 'touch';
      if (!this.hoverOn && this.hover) this.setHover(null);
      const last = this.lastClick;
      const double = !e.shiftKey && !!last && now - last.t < Interaction.DOUBLE_MS && Math.hypot(p.x - last.x, p.y - last.y) < (this.hoverOn ? 16 : 30);
      this.down = { x: p.x, y: p.y, t: now, still: true, place: e.shiftKey, double };
      if (double) {
        // The second press of a double-click releases at once (and lets go of the selection).
        this.lastClick = null;
        for (const cb of this.selectListeners) cb(null);
        const hit = this.cast(p.x, p.y, p.w, p.h);
        if (hit) this.releaseHere(hit, 1.2);
      }
      return;
    }
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
    if (this.down) {
      const d = this.down;
      this.down = null;
      if (!d.still) return;
      const p = this.rel(e);
      const hit = this.cast(p.x, p.y, p.w, p.h);
      if (d.place) {
        if (hit) for (const cb of this.placeListeners) cb(hit);
        return;
      }
      if (d.double) return; // it released at its press
      const now = e.timeStamp || performance.now();
      if (now - d.t >= Interaction.HOLD_MS) return; // a hold: it pressed while held
      this.lastClick = { x: p.x, y: p.y, t: now };
      const info = hit ? { hit, node: this.nearestNode(hit.point), root: this.nearestRoot(hit.point), screen: { x: p.x, y: p.y } } : null;
      for (const cb of this.selectListeners) cb(info);
      return;
    }
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
    // With a map shown the map has the pointer: no perforator lights up under it.
    const mark = !this.scene.activeMap;
    const glow = this.scene.cloud.glow;
    if (prev && prev.node >= 0) glow[prev.node] = 0;
    if (mark && h && h.node >= 0) glow[h.node] = 1;
    this.scene.cloud.markGlowDirty();
    this.scene.rootMarkers.hover.fill(0);
    if (mark && h && h.root >= 0) this.scene.rootMarkers.hover[h.root] = 1;
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
    if (this.hoverOn) {
      const node = this.nearestNode(hit.point);
      const root = this.nearestRoot(hit.point);
      this.setHover({ hit, node, root, screen: { x: this.pointer.x, y: this.pointer.y } });
    } else if (this.hover) this.setHover(null);
    if (this.pressing) this.applyAt(hit, dt);
    // Holding still keeps pressing: about two clicks' worth a second.
    const d = this.down;
    if (d && d.still && !d.place && performance.now() - d.t > Interaction.HOLD_MS) this.releaseHere(hit, dt * 2.2);
  }

  /** Releases under a hit, over a patch that looks the same size on screen at any zoom. */
  private releaseHere(hit: SurfaceHit, amount: number) {
    const cam = this.scene.engine.camera;
    const h = this.scene.engine.canvas.getBoundingClientRect().height || 1;
    const perPx = (2 * cam.position.distanceTo(hit.point) * Math.tan((cam.fov * Math.PI) / 360)) / h;
    const radius = Math.min(0.07, Math.max(0.01, 32 * perPx));
    this.scene.releaseAt(hit.point, radius, amount);
    for (const cb of this.releaseListeners) cb();
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
