"""Can pressure around a released knot knot it again? (exploratory, kept as run)

The author's question (27 Sep 2026): "Is it possible a released knot re knots if there is pressure around it." In the
vessel switch (T1) pressure outside a vessel pushes it toward shutting; this asks how much. It takes the matrix's single
knot (knots_sim/theories/t1.py, `single`) at the ladder's depths in all 32 settings: formed by the surge, held at the
holding stress, pressed for a minute and lifted (it lets go as the hand lifts). From 5 s after the lift, a sustained
pressure dP acts on the vessel from outside for 10 minutes, with the holding stress still on, or with the stress gone (at
rest); no breath. Per depth, the least dP at which the released vessel shuts again, against tissue pressure under the skin,
which rises by only about 2.5 mmHg as it fills (christ1997).

    uv run python exploratory/2026-09-27-reknot-pressure.py
"""

import numpy as np

from knots_sim import exam
from knots_sim.models import vessel as v
from knots_sim.theories import t1

ps = t1.sample(exam.K, exam.SEED)
K, D = len(ps), len(exam.DEPTHS)
rep = [p for p in ps for _ in exam.DEPTHS]
cal = [v.calibrate(p) for p in ps]
urest = np.repeat([c.urest for c in cal], D)
Aopen, Afold = np.repeat([c.Aopen for c in cal], D), np.repeat([c.Afold for c in cal], D)
hold = Aopen + np.tile(exam.DEPTHS, K) * (Afold - Aopen)
bist = np.repeat([c.bistable for c in cal], D)
palp, press_strain = t1._vec(ps, "palpation", D), t1._vec(ps, "press_strain", D)
pars = t1._pars(rep)
T0, LIFT = exam.T0, exam.T0 + exam.PRESS_FOR
ON = LIFT + 5.0
PUSH = (0.0, 1.0, 2.0, 5.0, 10.0, 20.0, 40.0)
zeros = np.zeros(K * D)


def run(dP: float, stressed: bool) -> np.ndarray:
    def inputs(t):
        if t < exam.SURGE[0]:
            return urest, zeros, zeros
        if t < exam.SURGE[1]:
            return np.clip(Afold + 0.03, 0, 1), zeros, zeros
        if t < T0:
            return hold, zeros, zeros
        if t < LIFT:
            return hold, palp, press_strain
        u = hold if stressed else urest
        return u, (np.full(K * D, dP) if t >= ON else zeros), zeros

    r = t1._run(pars, urest, inputs, ON + 600.0, dt=0.02, every=25, keep_n=False)
    t, shut = r["t"], (r["x"] < t1.SHUT * pars["xc"]) & bist
    formed = shut[np.searchsorted(t, T0) - 1]
    let_go = ~shut[(t >= LIFT) & (t < ON)].all(axis=0) & ~shut[np.searchsorted(t, ON) - 1]
    again = shut[t >= ON].any(axis=0)
    return formed & let_go, again


for stressed in (True, False):
    print(f"\n{'holding stress on' if stressed else 'at rest'}: the least outside pressure (mmHg) that shuts a released vessel again")
    least = np.full(K * D, np.inf)
    ok = None
    for dP in PUSH:
        released, again = run(dP, stressed)
        ok = released if ok is None else ok
        least = np.where(ok & again & ~np.isfinite(least), dP, least)
        print(f"  {dP:5.1f} mmHg: " + "  ".join(
            f"d{d:.2f} {int((least.reshape(K, D)[:, i] <= dP)[ok.reshape(K, D)[:, i]].sum())}/{int(ok.reshape(K, D)[:, i].sum())}"
            for i, d in enumerate(exam.DEPTHS)), flush=True)
