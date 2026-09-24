import { Color, Vector3 } from 'three';
import { AtlasScene } from '../AtlasScene';
import { preferredTheme, rememberTheme, type ThemeName } from '../engine/theme';
import type { HoverInfo, Tool } from '../interaction/Interaction';
import { applyScenario, SCENARIOS } from '../sim/scenarios';
import { hypothesisById } from '../../data/hypotheses';

const fmt = new Intl.NumberFormat('en-US');
const LEVEL_NAME = ['small perforator', 'medium perforator', 'major perforator', 'root'];
const LEVEL_COLOR = ['#cdb9a7', '#e0a58f', '#f08f73', '#ffb199'];

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
    engine.setPose({ position: [-1.55, 1.3, -3.2], target: [0, 0.9, 0], fov: 30 });
    engine.autoRotate = true;
    engine.start();
    requestAnimationFrame(() => {
      viz.querySelector('[data-loading]')?.classList.add('done');
      (window as unknown as { atlasReady: boolean }).atlasReady = true;
    });
    bindTabs(panel);
    bindLayers(panel, scene);
    bindTools(viz, scene);
    bindBreath(viz, scene);
    bindAge(viz, scene);
    bindScenarios(panel, scene);
    bindCensus(panel, scene);
    bindLog(panel, scene);
    bindTooltip(viz, scene);
    bindSettings(viz, stage, scene);
    bindHypotheses(viz, panel);
    bindKeys(viz, scene);
    const q = new URLSearchParams(location.search);
    if (q.get('lift')) {
      const v = Number(q.get('lift'));
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
  const set = (layer: string, on: boolean) => {
    switch (layer) {
      case 'perforators':
        scene.cloud.points.visible = on;
        break;
      case 'trees':
        scene.trees.lines.visible = on;
        break;
      case 'roots':
        scene.rootMarkers.points.visible = on;
        break;
      case 'knots':
        scene.cloud.material.uniforms.uKnotScale.value = on ? 1 : 0;
        break;
      case 'territories':
        showTerritories(scene, on);
        break;
    }
  };
  panel.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((el) => {
    el.addEventListener('change', () => set(el.dataset.layer!, el.checked));
  });
  const count = (k: string, n: number) => {
    const el = panel.querySelector(`[data-count="${k}"]`);
    if (el) el.textContent = fmt.format(n);
  };
  count('perforators', scene.ladder.count);
  count('roots', scene.roots.length);

  const lift = panel.querySelector<HTMLInputElement>('[data-lift]')!;
  const liftOut = panel.querySelector<HTMLElement>('[data-lift-out]')!;
  lift.addEventListener('input', () => {
    const v = Number(lift.value);
    scene.setLift(v);
    liftOut.textContent = v.toFixed(2);
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
      if (scene.lift < 0.3) {
        scene.setLift(0.6);
        lift.value = '0.6';
        liftOut.textContent = '0.60';
      }
    }),
  );
}

let territoryColors: Float32Array | null = null;
function showTerritories(scene: AtlasScene, on: boolean) {
  if (on && !territoryColors) {
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
  scene.layers.floorMaterial.uniforms.uTerritory.value = on ? 1 : 0;
}

function bindTools(viz: HTMLElement, scene: AtlasScene) {
  const buttons = viz.querySelectorAll<HTMLButtonElement>('[data-tool]');
  const setTool = (t: Tool) => {
    scene.interaction.tool = t;
    buttons.forEach((b) => b.classList.toggle('is-active', b.dataset.tool === t));
    scene.engine.canvas.style.cursor = t === 'look' ? 'grab' : 'crosshair';
  };
  buttons.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool as Tool)));
  setTool('press');
  (viz as HTMLElement & { setTool?: (t: Tool) => void }).setTool = setTool;
}

function bindBreath(viz: HTMLElement, scene: AtlasScene) {
  const btn = viz.querySelector<HTMLButtonElement>('[data-breath]')!;
  const enso = btn.querySelector<SVGElement>('.enso')!;
  const label = viz.querySelector<HTMLElement>('[data-breath-label]')!;
  const breath = scene.sim.breath;
  btn.addEventListener('click', () => {
    breath.setPaced(!breath.paced);
    btn.classList.toggle('manual', !breath.paced);
  });
  scene.engine.onFrame(() => {
    const s = 0.78 + 0.34 * breath.volume;
    enso.style.transform = `scale(${s.toFixed(3)}) rotate(${(-breath.volume * 18).toFixed(1)}deg)`;
    const text = breath.holding ? 'hold' : breath.phase === 'inhale' ? 'inhale' : breath.phase === 'rest' ? 'rest' : 'exhale';
    if (label.textContent !== text) label.textContent = text;
  });
}

function bindAge(viz: HTMLElement, scene: AtlasScene) {
  const input = viz.querySelector<HTMLInputElement>('[data-age]')!;
  const out = viz.querySelector<HTMLElement>('[data-age-out]')!;
  let pending: number | null = null;
  let lastFit = scene.body.height();

  const apply = (age: number) => {
    out.textContent = `${age < 2 ? age.toFixed(1) : Math.round(age)} y`;
    scene.setShape({ age });
    scene.sim.settle(age);
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

function bindScenarios(panel: HTMLElement, scene: AtlasScene) {
  const active = new Set<string>();
  const chips = panel.querySelectorAll<HTMLButtonElement>('[data-scenario]');
  const note = panel.querySelector<HTMLElement>('[data-scene-note]')!;
  const reapply = () => {
    scene.sim.stress.fill(0);
    scene.sim.globalStress = 0;
    for (const id of active) {
      const s = SCENARIOS.find((x) => x.id === id);
      if (s) applyScenario(scene, s);
    }
  };
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      const id = c.dataset.scenario!;
      if (active.has(id)) active.delete(id);
      else active.add(id);
      c.classList.toggle('is-active', active.has(id));
      reapply();
      const s = SCENARIOS.find((x) => x.id === id)!;
      if (active.has(id))
        note.innerHTML = `<p><strong>${s.label}.</strong> ${s.note}</p><p>Drive rises; knots swell and multiply over sim-minutes. Lift it and the drive goes — but the knots it wrote stay until released.</p>`;
    }),
  );
  const warm = panel.querySelector<HTMLButtonElement>('[data-warmth]')!;
  warm.addEventListener('click', () => {
    const on = !warm.classList.contains('is-active');
    warm.classList.toggle('is-active', on);
    scene.sim.warmth = on ? 1 : 0;
    if (on)
      note.innerHTML =
        '<p><strong>Sauna.</strong> Heat opens the cutaneous bed more completely than anything else the body does. The knots soften — and return when you step out: the collar, the tether and the writer are still in place.</p>';
  });
  panel.querySelector<HTMLButtonElement>('[data-rest]')!.addEventListener('click', (e) => {
    active.clear();
    chips.forEach((c) => c.classList.remove('is-active'));
    warm.classList.remove('is-active');
    scene.sim.warmth = 0;
    scene.sim.clearStress();
    const b = e.currentTarget as HTMLButtonElement;
    b.classList.add('is-active');
    setTimeout(() => b.classList.remove('is-active'), 900);
    note.innerHTML =
      '<p><strong>Rest.</strong> The drive is lifted. What it wrote remains: a knot is a loop that holds itself. Press a knot and breathe out to release it.</p>';
  });
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
  setInterval(update, 400);
}

/** A running log of releases, newest first — like OM's note stream. */
function bindLog(panel: HTMLElement, scene: AtlasScene) {
  const log = panel.querySelector<HTMLElement>('[data-log]')!;
  const countEl = panel.querySelector<HTMLElement>('[data-log-count]')!;
  let n = 0;
  let started = false;
  const t0 = performance.now();
  scene.sim.onRelease((e) => {
    if (!started) {
      log.innerHTML = '';
      started = true;
    }
    n++;
    countEl.textContent = `(${fmt.format(n)})`;
    const L = scene.ladder;
    const isRoot = e.node >= L.count;
    const root = isRoot ? scene.roots[e.node - L.count] : scene.roots[L.root[e.node]];
    const secs = (performance.now() - t0) / 1000;
    const stamp = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    const where = root ? `${root.def.id}-${root.side}` : '—';
    const div = document.createElement('div');
    div.className = 'item';
    div.style.color = LEVEL_COLOR[e.level];
    div.textContent = `${stamp} ✦ ${LEVEL_NAME[e.level].split(' ')[0]}/${where}${isRoot ? ' · root opens' : ''}`;
    log.prepend(div);
    while (log.childElementCount > 80) log.lastElementChild?.remove();
  });
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
  setInterval(() => {
    const h = current;
    if (!h || tip.hidden) return;
    const sim = scene.sim;
    const L = scene.ladder;
    if (h.root >= 0) {
      const r = scene.roots[h.root];
      const i = L.count + h.root;
      const stuck = sim.stuck[i] === 1;
      tip.innerHTML = `<div class="t-kicker">root · ${r.side === 'l' ? 'left' : r.side === 'r' ? 'right' : 'midline'}${r.def.gate ? ' · gate' : ''}</div>
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
      <div class="t-note">${(L.depth[i] * 100).toFixed(0)} cm along the skin from its root</div>`;
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
  const speed = pop.querySelector<HTMLSelectElement>('[data-speed]')!;
  speed.addEventListener('change', () => (scene.sim.params.timeScale = Number(speed.value)));
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
    showHypothesis(panel, h.id);
  };
  sel.addEventListener('change', show);
  show();
}

function setCard(panel: HTMLElement, kicker: string, html: string) {
  panel.querySelector('[data-card-kicker]')!.textContent = kicker;
  panel.querySelector('[data-card-body]')!.innerHTML = html;
}

function showHypothesis(panel: HTMLElement, id: string) {
  const h = hypothesisById(id);
  if (!h) return;
  setCard(
    panel,
    `${h.name}`,
    `<p>${h.short}</p>
     <p><em>Holds.</em> ${h.holds}</p>
     <p><em>Releases.</em> ${h.releases}</p>`,
  );
}

function bindKeys(viz: HTMLElement, scene: AtlasScene) {
  const setTool = (viz as HTMLElement & { setTool?: (t: Tool) => void }).setTool!;
  const breathBtn = viz.querySelector<HTMLButtonElement>('[data-breath]')!;
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) {
        scene.sim.breath.setManual(true);
        breathBtn.classList.add('manual');
      }
      return;
    }
    const map: Record<string, Tool> = { l: 'look', p: 'press', r: 'roll', h: 'hydro', s: 'stress' };
    const t = map[e.key.toLowerCase()];
    if (t) setTool(t);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') scene.sim.breath.setManual(false);
  });
}
