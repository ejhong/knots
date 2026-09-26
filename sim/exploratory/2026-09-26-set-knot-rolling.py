"""Exploratory: can breath movement, or a roller's squeezes, free a set knot at resting tone? (not published)"""
import numpy as np
from knots_sim import adapt as a
from knots_sim.models import vessel as v

p = v.params()
s0 = v.calibrate(p)
urest = s0.urest
V = a.Vessel(a.params(fitted=False))
dt = 0.01

def trial(lo, kind, amp, seconds=120.0):
    q = p | {"lo": lo}
    t = np.arange(0, seconds, dt)
    u = np.full(len(t), urest)
    pext = np.zeros(len(t))
    mv = np.zeros(len(t))
    if kind == "breath":
        mv = amp * (1 + v.breath_wave(t)) / 2
    elif kind == "roll":  # one pass a second for 30 s: a 0.5 s squeeze (pressed shut, deformed by amp), 0.5 s free
        on = (t < 30) & (np.mod(t, 1.0) < 0.5)
        pext[on] = 600.0
        mv[on] = amp
    y0 = np.array([p["xc"], urest, 1 - p["collateral"], 0, 0, 0, 0, 0])
    y = v.rk4(q, np.stack([u, pext, mv], 1), dt, y0)
    opened = np.flatnonzero((y[:, 0] > 1.5 * p["xc"]) & (pext == 0))
    return (t[opened[0]] if len(opened) else None), float(y[:, 7].max())

for lo, name in ((a.lo_after(V, 4 * urest, 2 * 3600), "just set (2 h)"), (a.lo_after(V, 4 * urest, 24 * 3600), "fully set (24 h)")):
    print(f"{name}: lo={lo:.3f}, reopens below {V.aopen(lo) / urest:.2f}x rest")
    for amp in (0.25, 0.5, 1.0):
        tb, zb = trial(lo, "breath", amp)
        tr, zr = trial(lo, "roll", amp)
        fmt = lambda x: "stays" if x is None else f"opens at {x:.0f} s"
        print(f"  deformation {amp:.2f}: breath {fmt(tb)} (max loosening {zb:.2f}); roller {fmt(tr)} (max loosening {zr:.2f})")
