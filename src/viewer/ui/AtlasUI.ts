import { Color, Vector3 } from 'three';
import { AtlasScene } from '../AtlasScene';
import { preferredTheme, type ThemeName } from '../engine/theme';
import type { HoverInfo, Tool } from '../interaction/Interaction';
import { KnotSim } from '../sim/KnotSim';
import { applyScenario, SCENARIOS } from '../sim/scenarios';
import { hypothesisById } from '../../data/hypotheses';

const fmt = new Intl.NumberFormat('en-US');
const LEVEL_NAME = ['Small perforator', 'Medium perforator', 'Major perforator'];

/** Stages of a life, shown while "A life" plays. */
const LIFE_NOTES: [number, string][] = [
  [1, 'Infancy. Perforators open; the young pandiculate constantly. Almost nothing to find.'],
  [9, 'Childhood. A few micro-knots where the body first learns to brace.'],
  [20, 'Early adulthood. The base of the skull, the neck, the low back begin to hold.'],
  [34, 'Midlife approaches. Knots gather at the junctions and the brace muscles; the roots at the ridges start to stick.'],
  [50, 'Midlife. Cutaneous vessels respond less; resting sympathetic tone climbs. The ladder fills from the roots down.'],
  [70, 'Late life. Knots across the back and hips; many roots held.'],
  [88, 'Old age. The original essay wonders whether stuck tone converts to diffuse stiffness here — fewer points, more hold.'],
];

export function mountAtlas(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('#atlas-canvas')!;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const theme = (document.documentElement.dataset.theme as ThemeName) ?? preferredTheme();
  const scene = new AtlasScene(canvas, { theme, modelBase: `${base}models/` });
  (window as unknown as { atlas: AtlasScene }).atlas = scene;

  window.addEventListener('knots:theme', (e) => scene.engine.setTheme((e as CustomEvent).detail));

  scene.ready.then(() => {
    const engine = scene.engine;
    engine.setPose({ position: [-1.45, 1.35, -2.95], target: [0, 0.98, 0], fov: 30 });
    engine.autoRotate = true;
    engine.start();
    requestAnimationFrame(() => {
      root.classList.add('ready');
      root.querySelector('[data-loading]')?.classList.add('done');
      (window as unknown as { atlasReady: boolean }).atlasReady = true;
    });
    bindLayers(root, scene);
    bindTools(root, scene);
    bindBreath(root, scene);
    bindAge(root, scene);
    bindScenarios(root, scene);
    bindCensus(root, scene);
    bindTooltip(root, scene);
    showHypothesis(root, 'perforator');
    bindKeys(root, scene);
  });
}

function bindLayers(root: HTMLElement, scene: AtlasScene) {
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
  root.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((el) => {
    el.addEventListener('change', () => set(el.dataset.layer!, el.checked));
  });
  const count = (k: string, n: number) => {
    const el = root.querySelector(`[data-count="${k}"]`);
    if (el) el.textContent = fmt.format(n);
  };
  count('perforators', scene.ladder.count);
  count('roots', scene.roots.length);
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
      // Golden-angle hues, low saturation: a quiet patchwork of angiosomes.
      c.setHSL(((r * 0.618034) % 1 + 1) % 1, 0.35, scene.engine.theme.glow ? 0.32 : 0.72);
      if (r < 0 || r >= n) c.setRGB(0.5, 0.5, 0.5);
      territoryColors[v * 3] = c.r;
      territoryColors[v * 3 + 1] = c.g;
      territoryColors[v * 3 + 2] = c.b;
    }
    scene.layers.setTerritoryColors(territoryColors);
  }
  scene.layers.floorMaterial.uniforms.uTerritory.value = on ? 1 : 0;
}

function bindTools(root: HTMLElement, scene: AtlasScene) {
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-tool]');
  const setTool = (t: Tool) => {
    scene.interaction.tool = t;
    buttons.forEach((b) => b.classList.toggle('is-active', b.dataset.tool === t));
    scene.engine.canvas.style.cursor = t === 'look' ? 'grab' : 'crosshair';
  };
  buttons.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool as Tool)));
  setTool('press');
  (root as HTMLElement & { setTool?: (t: Tool) => void }).setTool = setTool;
}

function bindBreath(root: HTMLElement, scene: AtlasScene) {
  const btn = root.querySelector<HTMLButtonElement>('[data-breath]')!;
  const enso = btn.querySelector<SVGElement>('.breath-enso')!;
  const label = root.querySelector<HTMLElement>('[data-breath-label]')!;
  const breath = scene.sim.breath;
  btn.addEventListener('click', () => {
    breath.setPaced(!breath.paced);
    btn.classList.toggle('manual', !breath.paced);
  });
  scene.engine.onFrame(() => {
    const s = 0.8 + 0.3 * breath.volume;
    enso.style.transform = `scale(${s.toFixed(3)}) rotate(${(-breath.volume * 18).toFixed(1)}deg)`;
    const text = breath.holding ? 'hold' : breath.phase === 'inhale' ? 'inhale' : breath.phase === 'rest' ? 'rest' : 'exhale';
    if (label.textContent !== text) label.textContent = text;
  });
}

function bindAge(root: HTMLElement, scene: AtlasScene) {
  const input = root.querySelector<HTMLInputElement>('[data-age]')!;
  const out = root.querySelector<HTMLElement>('[data-age-out]')!;
  const lifeBtn = root.querySelector<HTMLButtonElement>('[data-life]')!;
  let pending: number | null = null;
  let lastFit = scene.body.height();

  const apply = (age: number) => {
    out.textContent = age < 2 ? `${age.toFixed(1)}` : `${Math.round(age)}`;
    scene.setShape({ age });
    scene.sim.settle(age);
    fitCamera(scene, lastFit);
    lastFit = scene.body.height();
  };
  input.addEventListener('input', () => {
    const v = Number(input.value);
    if (pending === null)
      requestAnimationFrame(() => {
        apply(pending!);
        pending = null;
      });
    pending = v;
    stopLife();
  });

  // A life: infancy to ninety, slowly.
  let playing = false;
  let t = 0;
  const duration = 42;
  let unsub: (() => void) | null = null;
  const stopLife = () => {
    if (!playing) return;
    playing = false;
    unsub?.();
    lifeBtn.classList.remove('is-active');
    showHypothesis(root, 'perforator');
  };
  lifeBtn.addEventListener('click', () => {
    if (playing) return stopLife();
    playing = true;
    t = 0;
    lifeBtn.classList.add('is-active');
    let lastNote = -1;
    let acc = 0;
    unsub = scene.engine.onFrame(({ dt }) => {
      t += dt;
      const k = Math.min(1, t / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const age = 1 + 89 * eased;
      acc += dt;
      if (acc > 1 / 20) {
        acc = 0;
        input.value = String(age);
        apply(age);
      }
      let idx = -1;
      LIFE_NOTES.forEach(([a], i) => {
        if (age >= a) idx = i;
      });
      if (idx !== lastNote && idx >= 0) {
        lastNote = idx;
        setCard(root, `Age ${LIFE_NOTES[idx][0]}`, 'A life', `<p>${LIFE_NOTES[idx][1]}</p>`);
      }
      if (k >= 1) stopLife();
    }) as () => void;
  });
}

/** Keeps the whole figure in frame as it grows or shrinks. */
function fitCamera(scene: AtlasScene, previousHeight: number) {
  const h = scene.body.height();
  if (Math.abs(h - previousHeight) < 1e-4) return;
  const engine = scene.engine;
  const target = engine.controls.target;
  const cam = engine.camera.position;
  const off = cam.clone().sub(target);
  const scale = h / previousHeight;
  const newTarget = new Vector3(target.x * scale, target.y * scale, target.z * scale);
  off.multiplyScalar(scale);
  engine.controls.target.copy(newTarget);
  engine.camera.position.copy(newTarget).add(off);
}

function bindScenarios(root: HTMLElement, scene: AtlasScene) {
  const active = new Set<string>();
  const chips = root.querySelectorAll<HTMLButtonElement>('[data-scenario]');
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
        setCard(
          root,
          s.label,
          'Aggravation',
          `<p>${s.note}</p><p class="hint">Drive rises; knots swell and multiply over sim-minutes. Lift it (click again, or Rest) and the drive goes — but the knots it wrote stay until released.</p>`,
        );
    }),
  );
  const warm = root.querySelector<HTMLButtonElement>('[data-warmth]')!;
  warm.addEventListener('click', () => {
    const on = !warm.classList.contains('is-active');
    warm.classList.toggle('is-active', on);
    scene.sim.warmth = on ? 1 : 0;
    if (on)
      setCard(
        root,
        'Sauna',
        'Relief',
        '<p>Heat opens the cutaneous bed more completely than anything else the body does. Watch the knots soften — and come back when you step out: the collar, the tether and the writer are still in place.</p>',
      );
  });
  root.querySelector<HTMLButtonElement>('[data-rest]')!.addEventListener('click', () => {
    active.clear();
    chips.forEach((c) => c.classList.remove('is-active'));
    warm.classList.remove('is-active');
    scene.sim.warmth = 0;
    scene.sim.clearStress();
    setCard(
      root,
      'Rest',
      'Relief',
      '<p>The drive is lifted. What it wrote remains: a knot is a loop that holds itself. Press a knot and breathe out to release it.</p>',
    );
  });
}

function bindCensus(root: HTMLElement, scene: AtlasScene) {
  const els = [0, 1, 2, 3].map((i) => root.querySelector<HTMLElement>(`[data-c="${i}"]`)!);
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

function bindTooltip(root: HTMLElement, scene: AtlasScene) {
  const tip = root.querySelector<HTMLElement>('[data-tip]')!;
  const bar = (label: string, v: number, hot = false) =>
    `<span>${label}</span><span class="bar${hot ? ' hot' : ''}"><i style="width:${(v * 100).toFixed(0)}%"></i></span><span>${v.toFixed(2)}</span>`;
  let current: HoverInfo | null = null;
  scene.interaction.onHover((h) => {
    current = h;
    if (!h || (h.node < 0 && h.root < 0)) {
      tip.hidden = true;
      return;
    }
    tip.hidden = false;
  });
  // Refresh content at a gentle rate; position every frame.
  setInterval(() => {
    const h = current;
    if (!h || tip.hidden) return;
    const sim = scene.sim;
    const L = scene.ladder;
    if (h.root >= 0) {
      const r = scene.roots[h.root];
      const i = L.count + h.root;
      const stuck = sim.stuck[i] === 1;
      tip.innerHTML = `<div class="t-kicker">Root · ${r.side === 'l' ? 'left' : r.side === 'r' ? 'right' : 'midline'}${r.def.gate ? ' · gate' : ''}</div>
        <div class="t-title">${r.def.name}</div>
        <div class="t-state ${stuck ? 'stuck' : 'open'}">${stuck ? 'Held — a root knot' : 'Open'}</div>
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
      <div class="t-state ${stuck ? 'stuck' : 'open'}">${stuck ? 'Stuck — a knot' : 'Open'}</div>
      <div class="bars">${bar('vessel', sim.tone[i], sim.tone[i] > 0.6)}${bar('collar', sim.gel[i], sim.gel[i] > 0.5)}${bar('nerve', sim.nerve[i], sim.nerve[i] > 0.5)}</div>
      <div class="t-note">${(L.depth[i] * 100).toFixed(0)} cm along the skin from its root</div>`;
  }, 120);
  scene.engine.onFrame(() => {
    const h = current;
    if (!h || tip.hidden) return;
    const w = root.clientWidth;
    const x = Math.min(h.screen.x, w - 300);
    tip.style.left = `${x}px`;
    tip.style.top = `${h.screen.y}px`;
  });
}

function setCard(root: HTMLElement, title: string, kicker: string, html: string) {
  root.querySelector('[data-card-title]')!.textContent = title;
  root.querySelector('[data-card-kicker]')!.textContent = kicker;
  root.querySelector('[data-card-body]')!.innerHTML = html;
}

function showHypothesis(root: HTMLElement, id: string) {
  const h = hypothesisById(id);
  if (!h) return;
  setCard(
    root,
    h.name,
    `Hypothesis · ${h.who}`,
    `<p>${h.short}</p>
     <dl>
       <dt>Holds</dt><dd>${h.holds}</dd>
       <dt>Releases</dt><dd>${h.releases}</dd>
     </dl>
     <p class="hint">Press and hold a red knot. Release comes on the out-breath — watch the ensō. Hold Space to breathe by hand; try pressing during an inhale-hold.</p>`,
  );
}

function bindKeys(root: HTMLElement, scene: AtlasScene) {
  const setTool = (root as HTMLElement & { setTool?: (t: Tool) => void }).setTool!;
  const breathBtn = root.querySelector<HTMLButtonElement>('[data-breath]')!;
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
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

export { KnotSim };
