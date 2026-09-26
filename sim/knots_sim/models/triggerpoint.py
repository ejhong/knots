"""T3, trigger points: the energy crisis at an overactive motor endplate (gerwin2004; params/triggerpoint.yaml).

Per unit (a patch of sarcomeres at an endplate), with contracture c, energy e and acid milieu m, all 0 to 1:

    q      = (1 - κ_c c) · max(1 - p / p_occ, 0)                 perfusion: the contracture and a press squeeze the capillaries
    drive  = a₀ (1 + σ s) (1 + λ m) · coupling                   endplate activity: stress and the acid milieu raise it
    dc/dt  = drive (1 - c) - r eⁿ c - g_s |dε/dt| c - k_p ℓ c
    dℓ/dt  = ((p / 40) (1 - ℓ) - [p = 0] ℓ) / τ_p                  held pressure lengthens the band slowly (creep)
    de/dt  = (q (1 - e) - μ c e) / τ_e
    dm/dt  = ((1 - q) - m) / τ_m

A knot is a unit whose contracture holds (c > 0.5). With the energy crisis strong enough, a unit has two stable states
over a band of drive, like the vessel switch: relaxed, or held by its own ischaemia. A stretch (a change of length) and
held pressure loosen the contracture; a release fast enough comes with a local twitch (the account's pop). Pressure
works through the band's slow lengthening ℓ, over τ_p; its strength k_p is set by `press_rates` so that a press lets a
knot of middle depth go in τ_p, whatever it also does to perfusion.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

HELD = 0.5
C = np.linspace(0.005, 0.995, 800)


def curve(P: dict, s: float = 0.0) -> np.ndarray:
    """The baseline drive a₀ at which each contracture c is an equilibrium, at stress s (no press, no coupling)."""
    q = 1 - P["squeeze"] * C
    e = q / (q + P["use"] * C)
    m = 1 - q
    return P["relax"] * e ** P["coop"] * C / ((1 - C) * (1 + P["stress_gain"] * s) * (1 + P["milieu_gain"] * m))


def _fold(P: dict, s: float) -> tuple[int, int, np.ndarray] | None:
    """Indices of the relaxed branch's top (a_on) and the held branch's foot (a_off) on the curve, if both exist."""
    a = curve(P, s)
    d = np.diff(a)
    peaks = np.flatnonzero((d[:-1] > 0) & (d[1:] <= 0)) + 1
    if not len(peaks):
        return None
    i = int(peaks[0])
    j = i + int(np.argmin(a[i:]))
    if j >= len(C) - 1 or a[j] >= a[i]:
        return None
    return i, j, a


def band(P: dict, s: float = 0.0) -> tuple[float, float] | None:
    """(a_off, a_on): below a_off a held unit relaxes; above a_on a relaxed one contracts. None if not bistable."""
    f = _fold(P, s)
    return None if f is None else (float(f[2][f[1]]), float(f[2][f[0]]))


def held_state(P: dict, a0: float, s: float) -> tuple[float, float, float]:
    """The held (contracted) equilibrium for baseline drive a₀ at stress s: (c, e, m)."""
    f = _fold(P, s)
    if f is None:
        return 0.99, 0.0, 1.0
    i, j, a = f
    hi = np.flatnonzero((np.arange(len(C)) >= j) & (a >= a0))
    c = float(C[hi[0]]) if len(hi) else 0.99
    q = 1 - P["squeeze"] * c
    return c, q / (q + P["use"] * c), 1 - q


@dataclass
class State:
    c: np.ndarray
    e: np.ndarray
    m: np.ndarray
    l: np.ndarray | None = None  # lengthening under held pressure, 0-1


def simulate(P: dict[str, np.ndarray], a0: np.ndarray, inputs, duration: float, dt: float = 0.05, every: int = 4,
             state: State | None = None) -> dict:
    """Integrate every unit at once (Euler). P: parameters per unit. inputs(t, state) returns (stress per unit,
    strain per unit, pressure per unit in mmHg, coupling factor per unit)."""
    n = len(a0)
    k_press = P["press_rate"] if "press_rate" in P else 1.0
    st = state or State(c=np.zeros(n), e=np.ones(n), m=np.zeros(n))
    if st.l is None:
        st.l = np.zeros(n)
    last_strain = None
    ts, cs, rates = [], [], []
    for i in range(int(round(duration / dt))):
        t = i * dt
        s, strain, press, coupling = inputs(t, st)
        rate_strain = np.zeros(n) if last_strain is None else np.abs(strain - last_strain) / dt
        last_strain = strain
        q = (1 - P["squeeze"] * st.c) * np.maximum(1 - press / P["occlude"], 0.0)
        drive = a0 * (1 + P["stress_gain"] * s) * (1 + P["milieu_gain"] * st.m) * coupling
        dc = (drive * (1 - st.c) - P["relax"] * st.e ** P["coop"] * st.c - P["stretch_gain"] * rate_strain * st.c
              - k_press * st.l * st.c)
        st.c = np.clip(st.c + dt * dc, 0.0, 1.0)
        st.l = np.clip(st.l + dt * ((press / 40.0) * (1 - st.l) - (press <= 0) * st.l) / P["tau_press"], 0.0, 1.0)
        st.e = np.clip(st.e + dt * (q * (1 - st.e) - P["use"] * st.c * st.e) / P["tau_energy"], 0.0, 1.0)
        st.m = np.clip(st.m + dt * ((1 - q) - st.m) / P["tau_milieu"], 0.0, 1.0)
        if i % every == 0:
            ts.append(t)
            cs.append(st.c.astype(np.float32))
            rates.append((-dc).astype(np.float32))
    return {"t": np.array(ts), "c": np.array(cs), "fall": np.array(rates), "state": st}


def _press_times(ps: list[dict], rates: np.ndarray, depth: float) -> np.ndarray:
    """When a held knot of the given depth lets go under the set's press at each rate ([set, rate]; inf if it holds)."""
    K, R = rates.shape
    P = {k: np.repeat(np.array([p[k] for p in ps], float), R) for k in ps[0] if k != "seed"}
    P["press_rate"] = rates.ravel()
    a0, c0, e0, m0 = np.zeros(K * R), np.zeros(K * R), np.ones(K * R), np.zeros(K * R)
    for k, p in enumerate(ps):
        b = band(p, p["hold"])
        if b is None:
            continue
        sl = slice(k * R, (k + 1) * R)
        a0[sl] = b[0] + depth * (b[1] - b[0])
        c0[sl], e0[sl], m0[sl] = held_state(p, a0[sl][0], p["hold"])
    zeros = np.zeros(K * R)
    horizon = 1.2 * max(p["tau_press"] for p in ps)
    r = simulate(P, a0, lambda t, st: (P["hold"], zeros, P["palpation"], 1.0), horizon, dt=0.05, every=4,
                 state=State(c=c0, e=e0, m=m0))
    below = r["c"] < HELD
    return np.where(below.any(axis=0), r["t"][np.argmax(below, axis=0)], np.inf).reshape(K, R)


def press_rates(ps: list[dict], depth: float = 0.5, steps: int = 16) -> np.ndarray:
    """For each parameter set, the press rate k_p at which a held knot of the given depth in its band, pressed at the
    set's palpation pressure at the holding stress with nothing else, lets go after τ_p (pecosmartin2019's 60-90 s
    applications). A press weaker than a threshold never lets it go (it cannot outpull the ischaemia it adds), and
    near the threshold the release comes late: the rate is found by bisection there. Sets with no band get 1 / τ_p;
    a set whose knot goes sooner than τ_p at any rate gets the smallest."""
    K = len(ps)
    bank = np.geomspace(1e-2, 30.0, 24)
    when = _press_times(ps, np.tile(bank, (K, 1)), depth)
    tau = np.array([p["tau_press"] for p in ps])
    out = 1.0 / tau
    lo, hi = np.full(K, np.nan), np.full(K, np.nan)
    for k, p in enumerate(ps):
        if band(p, p["hold"]) is None:
            continue
        fast = np.flatnonzero(when[k] <= tau[k])
        if not len(fast):
            out[k] = bank[-1]
        elif fast[0] == 0:
            out[k] = bank[0]
        else:
            lo[k], hi[k] = bank[fast[0] - 1], bank[fast[0]]
    open_ = np.flatnonzero(~np.isnan(lo))
    if len(open_):
        sub = [ps[k] for k in open_]
        a, b = lo[open_], hi[open_]
        for _ in range(steps):
            mid = np.sqrt(a * b)
            t = _press_times(sub, mid[:, None], depth)[:, 0]
            soon = t <= tau[open_]
            b, a = np.where(soon, mid, b), np.where(soon, a, mid)
        out[open_] = b
    return out
