/**
 * One theory's patch, seen from above, drawn from its run (docs/SIMULATION.md, "The patch, drawn"): 4 cm of the upper
 * back, fibres running across, stress held toward the neck (the top). Each theory's units sit where its anatomy puts
 * them; a held knot glows terracotta, a release flashes jade, the hand is bronze. Everything that moves comes from the
 * model's frames; nothing is animated by hand but the fades between frames and the flicker of a firing unit.
 */
import type { Cells, FilmTheory, Layout, PatchIndex, TheoryIndex } from './data';

export const INKC = {
  bg: '#1b2023',
  bg2: '#262c30',
  knot: '#e27b61',
  spark: '#a8e6cd',
  vessel: '#b3c4d2',
  ivory: '#e6dccd',
  stone: '#8a9593',
  hand: '#c9a77c',
  ochre: '#c9a45f',
};

export type FrameInput = {
  f: number; // frame index
  t: number; // model seconds
  hand: boolean;
  roll: boolean;
  attend: boolean;
  breath: number; // -1..1
};

type Flash = { unit: number; kind: string; size: number; born: number };

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};

export class PatchView {
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private px = 0;
  private s = 1; // px per mm
  private dpr = 1;
  private cells: Cells | null = null;
  private film: FilmTheory | null = null;
  private held: Float32Array;
  private act: Float32Array;
  private halo: Float32Array;
  private flashes: Flash[] = [];
  private lastT = -1;
  readonly lay: Layout;
  readonly stiff: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    private th: TheoryIndex,
    private patch: PatchIndex,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.base = document.createElement('canvas');
    this.lay = th.layout;
    const n = this.lay.n;
    this.held = new Float32Array(n);
    this.act = new Float32Array(n);
    this.halo = new Float32Array(n);
    this.stiff = th.id === 'T3' || th.id === 'T7';
    this.resize();
  }

  // mm to px: x along the fibres; y toward the neck, drawn upward
  private X = (x: number) => x * this.s;
  private Y = (y: number) => (this.patch.size - y) * this.s;

  resize(): void {
    const w = Math.max(120, Math.round(this.canvas.clientWidth || 240));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.px = w;
    this.s = w / this.patch.size;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(w * this.dpr);
    this.base.width = this.canvas.width;
    this.base.height = this.canvas.height;
    this.drawBase();
  }

  setRun(cells: Cells, film: FilmTheory): void {
    this.cells = cells;
    this.film = film;
    this.held.fill(0);
    this.act.fill(0);
    this.halo.fill(0);
    this.flashes = [];
    this.lastT = -1;
  }

  /** Jump without fades (scrubbing): take the frame's values at once. */
  settle(f: number): void {
    if (!this.cells) return;
    for (let j = 0; j < this.lay.n; j++) {
      this.held[j] = this.cells.held(f, j) ? 1 : 0;
      this.act[j] = this.cells.active(f, j) ? 1 : 0;
      this.halo[j] = this.haloTarget(f, j);
    }
    this.flashes = [];
    this.lastT = -1;
  }

  private haloTarget(f: number, j: number): number {
    const c = this.cells!;
    return this.stiff ? Math.min(c.bump(f, j) / 2, 1) : Math.min(c.tender(f, j) / 1.5, 1);
  }

  // ---------- the still layer: tissue, stress, the theory's anatomy ----------

  private drawBase(): void {
    const g = this.base.getContext('2d')!;
    const { dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = this.px;
    const bgGrad = g.createRadialGradient(w * 0.5, w * 0.45, w * 0.05, w * 0.5, w * 0.5, w * 0.75);
    bgGrad.addColorStop(0, INKC.bg2);
    bgGrad.addColorStop(1, INKC.bg);
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, w, w);
    // where stress is held: a faint warm wash, from the shared field
    const sh = this.patch.share;
    const m = sh.length;
    const tiny = document.createElement('canvas');
    tiny.width = m;
    tiny.height = m;
    const tg = tiny.getContext('2d')!;
    const img = tg.createImageData(m, m);
    for (let r = 0; r < m; r++)
      for (let c = 0; c < m; c++) {
        const a = Math.max(0, sh[r][c] - 0.42) * 0.22;
        const i = ((m - 1 - r) * m + c) * 4;
        img.data[i] = 201;
        img.data[i + 1] = 164;
        img.data[i + 2] = 95;
        img.data[i + 3] = Math.round(a * 255);
      }
    tg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(tiny, 0, 0, w, w);
    // the muscle's fibres, running across
    g.lineWidth = 0.6;
    for (let i = 0; i < 34; i++) {
      const y0 = (i + 0.5) * (w / 34);
      g.strokeStyle = rgba(INKC.ivory, 0.035 + 0.02 * ((i * 7) % 3));
      g.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = y0 + Math.sin(x * 0.021 + i * 1.7) * 1.4;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    const L = this.lay;
    const id = this.th.id;
    if (id === 'T2') {
      for (const [x, y] of L.pos) {
        g.fillStyle = rgba(INKC.vessel, 0.45);
        g.beginPath();
        g.arc(this.X(x), this.Y(y), Math.max(1, 0.25 * this.s), 0, Math.PI * 2);
        g.fill();
      }
    } else if (id === 'T1') {
      g.lineWidth = 0.8;
      for (let j = 0; j < L.n; j++) {
        const p = L.parent[j];
        if (p < 0) continue;
        g.strokeStyle = rgba(INKC.vessel, 0.2);
        g.beginPath();
        g.moveTo(this.X(L.pos[p][0]), this.Y(L.pos[p][1]));
        g.lineTo(this.X(L.pos[j][0]), this.Y(L.pos[j][1]));
        g.stroke();
      }
      for (let j = 0; j < L.n; j++) {
        const [x, y] = L.pos[j];
        if (L.kind[j] === 'parent') {
          g.strokeStyle = rgba(INKC.vessel, 0.55);
          g.lineWidth = 1;
          g.beginPath();
          g.arc(this.X(x), this.Y(y), 0.55 * this.s, 0, Math.PI * 2);
          g.stroke();
        } else {
          g.fillStyle = rgba(INKC.ivory, 0.5);
          g.beginPath();
          g.arc(this.X(x), this.Y(y), Math.max(1, 0.22 * this.s), 0, Math.PI * 2);
          g.fill();
        }
      }
    } else if (id === 'T3') {
      if (L.zone_x !== undefined) {
        g.setLineDash([2, 4]);
        g.strokeStyle = rgba(INKC.stone, 0.22);
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(this.X(L.zone_x), 0);
        g.lineTo(this.X(L.zone_x), w);
        g.stroke();
        g.setLineDash([]);
      }
      const [aa, ax] = L.nodule ?? [2.8, 1.8];
      for (let j = 0; j < L.n; j++) {
        const [x, y] = L.pos[j];
        g.strokeStyle = rgba(INKC.ivory, 0.12);
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(this.X(x - 15), this.Y(y));
        g.lineTo(this.X(x + 15), this.Y(y));
        g.stroke();
        g.strokeStyle = rgba(INKC.ivory, 0.3);
        g.lineWidth = 0.8;
        g.beginPath();
        g.ellipse(this.X(x), this.Y(y), aa * this.s, ax * this.s, 0, 0, Math.PI * 2);
        g.stroke();
      }
    } else if (id === 'T6') {
      const r = (L.spacing ?? 10) * 0.42 * this.s;
      g.setLineDash([1.5, 3.5]);
      g.strokeStyle = rgba(INKC.stone, 0.28);
      g.lineWidth = 0.8;
      for (const [x, y] of L.pos) {
        g.beginPath();
        g.arc(this.X(x), this.Y(y), r, 0, Math.PI * 2);
        g.stroke();
      }
      g.setLineDash([]);
    } else if (id === 'T7') {
      g.lineWidth = 0.7;
      for (let j = 0; j < L.n; j++) {
        const [x, y] = L.pos[j];
        const a = (L.territory_along?.[j] ?? 15) * this.s;
        const b = (L.territory_across?.[j] ?? 3.5) * this.s;
        g.strokeStyle = rgba(INKC.ivory, 0.06);
        g.beginPath();
        g.ellipse(this.X(x), this.Y(y), a, b, 0, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = rgba(INKC.ivory, 0.28);
        g.beginPath();
        g.arc(this.X(x), this.Y(y), 0.8, 0, Math.PI * 2);
        g.fill();
      }
    }
    // the spot and the sham
    const [sx, sy] = this.patch.spot;
    g.strokeStyle = rgba(INKC.stone, 0.55);
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(this.X(sx), this.Y(sy), 2, 0, Math.PI * 2);
    g.stroke();
  }

  // ---------- a frame ----------

  draw(inp: FrameInput, dtReal: number, now: number): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.base, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const c = this.cells;
    if (!c) return;
    const f = Math.min(Math.max(Math.round(inp.f), 0), c.frames - 1);
    const kOn = 1 - Math.exp(-dtReal / 0.12);
    const kOff = 1 - Math.exp(-dtReal / 0.3);
    for (let j = 0; j < this.lay.n; j++) {
      const h = c.held(f, j) ? 1 : 0;
      const a = c.active(f, j) ? 1 : 0;
      const ht = this.haloTarget(f, j);
      this.held[j] += (h - this.held[j]) * (h > this.held[j] ? kOn : kOff);
      this.act[j] += (a - this.act[j]) * (a > this.act[j] ? kOn : kOff);
      this.halo[j] += (ht - this.halo[j]) * (ht > this.halo[j] ? kOn : kOff);
    }
    // flashes: events the playhead has just passed
    if (this.film && this.lastT >= 0 && inp.t > this.lastT && inp.t - this.lastT < 60) {
      for (const [u, te, kind, size] of this.film.events) if (te > this.lastT && te <= inp.t) this.flashes.push({ unit: u, kind, size, born: now });
    }
    this.lastT = inp.t;
    ctx.globalCompositeOperation = 'lighter';
    const id = this.th.id;
    if (id === 'T1') this.drawT1();
    else if (id === 'T2') this.drawT2();
    else if (id === 'T3') this.drawT3();
    else if (id === 'T6') this.drawT6();
    else if (id === 'T7') this.drawT7(now);
    this.drawFlashes(now);
    ctx.globalCompositeOperation = 'source-over';
    this.drawHand(inp);
  }

  private glow(x: number, y: number, r: number, color: string, a: number): void {
    if (a <= 0.003 || r <= 0) return;
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(0.45, rgba(color, a * 0.45));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private glowEllipse(x: number, y: number, rx: number, ry: number, color: string, a: number): void {
    if (a <= 0.003) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    this.glow(0, 0, rx, color, a);
    ctx.restore();
  }

  private drawT1(): void {
    const L = this.lay;
    for (let j = 0; j < L.n; j++) {
      const x = this.X(L.pos[j][0]);
      const y = this.Y(L.pos[j][1]);
      const parent = L.kind[j] === 'parent';
      // the patch it starves: tender
      this.glow(x, y, (parent ? 6.5 : 4.2) * this.s, INKC.knot, 0.16 * this.halo[j]);
      // the shut vessel itself
      this.glow(x, y, (parent ? 2.2 : 1.5) * this.s, INKC.knot, 0.95 * this.held[j]);
      this.glow(x, y, (parent ? 1.2 : 0.8) * this.s, INKC.ivory, 0.18 * this.act[j]);
    }
  }

  private drawT2(): void {
    // a clamped region is shadowed (less blood); a held one is a knot, tender only as awareness reaches it
    const L = this.lay;
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'source-over';
    for (let j = 0; j < L.n; j++) {
      if (this.held[j] < 0.02) continue;
      const x = this.X(L.pos[j][0]);
      const y = this.Y(L.pos[j][1]);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 4.5 * this.s);
      g.addColorStop(0, `rgba(10,12,14,${(0.55 * this.held[j]).toFixed(3)})`);
      g.addColorStop(1, 'rgba(10,12,14,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 4.5 * this.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < L.n; j++) {
      const x = this.X(L.pos[j][0]);
      const y = this.Y(L.pos[j][1]);
      // a knot is terracotta in every theory; here its halo (tenderness) waits for awareness to reach it
      this.glow(x, y, 1.6 * this.s, INKC.knot, 0.9 * this.held[j]);
      this.glow(x, y, 4.2 * this.s, INKC.knot, 0.2 * this.halo[j]);
    }
  }

  private drawT3(): void {
    const L = this.lay;
    const [aa, ax] = L.nodule ?? [2.8, 1.8];
    const ctx = this.ctx;
    for (let j = 0; j < L.n; j++) {
      const x = this.X(L.pos[j][0]);
      const y = this.Y(L.pos[j][1]);
      const firm = Math.max(this.halo[j], 0.35 * this.held[j]);
      if (firm > 0.01) {
        // the taut band, drawn taut
        const grad = ctx.createLinearGradient(x - 15 * this.s, 0, x + 15 * this.s, 0);
        grad.addColorStop(0, rgba(INKC.knot, 0));
        grad.addColorStop(0.5, rgba(INKC.knot, 0.55 * firm));
        grad.addColorStop(1, rgba(INKC.knot, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - 15 * this.s, y);
        ctx.lineTo(x + 15 * this.s, y);
        ctx.stroke();
      }
      this.glowEllipse(x, y, aa * 1.8 * this.s, ax * 1.8 * this.s, INKC.knot, 0.95 * this.held[j]);
      this.glow(x, y, 5 * this.s, INKC.knot, 0.1 * firm);
      this.glowEllipse(x, y, aa * this.s, ax * this.s, INKC.ivory, 0.15 * this.act[j]);
    }
  }

  private drawT6(): void {
    const L = this.lay;
    const r = (L.spacing ?? 10) * 0.62 * this.s;
    for (let j = 0; j < L.n; j++) {
      const x = this.X(L.pos[j][0]);
      const y = this.Y(L.pos[j][1]);
      const felt = Math.min(this.halo[j], 1);
      this.glow(x, y, r, INKC.knot, 0.42 * this.held[j] * (0.6 + 0.4 * felt));
      this.glow(x, y, r * 0.8, INKC.ivory, 0.06 * felt * (1 - this.held[j]));
    }
  }

  private drawT7(now: number): void {
    const L = this.lay;
    for (let j = 0; j < L.n; j++) {
      const x = this.X(L.pos[j][0]);
      const y = this.Y(L.pos[j][1]);
      const a = (L.territory_along?.[j] ?? 15) * this.s;
      const b = (L.territory_across?.[j] ?? 3.5) * this.s * 1.4;
      const flicker = 0.82 + 0.18 * Math.sin(now * 0.001 * 2 * Math.PI * 9 + j * 1.3);
      this.glowEllipse(x, y, a, b, INKC.knot, 0.34 * this.held[j] * flicker);
      this.glowEllipse(x, y, a, b, INKC.ivory, 0.07 * this.act[j] * flicker);
    }
  }

  private drawFlashes(now: number): void {
    const ctx = this.ctx;
    const L = this.lay;
    this.flashes = this.flashes.filter((fl) => now - fl.born < 1400);
    for (const fl of this.flashes) {
      const age = (now - fl.born) / 1400;
      const x = this.X(L.pos[fl.unit][0]);
      const y = this.Y(L.pos[fl.unit][1]);
      const a = (1 - age) * (0.5 + 0.5 * Math.min(fl.size * 4, 1));
      if (fl.kind === 'spark') {
        const R = (1.5 + 5.5 * Math.sqrt(age)) * this.s;
        this.glow(x, y, R, INKC.spark, 0.35 * a);
        ctx.strokeStyle = rgba(INKC.spark, 0.9 * a);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const th = (i * Math.PI) / 4 + 0.3;
          const r0 = R * 0.25;
          const r1 = R * (i % 2 ? 0.7 : 1);
          ctx.moveTo(x + Math.cos(th) * r0, y + Math.sin(th) * r0);
          ctx.lineTo(x + Math.cos(th) * r1, y + Math.sin(th) * r1);
        }
        ctx.stroke();
      } else {
        const grad = ctx.createLinearGradient(x - 15 * this.s, 0, x + 15 * this.s, 0);
        grad.addColorStop(0, rgba(INKC.spark, 0));
        grad.addColorStop(0.5, rgba(INKC.spark, a));
        grad.addColorStop(1, rgba(INKC.spark, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 15 * this.s, y);
        ctx.lineTo(x + 15 * this.s, y);
        ctx.stroke();
      }
    }
  }

  private drawHand(inp: FrameInput): void {
    const ctx = this.ctx;
    const [sx, sy] = this.patch.spot;
    const x = this.X(sx);
    const y = this.Y(sy);
    const r = this.patch.hand_r * this.s;
    if (inp.attend) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = rgba(INKC.spark, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r * (0.92 + 0.06 * inp.breath), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (inp.hand) {
      ctx.fillStyle = rgba(INKC.hand, 0.13);
      ctx.strokeStyle = rgba(INKC.hand, 0.7);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (inp.roll) {
      const [[x0, y0], [x1, y1]] = this.patch.roll;
      ctx.fillStyle = rgba(INKC.hand, 0.16);
      ctx.strokeStyle = rgba(INKC.hand, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(this.X(x0), this.Y(y1), (x1 - x0) * this.s, (y1 - y0) * this.s);
      ctx.fill();
      ctx.stroke();
    }
  }
}
