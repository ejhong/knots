import { Color, Vector3 } from 'three';
import { AtlasScene } from '../AtlasScene';
import { preferredTheme, rememberTheme, type ThemeName } from '../engine/theme';
import type { HoverInfo } from '../interaction/Interaction';
import { hypothesisById } from '../../data/hypotheses';

const fmt = new Intl.NumberFormat('en-US');
const LEVEL_NAME = ['small perforator', 'medium perforator', 'major perforator', 'root'];
const LEVEL_DEPTH = [
  'pierces the superficial fascia',
  'crosses the gliding plane; pierces the superficial fascia',
  'pierces the deep fascia',
];

const SECTIONS: Record<string, { normal: [number, number, number]; d: (s: AtlasScene) => number; pose: (s: AtlasScene) => [number[], number[]] } | null> = {
  none: null,
  sagittal: {
    normal: [1, 0, 0],
    d: () => 0,
    pose: (s) => {
      const h = s.body.height();
      return [
        [1.05, h * 0.86, 0.1],
        [0, h * 0.8, -0.02],
      ];
    },
  },
  coronal: {
    normal: [0, 0, 1],
    d: (s) => s.body.joint('neck')[2],
    pose: (s) => {
      const h = s.body.height();
      return [
        [0.35, h * 0.62, 1.9],
        [0, h * 0.62, 0],
      ];
    },
  },
  neck: {
    normal: [0, 1, 0],
    d: (s) => s.body.joint('neck')[1] + 0.035,
    pose: (s) => {
      const n = s.body.joint('neck');
      return [
        [0.12, n[1] + 0.42, 0.28],
        [0, n[1], 0],
      ];
    },
  },
};

/**
 * The atlas, for looking: turn the figure, set the age, choose layers and
 * sections, hover to inspect. (Tools for pressing and releasing knots will
 * return later.)
 */
export function mountAtlas(viz: HTMLElement, panel: HTMLElement) {
  const stage = viz.querySelector<HTMLElement>('[data-stage]')!;
  const canvas = viz.querySelector<HTMLCanvasElement>('#atlas-canvas')!;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const theme = preferredTheme();
  stage.classList.toggle('paper', theme === 'paper');
  const scene = new AtlasScene(canvas, { theme, modelBase: `${base}models/` });
  (window as unknown as { atlas: AtlasScene }).atlas = scene;

  scene.ready.then(() => {
    const engine = scene.engine;
    scene.simRunning = false;
    scene.interaction.tool = 'look';
    canvas.style.cursor = 'grab';
    scene.settle(34);
    scene.setWindowOn(true);
    engine.setPose({ position: [-1.02, 1.42, -1.95], target: [0.03, 1.16, -0.02], fov: 30 });
    engine.autoRotate = true;
    engine.start();
    requestAnimationFrame(() => {
      viz.querySelector('[data-loading]')?.classList.add('done');
      (window as unknown as { atlasReady: boolean }).atlasReady = true;
    });
    bindTabs(panel);
    bindLayers(panel, scene);
    bindAge(viz, scene);
    bindCensus(panel, scene);
    bindTooltip(viz, scene);
    bindSettings(viz, stage, scene);
    bindHypotheses(viz, panel);
    const q = new URLSearchParams(location.search);
    if (q.get('depth')) {
      const v = Number(q.get('depth'));
      scene.setLift(v);
      const el = panel.querySelector<HTMLInputElement>('[data-lift]');
      if (el) el.value = String(v);
    }
  });
}

function bindTabs(panel: HTMLElement) {
  const tabs = panel.querySelectorAll<HTMLButtonElement>('[data-tab]');
  const pages = panel.querySelectorAll<HTMLElement>('[data-page]');
  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('is-active', x === t));
      pages.forEach((p) => (p.hidden = p.dataset.page !== t.dataset.tab));
    }),
  );
}

function bindLayers(panel: HTMLElement, scene: AtlasScene) {
  panel.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((el) => {
    el.addEventListener('change', () => {
      const layer = el.dataset.layer as Parameters<AtlasScene['setVisible']>[0];
      if (layer === 'territories' && el.checked) ensureTerritoryColors(scene);
      scene.setVisible(layer, el.checked);
    });
  });
  const count = (k: string, n: number) => {
    const el = panel.querySelector(`[data-count="${k}"]`);
    if (el) el.textContent = fmt.format(n);
  };
  count('perforators', scene.ladder.count);
  count('roots', scene.roots.length);
  count('channels', scene.channels.channels.length);

  const lift = panel.querySelector<HTMLInputElement>('[data-lift]')!;
  lift.addEventListener('input', () => scene.setLift(Number(lift.value)));

  // The dissection window: toggle, and double-click the body to move it.
  const win = panel.querySelector<HTMLInputElement>('[data-window]')!;
  win.addEventListener('change', () => scene.setWindowOn(win.checked));
  scene.engine.canvas.addEventListener('dblclick', (e) => {
    const r = scene.engine.canvas.getBoundingClientRect();
    const hit = scene.picker.pick(e.clientX - r.left, e.clientY - r.top, r.width, r.height, scene.engine.camera);
    if (!hit) return;
    scene.setWindowAt(hit.tri, hit.point);
    win.checked = true;
    scene.setWindowOn(true);
  });

  panel.querySelectorAll<HTMLInputElement>('input[name="section"]').forEach((r) =>
    r.addEventListener('change', () => {
      if (!r.checked) return;
      const sec = SECTIONS[r.value];
      if (!sec) {
        scene.setClip(null);
        return;
      }
      scene.setClip({ normal: sec.normal, d: sec.d(scene) });
      const [pos, target] = sec.pose(scene);
      scene.engine.autoRotate = false;
      scene.engine.flyTo({ position: pos as [number, number, number], target: target as [number, number, number], fov: 30 }, 1.6);
    }),
  );
}

let territoryColors: Float32Array | null = null;
function ensureTerritoryColors(scene: AtlasScene) {
  if (territoryColors) return;
  const t = scene.ladder.territory;
  territoryColors = new Float32Array(t.length * 3);
  const c = new Color();
  const n = scene.roots.length;
  for (let v = 0; v < t.length; v++) {
    const r = t[v];
    c.setHSL((((r * 0.618034) % 1) + 1) % 1, 0.28, scene.engine.theme.glow ? 0.34 : 0.74);
    if (r < 0 || r >= n) c.setRGB(0.5, 0.5, 0.5);
    territoryColors[v * 3] = c.r;
    territoryColors[v * 3 + 1] = c.g;
    territoryColors[v * 3 + 2] = c.b;
  }
  scene.layers.setTerritoryColors(territoryColors);
}

function bindAge(viz: HTMLElement, scene: AtlasScene) {
  const input = viz.querySelector<HTMLInputElement>('[data-age]')!;
  const out = viz.querySelector<HTMLElement>('[data-age-out]')!;
  let pending: number | null = null;
  let lastFit = scene.body.height();
  const apply = (age: number) => {
    out.textContent = `${age < 2 ? age.toFixed(1) : Math.round(age)} y`;
    scene.setShape({ age });
    scene.settle(age);
    fitCamera(scene, lastFit);
    lastFit = scene.body.height();
  };
  input.addEventListener('input', () => {
    if (pending === null)
      requestAnimationFrame(() => {
        apply(pending!);
        pending = null;
      });
    pending = Number(input.value);
  });
}

/** Keeps the whole figure in frame as it grows or shrinks. */
function fitCamera(scene: AtlasScene, previousHeight: number) {
  const h = scene.body.height();
  if (Math.abs(h - previousHeight) < 1e-4) return;
  const engine = scene.engine;
  const target = engine.controls.target;
  const off = engine.camera.position.clone().sub(target);
  const scale = h / previousHeight;
  const newTarget = new Vector3(target.x * scale, target.y * scale, target.z * scale);
  off.multiplyScalar(scale);
  engine.controls.target.copy(newTarget);
  engine.camera.position.copy(newTarget).add(off);
}

function bindCensus(panel: HTMLElement, scene: AtlasScene) {
  const els = [0, 1, 2, 3].map((i) => panel.querySelector<HTMLElement>(`[data-c="${i}"]`)!);
  const update = () => {
    const c = scene.sim.census();
    c.forEach((n, i) => {
      const s = fmt.format(n);
      if (els[i].textContent !== s) els[i].textContent = s;
    });
  };
  update();
  setInterval(update, 500);
}

function bindTooltip(viz: HTMLElement, scene: AtlasScene) {
  const tip = viz.querySelector<HTMLElement>('[data-tip]')!;
  const bar = (label: string, v: number, hot = false) =>
    `<span>${label}</span><span class="bar${hot ? ' hot' : ''}"><i style="width:${(v * 100).toFixed(0)}%"></i></span><span>${v.toFixed(2)}</span>`;
  let current: HoverInfo | null = null;
  scene.interaction.onHover((h) => {
    current = h;
    tip.hidden = !h || (h.node < 0 && h.root < 0);
  });
  let lit = -1;
  setInterval(() => {
    const h = current;
    // Channels take precedence when the pointer is right on one.
    const ch = h && scene.channels.lines.visible ? scene.channels.nearest(h.hit.point.x, h.hit.point.y, h.hit.point.z) : -1;
    if (ch !== lit) {
      scene.channels.highlight(ch);
      lit = ch;
    }
    if (h && ch >= 0) {
      const c = scene.channels.channels[ch];
      tip.hidden = false;
      tip.innerHTML = `<div class="t-kicker">deep channel · ${c.def.kind}${c.side === 'm' ? ' · midline' : c.side === 'l' ? ' · left' : ' · right'}</div>
        <div class="t-title">${c.def.name}</div>
        <div class="t-note">${c.def.note}</div>`;
      return;
    }
    if (!h || tip.hidden) return;
    const sim = scene.sim;
    const L = scene.ladder;
    if (h.root >= 0) {
      const r = scene.roots[h.root];
      const i = L.count + h.root;
      const stuck = sim.stuck[i] === 1;
      tip.innerHTML = `<div class="t-kicker">source vessel · ${r.side === 'l' ? 'left' : r.side === 'r' ? 'right' : 'midline'}${r.def.gate ? ' · at an attachment line' : ''}</div>
        <div class="t-title">${r.def.name}</div>
        <div class="t-state ${stuck ? 'stuck' : 'open'}">${stuck ? 'held — a root knot' : 'open'}</div>
        <div class="bars">${bar('vessel', sim.tone[i], sim.tone[i] > 0.6)}${bar('collar', sim.gel[i], sim.gel[i] > 0.5)}${bar('nerve', sim.nerve[i], sim.nerve[i] > 0.5)}</div>
        <div class="t-note">${r.def.note}</div>`;
      return;
    }
    const i = h.node;
    const lvl = L.level[i];
    const rootDef = scene.roots[L.root[i]];
    const stuck = sim.stuck[i] === 1;
    tip.innerHTML = `<div class="t-kicker">${LEVEL_NAME[lvl]} · № ${fmt.format(i + 1)}</div>
      <div class="t-title">${rootDef ? rootDef.def.name.split(' ·')[0] : '—'} tree${rootDef ? `, ${rootDef.side === 'l' ? 'left' : 'right'}` : ''}</div>
      <div class="t-state ${stuck ? 'stuck' : 'open'}">${stuck ? 'stuck — a knot' : 'open'}</div>
      <div class="bars">${bar('vessel', sim.tone[i], sim.tone[i] > 0.6)}${bar('collar', sim.gel[i], sim.gel[i] > 0.5)}${bar('nerve', sim.nerve[i], sim.nerve[i] > 0.5)}</div>
      <div class="t-note">${LEVEL_DEPTH[lvl]} · ${(L.depth[i] * 100).toFixed(0)} cm from its source along the skin</div>`;
  }, 120);
  scene.engine.onFrame(() => {
    const h = current;
    if (!h || tip.hidden) return;
    const w = viz.clientWidth;
    tip.style.left = `${Math.min(h.screen.x, w - 280)}px`;
    tip.style.top = `${h.screen.y}px`;
  });
}

function bindSettings(viz: HTMLElement, stage: HTMLElement, scene: AtlasScene) {
  const btn = viz.querySelector<HTMLButtonElement>('[data-settings]')!;
  const pop = viz.querySelector<HTMLElement>('[data-settings-popup]')!;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !pop.classList.contains('open');
    pop.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!pop.contains(e.target as Node)) pop.classList.remove('open');
  });
  const ground = pop.querySelector<HTMLSelectElement>('[data-ground]')!;
  ground.value = scene.engine.theme.name;
  ground.addEventListener('change', () => {
    const t = ground.value as ThemeName;
    scene.engine.setTheme(t);
    stage.classList.toggle('paper', t === 'paper');
    rememberTheme(t);
    territoryColors = null;
  });
  const sex = pop.querySelector<HTMLInputElement>('[data-sex]')!;
  sex.addEventListener('input', () => scene.setShape({ sex: Number(sex.value) }));
  const turn = pop.querySelector<HTMLInputElement>('[data-turntable]')!;
  turn.addEventListener('change', () => (scene.engine.autoRotate = turn.checked));
}

function bindHypotheses(viz: HTMLElement, panel: HTMLElement) {
  const sel = viz.querySelector<HTMLSelectElement>('[data-hyp-select]')!;
  const who = viz.querySelector<HTMLElement>('[data-hyp-who]')!;
  const q = new URLSearchParams(location.search).get('h');
  if (q && hypothesisById(q)?.ready) sel.value = q;
  const show = () => {
    const h = hypothesisById(sel.value)!;
    who.textContent = h.who;
    panel.querySelector('[data-card-kicker]')!.textContent = h.name;
    panel.querySelector('[data-card-body]')!.innerHTML = `<p>${h.short}</p><p><em>Where.</em> ${h.layer}</p><p><em>Holds.</em> ${h.holds}</p>`;
  };
  sel.addEventListener('change', show);
  show();
}
