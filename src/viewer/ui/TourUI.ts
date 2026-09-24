import { Vector3 } from 'three';
import { AtlasScene } from '../AtlasScene';
import { preferredTheme } from '../engine/theme';
import { CHAPTERS, type Chapter } from '../../data/tour';
import { WINDOW_UNIFORMS } from '../body/layerModel';
import { createKnotPlate } from './KnotPlate';
import { hypothesisById } from '../../data/hypotheses';

const fmt = new Intl.NumberFormat('en-US');
/** A fixed pseudo-random number in [0, 1) for an integer. */
const hash = (i: number) => {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/**
 * The introduction as a guided tour: each chapter sets a scene in the
 * atlas. Scrolling the Introduction panel moves the figure along with it;
 * clicking a chapter jumps to it.
 */
export function mountTour(viz: HTMLElement, panel: HTMLElement) {
  const stage = viz.querySelector<HTMLElement>('[data-stage]')!;
  const canvas = viz.querySelector<HTMLCanvasElement>('#tour-canvas')!;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const theme = preferredTheme();
  stage.classList.toggle('paper', theme === 'paper');
  const small = window.matchMedia('(max-width: 900px)').matches;
  const scene = new AtlasScene(canvas, {
    theme,
    modelBase: `${base}models/`,
    ladder: small ? { total: 50_000, medium: 2_600 } : {},
  });
  (window as unknown as { atlas: AtlasScene }).atlas = scene;

  const label = viz.querySelector<HTMLElement>('[data-chapter-label]')!;
  const big = viz.querySelector<HTMLElement>('[data-big]')!;
  const list = panel.querySelector<HTMLElement>('[data-chapters]')!;
  // The magnified plate (chapter 02), and the line from it to its place on the body.
  const plateHost = viz.querySelector<HTMLElement>('[data-plate]')!;
  const plate = createKnotPlate(theme === 'paper' ? 'light' : 'dark');
  plateHost.append(plate.el);
  const callout = viz.querySelector<SVGSVGElement>('[data-callout]')!;
  const calloutLines = [...callout.querySelectorAll<SVGLineElement>('[data-callout-line]')];
  const calloutRings = [...callout.querySelectorAll<SVGCircleElement>('[data-callout-ring]')];
  let plateOn = false;
  const showPlate = (on: boolean) => {
    plateOn = on;
    plateHost.hidden = false;
    requestAnimationFrame(() => {
      plateHost.classList.toggle('on', on);
      callout.classList.toggle('on', on);
    });
    if (on) plate.start();
    else setTimeout(() => !plateOn && plate.stop(), 900);
  };
  const articles = [...panel.querySelectorAll<HTMLElement>('[data-chapter]')];

  let current = -1;
  let stopDemo: (() => void) | null = null;
  let lift = 0;
  let liftTarget = 0;
  let scrollingByCode = false;
  let ready = false;

  scene.ready.then(() => {
    ready = true;
    const engine = scene.engine;
    // The introduction is for looking: the chapters play their own scenes.
    scene.interaction.tool = 'look';
    scene.setLift(0);
    scene.setVisible('channels', false);
    engine.start();
    engine.onFrame(({ dt }) => {
      // The callout follows the window's place on the body as the camera moves.
      if (plateOn) {
        const w = WINDOW_UNIFORMS.uWindow.value;
        const v = new Vector3(w.x, w.y, w.z).project(engine.camera);
        const r = stage.getBoundingClientRect();
        const pr = plateHost.getBoundingClientRect();
        const x = (v.x * 0.5 + 0.5) * r.width;
        const y = (-v.y * 0.5 + 0.5) * r.height;
        const ax = pr.right - r.left - 10;
        const ay = pr.top - r.top + 10;
        const d = Math.hypot(x - ax, y - ay) || 1;
        for (const ring of calloutRings) {
          ring.setAttribute('cx', x.toFixed(1));
          ring.setAttribute('cy', y.toFixed(1));
        }
        for (const line of calloutLines) {
          line.setAttribute('x1', ax.toFixed(1));
          line.setAttribute('y1', ay.toFixed(1));
          line.setAttribute('x2', (x - ((x - ax) / d) * 11).toFixed(1));
          line.setAttribute('y2', (y - ((y - ay) / d) * 11).toFixed(1));
        }
      }
      // Ease the layers apart.
      if (Math.abs(lift - liftTarget) > 0.002) {
        lift += (liftTarget - lift) * Math.min(1, dt * 1.6);
        scene.setLift(lift);
      }
    });
    requestAnimationFrame(() => {
      viz.querySelector('[data-loading]')?.classList.add('done');
      (window as unknown as { atlasReady: boolean }).atlasReady = true;
    });
    const hash = location.hash.slice(1);
    const start = Math.max(0, CHAPTERS.findIndex((c) => c.id === hash));
    current = -1;
    go(start, start > 0, true);
  });

  articles.forEach((a) =>
    a.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a')) return;
      const i = Number(a.dataset.chapter);
      if (i !== current) go(i, true);
    }),
  );

  // The figure follows the reader's scroll (but not our own programmatic
  // scrolls): the active chapter is the last one whose top has passed the
  // upper third of the panel — or the last chapter, once the reader reaches
  // the bottom.
  let scrollQueued = false;
  const onScroll = () => {
    scrollQueued = false;
    if (scrollingByCode || !ready) return;
    const line = list.scrollTop + list.clientHeight * 0.34;
    let i = 0;
    for (let k = 0; k < articles.length; k++) if (articles[k].offsetTop - list.offsetTop <= line) i = k;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 4) i = articles.length - 1;
    if (i !== current) go(i, false);
  };
  list.addEventListener(
    'scroll',
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );

  function go(i: number, scroll: boolean, instant = false) {
    if (i === current) return;
    current = i;
    const ch = CHAPTERS[i];
    label.textContent = `${ch.n} · ${ch.title}`;
    articles.forEach((a, k) => a.classList.toggle('active', k === i));
    history.replaceState(null, '', `#${ch.id}`);
    if (scroll) {
      scrollingByCode = true;
      list.scrollTo({ top: articles[i].offsetTop - list.offsetTop - 6, behavior: instant ? 'auto' : 'smooth' });
      setTimeout(() => (scrollingByCode = false), 900);
    }
    if (ready) applyScene(ch, instant);
  }

  function applyScene(ch: Chapter, instant: boolean) {
    stopDemo?.();
    stopDemo = null;
    big.hidden = true;
    const s = ch.scene;
    const cu = scene.cloud.material.uniforms;
    cu.uLevelAlpha.value.set(1, 1, 1);
    scene.rootMarkers.points.visible = true;
    scene.trees.material.uniforms.uAlpha.value = 0.45 * (s.trees ?? 1);
    // A life starts at one year old, so the camera flies to the infant.
    const age = s.demo === 'life' ? 1 : s.age;
    if (age !== undefined && Math.abs(scene.body.shape.age - age) > 0.01) scene.setShape({ age });
    // Every chapter starts from the same held state: releases shown in one
    // chapter do not carry into the next.
    scene.settle(scene.body.shape.age);
    // The fascial layers and the perforators' stalks appear only in the
    // chapters about them; elsewhere the figure is its skin of perforators.
    const layers = !!s.layers;
    scene.setVisible('fascia', layers);
    scene.setVisible('channels', !!s.channels);
    scene.setHypothesis('perforator');
    scene.setMap(s.map ?? null);
    for (const layer of ['knots', 'perforators', 'vessels', 'channels'] as const) scene.setCompare(layer, !!s.compare?.includes(layer));
    if (!!s.plate !== plateOn) showPlate(!!s.plate);
    scene.stalks.lines.visible = layers;
    scene.stalks.collars.visible = layers;
    scene.setWindowOn(!!s.window);
    liftTarget = layers ? (s.lift ?? 1) : 0;
    if (s.section === 'sagittal') scene.setClip({ normal: [1, 0, 0], d: 0 });
    else scene.setClip(null);
    scene.engine.autoRotate = !!s.turntable;
    scene.engine.autoRotateSpeed = 0.08;
    flyTo(s.pose, instant ? 0 : 2.4);
    if (s.demo) stopDemo = startDemo(s.demo, s);
  }

  function flyTo(pose: Chapter['scene']['pose'], duration: number) {
    const h = scene.body.height();
    const p = pose.p.map((x) => x * h) as [number, number, number];
    const t = pose.t.map((x) => x * h) as [number, number, number];
    return scene.engine.flyTo({ position: p, target: t, fov: pose.fov ?? 30 }, duration);
  }

  /** Presses a stuck knot near a point until it lets go on an exhale. */
  function releaseNear(p: Vector3, radius: number, filter: (i: number) => boolean) {
    const L = scene.ladder;
    const P = scene.cloud.positions;
    let best = -1;
    let bestD = Infinity;
    scene.grid.query(p.x, p.y, p.z, radius, (i, d) => {
      if (scene.sim.stuck[i] && L.level[i] >= 1 && filter(i) && d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best < 0) return false;
    const nodes: [number, number][] = [];
    scene.grid.query(P[best * 3], P[best * 3 + 1], P[best * 3 + 2], 0.018, (j, d) => nodes.push([j, 1 - d / 0.018]));
    let held = 0;
    const off = scene.engine.onFrame(({ dt }) => {
      held += dt;
      scene.sim.applyPress(nodes, 1);
      if (held > 0.4) scene.sim.hydrodissect(nodes.map(([j, w]) => [j, w * 0.06] as [number, number]));
      if (!scene.sim.stuck[best] || held > 7) off();
    });
    return true;
  }

  function startDemo(kind: NonNullable<Chapter['scene']['demo']>, s: Chapter['scene']): () => void {
    const offs: Array<() => void> = [];
    const every = (seconds: number, fn: () => void) => {
      let t = seconds * 0.6;
      offs.push(
        scene.engine.onFrame(({ dt }) => {
          t += dt;
          if (t >= seconds) {
            t = 0;
            fn();
          }
        }) as () => void,
      );
    };
    const target = () => scene.engine.controls.target.clone();
    switch (kind) {
      case 'breath': {
        // A slow, relaxing breath: many of the small knots let go at once, in
        // a wave from the neck down, and drift back over the following
        // seconds; the breath comes round again. Between breaths, pressure
        // finds one knot at a time.
        const L = scene.ladder;
        const P = scene.cloud.positions;
        let queue: [number, number][] = [];
        let k = 0;
        let t = 0;
        let cycle = 0;
        const wave = () => {
          const h = scene.body.height();
          queue = [];
          k = 0;
          t = 0;
          for (let i = 0; i < L.count; i++) {
            if (!scene.sim.stuck[i] || L.level[i] !== 0 || hash(i + cycle * 7919) > 0.6) continue;
            const drop = Math.max(0, Math.min(1, (h * 0.9 - P[i * 3 + 1]) / (h * 0.55)));
            queue.push([i, drop * 2.6 + hash(i * 7 + 3) * 0.7]);
          }
          queue.sort((a, b) => a[1] - b[1]);
          cycle++;
        };
        let untilWave = 1.4;
        let untilPress = 7;
        offs.push(
          scene.engine.onFrame(({ dt }) => {
            untilWave -= dt;
            if (untilWave <= 0) {
              wave();
              untilWave = 16;
            }
            t += dt;
            const batch: number[] = [];
            while (k < queue.length && queue[k][1] <= t) batch.push(queue[k++][0]);
            if (batch.length) scene.sim.soften(batch);
            untilPress -= dt;
            if (untilPress <= 0) {
              untilPress = 3.2;
              if (untilWave > 5 && scene.sim.breath.phase !== 'inhale') releaseNear(target(), 0.14, () => true);
            }
          }) as () => void,
        );
        break;
      }
      case 'release':
        every(3.2, () => {
          if (scene.sim.breath.phase === 'inhale') return;
          releaseNear(target(), 0.12, () => true);
        });
        break;
      case 'theories': {
        // The alternate theories in turn on the same body: Johnson's latches first.
        const order = ['latch', 'trigger-point', 'densification', 'nerve', 'central'];
        const base = label.textContent ?? '';
        let k = 0;
        let t = 0;
        const show = () => {
          scene.setHypothesis(order[k]);
          label.textContent = `${base} · ${hypothesisById(order[k])?.label ?? ''}`;
        };
        show();
        offs.push(
          scene.engine.onFrame(({ dt }) => {
            t += dt;
            if (t < (k === 0 ? 7 : 5)) return;
            t = 0;
            k = (k + 1) % order.length;
            show();
          }) as () => void,
        );
        offs.push(() => {
          scene.setHypothesis('perforator');
          label.textContent = base;
        });
        break;
      }
      case 'ladder': {
        const L = scene.ladder;
        const counts = [0, 0, 0];
        for (let i = 0; i < L.count; i++) counts[L.level[i]]++;
        const stages: [number, number, number, string, string][] = [
          [0, 0, 0, `~${scene.roots.length / 2 | 0} × 2`, 'source arteries · the roots of the trees'],
          [0, 0, 1, fmt.format(counts[2]), 'major perforators (≥ 0.5 mm) — Taylor & Palmer counted 374'],
          [0, 1, 1, fmt.format(counts[1]), 'medium perforators'],
          [1, 1, 1, fmt.format(counts[0] + counts[1] + counts[2]), 'perforators in all — one every 4–5 mm of skin'],
        ];
        let t = 0;
        let stage = -1;
        const cu = scene.cloud.material.uniforms;
        big.hidden = false;
        offs.push(
          scene.engine.onFrame(({ dt }) => {
            t += dt;
            const k = Math.min(stages.length - 1, Math.floor(t / 5));
            if (k !== stage) {
              stage = k;
              const [a, b, c, v, label] = stages[k];
              cu.uLevelAlpha.value.set(a, b, c);
              scene.trees.lines.visible = k >= 1;
              big.innerHTML = `<span class="v">${v}</span><span class="k">${label}</span>`;
            }
          }) as () => void,
        );
        offs.push(() => {
          scene.trees.lines.visible = true;
          big.hidden = true;
        });
        break;
      }
      case 'life': {
        // Hold the infant while the camera arrives, then play one to ninety,
        // framing the figure from the chapter's pose at its current height.
        let t = -2.4;
        let acc = 0;
        big.hidden = false;
        offs.push(
          scene.engine.onFrame(({ dt }) => {
            t += dt;
            acc += dt;
            if (t < 0 || t > 26.5 || acc < 1 / 20) return;
            acc = 0;
            const k = Math.min(1, t / 26);
            const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            const age = 1 + 89 * eased;
            scene.setShape({ age });
            scene.settle(age);
            const h = scene.body.height();
            scene.engine.setPose({
              position: s.pose.p.map((x) => x * h) as [number, number, number],
              target: s.pose.t.map((x) => x * h) as [number, number, number],
              fov: s.pose.fov ?? 30,
            });
            const c = scene.sim.census();
            big.innerHTML = `<span class="v">${Math.round(age)} y</span><span class="k">${fmt.format(c[0])} small · ${fmt.format(c[1])} medium · ${fmt.format(c[2])} major knots</span>`;
          }) as () => void,
        );
        offs.push(() => (big.hidden = true));
        break;
      }
    }
    return () => offs.forEach((f) => f());
  }
}
