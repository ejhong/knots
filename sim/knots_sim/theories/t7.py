"""T7, the motor switch, through the exam (knots_sim/exam.py).

The unit is a motor unit whose neuron can latch on (models/motorswitch.py); a knot is a firing unit, a contraction
beneath the skin, as a shut vessel is in T1; its latch and loop let it outlast the stress that recruited it. Added 27 Sep
2026. How the shared trials map onto it, to be checked for
fairness:

- Stress (the shared unit) is the descending drive to the pool, times each place's share, times a scale U by the shared
  rule (knots_sim/exam.py): the typical unit (median threshold, median share) is recruited by the surge, kept by the
  holding stress with its loop at its steady state, and not recruited by the holding stress alone. The monoamine
  facilitation follows stress.
- A single knot of depth d is a unit at the typical place whose input at the holding stress, loop included, sits a share
  d of the way from where it would fall silent to where it would be recruited: its place in its own band, as T1's knot
  sits in its vessel's band. A brief input above its threshold latches it (gorassini1998's brief input).
- A slow breath lowers stress by the shared breath quantities, so drive and facilitation fall with it; minutes of it calm.
- Focused attention at a place inhibits its units (the view's focused local inhibition), by focus_inhibit.
- A press is an input to the units under the hand, press_gain per 40 mmHg of palpation: it excites (variant "excite"),
  or excites for a moment and then inhibits while held (variant "inhibit"); which, is not known.
- Its knot is a contraction beneath the skin, in muscle; it lets go when the unit falls silent, and the patch unclenches.
- Sparks: the account says nothing of a tingle at a release (silent). Count: no count until the number of motor units in a
  body is sourced (silent).
"""

from __future__ import annotations

import numpy as np

from ..exam import (AGE_DEPTH, BACK_WITHIN, MOOD_FOR, PATCH, PERIOD, PRESS_FOR, SURGE, T0, WITHIN, AgeOut, ClusterOut,
                    Hand, Patch, PatchOut, Single, SingleOut, breath_wave, calm, coming_and_going, held_again, mood,
                    out_breath, releases)
from ..models import motorswitch as ms
from ..params import load, values

ID, NAME = "T7", "Motor switch"
VARIANTS = {"excite": "a hand excites the units it presses; attention inhibits them",
            "inhibit": "a hand excites for a moment, then inhibits while held; attention inhibits"}
SILENT = {"O3", "O6", "O15"}
FEEL = {"bump": True, "unclench": True}
NOTES = {"O3": "Nothing in the motor switch turns on hydration.",
         "O6": "The account says nothing of a tingle at a release; its units, falling silent, unclench.",
         "O15": "No count until the number of motor units in a body is sourced.",
         "O17.1": "A latched unit keeps its patch of muscle contracted, beneath the skin: a bump the hand can feel.",
         "O17.2": "It lets go when the unit falls silent, and the contraction goes at once: an unclenching.",
         "O10.1": "Nothing in the switch remembers how long a knot was held, once its loop has built (minutes)."}
_CACHE: dict = {}
ZMED = float(np.median(PATCH["zone"]))
_side = int(np.ceil(np.sqrt(PATCH["n"])))
_d = np.sqrt(((PATCH["pos"][:, None, :] - PATCH["pos"][None, :, :]) ** 2).sum(-1)) * _side
NEIGHBOURS = ((_d > 0) & (_d <= 1.5)) / np.maximum(((_d > 0) & (_d <= 1.5)).sum(axis=1, keepdims=True), 1)


def sample(n: int, seed: int) -> list[dict]:
    from scipy.stats import qmc

    tables = load("motorswitch") | load("interface")
    keys = tuple(values("motorswitch")) + tuple(values("interface"))
    X = qmc.scale(qmc.Sobol(len(keys), seed=seed).random(n), [tables[k].range[0] for k in keys],
                  [tables[k].range[1] for k in keys])
    ps = [dict(zip(keys, map(float, x))) | {"seed": seed * 1000 + i} for i, x in enumerate(X)]
    for p in ps:
        p["U"] = _scale(p)
    return ps


def _scale(p: dict) -> float:
    """U by the shared rule, at the typical place (median threshold 1, median share): the surge recruits it; the holding
    stress keeps it, its loop at its steady state and warmed up; the holding stress alone does not recruit it."""
    L = float(ms.latch(p, p["hold"], 1.0))
    lo = max(1 / ZMED, (L - p["g_m"] * p["squeeze"]) / (p["hold"] * ZMED))
    hi = 1 / (p["hold"] * ZMED)
    return float(np.sqrt(lo * max(hi, lo * 1.0001)))


def _P(ps: list[dict], repeat: int = 1) -> dict[str, np.ndarray]:
    return {k: np.repeat(np.array([p[k] for p in ps], float), repeat) for k in ps[0] if k != "seed"}


def _breath(t: float, P: dict) -> np.ndarray:
    """What a slow breath does to stress at time t (s since breathing began): each out-breath eases it and the in-breath
    raises it again, while minutes of it calm."""
    w = float(breath_wave(np.array([t]))[0])
    return P["breath_fall"] * (P["breath_in_share"] * max(w, 0.0) + min(w, 0.0)) - calm(t, P["breath_calm"], P["tau_calm"])


def _hand(P: dict, variant: str, held_for: float) -> np.ndarray:
    """A hand's input to the units it presses, held_for s after it landed."""
    size = P["press_gain"] * P["palpation"] / 40.0
    if variant == "inhibit":
        return np.where(held_for < P["inhibit_after"], size, -size)
    return size


# ---------- A single held knot ----------


def single(ps: list[dict], variant: str, depths: tuple, protocol: Single) -> SingleOut:
    key = ("single", id(ps), variant, protocol, depths)
    if key in _CACHE:
        return _CACHE[key]
    K, D = len(ps), len(depths)
    M = K * D
    P = _P(ps, D)
    d = np.tile(depths, K)
    drive_h = P["hold"] * P["U"] * ZMED
    L = ms.latch(P, P["hold"], 1.0)
    theta = (drive_h + P["g_m"] * P["squeeze"]) / (L + d * (1 - L))  # its place in its band: d of the way up
    formed = drive_h < theta  # held by its latch and loop at the holding stress, not by its drive alone
    st = ms.State(on=formed.copy(), M=P["hold"].copy(), w=np.ones(M), m=P["squeeze"] * formed, D=drive_h.copy())
    zeros = np.zeros(M)

    def inputs(t, st_):
        s = P["hold"] + _breath(t, P)
        extra = zeros - (P["focus_inhibit"] if protocol.focus else 0.0)
        if protocol.press and t < protocol.press_for:
            extra = extra + _hand(P, variant, t)
        return s, s * P["U"] * ZMED, extra

    r = ms.simulate(P, theta, inputs, protocol.breaths * PERIOD + WITHIN, dt=0.1, every=2, state=st)
    t, on = r["t"], r["on"]
    rel = np.full(M, np.nan)
    for j in np.flatnonzero(formed):
        off = np.flatnonzero(~on[:, j] & (t < protocol.breaths * PERIOD))
        if len(off):
            rel[j] = t[off[0]]
    shape = (K, D)
    out = SingleOut(formed=formed.reshape(shape), rel_t=rel.reshape(shape),
                    during_out=np.where(np.isnan(rel), False, out_breath(np.nan_to_num(rel))).reshape(shape),
                    pressed=(protocol.press & (np.nan_to_num(rel, nan=np.inf) < protocol.press_for)).reshape(shape),
                    spark_here=np.zeros(shape), spark_far=np.zeros(shape))
    _CACHE[key] = out
    return out


# ---------- A patch: one person, many units ----------


def _setup(ps: list[dict]) -> dict:
    K, N = len(ps), PATCH["n"]
    z = np.random.default_rng(31).normal(0, 1, N)
    P = _P(ps, N)
    return {"K": K, "N": N, "P": P, "theta": np.exp(P["spread"] * np.tile(z, K)), "zone": np.tile(PATCH["zone"], K),
            "near": np.tile(PATCH["near"], K)}


def _form(S: dict, stress: float = 1.0) -> ms.State:
    """The knots latched by a surge (SURGE) and held until T0 at the holding stress."""
    P, zone = S["P"], S["zone"]
    n = len(zone)

    def inputs(t, st_):
        s = np.zeros(n) if t < SURGE[0] else (np.ones(n) if t < SURGE[1] else P["hold"] * stress)
        return s, s * zone * P["U"], np.zeros(n)

    return ms.simulate(P, S["theta"], inputs, T0, dt=0.1, every=100, neighbours=NEIGHBOURS)["state"]


def patch(ps: list[dict], variant: str, protocol: Patch) -> PatchOut:
    key = ("patch", id(ps), variant, protocol)
    if key in _CACHE:
        return _CACHE[key]
    S = _setup(ps)
    K, N, P, zone, near = S["K"], S["N"], S["P"], S["zone"], S["near"]
    n = K * N
    zeros = np.zeros(n)
    held0s, rels, cycles, shortest = [], [], [], []
    kind = protocol.kind
    if kind == "mood":
        mv = np.repeat(np.array([mood(p["mood_sd"], p["mood_tau"], p["seed"])[1] for p in ps]), N, axis=0)

        def inputs(t, st_):
            s = P["hold"] + mv[:, min(int(t), mv.shape[1] - 1)] + _breath(t, P)
            return s, s * zone * P["U"], zeros

        r = ms.simulate(P, S["theta"], inputs, MOOD_FOR, dt=0.1, every=10, neighbours=NEIGHBOURS)
        for k in range(K):
            cyc, best = coming_and_going(r["t"], r["knot"][:, k * N:(k + 1) * N])
            cycles.append(cyc)
            shortest.append(best)
            held0s.append(np.zeros(N, bool))
            rels.append(np.full(N, np.nan))
        out = PatchOut(held0s, rels, cycles, shortest)
        _CACHE[key] = out
        return out
    st = _form(S, protocol.stress)
    if kind == "hold":
        def inputs(t, st_):
            s = P["hold"] * protocol.stress
            return s, s * zone * P["U"], zeros

        r = ms.simulate(P, S["theta"], inputs, protocol.duration, dt=0.1, every=1000, state=st, neighbours=NEIGHBOURS)
        held = r["knot"][-1]
        for k in range(K):
            held0s.append(held[k * N:(k + 1) * N])
            rels.append(np.full(N, np.nan))
        out = PatchOut(held0s, rels)
        _CACHE[key] = out
        return out

    def inputs(t, st_):
        breathing, local, pressing = protocol.at(t)
        s = P["hold"] + (_breath(t, P) if breathing else 0.0)
        extra = np.where(near & local, -P["focus_inhibit"], 0.0)
        if pressing:
            extra = extra + np.where(near, _hand(P, variant, t - protocol.start), 0.0)
        return s, s * zone * P["U"], extra

    r = ms.simulate(P, S["theta"], inputs, protocol.duration, dt=0.1, every=2, state=st, neighbours=NEIGHBOURS)
    held, rel = releases(r["t"], r["knot"], protocol.start)
    for k in range(K):
        held0s.append(held[k * N:(k + 1) * N])
        rels.append(rel[k * N:(k + 1) * N])
    out = PatchOut(held0s, rels)
    _CACHE[key] = out
    return out


# ---------- A cluster: work the deepest knot until it lets go ----------


def cluster(ps: list[dict], variant: str) -> ClusterOut:
    key = ("cluster", id(ps), variant)
    if key in _CACHE:
        return _CACHE[key]
    S = _setup(ps)
    K, N, P, zone = S["K"], S["N"], S["P"], S["zone"]
    st = _form(S)
    held = st.on.copy()
    target = np.full(K, -1)
    for k in range(K):
        sl = slice(k * N, (k + 1) * N)
        if held[sl].any():
            target[k] = k * N + int(np.argmax(np.where(held[sl], st.m[sl], -np.inf)))  # the deepest: most metabolites
    work = np.zeros(K * N, bool)
    work[target[target >= 0]] = True
    hand = Hand(K)  # worked until it lets go, for at most a minute; then it lifts
    released_at = hand.released_at

    def inputs(t, st_):
        live = work & np.repeat(hand.step(t, (target >= 0) & st_.on[np.maximum(target, 0)]), N)
        s = P["hold"] + _breath(t, P)
        extra = np.where(live, _hand(P, variant, t) - P["focus_inhibit"], 0.0)
        return s, s * zone * P["U"], extra

    r = ms.simulate(P, S["theta"], inputs, PRESS_FOR + BACK_WITHIN + 240.0, dt=0.1, every=10, state=st,
                    neighbours=NEIGHBOURS)
    t, h = r["t"], r["knot"]
    pos = PATCH["pos"]
    grid = np.stack([np.arange(N) % _side, np.arange(N) // _side], -1)
    with_ = np.zeros(K, int)
    new = np.zeros(K, bool)
    how = {r_: np.zeros(K, bool) for r_ in ("same", "beneath", "beside")}
    first_back = np.full(K, np.inf)
    for k in range(K):
        if target[k] < 0 or np.isnan(released_at[k]):
            continue
        sl = slice(k * N, (k + 1) * N)
        t_rel = released_at[k]
        j = target[k] - k * N
        others = held[sl].copy()
        others[j] = False
        at10 = h[np.searchsorted(t, t_rel + 10.0) - 1, sl]
        with_[k] = int((others & ~at10).sum())
        close = ((pos - pos[j]) ** 2).sum(axis=1) < PATCH["radius"] ** 2
        before = h[np.searchsorted(t, t_rel) - 1, sl]
        after = h[(t > t_rel) & (t <= t_rel + BACK_WITHIN), sl]
        new[k] = bool((close & ~before & after.any(axis=0)).any())
        ring = np.abs(grid - grid[j]).max(axis=1) == 1
        window = (t > t_rel) & (t <= t_rel + BACK_WITHIN)
        for route, times in (("same", held_again(t, h[:, target[k]], t_rel)),
                             ("beside", t[window][(h[window, sl] & ring & ~before).any(axis=1)] - t_rel)):
            if len(times):
                how[route][k] = True
                first_back[k] = min(first_back[k], float(times[0]))
    ran = (target >= 0) & ~np.isnan(released_at)
    back = how["same"] | how["beneath"] | how["beside"]
    out = ClusterOut(with_=with_, new_nearby=new, tested_with=ran, tested_new=ran, back=back, back_how=how,
                     back_t=np.where(np.isfinite(first_back), first_back, np.nan), tested_back=ran)
    _CACHE[key] = out
    return out


# ---------- Age: held 30 minutes, or 3 hours, then the stress ends ----------


def ageing(ps: list[dict], variant: str) -> AgeOut:
    brief, long = np.zeros(len(ps), bool), np.zeros(len(ps), bool)
    P = _P(ps)
    K = len(ps)
    drive_h = P["hold"] * P["U"] * ZMED
    L = ms.latch(P, P["hold"], 1.0)
    theta = (drive_h + P["g_m"] * P["squeeze"]) / (L + AGE_DEPTH * (1 - L))
    for held_for, out in ((1800.0, brief), (10800.0, long)):
        st = ms.State(on=np.ones(K, bool), M=P["hold"].copy(), w=np.ones(K), m=P["squeeze"].copy(), D=drive_h.copy())

        def inputs(t, st_, held_for=held_for):
            s = P["hold"] if t < held_for else np.zeros(K)
            return s, s * P["U"] * ZMED, np.zeros(K)

        r = ms.simulate(P, theta, inputs, held_for + 3600.0, dt=1.0, every=60, state=st)
        still = r["on"][-1]
        out[:] = ~still if held_for < 3600 else still
    return AgeOut(brief_released=brief, long_persists=long)


def density():
    return None
