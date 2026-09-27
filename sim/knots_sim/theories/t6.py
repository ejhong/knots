"""T6, perception, through the exam (knots_sim/exam.py).

The unit is a place on the body map, felt as a knot when its felt intensity crosses a threshold
(models/perception.py). How the shared trials map onto it, to be checked for fairness:

- Stress (the shared unit) is what arousal follows; a surge of 1 forms knots where ordinary input is loudest, and the
  holding stress keeps them. By the shared rule (knots_sim/exam.py), the scale of ordinary input puts the typical place
  where stress is held in the middle of its window: the surge makes it a knot, the holding stress keeps it one and
  cannot make it one alone.
- A single knot of depth d is felt at (1 - h)(1 + d) at the holding stress: d is how far it sits above fading.
- A slow breath eases arousal by the shared breath quantities, and is felt as safety; the in-breath lowers what is felt a
  little (arsenault2013).
- Focused attention at a place raises what is felt there at once (miron1989) and, with the breath, quiets it over time.
- A press adds input at the place and brings attention to it.
- Sparks: the account's tingling comes from overbreathing, everywhere at once (macefield1991); the trials' slow breath
  makes none.
"""

from __future__ import annotations

import numpy as np

from ..exam import (AGE_DEPTH, MOOD_FOR, PATCH, PERIOD, PRESS_FOR, SURGE, T0, AgeOut, ClusterOut, Patch, PatchOut, Single, SingleOut,
                    calm, coming_and_going, mood, out_breath, releases)
from ..models.perception import State, simulate
from ..params import load, values

ID, NAME = "T6", "Perception"
VARIANTS = {"arousal": "the breath eases arousal and is felt as safety; attention and pressure act on what is felt at a place"}
SILENT = {"O3", "O15"}
NOTES = {"O3": "Nothing in the account turns on hydration.",
         "O15": "The account has no unit to count: knots are places made tender, as many as the body map resolves.",
         "O6": "Its tingling comes from overbreathing, in the hands, face and trunk at once (macefield1991), not at a release.",
         "O1.1": "Its easy knots fade on the in-breath, when pain is felt less (arsenault2013), not on the out-breath.",
         "O2.2": "A press adds input and draws attention, so a pressed knot is felt more: it fades, if at all, when the hand lifts, not under it."}
_CACHE: dict = {}


def sample(n: int, seed: int) -> list[dict]:
    from scipy.stats import qmc

    tables = load("perception") | load("interface")
    keys = tuple(values("perception")) + tuple(values("interface"))
    X = qmc.scale(qmc.Sobol(len(keys), seed=seed).random(n), [tables[k].range[0] for k in keys],
                  [tables[k].range[1] for k in keys])
    ps = [dict(zip(keys, map(float, x))) | {"seed": seed * 1000 + i} for i, x in enumerate(X)]
    for p in ps:
        p["u_scale"] = _scale(p)
    return ps


def _scale(p: dict) -> float:
    """u₀ by the shared rule: the typical place (median input, full share) in the middle (geometric) of its window. The
    surge's arousal is what it reaches in the surge's three minutes."""
    a_s = 1 - np.exp(-(SURGE[1] - SURGE[0]) / p["tau_arousal"])
    h = p["hold"]
    at_hold = (1 + p["kappa"] * h) * (1 + p["guard"] * h)
    lo = max(1 / ((1 + p["kappa"] * a_s) * (1 + p["guard"])), (1 - p["hysteresis"]) / at_hold)
    hi = 1 / at_hold
    return float(np.sqrt(lo * hi))


def _P(ps: list[dict], repeat: int = 1) -> dict[str, np.ndarray]:
    return {k: np.repeat(np.array([p[k] for p in ps], float), repeat) for k in ps[0] if k != "seed"}


# ---------- A single held knot (each its own person) ----------


def single(ps: list[dict], variant: str, depths: tuple, protocol: Single) -> SingleOut:
    key = ("single", id(ps), protocol, depths)
    if key in _CACHE:
        return _CACHE[key]
    K, D = len(ps), len(depths)
    M = K * D
    P = _P(ps, D)
    group = np.arange(M)
    s_h = P["hold"]
    d = np.tile(depths, K)
    u_hold = P["u_scale"] * (1 + P["guard"] * s_h)
    g0 = (1 - P["hysteresis"]) * (1 + d) / ((1 + P["kappa"] * s_h) * u_hold)
    formed = (1 + P["kappa"]) * g0 * P["u_scale"] * (1 + P["guard"]) > 1.0
    F0 = (1 - P["hysteresis"]) * (1 + d)
    st = State(a=s_h.copy(), g=g0.copy(), h=formed.copy(), F=F0)
    att = np.ones(M) if protocol.focus else np.zeros(M)
    duration = protocol.breaths * PERIOD

    def inputs(t, st_):
        pressing = protocol.press and t < protocol.press_for
        return (s_h - calm(t, P["breath_calm"], P["tau_calm"]), True, (np.ones(M) if pressing else att),
                (P["palpation"] if pressing else np.zeros(M)))

    r = simulate(P, group, np.ones(M), g0, np.ones(M), inputs, duration, dt=0.1, every=2, state=st)
    t, h = r["t"], r["h"]
    rel = np.full(M, np.nan)
    for j in np.flatnonzero(formed):
        off = np.flatnonzero(~h[:, j])
        if len(off):
            rel[j] = t[off[0]]
    shape = (K, D)
    out = SingleOut(formed=formed.reshape(shape), rel_t=rel.reshape(shape),
                    during_out=np.where(np.isnan(rel), False, out_breath(np.nan_to_num(rel))).reshape(shape),
                    pressed=(protocol.press & (np.nan_to_num(rel, nan=np.inf) < protocol.press_for)).reshape(shape),
                    spark_here=np.zeros(shape), spark_far=np.zeros(shape))
    _CACHE[key] = out
    return out


# ---------- A patch: one person, many places ----------


def _setup(ps: list[dict]) -> dict:
    K, N = len(ps), PATCH["n"]
    z = np.random.default_rng(11).normal(0, 1, N)
    P = _P(ps)
    group = np.repeat(np.arange(K), N)
    b = np.exp(np.repeat(P["input_sd"], N) * np.tile(z, K))
    return {"K": K, "N": N, "P": P, "group": group, "b": b, "zone": np.tile(PATCH["zone"], K),
            "near": np.tile(PATCH["near"], K), "g0": np.ones(K * N)}


def _formed(S: dict, stress: float = 1.0) -> dict:
    """The knots formed by a surge (5-25 s) and held until T0 at the holding stress."""
    P = S["P"]

    def inputs(t, st_):
        s = np.zeros(S["K"]) if t < SURGE[0] else (np.ones(S["K"]) if t < SURGE[1] else P["hold"] * stress)
        return s, False, np.zeros(len(S["b"])), np.zeros(len(S["b"]))

    return simulate(P, S["group"], S["b"], S["g0"], S["zone"], inputs, T0, dt=0.1, every=10)


def patch(ps: list[dict], variant: str, protocol: Patch) -> PatchOut:
    key = ("patch", id(ps), protocol)
    if key in _CACHE:
        return _CACHE[key]
    S = _setup(ps)
    K, N, P = S["K"], S["N"], S["P"]
    near = S["near"]
    zeros = np.zeros(K * N)
    kind = protocol.kind
    held0s, rels, cycles, shortest = [], [], [], []
    if kind == "mood":
        mv = np.array([mood(p["mood_sd"], p["mood_tau"], p["seed"])[1] for p in ps])

        def inputs(t, st_):
            return (P["hold"] + mv[:, min(int(t), mv.shape[1] - 1)] - calm(t, P["breath_calm"], P["tau_calm"]), True,
                    zeros, zeros)

        r = simulate(P, S["group"], S["b"], S["g0"], S["zone"], inputs, MOOD_FOR, dt=0.1, every=10)
        t, h = r["t"], r["h"]
        for k in range(K):
            cyc, best = coming_and_going(t, h[:, k * N:(k + 1) * N])
            cycles.append(cyc)
            shortest.append(best)
            held0s.append(np.zeros(N, bool))
            rels.append(np.full(N, np.nan))
        out = PatchOut(held0s, rels, cycles, shortest)
        _CACHE[key] = out
        return out
    f = _formed(S, protocol.stress)
    st = f["state"]
    if kind == "hold":
        def inputs(t, st_):
            return P["hold"] * protocol.stress, False, zeros, zeros

        r = simulate(P, S["group"], S["b"], S["g0"], S["zone"], inputs, protocol.duration, dt=0.1, every=100, state=st)
        held = r["h"][-1]
        for k in range(K):
            held0s.append(held[k * N:(k + 1) * N])
            rels.append(np.full(N, np.nan))
        out = PatchOut(held0s, rels)
        _CACHE[key] = out
        return out

    def inputs(t, st_):
        breathing, local, pressing = protocol.at(t)
        att = np.where(near, 1.0, 0.0) if local else zeros
        press = np.where(near, P["palpation"][S["group"]], 0.0) if pressing else zeros
        return P["hold"] - (calm(t, P["breath_calm"], P["tau_calm"]) if breathing else 0.0), breathing, att, press

    r = simulate(P, S["group"], S["b"], S["g0"], S["zone"], inputs, protocol.duration, dt=0.1, every=2, state=st)
    held, rel = releases(r["t"], r["h"], protocol.start)
    for k in range(K):
        held0s.append(held[k * N:(k + 1) * N])
        rels.append(rel[k * N:(k + 1) * N])
    out = PatchOut(held0s, rels)
    _CACHE[key] = out
    return out


# ---------- A cluster: work the loudest knot until it lets go ----------


def cluster(ps: list[dict], variant: str) -> ClusterOut:
    key = ("cluster", id(ps))
    if key in _CACHE:
        return _CACHE[key]
    S = _setup(ps)
    K, N, P = S["K"], S["N"], S["P"]
    st = _formed(S)["state"]
    held = st.h.copy()
    target = np.full(K, -1)
    for k in range(K):
        sl = slice(k * N, (k + 1) * N)
        if held[sl].any():
            target[k] = k * N + int(np.argmax(np.where(held[sl], st.F[sl], -np.inf)))
    work = np.zeros(K * N, bool)
    work[target[target >= 0]] = True
    released_at = np.full(K, np.nan)

    def inputs(t, st_):
        live = work & st_.h & (t < PRESS_FOR)  # worked for a minute, then the hand lifts
        for k in np.flatnonzero((target >= 0) & np.isnan(released_at)):
            if not st_.h[target[k]]:
                released_at[k] = t
        return (P["hold"] - calm(t, P["breath_calm"], P["tau_calm"]), True, live.astype(float),
                np.where(live, P["palpation"][S["group"]], 0.0))

    r = simulate(P, S["group"], S["b"], S["g0"], S["zone"], inputs, 300.0 + 600.0, dt=0.1, every=10, state=st)
    t, h = r["t"], r["h"]
    pos = PATCH["pos"]
    with_ = np.zeros(K, int)
    new = np.zeros(K, bool)
    for k in range(K):
        if target[k] < 0 or np.isnan(released_at[k]):
            continue
        sl = slice(k * N, (k + 1) * N)
        t_rel = released_at[k]
        others = held[sl].copy()
        others[target[k] - k * N] = False
        at10 = h[np.searchsorted(t, t_rel + 10.0) - 1, sl]
        with_[k] = int((others & ~at10).sum())
        close = ((pos - pos[target[k] - k * N]) ** 2).sum(axis=1) < PATCH["radius"] ** 2
        before = h[np.searchsorted(t, t_rel) - 1, sl]
        after = h[(t > t_rel) & (t <= t_rel + 600.0), sl]
        new[k] = bool((close & ~before & after.any(axis=0)).any())
    ran = (target >= 0) & ~np.isnan(released_at)
    out = ClusterOut(with_=with_, new_nearby=new, tested_with=ran, tested_new=ran)
    _CACHE[key] = out
    return out


# ---------- Age: held 30 minutes, or 3 hours, then rest ----------


def ageing(ps: list[dict], variant: str) -> AgeOut:
    brief, long = np.zeros(len(ps), bool), np.zeros(len(ps), bool)
    for held_for, out in ((1800.0, brief), (10800.0, long)):
        P = _P(ps)
        K = len(ps)
        s_h = P["hold"]
        u_hold = P["u_scale"] * (1 + P["guard"] * s_h)
        g0 = (1 - P["hysteresis"]) * (1 + AGE_DEPTH) / ((1 + P["kappa"] * s_h) * u_hold)
        st = State(a=s_h.copy(), g=g0.copy(), h=np.ones(K, bool), F=np.full(K, 1.0))

        def inputs(t, st_, held_for=held_for):
            return (s_h if t < held_for else np.zeros(K)), False, np.zeros(K), np.zeros(K)

        r = simulate(P, np.arange(K), np.ones(K), g0, np.ones(K), inputs, held_for + 3600.0, dt=1.0, every=60, state=st)
        still = r["h"][-1]
        out[:] = ~still if held_for < 3600 else still
    return AgeOut(brief_released=brief, long_persists=long)


def density():
    return None
