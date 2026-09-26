/**
 * The live instrument on the simulation page: one perforator's small artery, running the model generated from Python.
 * The figures are drawn at build time (./draw.ts); this steps the model and moves them.
 */
import data from '../data/sim/vessel.json';
import { CS, INK, SW, TRACES, swX, swY, traceBox, tracesFrame } from './draw';
import { breathWave, calibrate, curve, flow, gaspWave, inputAt, restState, scratch, step, type Input, type Params, type Score } from './vessel';

type Breath = 'off' | 'even' | 'relaxing';

const TRIALS: Record<string, string> = {
  knot_forms: 'A surge of stress carries tone past the fold at 10 s; at 40 s stress falls back but stays raised. The vessel shuts, and stays shut.',
  stress_eases: 'The knot forms as before; at 110 s stress eases back to rest. Tone fades over about 14 s, and the vessel reopens with a flush.',
  press_and_release: 'The knot forms; at 110 s pressure for 40 s. The muscle gives up tone under pressure and the patch runs up a debt; as the pressure lifts, the vessel reopens and the nerves light.',
  relaxing_breath_at_threshold: 'The knot forms; at 40 s stress sits just above the reopening threshold, and each out-breath lowers drive a little. It lets go after a few breaths.',
  gasp_near_fold: 'Tone sits two-thirds up the band; a deep breath at 30 s pushes it past the fold for a few seconds. Near a fold everything slows, and the vessel stays open.',
};

export function mountBench(root: HTMLElement): void {
  const p = data.params.values as unknown as Params;
  const s = calibrate(p);
  const scores = data.scenarios as unknown as Record<string, { score: Score }>;
  const dt = 0.02;
  const k = scratch();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = <T extends Element>(sel: string) => root.querySelector(sel) as T;
  const $$ = <T extends Element>(sel: string) => Array.from(root.querySelectorAll(sel)) as T[];

  // ---- model state ----
  let y = restState(p, s);
  let t = 0;
  let stress = 0;
  let pressing = false;
  let moving = 0; // how much the breath moves the tissue at the knot (0: not at all)
  let pressedAt = 0;
  let breath: Breath = 'off';
  let speed = 1;
  let gasps: number[] = [];
  let trial: { name: string; score: Score; t0: number } | null = null;
  let hist: { t: number; tone: number; flow: number; debt: number; spark: number; shut: boolean }[] = [];
  let nextSample = 0;
  let visible = true;

  const command = (): Input => {
    if (trial) return inputAt(p, trial.score, t - trial.t0, s);
    let u = s.urest + stress;
    for (const g of gasps) u += p.gasp_gain * gaspWave(t - g, p);
    const w = breathWave(t);
    if (breath !== 'off') u += p.breath_swing * (breath === 'relaxing' ? Math.min(w, 0) : w);
    // A press squeezes the tissue; the breath can also move it here (the movement route).
    const mv = pressing ? 1 : moving > 0 ? (moving * (1 + w)) / 2 : 0;
    return [Math.min(Math.max(u, 0), 1), pressing ? p.P + 10 : 0, mv];
  };

  // ---- elements ----
  const dot = $<SVGCircleElement>('#sw-dot');
  const cmd = $<SVGPathElement>('#sw-cmd');
  const lumen = $<SVGRectElement>('#cs-lumen');
  const wallL = $<SVGRectElement>('#cs-wall-l');
  const wallR = $<SVGRectElement>('#cs-wall-r');
  const knot = $<SVGCircleElement>('#cs-knot');
  const glow = $<SVGCircleElement>('#cs-knot-glow');
  const spark = $<SVGPathElement>('#cs-spark');
  const warm = $<SVGRectElement>('#cs-warm');
  const stateText = $<SVGTextElement>('#cs-state');
  const blood = $$<SVGCircleElement>('.cs-blood');
  const stars = $$<SVGCircleElement>('.cs-star');
  // The traces are redrawn at the width they are shown, so their text keeps its size on a phone.
  const traceFig = $<HTMLElement>('.fig-tr');
  let TR = traceBox();
  let shutPath: SVGPathElement;
  let lines: Record<string, SVGPolylineElement>;
  let values: Record<string, SVGTextElement>;
  const drawTraces = () => {
    const w = Math.round(traceFig.clientWidth) || 720;
    if (w === TR.W && shutPath) return;
    TR = traceBox(w);
    traceFig.innerHTML = tracesFrame(w);
    shutPath = $<SVGPathElement>('#tr-shut');
    lines = Object.fromEntries(TRACES.map((tr) => [tr.key, $<SVGPolylineElement>(`#tr-${tr.key}`)]));
    values = Object.fromEntries(TRACES.map((tr) => [tr.key, $<SVGTextElement>(`#tv-${tr.key}`)]));
  };
  drawTraces();
  new ResizeObserver(drawTraces).observe(traceFig);
  const out = (name: string) => $<HTMLElement>(`[data-out="${name}"]`);
  const bloodY = blood.map((_, i) => CS.bottom - i * 18);

  // ---- controls ----
  const stressIn = $<HTMLInputElement>('[data-ctl="stress"]');
  const toManual = () => {
    if (!trial) return;
    // Keep the trial's current inputs as the starting point for the hand.
    const [u] = inputAt(p, { ...trial.score, gasps: [], breathing: false }, t - trial.t0, s);
    stress = Math.max(0, u - s.urest);
    stressIn.value = String(stress);
    trial = null;
    $$<HTMLButtonElement>('[data-trial]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    out('note').textContent = '';
  };
  stressIn.addEventListener('input', () => {
    toManual();
    stress = Number(stressIn.value);
  });
  $('[data-ctl="gasp"]').addEventListener('click', () => {
    toManual();
    gasps = [...gasps.filter((g) => t - g < 20), t];
  });
  const pressBtn = $<HTMLButtonElement>('[data-ctl="press"]');
  pressBtn.addEventListener('click', () => {
    toManual();
    pressing = !pressing;
    pressedAt = t;
    pressBtn.setAttribute('aria-pressed', String(pressing));
  });
  $$<HTMLButtonElement>('[data-breath]').forEach((b) =>
    b.addEventListener('click', () => {
      toManual();
      breath = b.dataset.breath as Breath;
      $$<HTMLButtonElement>('[data-breath]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }),
  );
  $$<HTMLButtonElement>('[data-speed]').forEach((b) =>
    b.addEventListener('click', () => {
      speed = Number(b.dataset.speed);
      $$<HTMLButtonElement>('[data-speed]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }),
  );
  const reset = () => {
    y = restState(p, s);
    t = 0;
    hist = [];
    nextSample = 0;
    gasps = [];
    pressing = false;
    pressBtn.setAttribute('aria-pressed', 'false');
  };
  $('[data-ctl="reset"]').addEventListener('click', () => {
    trial = null;
    stress = 0;
    stressIn.value = '0';
    breath = 'off';
    $$<HTMLButtonElement>('[data-breath]').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.breath === 'off')));
    $$<HTMLButtonElement>('[data-trial]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    out('note').textContent = '';
    reset();
  });
  $$<HTMLButtonElement>('[data-trial]').forEach((b) =>
    b.addEventListener('click', () => {
      const name = b.dataset.trial!;
      reset();
      trial = { name, score: scores[name].score, t0: 0 };
      stress = 0;
      stressIn.value = '0';
      $$<HTMLButtonElement>('[data-trial]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      $$<HTMLButtonElement>('[data-speed]').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.speed === '4')));
      speed = 4;
      out('note').textContent = TRIALS[name] ?? '';
    }),
  );

  // ---- the switch diagram's hover readout ----
  const svg = $<SVGSVGElement>('svg.sw');
  const hover = $<SVGLineElement>('#sw-hover');
  const hoverText = $<SVGTextElement>('#sw-hover-text');
  const hit = $<SVGRectElement>('#sw-hit');
  const c = curve(p, 500);
  const openAt = (A: number) => {
    let best = NaN;
    let bestD = Infinity;
    c.x.forEach((x, i) => {
      if (x >= s.xfold && x <= s.xp && Math.abs(c.A[i] - A) < bestD) {
        bestD = Math.abs(c.A[i] - A);
        best = x;
      }
    });
    return best;
  };
  const showHover = (ev: PointerEvent) => {
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    const A = ((pt.x - SW.left) / (SW.right - SW.left)) * SW.Amax;
    if (A < 0 || A > SW.Amax) return hideHover();
    const x = pt.x;
    hover.setAttribute('x1', String(x));
    hover.setAttribute('x2', String(x));
    hover.setAttribute('opacity', '0.5');
    const r = openAt(A);
    const what = A < s.Aopen ? `only open (radius ${r.toFixed(2)})` : A <= s.Afold ? `open (radius ${r.toFixed(2)}) or shut` : 'only shut';
    hoverText.textContent = `tone ${A.toFixed(2)}: ${what}`;
    const leftSide = x > (SW.left + SW.right) / 2;
    hoverText.setAttribute('x', String(leftSide ? x - 6 : x + 6));
    hoverText.setAttribute('text-anchor', leftSide ? 'end' : 'start');
    hoverText.setAttribute('opacity', '1');
  };
  const hideHover = () => {
    hover.setAttribute('opacity', '0');
    hoverText.setAttribute('opacity', '0');
  };
  hit.addEventListener('pointermove', showHover);
  hit.addEventListener('pointerleave', hideHover);

  // ---- drawing ----
  const render = (real: number) => {
    const [x, A, m, n, , , , z] = y;
    const shut = x < 1.5 * p.xc;
    const q = flow(p, x);
    const [u] = command();
    dot.setAttribute('cx', (swX(A * (1 - n) * (1 - z))).toFixed(1));
    dot.setAttribute('cy', swY(x).toFixed(1));
    dot.setAttribute('fill', shut ? INK.knot : INK.spark);
    cmd.setAttribute('transform', `translate(${swX(u).toFixed(1)} ${SW.bottom + 1})`);

    const w = Math.max(0.6, 2 * x * CS.scale);
    lumen.setAttribute('x', (CS.vx - w / 2).toFixed(2));
    lumen.setAttribute('width', w.toFixed(2));
    wallL.setAttribute('x', (CS.vx - w / 2 - 4).toFixed(2));
    wallR.setAttribute('x', (CS.vx + w / 2).toFixed(2));
    const wallOp = (0.3 + 0.65 * A).toFixed(2);
    wallL.setAttribute('opacity', wallOp);
    wallR.setAttribute('opacity', wallOp);
    knot.setAttribute('opacity', shut ? '1' : '0');
    glow.setAttribute('opacity', shut ? (0.12 + 0.4 * m).toFixed(2) : '0');
    glow.setAttribute('r', (8 + 16 * m).toFixed(1));
    spark.setAttribute('opacity', Math.min(1, 2.5 * n).toFixed(2));
    warm.setAttribute('opacity', Math.min(0.35, Math.max(0, (q - 1) * 0.3)).toFixed(2));
    stateText.textContent = shut ? 'shut: a knot' : 'open';
    stars.forEach((st, i) => {
      const tw = reduce ? 1 : 0.6 + 0.4 * Math.sin(t * 6 + i * 1.7);
      st.setAttribute('opacity', Math.min(1, 2.2 * n * tw).toFixed(2));
    });
    // Blood: moves with flow; still when the vessel is shut.
    blood.forEach((b, i) => {
      if (!reduce) {
        bloodY[i] -= real * speed * 22 * Math.min(q, 3);
        if (bloodY[i] < CS.fat - 4) bloodY[i] += CS.bottom - CS.fat + 4;
      }
      b.setAttribute('cy', bloodY[i].toFixed(1));
      b.setAttribute('opacity', shut ? '0' : '0.8');
    });

    // Traces over the last minute.
    const from = t - TR.seconds;
    const X = (tt: number) => TR.left + ((tt - from) / TR.seconds) * (TR.right - TR.left);
    TRACES.forEach((tr, i) => {
      const base = i * (TR.rowH + TR.gap) + TR.rowH;
      const pts = hist
        .filter((h) => h.t >= from)
        .map((h) => `${X(h.t).toFixed(1)},${(base - (Math.min(h[tr.key], tr.max) / tr.max) * TR.rowH).toFixed(1)}`)
        .join(' ');
      lines[tr.key].setAttribute('points', pts);
      const last = hist[hist.length - 1];
      values[tr.key].textContent = last ? tr.fmt(last[tr.key]) : '';
    });
    let d = '';
    let start: number | null = null;
    const H = TRACES.length * (TR.rowH + TR.gap) - TR.gap;
    for (const h of hist.filter((h) => h.t >= from)) {
      if (h.shut && start === null) start = h.t;
      if (!h.shut && start !== null) {
        d += `M${X(start).toFixed(1)} 0h${(X(h.t) - X(start)).toFixed(1)}v${H}h${-(X(h.t) - X(start)).toFixed(1)}z`;
        start = null;
      }
    }
    if (start !== null) d += `M${X(start).toFixed(1)} 0H${TR.right}v${H}H${X(start).toFixed(1)}z`;
    shutPath.setAttribute('d', d);

    out('state').textContent = shut ? 'shut: a knot' : 'open';
    out('state').dataset.state = shut ? 'shut' : 'open';
    out('tone').textContent = `${(A * (1 - n)).toFixed(2)} → ${u.toFixed(2)}`;
    out('flow').textContent = `${q.toFixed(2)}× rest`;
    out('debt').textContent = m.toFixed(2);
    out('clock').textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}${pressing ? ` · pressure ${Math.floor(t - pressedAt)} s` : ''}${speed > 1 ? ` · ${speed}×` : ''}`;
  };

  // ---- the loop ----
  let last = performance.now();
  let carry = 0;
  const frame = (now: number) => {
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (visible) {
      carry += real * speed;
      let steps = 0;
      while (carry >= dt && steps < 400) {
        step(y, command(), p, dt, k);
        t += dt;
        carry -= dt;
        steps++;
        if (t >= nextSample) {
          hist.push({ t, tone: y[1] * (1 - y[3]), flow: flow(p, y[0]), debt: y[2], spark: y[3], shut: y[0] < 1.5 * p.xc });
          nextSample = t + 0.1;
        }
      }
      if (hist.length > 1200) hist = hist.slice(-700);
      if (trial && t - trial.t0 > trial.score.duration) toManual();
      render(real);
    }
    requestAnimationFrame(frame);
  };
  new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting))).observe(root);
  document.addEventListener('visibilitychange', () => (visible = !document.hidden));
  root.dataset.live = 'true';
  requestAnimationFrame(frame);
}
