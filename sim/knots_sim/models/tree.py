"""A parent and its children: a small tree of perforators, each a vessel switch (models/vessel.py), coupled by the
pressures they share (sim/PLAN.md §7; finding 8).

The parent vessel is fed from a source pressure and feeds K children in parallel; each child drains through its bed.
Flow follows Poiseuille (conductance ∝ radius⁴); pressures are solved at every step (they settle far faster than
tone). The parent's lumen sits at the mean of the pressures at its two ends, the children's at the pressure between
parent and children. Many trees run at once, as arrays of shape (trees, vessels), vessel 0 being the parent.

What it asks: when a parent holds a knot, what happens to its children; when the parent is released, what happens
to them; and what stays behind. And, for siblings on a rigid feed, whether one knot's release shuts a neighbour.
"""

from __future__ import annotations

from functools import lru_cache

import numpy as np
import sympy as sp

from ..params import values
from . import vessel as v

SHUT = 1.5  # a vessel is shut when its radius is within 1.5 × the shut radius (as in scenarios.py)


@lru_cache
def _rhs():
    L = v.laws()
    return sp.lambdify((sp.symbols(v.STATES, real=True), sp.symbols(v.INPUTS, real=True),
                        sp.symbols(v.PARAMS, real=True)), list(L["rhs"]), "numpy")


def build(walls: np.ndarray, P_source: np.ndarray, P_bed: np.ndarray, ratio: np.ndarray,
          rigid_parent: bool = False, base: dict[str, float] | None = None) -> dict:
    """Trees with walls (T, V) (vessel 0 is the parent), and per-tree source and bed pressures and resistance ratio.
    With rigid_parent the parent is a fixed resistance (a feed artery), and the children are siblings on it."""
    base = base or v.params()
    walls = np.atleast_2d(np.asarray(walls, float))
    T, V = walls.shape
    K = V - 1
    Ps, Pv = np.broadcast_to(P_source, (T,)).astype(float), np.broadcast_to(P_bed, (T,)).astype(float)
    Rpar = np.broadcast_to(ratio, (T,)).astype(float)  # the children together have resistance 1 at rest
    Rch = np.full(T, float(K))
    Pn = (Ps / Rpar + Pv * K / Rch) / (1 / Rpar + K / Rch)  # at rest, every vessel at its resting radius
    P = np.column_stack([(Ps + Pn) / 2] + [Pn] * K)
    cal = [[v.calibrate(base | {"wall": walls[i, j], "P": P[i, j]}) for j in range(V)] for i in range(T)]
    grab = lambda k: np.array([[getattr(c, k) for c in row] for row in cal])
    pars = {k: np.full((T, V), float(base[k])) for k in v.PARAMS}
    pars.update(wall=walls, P=P.copy(), xrest=grab("xrest"))
    return {"T": T, "V": V, "K": K, "pars": pars, "Ps": Ps, "Pv": Pv, "R": np.column_stack([Rpar] + [Rch] * K),
            "rigid": rigid_parent, "urest": grab("urest"), "Aopen": grab("Aopen"), "Afold": grab("Afold"),
            "xc": float(base["xc"])}


def pressures(tree: dict, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(the lumen pressure of every vessel (T, V), the pressure between parent and children (T,)) at radii x."""
    xr = tree["pars"]["xrest"]
    g = 1.0 / (tree["R"] * (xr / np.maximum(x, 1e-3)) ** 4)
    if tree["rigid"]:
        g[:, 0] = 1.0 / tree["R"][:, 0]
    gc = g[:, 1:].sum(axis=1)
    Pn = (g[:, 0] * tree["Ps"] + gc * tree["Pv"]) / (g[:, 0] + gc)
    return np.column_stack([(tree["Ps"] + Pn) / 2] + [Pn] * tree["K"]), Pn


def run(tree: dict, inputs, duration: float, dt: float = 0.02, every: int = 10) -> dict:
    """Integrate every tree at once (RK4, inputs held over each step). inputs(t) -> (uS, Pext, mv), each (T, V).
    Returns radii and junction pressure every `every` steps."""
    f = _rhs()
    T, V = tree["T"], tree["V"]
    pars = dict(tree["pars"])
    Y = np.zeros((len(v.STATES), T, V))
    Y[0], Y[1] = tree["pars"]["xrest"], tree["urest"]
    if tree["rigid"]:
        Y[0][:, 0] = tree["pars"]["xrest"][:, 0]

    def F(Y, u):
        pars["P"], _ = pressures(tree, Y[0])
        d = f(tuple(Y), u, tuple(pars[k] for k in v.PARAMS))
        out = np.array([np.broadcast_to(di, (T, V)) for di in d], dtype=float)
        if tree["rigid"]:
            out[:, :, 0] = 0.0  # a feed artery, not a switch
        return out

    n = int(round(duration / dt))
    ts, xs, Pns = [], [], []
    for i in range(n):
        t = i * dt
        if i % every == 0:
            ts.append(t)
            xs.append(Y[0].copy())
            Pns.append(pressures(tree, Y[0])[1])
        u = inputs(t)
        k1 = F(Y, u)
        k2 = F(Y + dt / 2 * k1, u)
        k3 = F(Y + dt / 2 * k2, u)
        k4 = F(Y + dt * k3, u)
        Y = Y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        Y[0] = np.maximum(Y[0], tree["xc"])
        Y[1:] = np.clip(Y[1:], 0.0, 1.0)
    return {"t": np.array(ts), "x": np.array(xs), "Pn": np.array(Pns)}


# ---------- The trials ----------

SURGE = (10.0, 30.0)  # a local surge of stress at the parent
PRESS = (100.0, 140.0)  # the parent pressed, then released
CALM = 220.0  # drive falls to rest everywhere


def parent_inputs(tree: dict, u_m: np.ndarray, calm: float | None = CALM, target: int = 0, surge: float = 0.95):
    """Drive raised to u_m everywhere; a local surge (near-maximal tone) shuts the target; the target is pressed (and
    squeezed), then released; then calm."""
    T, V = tree["T"], tree["V"]
    u_m = np.broadcast_to(u_m, (T,))[:, None] * np.ones((1, V))
    urest, P = tree["urest"], tree["pars"]["P"]

    def inputs(t):
        u = urest.copy() if t < SURGE[0] or (calm is not None and t >= calm) else u_m.copy()
        pe = np.zeros((T, V))
        mv = np.zeros((T, V))
        if SURGE[0] <= t < SURGE[1]:
            u[:, target] = surge
        if PRESS[0] <= t < PRESS[1]:
            pe[:, target] = P[:, target] + 10
            mv[:, target] = 1.0
        return u, pe, mv

    return inputs


def shut(tree: dict, x: np.ndarray) -> np.ndarray:
    return x < SHUT * tree["xc"]


def story(tree: dict, r: dict) -> dict:
    """Read a parent trial: the cluster the parent's knot makes, what lets go when the parent is released, what
    stays. Per tree."""
    t, s = r["t"], shut(tree, r["x"])
    at = lambda time: s[np.searchsorted(t, time) - 1]
    before = at(PRESS[0])  # (T, V) held just before the press
    after = at(PRESS[1] + 5.0)  # five seconds after release
    late = at(CALM - 0.1)
    kids = slice(1, None)
    return {
        "parent_knot": before[:, 0],
        "cluster": before[:, kids].sum(axis=1),
        "freed_in_5s": (before[:, kids] & ~after[:, kids]).sum(axis=1),
        "parent_open": ~after[:, 0],
        "remain": late[:, kids].sum(axis=1),
    }


WORKED_WALLS = [0.30, 0.25, 0.283, 0.317, 0.35]  # media 7.5-10% of the lumen: walls as in hypertension (schiffrin1995)
WORKED_DRIVE = 0.40


def figure(u_m: float = WORKED_DRIVE) -> dict:
    """The worked example: a parent and four children with walls as in hypertension (thin walls hold less, thick
    more), drive raised to u_m (about twice resting tone)."""
    tv = values("tree")
    walls = np.array([WORKED_WALLS])
    tree = build(walls, tv["P_source"], tv["P_bed"], tv["ratio"])
    r = run(tree, parent_inputs(tree, np.array([u_m])), duration=300.0)
    s = shut(tree, r["x"])[:, 0, :]
    events = []
    for j in range(tree["V"]):
        edges = np.flatnonzero(np.diff(s[:, j].astype(int)))
        events += [{"t": float(r["t"][k + 1]), "vessel": j, "to": "shut" if s[k + 1, j] else "open"} for k in edges]
    keep = slice(None, None, 5)  # every 1 s for the site
    return {"u_m": u_m, "walls": walls[0].tolist(), "t": r["t"][keep].tolist(),
            "x": (r["x"][keep, 0, :] / tree["pars"]["xrest"][0]).round(4).tolist(),
            "shut": s[keep].astype(int).tolist(), "Pn": r["Pn"][keep, 0].round(2).tolist(),
            "events": sorted(events, key=lambda e: e["t"]), "Aopen": tree["Aopen"][0].tolist(),
            "Afold": tree["Afold"][0].tolist(), "surge": SURGE, "press": PRESS, "calm": CALM}


def robustness(n: int = 256, seed: int = 11) -> dict:
    """Plausible trees: pressures, resistance ratio, children's walls and drive all sampled across their ranges."""
    rng = np.random.default_rng(seed)
    tv = {k: p for k, p in __import__("knots_sim.params", fromlist=["load"]).load("tree").items()}
    lo, hi = lambda k: tv[k].range[0], lambda k: tv[k].range[1]
    Ps = rng.uniform(lo("P_source"), hi("P_source"), n)
    Pv = rng.uniform(lo("P_bed"), hi("P_bed"), n)
    ratio = np.exp(rng.uniform(np.log(lo("ratio")), np.log(hi("ratio")), n))
    wall_range = __import__("knots_sim.params", fromlist=["load"]).load("vessel")["wall"].range
    walls = np.column_stack([np.full(n, 0.30), np.sort(rng.uniform(*wall_range, (n, 4)), axis=1)])
    u_m = rng.uniform(0.25, 0.65, n)
    tree = build(walls, Ps, Pv, ratio)
    r = run(tree, parent_inputs(tree, u_m), duration=CALM + 1.0, dt=0.02, every=5)
    st = story(tree, r)
    formed = st["parent_knot"]
    cluster = formed & (st["cluster"] >= 1)
    released = cluster & st["parent_open"]
    frac = lambda num, den: float(num.sum() / max(den.sum(), 1))
    return {
        "samples": n,
        "share_parent_knot": frac(formed, np.ones(n, bool)),
        "share_cluster": frac(formed & (st["cluster"] >= tree["K"] / 2), formed),
        "share_cascade": frac(released & (st["freed_in_5s"] >= st["cluster"] / 2), released),
        "share_queue": frac(released & (st["remain"] >= 1), released),
        "mean_cluster": float(st["cluster"][formed].mean()) if formed.any() else 0.0,
    }


def queue_by_drive(drives: tuple[float, ...] = tuple(np.round(np.arange(0.30, 0.62, 0.04), 2))) -> dict:
    """The worked tree at each drive: how many children stay held after the parent lets go (the queue)."""
    tv = values("tree")
    T = len(drives)
    tree = build(np.repeat(np.array([WORKED_WALLS]), T, axis=0), tv["P_source"], tv["P_bed"], tv["ratio"])
    r = run(tree, parent_inputs(tree, np.array(drives)), duration=CALM - 1.0, every=10)
    st = story(tree, r)
    return {"drive": list(drives), "urest": float(tree["urest"][0, 0]), "parent_knot": st["parent_knot"].tolist(),
            "cluster": st["cluster"].tolist(), "remain": st["remain"].tolist()}


def siblings(u_m: float = 0.5) -> dict:
    """Eight siblings on a rigid feed (walls 0.25–0.35): a surge of stress everywhere; how many shut?"""
    walls = np.array([[0.30] + [0.25 + 0.1 * i / 7 for i in range(8)]])
    tree = build(walls, 90.0, 20.0, 0.5, rigid_parent=True)
    T, V = tree["T"], tree["V"]

    def inputs(t):
        u = tree["urest"].copy() if t < 10 else np.full((T, V), 0.8 if t < 30 else u_m)
        return u, np.zeros((T, V)), np.zeros((T, V))

    r = run(tree, inputs, duration=100.0)
    s = shut(tree, r["x"])[:, 0, 1:]
    # Alone, at the pressure they share at rest, every sibling whose fold lies below the surge would shut.
    alone = int((tree["Afold"][0, 1:] < 0.8).sum())
    return {"siblings": 8, "shut_by_surge": int(s[-1].sum()), "shut_alone": alone, "Pn_rest": float(r["Pn"][0, 0]),
            "Pn_after": float(r["Pn"][-1, 0])}
