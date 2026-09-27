"""The motor switch with its metabolic loop (T7, strongest form): deep knots that unclench in a moment? (exploratory)

Kept as run. The author (27 Sep 2026): a knot "doesn't seem to pinch with the skin", is "maybe less over bone", and lets go
with "a release feel like unclenching might be right or relaxing". The first motor-switch study
(2026-09-27-motor-switch.py) made knots that form at once under stress and go in a moment, but shallow: most went with any
slow breath. This adds the loop the account needs for depth, proposed by johansson1991: metabolites of a sustained
contraction drive the muscle's own sensors, which drive the same motor neurons, so the contraction keeps itself going and
spreads. Each unit's firing squeezes its own supply (as a contracture does in T3: squeeze), its metabolites build over
tau_m and wash out when it stops; they add g_m times their level to the unit's input, and g_n times their neighbours' mean
to the units within 1.5 spacings. The rest is the first study's: persistent inward currents latch a unit on until its
input falls below its threshold times (1 - H M (1 + k_w w)), M the monoamine facilitation following stress, w its
warm-up; the descending drive is stress times each place's share times a scale by the exam's shared rule (the loop at
its steady state included); the slow breath lowers stress; focused attention, where it is aimed, inhibits (heckman2008's
"focused local inhibition"); a hand excites, or excites for a moment and then inhibits while held. A knot is a unit on
only by its latch and its loop: without them, silent. Its depth is its metabolite level.

Trials, as the exam's: the surge and the holding stress; thirty broad breaths (which go, deep or easy?); then thirty aimed
at the spot; a press held a minute, then lifted; rolling a place with no knot, 1 s in every 3 for three minutes (does a
knot come out, how soon, and does it stay?); and after a knot at the spot lets go, is one back in the same place or beside
it within ten minutes?

    uv run python exploratory/2026-09-27-motor-loop.py
"""

import numpy as np
from scipy.stats import qmc

from knots_sim import exam
from knots_sim.exam import PATCH, PRESS_FOR, SURGE, T0, breath_wave, calm

K, N = exam.K, PATCH["n"]
RANGES = {  # guessed: none is measured for knots
    "H": (0.3, 0.8),  # the latch (the currents' amplification of input, up to fivefold: heckman2008)
    "tau_M": (10.0, 120.0),  # s
    "k_w": (0.0, 1.0),
    "tau_w": (30.0, 300.0),  # s
    "spread": (0.2, 0.6),  # thresholds' spread (log)
    "hold": (0.4, 0.7),  # the shared interface's range
    "breath_fall": (0.05, 0.3),
    "breath_calm": (0.05, 0.3),
    "press_in": (0.2, 1.0),
    "inhibit_after": (2.0, 20.0),  # s
    "focus": (0.1, 0.6),
    "g_m": (0.1, 1.0),  # the loop: metabolites' drive back onto the unit, in units of the typical threshold
    "tau_m": (30.0, 300.0),  # s: as T3's milieu (tau_milieu's range)
    "squeeze": (0.5, 0.95),  # as T3's: how far a contraction squeezes its own supply
    "g_n": (0.0, 0.3),  # spread to neighbours
}
X = qmc.scale(qmc.Sobol(len(RANGES), seed=exam.SEED).random(K), [r[0] for r in RANGES.values()],
              [r[1] for r in RANGES.values()])
S = {k: np.repeat(X[:, i], N) for i, k in enumerate(RANGES)}
z = np.random.default_rng(29).normal(0, 1, N)
theta = np.exp(S["spread"] * np.tile(z, K))
zone = np.tile(PATCH["zone"], K)
near = np.tile(PATCH["near"], K)
pos = PATCH["pos"]
d = np.sqrt(((pos[:, None, :] - pos[None, :, :]) ** 2).sum(-1)) * int(np.ceil(np.sqrt(N)))
NB = (d > 0) & (d <= 1.5)
NB = NB / np.maximum(NB.sum(axis=1, keepdims=True), 1)  # each place's neighbours, averaged
# Rolled: the places around the patch's calmest place (least share of the stress), where units sit silent
CALM = pos[int(np.argmin(PATCH["zone"]))]
ROLLED = np.tile(np.isin(np.arange(N), np.argsort(((pos - CALM) ** 2).sum(axis=1))[:6]), K)  # the six nearest
TAU_CALM = 120.0
PREP = exam.PREP

zmed = float(np.median(PATCH["zone"]))
loop = S["g_m"] * S["squeeze"]  # the loop's drive at its steady state, while a unit fires
lo = np.maximum(1.0 / zmed, (1 - S["H"] * S["hold"] - loop) / (S["hold"] * zmed))
hi = 1.0 / (S["hold"] * zmed)
U = np.sqrt(np.maximum(lo, 1e-3) * np.maximum(hi, lo * 1.0001))


def run(kind: str, press_sign: str = "excite", duration: float = T0 + 600.0, dt: float = 0.1, aimed: bool = False) -> dict:
    n = K * N
    on = np.zeros(n, bool)
    w, M, m = np.zeros(n), np.zeros(n), np.zeros(n)
    ts, knots, depth, fire = [], [], [], []
    for i in range(int(round(duration / dt))):
        t = i * dt
        if kind == "roll":
            s = S["hold"]
        else:
            s = np.zeros(n) if t < SURGE[0] else (np.ones(n) if t < SURGE[1] else S["hold"])
        if kind in ("broad", "focused", "press", "after") and t >= T0:
            wv = float(breath_wave(np.array([t - T0]))[0])
            s = s + S["breath_fall"] * (0.3 * max(wv, 0.0) + min(wv, 0.0)) - calm(t - T0, S["breath_calm"], TAU_CALM)
        M = M + dt * (np.clip(s, 0, None) - M) / S["tau_M"]
        drive = s * zone * U
        hand = np.zeros(n)
        if kind in ("press", "after") and T0 <= t < T0 + PRESS_FOR:
            sign = np.where((press_sign == "excite") | ((t - T0) < S["inhibit_after"]), 1.0, -1.0)
            hand = np.where(near, sign * S["press_in"], 0.0)
        if kind == "roll" and T0 <= t < T0 + 180.0 and (t - T0) % 3.0 < 1.0:
            hand = np.where(ROLLED, S["press_in"], 0.0)
        focus = np.zeros(n)
        if kind == "focused" and aimed and t >= T0 + PREP:
            focus = np.where(near, S["focus"], 0.0)
        nb = (m.reshape(K, N) @ NB.T).reshape(-1)
        I = drive + hand - focus + S["g_m"] * m + S["g_n"] * nb
        off_at = theta * (1 - S["H"] * np.clip(M, 0, 1) * (1 + S["k_w"] * w))
        on = np.where(on, I > off_at, I > theta)
        w = w + dt * (on - w) / S["tau_w"]
        m = m + dt * (S["squeeze"] * on - m) / S["tau_m"]  # builds while it fires (its supply squeezed), washes out after
        if i % 10 == 0:
            ts.append(t)
            fire.append(on.copy())
            knots.append(on & (drive - focus < theta))  # on only by its latch and its loop
            depth.append(m.copy())
    return {"t": np.array(ts), "on": np.array(fire), "knot": np.array(knots), "m": np.array(depth)}


def at(r, t, key="knot"):
    return r[key][min(int(np.searchsorted(r["t"], t)), len(r["t"]) - 1)]


def share(x):
    x = np.asarray(x, float)
    return f"{100 * np.nanmean(x):3.0f}%" if x.size and np.isfinite(np.nanmean(x)) else "  - "


def when(r, units, after, key="knot", on=False):
    out = np.full(K * N, np.nan)
    for j in np.flatnonzero(units):
        idx = np.flatnonzero((r["t"] >= after) & (r[key][:, j] if on else ~r[key][:, j]))
        out[j] = r["t"][idx[0]] - after if len(idx) else np.nan
    return out


held = run("hold", duration=T0 + 5.0)
k0 = at(held, T0)
m0 = at(held, T0, "m")
per = k0.reshape(K, N).sum(axis=1)
print(f"knots at T0: median {int(np.median(per))} of {N} per setting, in {share(per > 0)} of settings; depth (metabolites)"
      f" median {np.median(m0[k0]):.2f}")
long = run("hold", duration=T0 + 1800.0)
print(f"  still held after half an hour of held stress: {share(at(long, T0 + 1795.0)[k0])}; depth then"
      f" {np.median(at(long, T0 + 1795.0, 'm')[k0]):.2f}")

alone = run("roll", duration=T0 + 1.0)  # the holding stress from the start, no surge, no hand
pa = at(alone, T0).reshape(K, N).sum(axis=1)
print(f"  by the holding stress alone, with no surge: {int(np.median(pa))} knots per setting at T0 (the loop spreading"
      f" from units the stress drives), in {share(pa > 0)} of settings")

b = run("broad", duration=T0 + PREP + 5.0)
rel = when(b, k0, T0)
gone = np.isfinite(rel)
deep = m0 > np.median(m0[k0])
print(f"30 broad breaths: {share(gone[k0])} of knots let go (deeper half {share(gone[k0 & deep])}, shallower half"
      f" {share(gone[k0 & ~deep])}); median {np.nanmedian(rel):.0f} s")

f = run("focused", duration=T0 + 2 * PREP + 5.0, aimed=True)
left = at(f, T0 + PREP) & near
went = left & ~at(f, T0 + 2 * PREP)
print(f"then 30 aimed at the spot: {share(went[left])} of the {left.sum()} knots left there let go"
      f" (median {np.nanmedian(when(f, left, T0 + PREP)):.0f} s)")
f0 = run("focused", duration=T0 + 2 * PREP + 5.0)
left0 = at(f0, T0 + PREP) & near
print(f"  (30 more broad breaths instead: {share((left0 & ~at(f0, T0 + 2 * PREP))[left0])})")

for sign in ("excite", "excite-then-inhibit"):
    pr = run("press", press_sign=sign, duration=T0 + PRESS_FOR + 600.0)
    kn = k0 & near
    under = kn & ~at(pr, T0 + PRESS_FOR - 0.5)
    lift = kn & at(pr, T0 + PRESS_FOR - 0.5) & ~at(pr, T0 + PRESS_FOR + 5.0)
    gone_ = kn & ~at(pr, T0 + PRESS_FOR + 5.0)
    rel_ = when(pr, kn, T0)
    # back at its place: the same unit latched again, or a neighbour newly latched, within 10 minutes
    again = np.zeros(K * N, bool)
    for j in np.flatnonzero(gone_):
        tj = T0 + rel_[j]
        after = (pr["t"] > tj + 2.0) & (pr["t"] <= tj + 600.0)
        again[j] = bool(pr["knot"][after, j].any())
    beside = np.zeros(K * N, bool)
    for j in np.flatnonzero(gone_):
        k, jj = divmod(j, N)
        nbs = k * N + np.flatnonzero(NB[jj] > 0)
        tj = T0 + rel_[j]
        was = at(pr, tj)[nbs]
        after = (pr["t"] > tj) & (pr["t"] <= tj + 600.0)
        beside[j] = bool((pr["knot"][after][:, nbs] & ~was).any())
    print(f"press ({sign}): of {kn.sum()} knots at the spot, {share(under[kn])} let go under the hand,"
          f" {share(lift[kn])} as it lifts; of those gone, back at the same unit in {share(again[gone_])},"
          f" a neighbour newly held in {share(beside[gone_])}")

ro = run("roll", duration=T0 + 480.0)
fresh = ROLLED & ~at(ro, T0) & ~at(ro, T0, "on")
out_at = when(ro, fresh, T0, on=True)
between = fresh & at(ro, T0 + 180.0 - 1.5)
after1 = fresh & at(ro, T0 + 240.0)
after5 = fresh & at(ro, T0 + 480.0)
print(f"rolling 3 min at a place with no knot ({int(fresh.reshape(K, N).sum(axis=1).mean())} silent units under the hand"
      f" per setting): a knot out, between passes, in {share(between.reshape(K, N).any(axis=1))} of settings (first"
      f" latched {np.nanmedian(out_at[between]) if between.any() else float('nan'):.0f} s in); still there 1 min after in"
      f" {share(after1.reshape(K, N).any(axis=1))}, 5 min after in {share(after5.reshape(K, N).any(axis=1))}")
