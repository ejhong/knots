"""The field: a patch of perforators under one breath (sim/PLAN.md §7).

A few hundred vessel switches (models/vessel.py) scattered over a patch of skin, each with its own wall (sampled across
the plausible range, so each has its own band) and its own share of the stress (more in some zones: knots gather where
tone is higher, O4). The same knots are formed the same way, then the breath acts in one of three ways:

    calm      no breathing: the knots hold
    broad     the breath acts through drive, everywhere at once: drive eases over a minute and stays down
    focused   the breath moves the tissue around one spot (a Gaussian patch), with drive unchanged
    both      the two together

and each vessel's state is recorded over time. What it asks: does broad release take knots in order of difficulty,
scattered across the patch, and focused release take the knots near the spot whatever their difficulty?

The vessels are independent here (each on its own feed); the tree (models/tree.py) is where they couple. The zones, the
patch and the spot are representative, not anatomy.
"""

from __future__ import annotations

import numpy as np

from .models import vessel as v
from .models.tree import _rhs
from .params import load

SHUT = 1.5
FORM = (5.0, 35.0)  # a surge of stress, scaled by each vessel's zone
BREATH_FROM = 60.0
BREATHS = 30
PERIOD = 10.0
SURGE, HOLD = 0.35, 0.12  # extra tone during the surge, and after it (times the zone)
SPOT, RADIUS = (0.64, 0.8), 0.14  # the focused breath's centre and reach (patch units)
CONDITIONS = {
    "calm": {},
    "broad": {"settle": 0.09},
    "focused": {"move": 0.8},
    "both": {"settle": 0.09, "move": 0.8},
}


def patch(n: int = 240, seed: int = 5) -> dict:
    """Positions (a jittered grid on the unit square), walls and each vessel's share of the stress."""
    rng = np.random.default_rng(seed)
    side = int(np.ceil(np.sqrt(n)))
    g = (np.stack(np.meshgrid(np.arange(side), np.arange(side)), -1).reshape(-1, 2)[:n] + 0.5) / side
    pos = np.clip(g + rng.normal(0, 0.18 / side, g.shape), 0.01, 0.99)
    wall = rng.uniform(*load("vessel")["wall"].range, n)
    x, y = pos[:, 0], pos[:, 1]
    zone = 0.35 + 0.65 * np.exp(-(((y - 0.82) / 0.22) ** 2)) + 0.45 * np.exp(-((x - 0.22) ** 2 + (y - 0.3) ** 2) / 0.02)
    return {"pos": pos, "wall": wall, "zone": np.clip(zone, 0, 1.2)}


def run(field: dict, condition: str, dt: float = 0.02, every: int = 50, breaths: int = BREATHS) -> dict:
    f = _rhs()
    base = v.params()
    n = len(field["wall"])
    cal = [v.calibrate(base | {"wall": w}) for w in field["wall"]]
    urest = np.array([c.urest for c in cal])
    pars = {k: np.full(n, float(base[k])) for k in v.PARAMS}
    pars["wall"] = field["wall"].astype(float)
    pars["xrest"] = np.array([c.xrest for c in cal])
    pv = tuple(pars[k] for k in v.PARAMS)
    zone = field["zone"]
    dist2 = ((field["pos"] - np.array(SPOT)) ** 2).sum(axis=1)
    reach = np.exp(-dist2 / (2 * RADIUS**2))
    cfg = CONDITIONS[condition]
    Y = np.zeros((len(v.STATES), n))
    Y[0], Y[1] = pars["xrest"], urest
    T = BREATH_FROM + breaths * PERIOD
    steps = int(round(T / dt))
    ts, shut = [], []
    for i in range(steps):
        t = i * dt
        if i % every == 0:
            ts.append(t)
            shut.append(Y[0] < SHUT * base["xc"])
        u = urest + (SURGE if FORM[0] <= t < FORM[1] else HOLD if t >= FORM[1] else 0.0) * zone
        mv = np.zeros(n)
        if t >= BREATH_FROM:
            w = float(v.breath_wave(np.array([t]), PERIOD)[0])
            if "settle" in cfg:
                u = u - cfg["settle"] * min((t - BREATH_FROM) / 60.0, 1.0)
            if "move" in cfg:
                mv = cfg["move"] * reach * (1 + w) / 2
        uin = (np.clip(u, 0, 1), np.zeros(n), mv)

        def F(Y):
            return np.array([np.broadcast_to(d, (n,)) for d in f(tuple(Y), uin, pv)], dtype=float)

        k1 = F(Y)
        k2 = F(Y + dt / 2 * k1)
        k3 = F(Y + dt / 2 * k2)
        k4 = F(Y + dt * k3)
        Y = Y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        Y[0] = np.maximum(Y[0], base["xc"])
        Y[1:] = np.clip(Y[1:], 0.0, 1.0)
    shut = np.array(shut)
    ts = np.array(ts)
    knot = shut[np.searchsorted(ts, BREATH_FROM) - 1]  # held when the breath begins
    released = np.full(n, np.nan)
    for j in np.flatnonzero(knot):
        after = np.flatnonzero((ts >= BREATH_FROM) & ~shut[:, j])
        if len(after):
            released[j] = ts[after[0]] - BREATH_FROM
    # How deep each knot sat: where its held drive falls in its own band (0: at its threshold; 1: at its fold).
    held = urest + HOLD * zone
    depth = (held - np.array([c.Aopen for c in cal])) / np.array([c.Afold - c.Aopen for c in cal])
    return {"t": ts, "knot": knot, "released_s": released, "depth": depth, "reach": reach}


def study(n: int = 240) -> dict:
    field = patch(n)
    out = {"n": n, "pos": field["pos"].round(4).tolist(), "zone": field["zone"].round(3).tolist(), "spot": SPOT,
           "radius": RADIUS, "breaths": BREATHS, "period": PERIOD, "conditions": {}}
    for name in CONDITIONS:
        r = run(field, name)
        knot, rel, depth, reach = r["knot"], r["released_s"], r["depth"], r["reach"]
        near = reach > np.exp(-0.5)  # within one radius of the spot
        freed = knot & ~np.isnan(rel)
        order = np.corrcoef(depth[freed], rel[freed])[0, 1] if freed.sum() > 2 else float("nan")
        out["conditions"][name] = {
            "knots": int(knot.sum()),
            "freed": int(freed.sum()),
            "freed_near": int((freed & near).sum()),
            "knots_near": int((knot & near).sum()),
            "freed_far": int((freed & ~near).sum()),
            "knots_far": int((knot & ~near).sum()),
            "depth_vs_time": None if np.isnan(order) else float(order),
            "knot": knot.astype(int).tolist(),
            "released_s": [None if np.isnan(x) else round(float(x), 1) for x in rel],
            "depth": [round(float(x), 3) for x in depth],
        }
    return out


if __name__ == "__main__":
    import json
    import time

    t0 = time.time()
    s = study()
    for k, c in s["conditions"].items():
        print(k, {x: c[x] for x in ("knots", "freed", "knots_near", "freed_near", "knots_far", "freed_far", "depth_vs_time")})
    print(f"{time.time() - t0:.0f} s")
