import { Color, Vector3 } from 'three';
import { AtlasScene } from '../AtlasScene';
import { preferredTheme, rememberTheme, type ThemeName } from '../engine/theme';
import type { HoverInfo } from '../interaction/Interaction';
import { hypothesisById } from '../../data/hypotheses';
import { crossSectionSVG } from '../../lib/crossSection';
import { REGIONS } from '../body/skeleton';
import { mapById } from '../../data/mapIndex';
import type { MapId } from '../AtlasScene';
import type { AtlasMap } from '../maps/SkinMap';

const REGION_LABEL: Record<string, string> = {
  head: 'scalp',
  face: 'face',
  neck: 'neck',
  chest: 'chest',
  'upper-back': 'upper back',
  abdomen: 'abdomen',
  'lower-back': 'low back',
  pelvis: 'groin',
  buttock: 'buttock',
  'upper-arm': 'upper arm',
  forearm: 'forearm',
  hand: 'hand',
  thigh: 'thigh',
  leg: 'lower leg',
  foot: 'foot',
};

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
    scene.interaction.tool = 'release';
    canvas.style.cursor = ringCursor(theme === 'paper');
    scene.setShape({ age: 46 });
    scene.settle(46);
    scene.setVisible('channels', false);
    scene.setWindowOn(false);
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
    const card = mapCard(panel);
    bindTooltip(viz, scene, card);
    bindSettings(viz, stage, scene);
    bindHypotheses(viz, panel, scene);
    bindMaps(panel, scene, card);
    firstVisitHint(viz, scene);
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
      // The legend lists what is on show.
      const item = document.querySelector<HTMLElement>(`[data-legend="${layer}"]`);
      if (item) item.hidden = !el.checked;
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

  // The dissection window: toggle, and shift-click the body to open it there.
  const win = panel.querySelector<HTMLInputElement>('[data-window]')!;
  win.addEventListener('change', () => scene.setWindowOn(win.checked));
  scene.interaction.onPlace((hit) => {
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
    const restore = document.querySelector<HTMLElement>('[data-restore]');
    if (restore) restore.hidden = true;
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

/**
 * A thin ring the size of a press (32 px): where a double-click will release. An SVG
 * cursor, so it needs no drawing of its own; a crosshair where unsupported.
 */
function ringCursor(paper: boolean) {
  const stroke = paper ? '#3a3632' : '#efe7da';
  const halo = paper ? '#faf7f2' : '#171b1e';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='68' height='68'><circle cx='34' cy='34' r='32' fill='none' stroke='${halo}' stroke-opacity='0.5' stroke-width='2.5'/><circle cx='34' cy='34' r='32' fill='none' stroke='${stroke}' stroke-opacity='0.75' stroke-width='1'/><circle cx='34' cy='34' r='1.2' fill='${stroke}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 34 34, crosshair`;
}

function bindCensus(panel: HTMLElement, scene: AtlasScene) {
  // After any release, a reset: every knot back as it was for this age.
  const restore = panel.querySelector<HTMLButtonElement>('[data-restore]')!;
  scene.interaction.onRelease(() => (restore.hidden = false));
  restore.addEventListener('click', () => {
    scene.settle(scene.sim.age);
    restore.hidden = true;
  });
  const els = [0, 1, 2, 3].map((i) => panel.querySelector<HTMLElement>(`[data-c="${i}"]`)!);
  const keys = [0, 1, 2, 3].map((i) => els[i].nextElementSibling as HTMLElement);
  // What each theory counts, when it isn't the perforators' four rungs.
  // Where the count is a sample drawn rather than a prediction, it says so.
  const SINGLE: Record<string, [() => number, string]> = {
    latch: [() => scene.latch.census(), 'latched · of a sample drawn'],
    'trigger-point': [() => scene.theories['trigger-point']?.census() ?? 0, 'trigger points'],
    densification: [() => scene.theories.densification?.census() ?? 0, 'patches · a sample drawn'],
    nerve: [() => scene.theories.nerve?.census() ?? 0, 'sensitised nerves'],
    central: [() => scene.theories.central?.census() ?? 0, 'places felt · a sample drawn'],
  };
  const update = () => {
    const single = SINGLE[scene.hypothesis];
    if (single) {
      const vals = [fmt.format(single[0]()), '—', '—', '—'];
      const names = [single[1], '', '', ''];
      vals.forEach((v, i) => {
        els[i].textContent = v;
        keys[i].textContent = names[i];
      });
      return;
    }
    const names = ['micro', 'medium', 'major', 'roots'];
    const c = scene.sim.census();
    c.forEach((n, i) => {
      const s = fmt.format(n);
      if (els[i].textContent !== s) els[i].textContent = s;
      keys[i].textContent = names[i];
    });
  };
  update();
  setInterval(update, 500);
}

/**
 * What the pointer is over, in a fixed box at the lower left of the canvas
 * (it does not chase the pointer). It lingers a moment after the pointer
 * leaves, so it does not flicker between perforators.
 */
function bindTooltip(viz: HTMLElement, scene: AtlasScene, card: MapCard) {
  const tip = viz.querySelector<HTMLElement>('[data-tip]')!;
  const bar = (label: string, v: number, hot = false) =>
    `<span>${label}</span><span class="bar${hot ? ' hot' : ''}"><i style="width:${(v * 100).toFixed(0)}%"></i></span><span>${v.toFixed(2)}</span>`;
  let current: HoverInfo | null = null;
  let lastSeen = 0;
  /** A clicked place stays inspected (the way a phone, with no hover, inspects). */
  let pinned: HoverInfo | null = null;
  scene.interaction.onHover((h) => {
    if (h && (h.node >= 0 || h.root >= 0)) {
      current = h;
      lastSeen = performance.now();
    }
  });
  scene.interaction.onSelect((h) => {
    pinned = h;
    current = null;
  });
  let lit = -1;
  let mapLit: [number, number] = [-1, -1];
  setInterval(() => {
    const fresh = current && performance.now() - lastSeen <= 900 ? current : null;
    const h = fresh ?? pinned;
    if (!h) {
      tip.classList.remove('on');
      if (mapLit[0] !== -1 || mapLit[1] !== -1) {
        scene.activeMap?.highlight(-1, -1);
        mapLit = [-1, -1];
      }
      if (lit !== -1) {
        scene.channels.highlight(-1);
        lit = -1;
      }
      return;
    }
    tip.hidden = false;
    tip.classList.add('on');
    // A map, when shown, comes first: its places, then its lines, picked where they are drawn.
    const map = scene.activeMap;
    if (map) {
      const r = scene.engine.canvas.getBoundingClientRect();
      const { point: pi, line: li } = map.pick(scene.engine.camera, r.width, r.height, h.screen.x, h.screen.y, h.hit.distance);
      const ch = pi >= 0 ? map.data.points[pi].group : li >= 0 ? map.data.lines[li].group : -1;
      if (pi !== mapLit[0] || ch !== mapLit[1]) {
        map.highlight(pi, pi >= 0 ? -1 : ch);
        mapLit = [pi, ch];
      }
      if (pi >= 0 || li >= 0) {
        const d = pi >= 0 ? describePlace(scene, map, pi) : describeGroup(map, ch);
        card.set(d);
        tip.innerHTML = `<div class="t-kicker">${d.kicker}</div><div class="t-title">${d.title}</div><div class="t-note">${d.sub}</div>`;
        return;
      }
    }
    // Channels take precedence when the pointer is right on one.
    const ch = scene.channels.lines.visible ? scene.channels.nearest(h.hit.point.x, h.hit.point.y, h.hit.point.z) : -1;
    if (ch !== lit) {
      scene.channels.highlight(ch);
      lit = ch;
    }
    if (ch >= 0) {
      const c = scene.channels.channels[ch];
      tip.innerHTML = `<div class="t-kicker">deep channel · ${c.def.kind}${c.side === 'm' ? ' · midline' : c.side === 'l' ? ' · left' : ' · right'}</div>
        <div class="t-title">${c.def.name}</div>
        <div class="t-note">${c.def.note}</div>`;
      return;
    }
    const sim = scene.sim;
    const L = scene.ladder;
    // Knot state belongs to the perforator view; elsewhere, anatomy only.
    const perf = scene.hypothesis === 'perforator';
    const state = (i: number) => {
      if (!perf) return '';
      const stuck = sim.stuck[i] === 1;
      return `<div class="t-state ${stuck ? 'stuck' : 'open'}">${stuck ? 'held — a knot' : 'open'}</div>
        <div class="bars">${bar('vessel', sim.tone[i], sim.tone[i] > 0.6)}${bar('hold', sim.gel[i], sim.gel[i] > 0.5)}${bar('nerve', sim.nerve[i], sim.nerve[i] > 0.5)}</div>`;
    };
    if (h.root >= 0) {
      const r = scene.roots[h.root];
      tip.innerHTML = `<div class="t-kicker">source vessel · ${r.side === 'l' ? 'left' : r.side === 'r' ? 'right' : 'midline'}</div>
        <div class="t-title">${r.def.name}</div>
        ${state(L.count + h.root)}
        <div class="t-note">${r.def.note}</div>`;
      return;
    }
    const i = h.node;
    const lvl = L.level[i];
    const rootDef = scene.roots[L.root[i]];
    tip.innerHTML = `<div class="t-kicker">${LEVEL_NAME[lvl]} · № ${fmt.format(i + 1)}</div>
      <div class="t-title">${rootDef ? rootDef.def.name.split(' ·')[0] : '—'} tree${rootDef ? `, ${rootDef.side === 'l' ? 'left' : 'right'}` : ''}</div>
      ${state(i)}
      <div class="t-note">${LEVEL_DEPTH[lvl]} · ${(L.depth[i] * 100).toFixed(0)} cm from its source along the skin</div>`;
  }, 120);
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
  // The ring cursor follows the ground.
  ground.addEventListener('change', () => (scene.engine.canvas.style.cursor = ringCursor(ground.value === 'paper')));
  const turn = pop.querySelector<HTMLInputElement>('[data-turntable]')!;
  turn.addEventListener('change', () => (scene.engine.autoRotate = turn.checked));
  // Pressing on the body stops the turntable, so the place pressed stays put.
  scene.interaction.onRelease(() => {
    if (!scene.engine.autoRotate) return;
    scene.engine.autoRotate = false;
    turn.checked = false;
  });
}

function bindHypotheses(viz: HTMLElement, panel: HTMLElement, scene: AtlasScene) {
  const sel = viz.querySelector<HTMLSelectElement>('[data-hyp-select]')!;
  const sectionEl = panel.querySelector<HTMLElement>('[data-section]')!;
  const whereEl = panel.querySelector<HTMLElement>('[data-section-where]')!;
  const q = new URLSearchParams(location.search).get('h');
  if (q && hypothesisById(q)?.ready) sel.value = q;

  // The cross-section follows the pointer; it starts at the dissection window.
  let place = { dSup: 0.0042, dDeep: 0.01, region: 'upper back' };
  const drawSection = () => {
    sectionEl.innerHTML = crossSectionSVG({ ...place, hypothesis: sel.value, tone: scene.engine.theme.glow ? 'dark' : 'light' });
    whereEl.textContent = `· ${place.region}`;
  };
  const show = () => {
    const h = hypothesisById(sel.value)!;
    scene.setHypothesis(h.id);
    panel.querySelector('[data-card-kicker]')!.textContent = h.name;
    panel.querySelector('[data-census-note]')!.textContent = h.count;
    panel.querySelector('[data-card-body]')!.innerHTML = `<p>${h.short}</p><p><em>Where.</em> ${h.layer}</p><p><em>Holds.</em> ${h.holds}</p>`;
    drawSection();
  };
  sel.addEventListener('change', show);
  show();

  let last = 0;
  scene.interaction.onHover((h) => {
    if (!h) return;
    const now = performance.now();
    if (now - last < 150) return;
    last = now;
    const T = scene.body.triangles;
    const coarse = T[h.hit.tri * 3];
    const fine = T[h.hit.tri * 3];
    const region = REGIONS[scene.segmentation.region[coarse]] ?? 'chest';
    place = { dSup: scene.supDepth[fine], dDeep: scene.depth[fine], region: REGION_LABEL[region] ?? region };
    drawSection();
  });
}

interface CardText {
  kicker: string;
  title: string;
  sub: string;
  note: string;
}
type MapCard = { set(d: CardText): void };

/** The card at the top of the Maps tab, which follows the pointer over a map. */
function mapCard(panel: HTMLElement): MapCard {
  const q = (k: string) => panel.querySelector<HTMLElement>(`[data-mc-${k}]`)!;
  const [kicker, title, sub, note] = ['kicker', 'title', 'sub', 'note'].map(q);
  return {
    set(d) {
      kicker.textContent = d.kicker;
      title.textContent = d.title;
      sub.textContent = d.sub;
      note.innerHTML = d.note;
    },
  };
}

const len = (d: number) => (!isFinite(d) ? 'over 6 cm' : d < 0.01 ? `${Math.round(d * 1000)} mm` : `${(d * 100).toFixed(1)} cm`);

/** A place on a map: its names, where it is, and the anatomy nearest it on this figure. */
function describePlace(scene: AtlasScene, map: AtlasMap, i: number): CardText {
  const p = map.data.points[i];
  // The subtle body is not anatomy: no perforators or channels beneath it.
  if (map.data.inner) return { kicker: p.kicker, title: p.title, sub: p.sub, note: p.where };
  const x = map.pointPos[i * 3];
  const y = map.pointPos[i * 3 + 1];
  const z = map.pointPos[i * 3 + 2];
  const nearest = [Infinity, Infinity, Infinity];
  scene.grid.query(x, y, z, 0.06, (j, d) => {
    const l = scene.ladder.level[j];
    if (d < nearest[l]) nearest[l] = d;
  });
  // The nearest deep channel, and how far.
  let chIdx = -1;
  let chD = 0.03;
  scene.channels.skinLines.forEach((pl, ci) => {
    for (let k = 0; k < pl.length; k += 3) {
      const d = Math.hypot(pl[k] - x, pl[k + 1] - y, pl[k + 2] - z);
      if (d < chD) {
        chD = d;
        chIdx = ci;
      }
    }
  });
  const side = p.side === 'l' ? 'left' : p.side === 'r' ? 'right' : 'midline';
  const chName = chIdx >= 0 ? scene.channels.channels[chIdx].def.name.toLowerCase() : '';
  const anat = [
    `nearest medium perforator ${len(nearest[1])}`,
    `major ${len(nearest[2])}`,
    chIdx < 0 ? '' : chD < 0.008 ? `over the ${chName}` : `${len(chD)} from the ${chName}`,
  ].filter(Boolean);
  return {
    kicker: `${p.kicker} · ${side}`,
    title: p.title,
    sub: p.sub,
    note: `${p.where}<span class="anat">${anat.join(' · ')}</span>`,
  };
}

/** A group of a map: a channel, a region. */
function describeGroup(map: AtlasMap, g: number): CardText {
  const m = map.data.groups[g];
  return {
    kicker: `${map.data.title} · ${m.chip}`,
    title: m.name,
    sub: m.hanzi ?? '',
    note: m.course,
  };
}

/** The Maps tab: one map at a time, a group of it alone, and layers brought forward to compare. */
function bindMaps(panel: HTMLElement, scene: AtlasScene, card: MapCard) {
  const grid = panel.querySelector<HTMLElement>('[data-map-chips]')!;
  let solo = -1;
  const intro = (id: string | null) => {
    const m = id ? mapById(id) : null;
    card.set(
      m
        ? { kicker: m.tradition, title: m.name, sub: '', note: m.intro ?? '' }
        : {
            kicker: 'Maps',
            title: 'Traditional and clinical maps',
            sub: '',
            note: 'Choose a map. While it is on, the anatomy steps back — bring a layer forward below to compare.',
          },
    );
  };
  const setSolo = (i: number) => {
    solo = i;
    scene.activeMap?.solo(i);
    grid.querySelectorAll<HTMLButtonElement>('[data-ch]').forEach((c) => c.classList.toggle('is-active', Number(c.dataset.ch) === i));
    const map = scene.activeMap;
    if (map && i >= 0) card.set(describeGroup(map, i));
  };
  const show = (id: MapId | null) => {
    scene.setMap(id);
    solo = -1;
    grid.innerHTML = '';
    grid.hidden = !id;
    intro(id);
    const map = scene.activeMap;
    if (!map) return;
    map.solo(-1);
    const chip = (i: number, label: string, cjk = '') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `chip${i < 0 ? ' is-active' : ''}`;
      b.dataset.ch = String(i);
      b.innerHTML = cjk ? `${label} <span class="cjk">${cjk}</span>` : label;
      b.addEventListener('click', () => setSolo(i === solo || i < 0 ? -1 : i));
      b.addEventListener('mouseenter', () => {
        if (i < 0 || !scene.activeMap) return;
        scene.activeMap.highlight(-1, i);
        card.set(describeGroup(scene.activeMap, i));
      });
      b.addEventListener('mouseleave', () => scene.activeMap?.highlight(-1, -1));
      grid.append(b);
    };
    chip(-1, 'all');
    map.data.groups.forEach((g, i) => chip(i, g.chip, g.cjk));
  };
  const radios = panel.querySelectorAll<HTMLInputElement>('input[name="map"]');
  radios.forEach((r) =>
    r.addEventListener('change', () => {
      if (r.checked) show((r.value || null) as MapId | null);
    }),
  );
  // ?map=<id> opens the atlas on a map (the Traditions page links here).
  const asked = new URLSearchParams(location.search).get('map');
  const radio = [...radios].find((r) => r.value && r.value === asked);
  if (radio) {
    radio.checked = true;
    panel.querySelector<HTMLButtonElement>('[data-tab="maps"]')?.click();
    show(radio.value as MapId);
  }
  panel.querySelectorAll<HTMLButtonElement>('[data-compare]').forEach((b) =>
    b.addEventListener('click', () => {
      const on = !b.classList.contains('is-active');
      b.classList.toggle('is-active', on);
      scene.setCompare(b.dataset.compare as 'knots' | 'perforators' | 'vessels' | 'channels', on);
    }),
  );
}

/** Once per browser: how to release knots, until it is tried or has faded. */
function firstVisitHint(viz: HTMLElement, scene: AtlasScene) {
  const el = viz.querySelector<HTMLElement>('[data-first-hint]');
  if (!el) return;
  let seen = false;
  try {
    seen = localStorage.getItem('knots-hint-release') === '1';
  } catch {
    /* storage unavailable: show it this time */
  }
  if (seen) return;
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  el.textContent = touch ? 'double-tap the body to release knots · tap to inspect' : 'double-click the body to release knots · click to inspect';
  const done = () => {
    el.classList.remove('on');
    try {
      localStorage.setItem('knots-hint-release', '1');
    } catch {
      /* ignore */
    }
  };
  setTimeout(() => el.classList.add('on'), 1200);
  setTimeout(done, 9000);
  scene.interaction.onRelease(done);
}
