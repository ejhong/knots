import { AtlasScene } from '../AtlasScene';
import { preferredTheme, type ThemeName } from '../engine/theme';

/**
 * The figure on the introduction page: a presentation of the atlas with
 * no tools — a slow turn in the dark, knots glowing where a middle-aged body
 * holds them, light occasionally climbing a tree.
 */
export function mountHero(canvas: HTMLCanvasElement, opts: { age?: number } = {}) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const theme = (document.documentElement.dataset.theme as ThemeName) ?? preferredTheme();
  const small = window.matchMedia('(max-width: 760px)').matches;
  const scene = new AtlasScene(canvas, {
    theme,
    modelBase: `${base}models/`,
    ladder: small ? { total: 45_000, medium: 2_400 } : {},
  });
  window.addEventListener('knots:theme', (e) => scene.engine.setTheme((e as CustomEvent).detail));

  scene.ready.then(() => {
    const e = scene.engine;
    e.controls.enabled = false;
    scene.interaction.tool = 'look';
    scene.sim.settle(opts.age ?? 46);
    e.setPose({ position: [0.0, 1.05, 4.6], target: [0, 0.9, 0], fov: 28 });
    const wide = () => window.matchMedia('(min-width: 901px)').matches;
    e.setViewShift(wide() ? 0.19 : 0, wide() ? 0 : -0.06);
    window.addEventListener('resize', () => e.setViewShift(wide() ? 0.19 : 0, wide() ? 0 : -0.06));
    e.autoRotate = true;
    e.autoRotateSpeed = 0.1;
    e.start();
    canvas.classList.add('ready');
    (window as unknown as { atlasReady: boolean }).atlasReady = true;

    // Now and then, a knot lets go on the out-breath.
    let t = 0;
    e.onFrame(({ dt }) => {
      t += dt;
      if (t < 2.4) return;
      t = 0;
      if (!scene.sim.breath.permits) return;
      const L = scene.ladder;
      for (let tries = 0; tries < 60; tries++) {
        const i = Math.floor(Math.random() * Math.min(L.count, 4000));
        if (scene.sim.stuck[i] && L.level[i] >= 1) {
          const nodes: [number, number][] = [];
          const P = scene.cloud.positions;
          scene.grid.query(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.02, (j, d) => nodes.push([j, 1 - d / 0.02]));
          scene.sim.hydrodissect(nodes);
          scene.sim.applyPress(nodes, 1);
          break;
        }
      }
    });
  });

  // Pause rendering when the hero is off screen.
  const io = new IntersectionObserver(([entry]) => {
    if (!scene.engine) return;
    if (entry.isIntersecting) scene.ready.then(() => scene.engine.start());
    else scene.engine.stop();
  });
  io.observe(canvas);
  return scene;
}
