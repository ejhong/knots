import { describe, expect, it } from 'vitest';
import golden from '../src/data/sim/golden-vessel.json';
import data from '../src/data/sim/vessel.json';
import { calibrate, run, type Params, type Score } from '../src/sim/vessel';

// The site runs the model generated from sim/knots_sim/models/vessel.py; these hold it to the Python run.
const p = golden.params as unknown as Params;

describe('the vessel switch in the browser', () => {
  it('finds the same band as the Python model', () => {
    const s = calibrate(p);
    const py = data.switch;
    expect(s.urest).toBeCloseTo(py.urest, 3);
    expect(s.Aopen).toBeCloseTo(py.Aopen, 3);
    expect(s.Afold).toBeCloseTo(py.Afold, 3);
    expect(s.xrest).toBeCloseTo(py.xrest, 3);
  });

  for (const [name, g] of Object.entries(golden.runs)) {
    it(`reproduces the Python trajectory: ${name}`, () => {
      const states = run(p, g.score as unknown as Score, golden.dt);
      let worst = 0;
      g.states.forEach((row: number[], i: number) => {
        const ts = states[i * golden.every];
        row.forEach((v, j) => (worst = Math.max(worst, Math.abs(ts[j] - v))));
      });
      expect(worst).toBeLessThan(1e-6);
    });
  }

  it('every parameter shown on the site has provenance or is marked a guess', () => {
    for (const row of [...data.params.vessel, ...data.params.checks] as { confidence: string; source?: string; quote?: string }[]) {
      if (row.confidence !== 'guessed') {
        expect(row.source).toBeTruthy();
        expect(row.quote).toBeTruthy();
      }
    }
  });
});
