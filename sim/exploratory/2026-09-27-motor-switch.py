"""The motor switch (T7): can motor units that latch on make the bump, and let it go in about a second? (exploratory)

Kept as run. Spinal motor neurons have persistent inward currents: a brief input starts self-sustained firing that
outlasts it, measured in people (gorassini1998); the currents amplify synaptic input up to fivefold or more under serotonin
and noradrenaline, and switching them off usually needs inhibitory input (heckman2008); blocking 5-HT2 receptors shortens
the self-sustained firing (goodlich2024). The candidate: a latched unit keeps its patch of muscle contracted, the felt
bump, and the knot lets go when the unit falls silent. None of that has been shown for knots; this asks what it would take.

A pool of 64 units on the exam's patch (knots_sim/exam.py, PATCH: each place's share of the stress, representative), in
32 settings of the guessed numbers below. Each unit is recruited when its input passes its threshold and, once on, stays on
until its input falls below the threshold times (1 - H M (1 + k_w w)): H the latch (the currents' amplification), M the
monoamine facilitation, which follows stress over tau_M, and w each unit's warm-up (the currents grow with repeated
activation, heckman2008), over tau_w. The input is the descending drive, stress times the place's share times a scale set
by the exam's shared rule (the typical place is recruited by the surge and kept by the holding stress, not recruited by it
alone), less the slow breath (the shared breath quantities) and, in the pooled variant, raised by the pool when its units
fall silent (the muscle keeps its tone: minerbi2018's rotation). A hand is an afferent input at the places it covers, whose
sign is not known: it excites; or it excites for a moment and then inhibits while held. Focused attention, in the aimed
variant, inhibits the units at its place (heckman2008's "focused local inhibition"), by the setting's focus gain.

Trials, as the exam's: the surge and the holding stress (knots formed, how soon); thirty broad breaths (which go, easiest
first?); then thirty focused ones at the spot; a press held a minute at the spot with slow breaths, then lifted (under the
hand, as it lifts, or not?); rolling a place with no knot, the hand on 1 s in every 3 for three minutes (does a knot come
out, and how soon?); and, pooled, whether a unit's release brings another out nearby.

    uv run python exploratory/2026-09-27-motor-switch.py
"""

import numpy as np
from scipy.stats import qmc

from knots_sim import exam
from knots_sim.exam import PATCH, PERIOD, PRESS_FOR, SURGE, T0, breath_wave, calm

K, N = exam.K, PATCH["n"]
RANGES = {  # guessed: none of these is measured for knots
    "H": (0.3, 0.8),  # the latch: how far below its recruitment input a unit keeps firing (fivefold amplification ~ 0.8)
    "tau_M": (10.0, 120.0),  # s: monoamine facilitation following stress
    "k_w": (0.0, 1.0),  # warm-up: how much repeated activation deepens the latch
    "tau_w": (30.0, 300.0),  # s
    "spread": (0.2, 0.6),  # the spread of recruitment thresholds (log)
    "hold": (0.4, 0.7),  # the holding stress (the shared interface's range)
    "breath_fall": (0.05, 0.3),  # how much an out-breath lowers stress (shared interface)
    "breath_calm": (0.05, 0.3),  # how much minutes of slow breathing calm (shared interface)
    "press_in": (0.2, 1.0),  # a hand's afferent input, in units of the typical threshold
    "inhibit_after": (2.0, 20.0),  # s: in the excite-then-inhibit variant, when a held hand turns to inhibiting
    "focus": (0.1, 0.6),  # focused inhibition at the attended place, in units of the typical threshold
    "pool": (0.0, 0.5),  # pooled variant: how much the pool's drive rises per unit of lost force (as a share)
}
X = qmc.scale(qmc.Sobol(len(RANGES), seed=exam.SEED).random(K), [r[0] for r in RANGES.values()],
              [r[1] for r in RANGES.values()])
S = {k: np.repeat(X[:, i], N) for i, k in enumerate(RANGES)}
z = np.random.default_rng(29).normal(0, 1, N)
theta = np.exp(S["spread"] * np.tile(z, K))  # recruitment thresholds, median 1
zone = np.tile(PATCH["zone"], K)
near = np.tile(PATCH["near"], K)
pos = PATCH["pos"]
TAU_CALM = 120.0
# Rolled: the places nearest the patch's middle, where the typical place's share is (not the spot, whose units the
# holding stress already drives)
ROLLED = np.tile(((pos - 0.5) ** 2).sum(axis=1) < 0.16**2, K)

# The scale by the shared rule: the typical place (median threshold, median share) recruited by the surge (stress 1, M
# reaching 1 - e^-180/tau_M) and kept by the holding stress, not recruited by it alone: sqrt of the window's ends.
Mq = 1 - np.exp(-(SURGE[1] - SURGE[0]) / S["tau_M"])
zmed = float(np.median(PATCH["zone"]))
lo = np.maximum(1.0 / zmed, (1 - S["H"] * S["hold"]) / (S["hold"] * zmed))  # recruited by the surge; kept at the hold
hi = 1.0 / (S["hold"] * zmed)  # not recruited by the hold alone
U = np.sqrt(lo * np.maximum(hi, lo * 1.0001))


def run(kind: str, variant: str, press_sign: str = "excite", duration: float = T0 + 600.0, dt: float = 0.1) -> dict:
    """One trial for every setting at once. Returns time, which units fire, and the pool's drive."""
    n = K * N
    on = np.zeros(n, bool)
    w = np.zeros(n)
    M = np.zeros(n)
    comp = np.zeros(n)  # the pool's added drive
    ts, ons, latched = [], [], []
    base_force = None
    for i in range(int(round(duration / dt))):
        t = i * dt
        if kind == "roll":
            s = S["hold"]
        else:
            s = np.zeros(n) if t < SURGE[0] else (np.ones(n) if t < SURGE[1] else S["hold"])
        breathing = kind in ("broad", "focused", "press") and t >= T0
        if breathing:
            wv = float(breath_wave(np.array([t - T0]))[0])
            s = s + S["breath_fall"] * (0.3 * max(wv, 0.0) + min(wv, 0.0)) - calm(t - T0, S["breath_calm"], TAU_CALM)
        M = M + dt * (np.clip(s, 0, None) - M) / S["tau_M"]
        drive = s * zone * U + comp
        # the hand, at the spot (the press) or at a place (rolling)
        hand = np.zeros(n)
        if kind == "press" and T0 <= t < T0 + PRESS_FOR:
            held_for = t - T0
            sign = np.where((press_sign == "excite") | (held_for < S["inhibit_after"]), 1.0, -1.0)
            hand = np.where(near, sign * S["press_in"], 0.0)
        if kind == "roll" and T0 <= t < T0 + 180.0 and (t - T0) % 3.0 < 1.0:
            hand = np.where(ROLLED, S["press_in"], 0.0)
        focus = np.zeros(n)
        if kind == "focused" and t >= T0 + exam.PREP and variant == "aimed":
            focus = np.where(near, S["focus"], 0.0)
        I = drive + hand - focus
        off_at = theta * (1 - S["H"] * np.clip(M, 0, 1) * (1 + S["k_w"] * w))
        on = np.where(on, I > off_at, I > theta)
        w = w + dt * (on - w) / S["tau_w"]
        if variant == "pooled":
            force = on.reshape(K, N).sum(axis=1).astype(float)
            if base_force is None and t >= T0:
                base_force = force.copy()
            if base_force is not None:
                lost = np.clip(base_force - force, 0, None) / np.maximum(base_force, 1)
                comp = np.repeat(S["pool"][::N] * lost, N) * U
        if i % 10 == 0:
            ts.append(t)
            ons.append(on.copy())
            latched.append(on & (drive - focus < theta))  # on only by the latch: without it, silent
    return {"t": np.array(ts), "on": np.array(ons), "knot": np.array(latched)}


def at(r, t, key="knot"):
    return r[key][min(int(np.searchsorted(r["t"], t)), len(r["t"]) - 1)]


def share(x):
    return f"{100 * np.mean(x):3.0f}%"


for variant in ("plain", "aimed", "pooled"):
    print(f"\n== {variant}")
    held = run("hold", variant, duration=T0 + 5.0)
    k0 = at(held, T0)
    per = k0.reshape(K, N).sum(axis=1)
    alone = run("roll", variant, duration=T0 + 1.0)  # the holding stress alone, no surge, no hand
    print(f"knots held at T0: median {int(np.median(per))} of {N} per setting (none in {share(per == 0)} of settings);"
          f" by the holding stress alone: {int(np.median(at(alone, T0).reshape(K, N).sum(axis=1)))}")
    first_on = np.where(held["on"].any(axis=0), held["t"][np.argmax(held["on"], axis=0)], np.nan)
    print(f"  recruited {np.nanmedian(first_on - SURGE[0]):.1f} s (median) after the surge began")
    b = run("broad", variant, duration=T0 + exam.PREP + 5.0)
    gone = k0 & ~at(b, T0 + exam.PREP)
    rel = np.where(k0, np.nan, np.nan)
    for j in np.flatnonzero(k0):
        off = np.flatnonzero((b["t"] >= T0) & ~b["on"][:, j])
        rel[j] = b["t"][off[0]] - T0 if len(off) else np.nan
    depth = np.where(k0, zone * U / theta, np.nan)  # a knot's depth: its input over its threshold
    ok = k0 & np.isfinite(rel)
    rho = np.corrcoef(depth[ok], rel[ok])[0, 1] if ok.sum() > 3 else np.nan
    print(f"  30 broad breaths: {share(gone[k0])} of knots let go, the first after {np.nanmin(rel):.0f} s;"
          f" median {np.nanmedian(rel):.0f} s; knots that go later are {'deeper' if rho > 0 else 'shallower'} (r = {rho:.2f})")
    if variant == "aimed":
        f = run("focused", variant, duration=T0 + 2 * exam.PREP + 5.0)
        left = at(f, T0 + exam.PREP) & near
        went = left & ~at(f, T0 + 2 * exam.PREP)
        print(f"  then 30 focused breaths: {share(went[left])} of the knots left at the spot let go"
              f" ({left.sum()} were left)")
    for sign in ("excite", "excite-then-inhibit"):
        pr = run("press", variant, press_sign=sign, duration=T0 + PRESS_FOR + 60.0)
        kn = k0 & near
        under = kn & ~at(pr, T0 + PRESS_FOR - 0.5)
        lift = kn & at(pr, T0 + PRESS_FOR - 0.5) & ~at(pr, T0 + PRESS_FOR + 5.0)
        print(f"  press ({sign}): of {kn.sum()} knots at the spot, {share(under[kn])} let go under the hand,"
              f" {share(lift[kn])} within 5 s of the lift")
        if variant == "pooled":
            new = near & ~k0 & at(pr, T0 + PRESS_FOR + 30.0)
            nb = ~near & ~k0 & at(pr, T0 + PRESS_FOR + 30.0)
            print(f"    after it: a unit not held before is on at the spot in {share(new.reshape(K, N).any(axis=1))}"
                  f" of settings, elsewhere in {share(nb.reshape(K, N).any(axis=1))}")
    ro = run("roll", variant, duration=T0 + 240.0)
    fresh = ROLLED & ~at(ro, T0) & ~at(ro, T0, "on")
    came = fresh & at(ro, T0 + 180.0 - 1.5)  # between passes: on by the latch, not by the hand
    stays = fresh & at(ro, T0 + 240.0)
    t_on = np.full(K * N, np.nan)
    for j in np.flatnonzero(stays):
        on_ = np.flatnonzero((ro["t"] >= T0) & ro["knot"][:, j])
        t_on[j] = ro["t"][on_[0]] - T0 if len(on_) else np.nan
    per = stays.reshape(K, N).sum(axis=1)
    print(f"  rolling 3 min at a place with no knot: knots still there a minute after in {share(per > 0)} of settings"
          f" (median {np.nanmedian(t_on) if np.isfinite(t_on).any() else float('nan'):.0f} s into the rolling when they"
          f" first latched; {int(fresh.reshape(K, N).sum(axis=1).mean())} silent units under the hand per setting)")
