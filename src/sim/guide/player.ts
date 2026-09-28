/**
 * The field guide's instrument: scenes, the modelled theories' patches side by side, the timeline, and one theory
 * up close (its plate beneath the spot and what instruments would record). Everything drawn comes from the films the
 * Python engine wrote; this only plays them.
 */
import indexData from '../../data/sim/guide.json';
import { Cells, loadFilm, type Film, type GuideIndex } from './data';
import { INKC, PatchView } from './patch';
import { PLATES } from './plate';
import { switchChart, type Switch } from './switch';

const index = indexData as unknown as GuideIndex;
const VIEW_SECONDS = 36; // how long a scene takes to watch

const INST: Record<string, [string, string, string][]> = {
  T1: [['flow_spot', 'skin flow at the spot (laser speckle)', INKC.vessel], ['flow_sham', 'at the sham', INKC.stone]],
  T2: [['flow_spot', 'blood flow at the spot', INKC.vessel], ['flow_sham', 'at the sham', INKC.stone]],
  T3: [['stiffness', 'contracture at the spot (elastography)', INKC.ivory], ['needle_emg', 'endplate activity (needle EMG)', INKC.ochre]],
  T4: [['glide_spot', 'the layers sliding at the spot (ultrasound)', INKC.ivory], ['glide_sham', 'at the sham', INKC.stone]],
  T5: [['nerve_firing', "the nerve's firing at the spot (1: felt)", INKC.ivory], ['sympathetic', 'the sympathetic drive reaching it', INKC.ochre]],
  T7: [['emg_units', 'motor units firing under the electrode (surface EMG)', INKC.ivory], ['stiffness', 'firmness at the spot', INKC.ochre]],
  T6: [['felt', 'what is felt at the spot (report)', INKC.ivory]],
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export function mountGuide(root: HTMLElement, base: string): void {
  const $ = <T extends Element>(sel: string) => root.querySelector(sel) as T | null;
  const $$ = <T extends Element>(sel: string) => Array.from(root.querySelectorAll(sel)) as T[];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const views = new Map<string, PatchView>();
  for (const th of index.theories) {
    const cv = $<HTMLCanvasElement>(`[data-patch="${th.id}"]`);
    if (cv) views.set(th.id, new PatchView(cv, th, index.patch));
  }
  const closeCv = $<HTMLCanvasElement>('[data-patch-close]');
  let closeView: PatchView | null = null;
  const plateBox = $<HTMLElement>('[data-plate]');
  const instBox = $<HTMLElement>('[data-inst]');
  const switchBox = $<HTMLElement>('[data-switch]');
  const switchNote = $<HTMLElement>('[data-switch-note]');
  const clock = $<HTMLElement>('[data-clock]');
  const scrub = $<HTMLInputElement>('[data-scrub]');
  const play = $<HTMLButtonElement>('[data-play]');
  const what = $<HTMLElement>('[data-what]');
  const timeline = $<SVGSVGElement>('[data-timeline]');

  let film: Film | null = null;
  let cells = new Map<string, Cells>();
  let scene = index.scenes.find((s) => s.film)!;
  let t = 0;
  let playing = false;
  let speed = 1;
  let selected = index.theories[0].id;
  let last = performance.now();
  let visible = true;

  const frameAt = (time: number) => (film ? Math.min(Math.floor(time / film.frame + 1e-6), film.frames - 1) : 0);

  // ---------- choosing ----------

  async function choose(id: string, autoplay = true) {
    const sc = index.scenes.find((s) => s.id === id);
    if (!sc) return;
    scene = sc;
    $$<HTMLButtonElement>('[data-scene]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === id)));
    if (what) what.textContent = sc.what;
    root.classList.add('loading');
    film = await loadFilm(base, id);
    root.classList.remove('loading');
    (window as unknown as { atlasReady?: boolean }).atlasReady = true; // for scripts/shot.ts
    cells = new Map();
    for (const th of index.theories) {
      const ft = film.theories[th.id];
      const c = new Cells(ft.cells, film.frames, th.layout.n);
      cells.set(th.id, c);
      views.get(th.id)?.setRun(c, ft);
    }
    speed = sc.duration / VIEW_SECONDS;
    if (scrub) {
      scrub.max = String(sc.duration);
      scrub.step = String(film.frame);
    }
    drawTimeline();
    select(selected, false);
    seek(reduce ? sc.duration : 0);
    playing = autoplay && !reduce;
    syncPlay();
  }

  function select(id: string, scroll = true) {
    selected = id;
    const th = index.theories.find((x) => x.id === id);
    if (!th) return;
    $$<HTMLElement>('[data-card]').forEach((c) => c.classList.toggle('on', c.dataset.card === id));
    $$<HTMLElement>('[data-traits]').forEach((c) => (c.hidden = c.dataset.traits !== id));
    const title = $<HTMLElement>('[data-close-title]');
    if (title) title.textContent = `${th.glyph} ${th.name}`;
    if (closeCv) {
      closeView = new PatchView(closeCv, th, index.patch);
      const c = cells.get(id);
      if (c && film) closeView.setRun(c, film.theories[id]);
      closeView.settle(frameAt(t));
    }
    if (plateBox) plateBox.innerHTML = PLATES[id]?.svg ?? '';
    const sw = (th as unknown as { switch?: Switch }).switch;
    if (switchBox) switchBox.innerHTML = switchChart(sw);
    if (switchNote) switchNote.textContent = sw?.note ?? '';
    $$<HTMLButtonElement>('[data-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pick === id)));
    drawInst();
    drawTimeline();
    if (scroll) $<HTMLElement>('#close')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function seek(time: number) {
    t = Math.max(0, Math.min(time, scene.duration));
    const f = frameAt(t);
    for (const v of views.values()) v.settle(f);
    closeView?.settle(f);
    render(0, performance.now());
  }

  function syncPlay() {
    if (play) {
      play.textContent = playing ? '❚❚' : '▶';
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
  }

  // ---------- the timeline and the instruments ----------

  function drawTimeline() {
    if (!timeline || !film) return;
    const W = 600;
    const H = 46;
    const x = (s: number) => (s / film!.duration) * W;
    const n = film.frames;
    const ft = film.theories[selected];
    let breath = '';
    if (film.breath.some((b) => b !== 0 && b !== null)) {
      breath = film.breath.map((b, i) => `${i ? 'L' : 'M'}${x(i * film!.frame).toFixed(1)} ${(16 - 9 * (b ?? 0)).toFixed(1)}`).join(' ');
    }
    const band = (arr: number[], y: number, h: number, color: string) => {
      let out = '';
      let start = -1;
      for (let i = 0; i <= n; i++) {
        const on = i < n && arr[i] > 0;
        if (on && start < 0) start = i;
        if (!on && start >= 0) {
          out += `<rect x="${x(start * film!.frame).toFixed(1)}" y="${y}" width="${Math.max(x((i - start) * film!.frame), 1).toFixed(1)}" height="${h}" fill="${color}"/>`;
          start = -1;
        }
      }
      return out;
    };
    const smax = Math.max(1, ...ft.stress.map((v) => v ?? 0));
    const stress = ft.stress.map((v, i) => `${i ? 'L' : 'M'}${x(i * film!.frame).toFixed(1)} ${(44 - 12 * ((v ?? 0) / smax)).toFixed(1)}`).join(' ');
    timeline.setAttribute('viewBox', `0 0 ${W} ${H}`);
    timeline.innerHTML = `
      ${band(ft.hand, 29, 5, 'rgba(201,167,124,0.55)')}${band(film.attend, 35, 3, 'rgba(168,230,205,0.55)')}${band(film.roll, 29, 5, 'rgba(201,167,124,0.35)')}
      <path d="${stress}" fill="none" stroke="rgba(201,164,95,0.55)" stroke-width="1"/>
      ${breath ? `<path d="${breath}" fill="none" stroke="rgba(230,220,205,0.45)" stroke-width="1"/>` : ''}
      <line data-head x1="0" x2="0" y1="0" y2="${H}" stroke="rgba(230,220,205,0.8)" stroke-width="1"/>`;
  }

  function drawInst() {
    if (!instBox || !film) return;
    const ft = film.theories[selected];
    const rows = INST[selected] ?? [];
    const W = 360;
    const rowH = 34;
    const H = rows.length * rowH + 6;
    const x = (i: number) => 8 + (i / Math.max(film!.frames - 1, 1)) * (W - 16);
    let hi = 0;
    for (const [k] of rows) for (const v of ft.inst[k] ?? []) hi = Math.max(hi, v ?? 0);
    hi = hi || 1;
    const paths = rows
      .map(([k, label, color], r) => {
        const y0 = r * rowH + rowH - 4;
        const d = (ft.inst[k] ?? []).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${(y0 - ((v ?? 0) / hi) * (rowH - 14)).toFixed(1)}`).join(' ');
        return `<text x="8" y="${r * rowH + 9}" font-family="SF Mono, Menlo, monospace" font-size="7.5" fill="${INKC.stone}">${label}</text>
          <path d="${d}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.9"/>`;
      })
      .join('');
    instBox.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="inst-svg">${paths}<line data-ihead x1="0" x2="0" y1="0" y2="${H}" stroke="rgba(230,220,205,0.6)" stroke-width="1"/></svg>`;
  }

  // ---------- a frame ----------

  function render(dt: number, now: number) {
    if (!film) return;
    const f = frameAt(t);
    const w = film.breath[f] ?? 0;
    for (const th of index.theories) {
      const ft = film.theories[th.id];
      const inp = { f, t, hand: !!ft.hand[f], roll: !!film.roll[f], attend: !!film.attend[f], breath: w };
      views.get(th.id)?.draw(inp, dt, now);
      if (th.id === selected) {
        closeView?.draw(inp, dt, now);
        const pl = PLATES[th.id];
        const svg = plateBox?.querySelector('svg') as SVGSVGElement | null;
        if (pl && svg) {
          const s: Record<string, number> = {};
          for (const [k, arr] of Object.entries(ft.focal)) s[k] = arr[f] ?? 0;
          pl.update(svg, s, { hand: inp.hand, attend: inp.attend });
        }
      }
      const cap = root.querySelector(`[data-caption="${th.id}"]`);
      if (cap) {
        let text = '';
        for (const [tc, line] of ft.captions) if (tc <= t + 1e-6) text = line;
        if (cap.textContent !== text) cap.textContent = text;
      }
      const cnt = root.querySelector(`[data-count="${th.id}"]`);
      const c = cells.get(th.id);
      if (cnt && c) {
        const n = c.count(f);
        const txt = `${n} held`;
        if (cnt.textContent !== txt) cnt.textContent = txt;
      }
    }
    const head = timeline?.querySelector('[data-head]');
    const hx = ((t / scene.duration) * 600).toFixed(1);
    head?.setAttribute('x1', hx);
    head?.setAttribute('x2', hx);
    const ih = instBox?.querySelector('[data-ihead]');
    if (ih) {
      const ix = (8 + (f / Math.max(film.frames - 1, 1)) * 344).toFixed(1);
      ih.setAttribute('x1', ix);
      ih.setAttribute('x2', ix);
    }
    if (clock) clock.textContent = `${fmt(t)} of ${fmt(scene.duration)} · shown ${Math.round(speed)}× faster than life`;
    if (scrub && document.activeElement !== scrub) scrub.value = String(t);
  }

  function loop(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (visible) {
      if (playing) {
        t += dt * speed;
        if (t >= scene.duration) {
          t = scene.duration;
          playing = false;
          syncPlay();
        }
      }
      render(dt, now);
    }
    requestAnimationFrame(loop);
  }

  // ---------- wiring ----------

  $$<HTMLButtonElement>('[data-scene]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.scene!)));
  $$<HTMLElement>('[data-card]').forEach((c) => {
    c.addEventListener('click', () => select(c.dataset.card!));
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(c.dataset.card!);
      }
    });
  });
  $$<HTMLButtonElement>('[data-pick]').forEach((b) => b.addEventListener('click', () => select(b.dataset.pick!, false)));
  $$<HTMLButtonElement>('[data-watch]').forEach((b) =>
    b.addEventListener('click', () => {
      select(b.dataset.watch!, true);
      if (!playing && film) {
        if (t >= scene.duration - 1e-6) seek(0);
        playing = !reduce;
        syncPlay();
      }
    }),
  );
  play?.addEventListener('click', () => {
    if (t >= scene.duration - 1e-6) seek(0);
    playing = !playing;
    syncPlay();
  });
  scrub?.addEventListener('input', () => {
    playing = false;
    syncPlay();
    seek(parseFloat(scrub.value));
  });
  addEventListener('resize', () => {
    for (const v of views.values()) v.resize();
    closeView?.resize();
    if (film) seek(t);
  });
  new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting)), { threshold: 0.01 }).observe(root);
  const fromHash = index.theories.find((th) => `#${th.key}` === location.hash);
  if (fromHash) selected = fromHash.id;
  choose(scene.id);
  requestAnimationFrame(loop);
}
