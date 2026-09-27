"""Can a release make a new knot nearby? How much push on the neighbours it would take (exploratory, kept as run).

The perforator view's migration (O8): after one knot lets go, a new one forms nearby. In the vessel switch, pressure holds a
vessel open, so a release could shut a neighbour two ways: by drawing down the pressure the siblings share on one feed (in
the tree model already), or by pushing on the tissue around it as its territory fills (not in the model: a guess). This
takes the matrix's sibling trial (knots_sim/theories/t1.py, `cluster`): six siblings on a rigid feed with walls across the
plausible range, the thickest held as a knot and released by a press (the first run put the knot on the thinnest wall,
which cannot hold one, so the matrix's v1 sibling test never ran: see findings 004); then it adds an external pressure dP on the other
siblings from the moment the knot opens, for 10 minutes, and asks, per plausible setting, the least dP at which a sibling
that was open shuts. Also: how far the shared pressure falls when the knot opens.

    uv run python exploratory/2026-09-27-migration-pressure.py
"""

import numpy as np

from knots_sim import exam
from knots_sim.models import tree as tr
from knots_sim.params import load
from knots_sim.theories import t1

ps = t1.sample(exam.K, exam.SEED)
U = t1.units(ps)
hold = np.array([p["hold"] for p in ps])
palp = np.array([p["palpation"] for p in ps])
strain = np.array([p["press_strain"] for p in ps])
walls = np.array([0.30] + list(np.linspace(*load("vessel")["wall"].range, 6)))
target = len(walls) - 1  # the thickest wall, 0.30, as the matrix's parent test uses: the sibling most able to hold a knot
press = (exam.T0, exam.T0 + exam.PRESS_FOR)
PUSH = (0.0, 1.0, 2.0, 5.0, 10.0, 20.0, 40.0)

sib = t1._trees(ps, walls, rigid=True)
K, V = len(ps), len(walls)
u_m = sib["urest"] + (U * hold)[:, None]


def run(dP: float, opened_at: np.ndarray | None):
    def inputs(t):
        u = sib["urest"].copy() if t < exam.SURGE[0] else u_m.copy()
        pe, mv = np.zeros((K, V)), np.zeros((K, V))
        if exam.SURGE[0] <= t < exam.SURGE[1]:
            u[:, target] = np.clip(sib["urest"][:, target] + U, 0, 1)
        if press[0] <= t < press[1]:
            pe[:, target], mv[:, target] = palp, strain
        if opened_at is not None:
            on = (t >= opened_at)[:, None] & (np.arange(V) != target)[None, :] & (np.arange(V) > 0)[None, :]
            pe = np.where(on, dP, pe)
        return np.clip(u, 0, 1), pe, mv

    return tr.run(sib, inputs, press[1] + 600.0, dt=0.02, every=10)


base = run(0.0, None)
t = base["t"]
shut = base["x"] < t1.SHUT * sib["xc"][None]
before = shut[np.searchsorted(t, press[0]) - 1]
opened = np.full(K, np.inf)
for k in range(K):
    if before[k, target]:
        i = np.flatnonzero((t >= press[0]) & ~shut[:, k, target])
        if len(i):
            opened[k] = t[i[0]]
ok = np.isfinite(opened)
drop = np.full(K, np.nan)
for k in np.flatnonzero(ok):
    i0 = np.searchsorted(t, opened[k]) - 1
    after = (t >= opened[k] + 5) & (t <= opened[k] + 60)
    drop[k] = base["Pn"][i0, k] - base["Pn"][after, k].min()
print(f"settings where the knot formed and let go: {ok.sum()} of {K}", flush=True)
print(f"shared pressure fall when it opens (mmHg): median {np.nanmedian(drop):.2f}, range {np.nanmin(drop):.2f}-{np.nanmax(drop):.2f}", flush=True)

least = np.full(K, np.inf)
for dP in PUSH:
    r = run(dP, np.where(ok, opened, np.inf))
    s = r["x"] < t1.SHUT * sib["xc"][None]
    for k in np.flatnonzero(ok & ~np.isfinite(least)):
        others = [j for j in range(1, V) if j != target]
        was_open = ~before[k, others]
        later = s[r["t"] >= opened[k], k][:, others].any(axis=0)
        if (was_open & later).any():
            least[k] = dP
    print(f"push {dP:5.1f} mmHg: a new knot nearby in {int((least <= dP).sum())} of {int(ok.sum())} settings", flush=True)
