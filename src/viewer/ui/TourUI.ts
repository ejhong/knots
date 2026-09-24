import { Vector3 } from 'three';
import { AtlasScene } from '../AtlasScene';
import { preferredTheme } from '../engine/theme';
import { CHAPTERS, type Chapter } from '../../data/tour';

const fmt = new Intl.NumberFormat('en-US');
const PLAY = 'M8 5v14l11-7z';
const PAUSE = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';

/**
 * The introduction as a guided tour. Each chapter sets a scene in the atlas;
 * ▶ plays them in order, and scrolling the notes panel follows along.
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
  const timeEl = viz.querySelector<HTMLElement>('[data-time]')!;
  const progress = viz.querySelector<HTMLInputElement>('[data-progress]')!;
  const playBtn = viz.querySelector<HTMLButtonElement>('[data-play]')!;
  const playIcon = playBtn.querySelector('path')!;
  const big = viz.querySelector<HTMLElement>('[data-big]')!;
  const list = panel.querySelector<HTMLElement>('[data-chapters]')!;
  const articles = [...panel.querySelectorAll<HTMLElement>('[data-chapter]')];
  const markers = [...viz.querySelectorAll<HTMLButtonElement>('[data-goto]')];

  let current = -1;
  let playing = false;
  let elapsed = 0;
  let stopDemo: (() => void) | null = null;
  let lift = 0;
  let liftTarget = 0;
  let scrollingByCode = false;
  let ready = false;

  const n = CHAPTERS.length;

  scene.ready.then(() => {
    ready = true;
    const engine = scene.engine;
    engine.start();
    engine.onFrame(({ dt }) => {
      // Ease the sheet's lift.
      if (Math.abs(lift - liftTarget) > 0.002) {
        lift += (liftTarget - lift) * Math.min(1, dt * 1.6);
        scene.setLift(lift);
      }
      if (playing && current >= 0) {
        elapsed += dt;
        const ch = CHAPTERS[current];
        progress.value = String(current + Math.min(0.999, elapsed / ch.seconds));
        if (elapsed >= ch.seconds) {
          if (current < n - 1) go(current + 1, true);
          else setPlaying(false);
        }
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

  function setPlaying(p: boolean) {
    playing = p;
    playIcon.setAttribute('d', p ? PAUSE : PLAY);
    playBtn.setAttribute('aria-label', p ? 'Pause the tour' : 'Play the tour');
  }

  playBtn.addEventListener('click', () => {
    if (!playing && current === n - 1 && elapsed >= CHAPTERS[n - 1].seconds - 0.1) go(0, true);
    setPlaying(!playing);
  });
  markers.forEach((m) => m.addEventListener('click', () => go(Number(m.dataset.goto), true)));
  progress.addEventListener('input', () => {
    const v = Math.min(n - 1, Math.floor(Number(progress.value)));
    if (v !== current) go(v, true);
    elapsed = (Number(progress.value) - v) * CHAPTERS[v].seconds;
  });
  articles.forEach((a) =>
    a.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a')) return;
      const i = Number(a.dataset.chapter);
      if (i !== current) go(i, true);
    }),
  );

  // Scrolling the notes follows along (when the user scrolls, not the tour).
  const io = new IntersectionObserver(
    (entries) => {
      if (scrollingByCode) return;
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const i = Number((visible[0].target as HTMLElement).dataset.chapter);
      if (i !== current && ready) go(i, false);
    },
    { root: list, rootMargin: '0px 0px -65% 0px', threshold: 0 },
  );
  articles.forEach((a) => io.observe(a));

  function go(i: number, scroll: boolean, instant = false) {
    if (i === current) return;
    current = i;
    elapsed = 0;
    const ch = CHAPTERS[i];
    label.textContent = `${ch.n} · ${ch.title}`;
    timeEl.textContent = `${ch.n} / ${String(n).padStart(2, '0')}`;
    progress.value = String(i + 0.001);
    markers.forEach((m, k) => m.classList.toggle('active', k === i));
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
    scene.trees.material.uniforms.uAlpha.value = 0.34 * (s.trees ?? 1);
    if (s.age !== undefined && Math.abs(scene.body.shape.age - s.age) > 0.01) {
      scene.setShape({ age: s.age });
      scene.sim.settle(s.age);
    }
    liftTarget = s.lift ?? 0;
    if (s.section === 'sagittal') scene.setClip({ normal: [1, 0, 0], d: 0 });
    else scene.setClip(null);
    scene.engine.autoRotate = !!s.turntable;
    scene.engine.autoRotateSpeed = 0.08;
    flyTo(s.pose, instant ? 0 : 2.4);
    if (s.demo) stopDemo = startDemo(s.demo);
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

  function startDemo(kind: NonNullable<Chapter['scene']['demo']>): () => void {
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
      case 'release':
        every(3.2, () => {
          if (scene.sim.breath.phase === 'inhale') return;
          releaseNear(target(), 0.12, () => true);
        });
        break;
      case 'pulse-occiput': {
        const L = scene.ladder;
        const occ = new Set(scene.roots.map((r, k) => (r.def.id === 'occipital' ? k : -1)).filter((k) => k >= 0));
        every(2.6, () => {
          releaseNear(target(), 0.2, (i) => occ.has(L.root[i]));
        });
        break;
      }
      case 'gate': {
        const occ = scene.roots.map((r, k) => (r.def.id === 'occipital' || r.def.id === 'deep-cervical' ? k : -1)).filter((k) => k >= 0);
        let t = 0;
        offs.push(
          scene.engine.onFrame(({ dt }) => {
            t += dt;
            const v = 0.5 + 0.5 * Math.sin(t * 1.4);
            for (const k of occ) scene.rootMarkers.hover[k] = v;
            scene.rootMarkers.update();
          }) as () => void,
        );
        offs.push(() => {
          scene.rootMarkers.hover.fill(0);
          scene.rootMarkers.update();
        });
        every(4, () => releaseNear(target(), 0.1, () => true));
        break;
      }
      case 'ladder': {
        const L = scene.ladder;
        const counts = [0, 0, 0];
        for (let i = 0; i < L.count; i++) counts[L.level[i]]++;
        const stages: [number, number, number, string, string][] = [
          [0, 0, 0, `~${scene.roots.length / 2 | 0} × 2`, 'roots · source arteries entering the sheet'],
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
        let t = 0;
        let acc = 0;
        let lastH = scene.body.height();
        big.hidden = false;
        offs.push(
          scene.engine.onFrame(({ dt }) => {
            t += dt;
            acc += dt;
            if (acc < 1 / 20) return;
            acc = 0;
            const k = Math.min(1, t / 26);
            const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            const age = 1 + 89 * eased;
            scene.setShape({ age });
            scene.sim.settle(age);
            // Keep the figure framed as it grows.
            const h = scene.body.height();
            const tg = scene.engine.controls.target;
            const off = scene.engine.camera.position.clone().sub(tg);
            const s = h / lastH;
            tg.multiplyScalar(s);
            scene.engine.camera.position.copy(tg).add(off.multiplyScalar(s));
            lastH = h;
            const c = scene.sim.census();
            big.innerHTML = `<span class="v">${Math.round(age)} y</span><span class="k">${fmt.format(c[0])} micro · ${fmt.format(c[1])} medium · ${fmt.format(c[2])} major · ${c[3]} roots</span>`;
          }) as () => void,
        );
        offs.push(() => (big.hidden = true));
        break;
      }
    }
    return () => offs.forEach((f) => f());
  }
}
