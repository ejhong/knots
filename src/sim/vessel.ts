/**
 * The vessel switch in the browser: the generated equations (./models/vessel.ts, written from the Python model) with
 * the same stepper, calibration and inputs as sim/knots_sim/models/vessel.py. tests/sim-vessel.test.ts holds the two
 * to the same trajectories.
 */
import { aeq, rhs, STATES, type VesselParams } from './models/vessel';

export type { VesselParams };

/** The model's parameters plus the measured targets and input settings the site needs. */
export interface Params extends VesselParams {
  porh_rise: number;
  gasp_drop: number;
  gasp_gain: number;
  latency: number;
  gasp_duration: number;
  breath_swing: number;
  breath_move: number;
}

export interface SwitchInfo {
  /** Relaxed radius (no tone), resting radius and resting tone. */
  xp: number;
  xrest: number;
  urest: number;
  /** The fold: an open vessel snaps shut above tone Afold; a shut one reopens below Aopen. */
  xfold: number;
  Afold: number;
  Aopen: number;
  /** Extra tone at the peak of a deep gasp, at equilibrium. */
  gasp: number;
}

const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

export function calibrate(p: Params, Pext = 0): SwitchInfo {
  const xs = linspace(p.xc, 1.5, 6000);
  const a = xs.map((x) => aeq(x, Pext, p));
  let xp = NaN;
  for (let k = 0; k < xs.length - 1; k++) {
    if (a[k] > 0 && a[k + 1] <= 0) {
      xp = xs[k + 1] + ((0 - a[k + 1]) * (xs[k] - xs[k + 1])) / (a[k] - a[k + 1]);
      break;
    }
  }
  const xrest = xp / Math.pow(1 + p.porh_rise, 0.25);
  const urest = aeq(xrest, Pext, p);
  let i = 0;
  let best = -Infinity;
  for (let k = 0; k < xs.length; k++) {
    if (xs[k] < xp && a[k] > best) {
      best = a[k];
      i = k;
    }
  }
  const xfold = xs[i];
  const Afold = a[i];
  const Aopen = aeq(p.xc, Pext, p);
  const xg = xrest * Math.pow(1 - p.gasp_drop, 0.25);
  const gasp = xg > xfold ? aeq(xg, Pext, p) - urest : Afold - urest;
  return { xp, xrest, urest, xfold, Afold, Aopen, gasp };
}

/** The equilibrium curve: radii from the shut radius outward, and the tone that holds each. */
export function curve(p: Params, n = 240, Pext = 0): { x: number[]; A: number[] } {
  const x = linspace(p.xc, 1.2, n);
  return { x, A: x.map((xi) => aeq(xi, Pext, p)) };
}

/** Inputs: [tone command, external pressure (mmHg), local deformation (0..1)]. */
export type Input = [number, number, number];

const N = STATES.length;

/** One RK4 step with inputs held over the step; state written back into y. */
export function step(y: number[], u: Input, p: Params, dt: number, k: number[][] = scratch()): void {
  const [k1, k2, k3, k4, t] = k;
  rhs(y, u, p, k1);
  for (let j = 0; j < N; j++) t[j] = y[j] + (dt / 2) * k1[j];
  rhs(t, u, p, k2);
  for (let j = 0; j < N; j++) t[j] = y[j] + (dt / 2) * k2[j];
  rhs(t, u, p, k3);
  for (let j = 0; j < N; j++) t[j] = y[j] + dt * k3[j];
  rhs(t, u, p, k4);
  for (let j = 0; j < N; j++) y[j] += (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
  y[0] = Math.max(y[0], p.xc);
  for (let j = 1; j < N; j++) y[j] = Math.min(Math.max(y[j], 0), 1);
}

export const scratch = () => Array.from({ length: 5 }, () => new Array<number>(N).fill(0));

export const restState = (p: Params, s = calibrate(p)): number[] => [s.xrest, s.urest, ...new Array<number>(N - 2).fill(0)];

export const flow = (p: Params, x: number) => Math.pow(x / p.xrest, 4);

/** A deep gasp's drive, t seconds after the gasp: nothing for the reflex latency, then a brief burst. */
export const gaspWave = (t: number, p: Params) => {
  const t0 = t - p.latency;
  return t0 >= 0 && t0 < p.gasp_duration ? 1 : 0;
};

/** +1 at the top of the in-breath, −1 at the end of the out-breath: 4 s in, 6 s out. */
export function breathWave(t: number, period = 10, inhale = 4): number {
  const ph = ((t % period) + period) % period;
  return ph < inhale ? -Math.cos((Math.PI * ph) / inhale) : Math.cos((Math.PI * (ph - inhale)) / (period - inhale));
}

/** Inputs over time, as in the Python Score. */
export interface Score {
  duration: number;
  stress: [number, number][];
  gasps: number[];
  presses: [number, number, number][];
  breath_period?: number;
  breathing?: boolean;
  relaxing?: boolean;
  /** (start, end, deformation): a press also deforms the tissue. */
  squeezes?: [number, number, number][];
  /** The breath moves the tissue at the knot, by `move` (default breath_move) of a squeeze that shuts the vessel. */
  moving?: boolean;
  move?: number | null;
  move_from?: number;
  /** (start, time to settle, drop): drive eases and stays down. */
  settle?: [number, number, number] | null;
}

/** The inputs [tone command, external pressure, local deformation] at time t of a score. */
export function inputAt(p: Params, score: Score, t: number, s: SwitchInfo): Input {
  let u = s.urest;
  for (const [t0, extra] of score.stress) if (t >= t0) u = s.urest + extra;
  for (const tg of score.gasps) u += p.gasp_gain * gaspWave(t - tg, p);
  const w = breathWave(t, score.breath_period ?? 10);
  if (score.breathing) u += p.breath_swing * (score.relaxing ? Math.min(w, 0) : w);
  if (score.settle) {
    const [t0, span, drop] = score.settle;
    u -= drop * Math.min(Math.max((t - t0) / span, 0), 1);
  }
  let pext = 0;
  for (const [a, b, mmhg] of score.presses) if (t >= a && t < b) pext = mmhg;
  let mv = 0;
  for (const [a, b, amount] of score.squeezes ?? []) if (t >= a && t < b) mv = amount;
  if (score.moving && t >= (score.move_from ?? 0)) mv = Math.max(mv, ((score.move ?? p.breath_move) * (1 + w)) / 2);
  return [Math.min(Math.max(u, 0), 1), pext, mv];
}

export function inputs(p: Params, score: Score, dt: number, s = calibrate(p)): Input[] {
  const n = Math.ceil(score.duration / dt);
  return Array.from({ length: n }, (_, i) => inputAt(p, score, i * dt, s));
}

/** Run a score from rest; states at every step. */
export function run(p: Params, score: Score, dt = 0.02): number[][] {
  const s = calibrate(p);
  const u = inputs(p, score, dt, s);
  const y = restState(p, s);
  const k = scratch();
  const out: number[][] = [];
  for (const ui of u) {
    out.push(y.slice());
    step(y, ui, p, dt, k);
  }
  return out;
}
