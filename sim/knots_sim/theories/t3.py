"""T3, trigger points, through the exam (knots_sim/exam.py).

The unit is an endplate's contracture in the energy crisis (models/triggerpoint.py). How the shared trials map onto it,
to be checked for fairness:

- Stress (the shared unit) raises endplate drive, times each place's share; a surge forms contractures where drive
  passes the relaxed state's top, and the holding stress keeps them. By the shared rule (knots_sim/exam.py), the
  typical unit's baseline drive sits in the middle of its window: a surge contracts it, the holding stress keeps it
  contracted and cannot contract it alone. A single knot of depth d has its baseline drive at a_off + d (a_on - a_off)
  at the holding stress: where it sits in its own band.
- A slow breath lowers stress by the shared breath quantities: relaxation lowers motor drive (the account's own breath).
  In the variant with stretch, each breath also changes the band's length by breath_strain, and a change of length
  loosens the contracture; focused attention concentrates that movement at the place (focus_gain), as for every
  theory with a movement route. In the aimed variant (route B6, the author's hypothesis), attention aims the relaxation
  instead: at the attended place the breath lowers drive focus_gain times as far, as for every theory with a drive.
- A press is sustained pressure: it squeezes the capillaries and, held, lengthens the contracture, at a rate set so
  that a knot of middle depth lets go in τ_p, the 60-90 s of the pressure-release technique (pecosmartin2019). It is
  not treated as a stretch.
- The sensation is the local twitch: a release fast enough twitches, at the unit's own place.
- Clusters: a key trigger point keeps its satellites going through its milieu (the account's own claim); within a taut
  band, a released unit's load falls on its neighbours (an extension: the band's mechanics, not stated by the account).
"""

from __future__ import annotations

import numpy as np

from ..exam import (BACK_WITHIN, MOOD_FOR, PATCH, PERIOD, PRESS_FOR, ROUTES, SURGE, T0, WITHIN, AgeOut, ClusterOut, Density, Patch, PatchOut, Single,
                    SingleOut, breath_wave, calm, coming_and_going, held_again, mood, out_breath, releases)
from ..models import triggerpoint as tp
from ..params import load, values

ID, NAME = "T3", "Trigger points"
VARIANTS = {
    "drive": "the breath acts as relaxation lowering motor drive (the account's own)",
    "drive+stretch": "and the breath's movement stretches the band",
    "aimed": "relaxation, aimed by attention: at the attended place the breath lowers drive focus_gain times as far",
}
SILENT = {"O3"}
NOTES = {"O3": "Nothing in the energy crisis turns on hydration.",
         "O10.1": "Its slow sustaining factors (weeks) are not modelled yet.",
         "O15": "Hundreds of sites, a few regions in each muscle (300 taken as representative); the active nidus is 1-2 mm (hubbard1993).",
         "O8.1": "New knots after a release come from the taut band's load shifting to its neighbours: an extension of the account.",
         "O2.2": "Pressure release takes tens of seconds (60-90 s at the pressures used, pecosmartin2019), not one out-breath.",
         "O4.2": "Which endplates hold a knot is set more by their own activity than by where stress is held."}
_CACHE: dict = {}


def sample(n: int, seed: int) -> list[dict]:
    from scipy.stats import qmc

    tables = load("triggerpoint") | load("interface")
    keys = tuple(values("triggerpoint")) + tuple(values("interface"))
    X = qmc.scale(qmc.Sobol(len(keys), seed=seed).random(n), [tables[k].range[0] for k in keys],
                  [tables[k].range[1] for k in keys])
    ps = [dict(zip(keys, map(float, x))) | {"seed": seed * 1000 + i} for i, x in enumerate(X)]
    for p, k in zip(ps, tp.press_rates(ps)):
        p["press_rate"] = float(k)
    return ps


def windows(ps: list[dict], n: int = 48) -> list[tuple[float, float] | None]:
    """Each set's window of baseline drive for a unit at full share, found by running the shared trial: the surge
    (SURGE, then the holding stress until T0) leaves it contracted, and the holding stress alone does not contract it
    by then. The energy crisis builds over its slow loops, so the window is narrower than the balance of rates says.
    None where no drive does both."""
    key = ("windows", id(ps))
    if key in _CACHE:
        return _CACHE[key]
    K = len(ps)
    lows = np.array([(tp.band(p, p["hold"]) or (0.02, 0.1))[0] for p in ps])
    highs = np.array([(tp.band(p, 0.0) or (0.02, 0.1))[1] for p in ps])
    a0 = np.exp(np.linspace(np.log(0.5 * lows), np.log(2.0 * highs), n).T).ravel()  # [set, n]
    P = _P(ps, 2 * n)
    a0 = np.concatenate([a0.reshape(K, n), a0.reshape(K, n)], axis=1).ravel()
    surged = np.tile(np.r_[np.ones(n, bool), np.zeros(n, bool)], K)

    def inputs(t, st):
        return np.where(surged & (SURGE[0] <= t) & (t < SURGE[1]), 1.0, P["hold"]), 0.0 * a0, 0.0 * a0, 1.0

    held = (tp.simulate(P, a0, inputs, T0, dt=0.05, every=1000)["state"].c > tp.HELD).reshape(K, 2 * n)
    a0 = a0.reshape(K, 2 * n)[:, :n]
    out = []
    for k in range(K):
        made, alone = held[k, :n], held[k, n:]
        if tp.band(ps[k], ps[k]["hold"]) is None or not made.any():
            out.append(None)
            continue
        lo = a0[k, np.argmax(made)]  # the least drive the surge makes into a knot
        hi = a0[k, np.argmax(alone)] if alone.any() else a0[k, -1]  # the least the holding stress makes alone
        out.append((float(lo), float(hi)) if lo < hi else None)
    _CACHE[key] = out
    return out


def _P(ps: list[dict], repeat: int = 1) -> dict[str, np.ndarray]:
    return {k: np.repeat(np.array([p[k] for p in ps], float), repeat) for k in ps[0] if k != "seed"}


def _breath(t: float, stretch: bool, P: dict, strain_gain=1.0, drive_gain=1.0):
    """(stress change, band length) a slow breath makes at time t (s since breathing began): each out-breath eases
    stress and the in-breath raises it again, while minutes of it calm; drive_gain where it is aimed."""
    w = float(breath_wave(np.array([t]))[0])
    ds = drive_gain * (P["breath_fall"] * (P["breath_in_share"] * max(w, 0.0) + min(w, 0.0))
                       - calm(t, P["breath_calm"], P["tau_calm"]))
    strain = P["breath_strain"] * strain_gain
    return ds, (strain * (1 + w) / 2 if stretch else 0.0 * strain)


def _released(t: np.ndarray, c: np.ndarray, fall: np.ndarray, P: dict, held: np.ndarray, until: float = np.inf):
    """Release time (first fall below HELD, before `until`), and the twitch around it (0-1), per unit."""
    n = c.shape[1]
    rel, twitch = np.full(n, np.nan), np.zeros(n)
    for j in np.flatnonzero(held):
        below = np.flatnonzero((c[:, j] < tp.HELD) & (t < until))
        if len(below):
            rel[j] = t[below[0]]
            win = (t >= rel[j] - 1.0) & (t <= rel[j] + WITHIN)
            twitch[j] = min(float(fall[win, j].max()) * P["twitch"][j], 1.0)
    return rel, twitch


# ---------- A single held knot ----------


def single(ps: list[dict], variant: str, depths: tuple, protocol: Single) -> SingleOut:
    key = ("single", id(ps), variant, protocol, depths)
    if key in _CACHE:
        return _CACHE[key]
    K, D = len(ps), len(depths)
    M = K * D
    P = _P(ps, D)
    a0, formed = np.zeros(M), np.zeros(M, bool)
    c0, e0, m0 = np.zeros(M), np.ones(M), np.zeros(M)
    for k, p in enumerate(ps):
        b = tp.band(p, p["hold"])
        if b is None:
            continue
        for i, d in enumerate(depths):
            j = k * D + i
            a0[j] = b[0] + d * (b[1] - b[0])
            formed[j] = True
            c0[j], e0[j], m0[j] = tp.held_state(p, a0[j], p["hold"])
    stretch, aim = variant == "drive+stretch", variant == "aimed"
    focus = P["focus_gain"] if protocol.focus else 1.0

    def inputs(t, st):
        ds, strain = _breath(t, stretch, P, focus, focus if aim else 1.0)
        press = P["palpation"] if protocol.press and t < protocol.press_for else np.zeros(M)
        return P["hold"] + ds, strain + np.zeros(M), press, np.ones(M)

    r = tp.simulate(P, np.where(formed, a0, 0.0), inputs, protocol.breaths * PERIOD + WITHIN, dt=0.05, every=4,
                    state=tp.State(c=c0, e=e0, m=m0))
    rel, twitch = _released(r["t"], r["c"], r["fall"], P, formed, until=protocol.breaths * PERIOD)
    shape = (K, D)
    out = SingleOut(formed=formed.reshape(shape), rel_t=rel.reshape(shape),
                    during_out=np.where(np.isnan(rel), False, out_breath(np.nan_to_num(rel))).reshape(shape),
                    pressed=(protocol.press & (np.nan_to_num(rel, nan=np.inf) < protocol.press_for)).reshape(shape),
                    spark_here=np.where(np.isnan(rel), np.nan, twitch).reshape(shape), spark_far=np.zeros(shape))
    _CACHE[key] = out
    return out


# ---------- A patch of units ----------


def _setup(ps: list[dict]) -> dict:
    K, N = len(ps), PATCH["n"]
    z = np.random.default_rng(13).normal(0, 1, N)
    P = _P(ps, N)
    mids = [0.0 if w is None else float(np.sqrt(w[0] * w[1])) for w in windows(ps)]  # no window: no knot holds
    a0 = np.repeat(mids, N) * np.exp(P["drive_sd"] * np.tile(z, K))
    return {"K": K, "N": N, "P": P, "a0": a0, "zone": np.tile(PATCH["zone"], K), "near": np.tile(PATCH["near"], K)}


def _form(S: dict, stress: float = 1.0) -> tp.State:
    P, zone = S["P"], S["zone"]
    n = len(zone)

    def inputs(t, st):
        s = 0.0 if t < SURGE[0] else (1.0 if t < SURGE[1] else P["hold"] * stress)
        return s * zone, np.zeros(n), np.zeros(n), np.ones(n)

    return tp.simulate(P, S["a0"], inputs, T0, dt=0.05, every=100)["state"]


def patch(ps: list[dict], variant: str, protocol: Patch) -> PatchOut:
    key = ("patch", id(ps), variant, protocol)
    if key in _CACHE:
        return _CACHE[key]
    S = _setup(ps)
    K, N, P, zone, near = S["K"], S["N"], S["P"], S["zone"], S["near"]
    n = K * N
    stretch, aim = variant == "drive+stretch", variant == "aimed"
    kind = protocol.kind
    held0s, rels, cycles, shortest = [], [], [], []
    if kind == "mood":
        mv = np.repeat(np.array([mood(p["mood_sd"], p["mood_tau"], p["seed"])[1] for p in ps]), N, axis=0)

        def inputs(t, st):
            ds, strain = _breath(t, stretch, P)
            return (P["hold"] + mv[:, min(int(t), mv.shape[1] - 1)] + ds) * zone, strain + np.zeros(n), np.zeros(n), np.ones(n)

        r = tp.simulate(P, S["a0"], inputs, MOOD_FOR, dt=0.05, every=20)
        t, h = r["t"], r["c"] > tp.HELD
        for k in range(K):
            cyc, best = coming_and_going(t, h[:, k * N:(k + 1) * N])
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
            return P["hold"] * protocol.stress * zone, np.zeros(n), np.zeros(n), np.ones(n)

        st = tp.simulate(P, S["a0"], inputs, protocol.duration, dt=0.05, every=1000, state=st)["state"]
        held = st.c > tp.HELD
        for k in range(K):
            held0s.append(held[k * N:(k + 1) * N])
            rels.append(np.full(N, np.nan))
        out = PatchOut(held0s, rels)
        _CACHE[key] = out
        return out
    focus = np.where(near, P["focus_gain"], 1.0)

    def inputs(t, st_):
        breathing, local, pressing = protocol.at(t)
        if breathing:
            ds, strain = _breath(t, stretch, P, focus if local else 1.0, focus if local and aim else 1.0)
        else:
            ds, strain = 0.0, 0.0
        press = np.where(near, P["palpation"], 0.0) if pressing else np.zeros(n)
        return (P["hold"] + ds) * zone, strain + np.zeros(n), press, np.ones(n)

    r = tp.simulate(P, S["a0"], inputs, protocol.duration, dt=0.05, every=4, state=st)
    held, rel = releases(r["t"], r["c"] > tp.HELD, protocol.start)
    for k in range(K):
        held0s.append(held[k * N:(k + 1) * N])
        rels.append(rel[k * N:(k + 1) * N])
    out = PatchOut(held0s, rels)
    _CACHE[key] = out
    return out


# ---------- Clusters: a key and its satellites; a taut band sharing load ----------


def _work_first(P1, a0, st, coupling, K, V, variant, duration):
    """Press and breathe at unit 0 of each group of V (with attention there) until it lets go, for at most PRESS_FOR s
    (the hand then lifts and does not come back, as for every theory); keep breathing."""
    stretch, aim = variant == "drive+stretch", variant == "aimed"
    n = K * V
    first = np.arange(K) * V
    released_at = np.full(K, np.nan)

    def inputs(t, st_):
        held = st_.c[first] > tp.HELD
        for k in np.flatnonzero(np.isnan(released_at) & ~held):
            released_at[k] = t
        live = np.zeros(n, bool)
        live[first] = np.isnan(released_at) & (t < PRESS_FOR)  # worked until it lets go, for at most a minute
        local = np.where(live, P1["focus_gain"], 1.0)
        ds, strain = _breath(t, stretch, P1, local, local if aim else 1.0)
        return P1["hold"] + ds, strain + np.zeros(n), np.where(live, P1["palpation"], 0.0), coupling(st_)

    r = tp.simulate(P1, a0, inputs, duration, dt=0.05, every=20, state=st)
    return r, released_at


def cluster(ps: list[dict], variant: str) -> ClusterOut:
    key = ("cluster", id(ps), variant)
    if key in _CACHE:
        return _CACHE[key]
    K = len(ps)
    with_, new = np.zeros(K, int), np.zeros(K, bool)
    # A key and four satellites: the satellites' drive rises with the key's milieu.
    V = 5
    P1 = _P(ps, V)
    a0, c0, e0, m0 = (np.zeros(K * V) for _ in range(4))
    e0[:] = 1.0
    ok = np.zeros(K, bool)
    for k, p in enumerate(ps):
        b = tp.band(p, p["hold"])
        if b is None:
            continue
        ok[k] = True
        a_key = b[0] + 0.5 * (b[1] - b[0])
        ck, ek, mk = tp.held_state(p, a_key, p["hold"])
        boost = 1 + p["satellite"] * mk
        a0[k * V], c0[k * V], e0[k * V], m0[k * V] = a_key, ck, ek, mk
        for i, d in enumerate((0.2, 0.4, 0.6, 0.8)):
            j = k * V + 1 + i
            a0[j] = (b[0] + d * (b[1] - b[0])) / boost
            c0[j], e0[j], m0[j] = tp.held_state(p, a0[j] * boost, p["hold"])
    keys = np.arange(K) * V

    def coupling(st_):
        f = np.ones(K * V)
        for i in range(1, V):
            f[keys + i] = 1 + P1["satellite"][keys] * st_.m[keys]
        return f

    # O8.2, per set: within BACK_WITHIN s of the worked knot's release, a knot back at its place, by route, how soon
    how = {r_: np.zeros(K, bool) for r_ in ROUTES}
    first_back = np.full(K, np.inf)

    def came_back(k, route, times):
        if len(times):
            how[route][k] = True
            first_back[k] = min(first_back[k], float(times[0]))

    r, rel_at = _work_first(P1, np.where(np.repeat(ok, V), a0, 0.0), tp.State(c=c0, e=e0, m=m0), coupling, K, V,
                            variant, PRESS_FOR + BACK_WITHIN + 10.0)
    ok_key = ok.copy()
    t, c = r["t"], r["c"]
    for k in np.flatnonzero(ok & ~np.isnan(rel_at)):
        sats = slice(k * V + 1, (k + 1) * V)
        before = c[np.searchsorted(t, rel_at[k]) - 1, sats] > tp.HELD
        after = c[np.searchsorted(t, rel_at[k] + 10.0) - 1, sats] > tp.HELD
        with_[k] = int((before & ~after).sum())
        # the key itself contracting again (its satellites lie in its referral zone, not its spot: they do not count)
        came_back(k, "same", held_again(t, c[:, k * V] > tp.HELD, rel_at[k]))
    # A taut band of six, laid out as a line with the held unit in the middle and units 1 and 2 on either side of it (its
    # immediate neighbours, for O8.2); five relaxed near their tops; a released unit's load falls on the rest.
    V = 6
    P2 = _P(ps, V)
    a0, c0, e0, m0 = (np.zeros(K * V) for _ in range(4))
    e0[:] = 1.0
    ok = np.zeros(K, bool)
    for k, p in enumerate(ps):
        b = tp.band(p, p["hold"])
        if b is None:
            continue
        ok[k] = True
        a0[k * V] = b[0] + 0.5 * (b[1] - b[0])
        c0[k * V], e0[k * V], m0[k * V] = tp.held_state(p, a0[k * V], p["hold"])
        for i, f_ in enumerate(np.linspace(0.9, 0.99, V - 1)):
            a0[k * V + 1 + i] = f_ * b[1]
    firsts = np.arange(K) * V

    def band_load(st_):
        shed = (st_.c[firsts] <= tp.HELD).astype(float)  # the held unit has let go: its load is shared out
        f = np.ones(K * V)
        for i in range(1, V):
            f[firsts + i] = 1 + P2["load_share"][firsts] * shed / (V - 1)
        return f

    r2, rel2 = _work_first(P2, np.where(np.repeat(ok, V), a0, 0.0), tp.State(c=c0, e=e0, m=m0), band_load, K, V,
                           variant, PRESS_FOR + BACK_WITHIN + 10.0)
    t2, c2 = r2["t"], r2["c"]
    for k in np.flatnonzero(ok & ~np.isnan(rel2)):
        rest = slice(k * V + 1, (k + 1) * V)
        window = (t2 > rel2[k]) & (t2 <= rel2[k] + BACK_WITHIN)
        later = c2[window, rest] > tp.HELD
        new[k] = bool(later.any())
        came_back(k, "same", held_again(t2, c2[:, k * V] > tp.HELD, rel2[k]))
        was = c2[np.searchsorted(t2, rel2[k]) - 1, k * V + 1:k * V + 3] > tp.HELD
        beside = (c2[window, k * V + 1:k * V + 3] > tp.HELD) & ~was
        came_back(k, "beside", t2[window][beside.any(axis=1)] - rel2[k])
    ran = (ok_key & ~np.isnan(rel_at)) | (ok & ~np.isnan(rel2))
    back = how["same"] | how["beneath"] | how["beside"]
    out = ClusterOut(with_=with_, new_nearby=new, tested_with=ok_key & ~np.isnan(rel_at), tested_new=ok & ~np.isnan(rel2),
                     back=back, back_how=how, back_t=np.where(np.isfinite(first_back), first_back, np.nan),
                     tested_back=ran)
    _CACHE[key] = out
    return out


def ageing(ps: list[dict], variant: str) -> AgeOut | None:
    return None  # its slow sustaining factors (weeks) are not modelled yet


def density() -> Density:
    return Density(per_mm2=300 / 1.8e6, total=300, note=NOTES["O15"])
