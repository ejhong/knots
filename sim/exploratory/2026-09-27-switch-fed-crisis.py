"""The switch feeds the crisis (H2): can a shut perforator make the bump, and its reopening let it go? (exploratory, kept as run)

The author (27 Sep 2026): a knot can be felt, from a grain to a penny, and "The knot seems to let go and disappear"; "foam
rolling or palpating can bring it out at least over minutes". Only trigger points (T3) build a bump in; the vessel view
(T1) says what holds and releases, not what the hand feels. This couples the two models as they are, one way: a
perforator (models/vessel.py, the matrix's single knot in t1.py) feeds a unit of the muscle or fascia beneath it
(models/triggerpoint.py) through its flow. The unit is an ordinary one: its baseline drive is a fraction f of the foot of
its own band at the holding stress, so with its full supply it cannot hold a contracture (it is no trigger point on its
own). Its supply is its own vessel's flow, relative to that flow at resting tone, for a share s_own of it (guessed: each
perforasome is linked to its neighbours', saintcyr2009), and its neighbours' for the rest. Stress drives both: the vessel's
tone and the unit's motor drive. The interface (stress, press, breath) is T1's for both.

Per setting (the exam's 32 of each, paired by index) and knot depth, four trials:
- hold: the surge shuts the vessel and the holding stress keeps it; does the unit contract (the bump), how soon, and does
  it last twenty minutes?
- press: then a minute's press with slow breaths, lifted; when the vessel reopens, how long until the bump goes?
- breath: then thirty slow breaths (the breath through drive); the same.
- roll: no surge; a vessel held in its band but open, rolled (the press for 1 s in every 3) for three minutes, then left;
  does it shut, and does a bump come out, and when?
Beside each, the same unit with its full supply (s_own = 0): does the surge alone make its bump? It should not, so a bump
is the vessel's doing.

    uv run python exploratory/2026-09-27-switch-fed-crisis.py
"""

import numpy as np

from knots_sim import exam
from knots_sim.models import triggerpoint as tp
from knots_sim.models import vessel as v
from knots_sim.params import values
from knots_sim.theories import t1, t3

K = exam.K
DEPTHS = (0.1, 0.4, 0.7)
FRACTION = (0.6, 0.9)  # the unit's drive, as a share of the foot of its band: an ordinary unit
OWN = (0.3, 0.6, 1.0)
T0, LIFT, PERIOD = exam.T0, exam.T0 + exam.PRESS_FOR, exam.PERIOD
ROLL = (T0, T0 + 180.0)

ps1 = t1.sample(K, exam.SEED)
ps3 = t3.sample(K, exam.SEED)
for p1, p3 in zip(ps1, ps3):  # one interface for both: T1's stress, press and breath
    for k in values("interface"):
        p3[k] = p1[k]
for p3, k in zip(ps3, tp.press_rates(ps3)):
    p3["press_rate"] = float(k)

D = len(DEPTHS)
rep = [p for p in ps1 for _ in DEPTHS]
cal = [v.calibrate(p) for p in ps1]
urest = np.repeat([c.urest for c in cal], D)
Aopen, Afold = np.repeat([c.Aopen for c in cal], D), np.repeat([c.Afold for c in cal], D)
bist = np.repeat([c.bistable for c in cal], D)
hold = Aopen + np.tile(DEPTHS, K) * (Afold - Aopen)
U = np.repeat(t1.units(ps1), D)
vec = lambda key: t1._vec(ps1, key, D)
fall, calm_by, calm_tau, in_share = vec("breath_fall") * U, vec("breath_calm") * U, vec("tau_calm"), vec("breath_in_share")
palp, strain = vec("palpation"), vec("press_strain")
stress_hold = vec("hold")
pars = t1._pars(rep)
zeros = np.zeros(K * D)


def vessel(kind: str) -> dict:
    """The perforator: its radius over time, from the matrix's single knot (t1.single's inputs), by trial."""
    duration = {"hold": T0 + 1200.0, "press": T0 + 180.0, "breath": T0 + 300.0, "roll": ROLL[1] + 180.0}[kind]

    def inputs(t):
        if kind != "roll" and t < exam.SURGE[0]:
            return urest, zeros, zeros
        if kind != "roll" and t < exam.SURGE[1]:
            return np.clip(Afold + 0.03, 0, 1), zeros, zeros
        if t < T0 or kind == "hold":
            return hold, zeros, zeros
        if kind == "roll":
            on = ROLL[0] <= t < ROLL[1] and (t - ROLL[0]) % 3.0 < 1.0
            return hold, (palp if on else zeros), (strain if on else zeros)
        du, mv = t1._breath(t - T0, True, False, fall, in_share, zeros, calm_by, calm_tau)
        pe = zeros
        if kind == "press" and t < LIFT:
            pe, mv = palp, np.maximum(mv, strain)
        return np.clip(hold + du, 0, 1), pe, np.clip(mv + zeros, 0, 1)

    r = t1._run(pars, urest, inputs, duration, keep_n=False)
    x = r["x"].astype(float)
    shut = (x < t1.SHUT * pars["xc"]) & bist
    flow = (x / pars["xrest"]) ** 4
    rest = flow[np.searchsorted(r["t"], exam.SURGE[0] - 1.0)]  # at resting tone, open
    return {"t": r["t"], "shut": shut, "supply": np.clip(flow / np.maximum(rest, 1e-9), 0, 1), "duration": duration}


def unit(kind: str, ves: dict, f: float, own: float) -> dict:
    """The unit beneath it: its contracture over time, supplied by the vessel for a share `own`."""
    P = t3._P(ps3, D)
    a0 = np.zeros(K * D)
    for k, p in enumerate(ps3):
        b = tp.band(p, p["hold"])
        a0[k * D:(k + 1) * D] = f * b[0] if b else 0.0
    t_v, supply = ves["t"], ves["supply"]

    def inputs(t, st):
        i = min(int(np.searchsorted(t_v, t)), len(t_v) - 1)
        q_in = own * supply[i] + (1 - own)
        if kind == "roll":
            s = P["hold"]
            pressing = ROLL[0] <= t < ROLL[1] and (t - ROLL[0]) % 3.0 < 1.0
        else:
            s = np.zeros(K * D) if t < exam.SURGE[0] else (np.ones(K * D) if t < exam.SURGE[1] else P["hold"])
            if kind in ("press", "breath") and t >= T0:  # the breath relaxes motor drive too, as in T3's own breath
                s = s + t3._breath(t - T0, False, P)[0]
            pressing = kind == "press" and T0 <= t < LIFT
        press = np.where(pressing, P["palpation"], 0.0)
        return s, np.zeros(K * D), press, np.ones(K * D), P["occlude"] * (1 - q_in)

    st = tp.State(c=np.zeros(K * D), e=np.ones(K * D), m=np.zeros(K * D))
    r = tp.simulate(P, a0, inputs, ves["duration"], dt=0.05, every=20, state=st)
    return {"t": r["t"], "held": r["c"] > tp.HELD, "ok": a0 > 0}


def first(t, mask, after):
    """Per unit, the first time at or after `after` where mask holds (nan if never)."""
    m = mask & (t >= after)[:, None]
    return np.where(m.any(axis=0), t[np.argmax(m, axis=0)], np.nan)


def pct(x):
    return f"{100 * np.nanmean(x):3.0f}%" if np.isfinite(np.nanmean(x)) else "  - "


def med(x):
    x = x[np.isfinite(x)]
    return f"{np.median(x):6.0f} s" if len(x) else "     - "


runs = {kind: vessel(kind) for kind in ("hold", "press", "breath", "roll")}
held0 = runs["hold"]["shut"][np.searchsorted(runs["hold"]["t"], T0) - 1]
print(f"vessels shut by the surge and held at T0: {held0.sum()} of {K * D}", flush=True)
for f in FRACTION:
    for own in OWN:
        rows = []
        # the control: the same unit with its full supply
        ctrl = unit("hold", runs["hold"], f, 0.0)
        ctrl_bump = ctrl["held"][np.searchsorted(ctrl["t"], T0) - 1]
        u = unit("hold", runs["hold"], f, own)
        tv, uv = runs["hold"]["t"], u["t"]
        shut_at = first(tv, runs["hold"]["shut"], exam.SURGE[0])
        bump_at = first(uv, u["held"], exam.SURGE[0])
        ok = held0 & u["ok"]
        bumped = ok & np.isfinite(bump_at)
        lasts = u["held"][-1] & ok
        line = (f"f {f:.1f} own {own:.1f}: bump in {pct(np.where(ok, np.isfinite(bump_at), np.nan))} of held knots "
                f"({pct(np.where(u['ok'], ctrl_bump, np.nan))} with full supply), {med(np.where(bumped, bump_at - shut_at, np.nan))} after "
                f"the vessel shut; lasts 20 min in {pct(np.where(bumped, lasts, np.nan))}")
        for kind in ("press", "breath"):
            ves, un = runs[kind], unit(kind, runs[kind], f, own)
            had = un["held"][np.searchsorted(un["t"], T0) - 1] & held0 & un["ok"]
            opened = first(ves["t"], ~ves["shut"], T0)
            gone = first(un["t"], ~un["held"], T0)
            lag = np.where(had & np.isfinite(opened) & np.isfinite(gone), gone - opened, np.nan)
            stays = had & np.isfinite(opened) & un["held"][-1]
            line += (f" | {kind}: bump goes in {pct(np.where(had & np.isfinite(opened), np.isfinite(gone), np.nan))} of vessels that opened,"
                     f" {med(lag)} after the flow; stays in {pct(np.where(had & np.isfinite(opened), stays, np.nan))}")
        ves, un = runs["roll"], unit("roll", runs["roll"], f, own)
        open0 = ~ves["shut"][np.searchsorted(ves["t"], ROLL[0]) - 1] & bist & un["ok"]
        vshut = first(ves["t"], ves["shut"], ROLL[0])
        vend = ves["shut"][-1]
        bump = first(un["t"], un["held"], ROLL[0])
        line += (f" | roll: vessel shut by {pct(np.where(open0, np.isfinite(vshut), np.nan))}, still shut after {pct(np.where(open0, vend, np.nan))};"
                 f" bump out in {pct(np.where(open0, np.isfinite(bump), np.nan))}, {med(np.where(open0, bump - ROLL[0], np.nan))} into the rolling;"
                 f" there after in {pct(np.where(open0, un['held'][-1], np.nan))}")
        print(line, flush=True)
