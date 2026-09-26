"""Exploratory only. Eight sibling perforators on one feed artery (walls 0.25-0.35, so each has its own band), coupled by the
pressure they share. One knot forms by a LOCAL surge at a strong vessel (#1); everyone else sits at a raised drive u_m.
At 100-140 s the knot is pressed, then released. Does a neighbour shut in its place?"""
import numpy as np
from knots_sim.models import vessel as v
from knots_sim.scenarios import SHUT

rhs, _ = v.numeric(); base = v.params()
PS, PV, RP, RD = 90.0, 20.0, 1.0, 1.0

def run(u_m, K=1, walls=None, dur=260.0, dt=0.02, root=None, conduct=0.0, press=True):
    walls = walls or [0.25 + 0.1 * i / 7 for i in range(8)]
    N = len(walls); ps = [base | {"wall": w} for w in walls]
    for p in ps: p["xrest"] = v.calibrate(p).xrest
    urest = v.calibrate(ps[0]).urest
    R0 = (PS - 60) * (RP + RD) / ((60 - PV) * N)
    ys = [list(v.rest_state(p)) for p in ps]; prev = [False] * N; log = []; t = 0.0; Pns = []
    while t < dur:
        r0 = R0 * (root if (root and t >= 100) else 1.0)
        G = [1.0 / (RP * (p["xrest"] / max(y[0], 1e-3)) ** 4 + RD) for p, y in zip(ps, ys)]
        Pn = (PS / r0 + PV * sum(G)) / (1 / r0 + sum(G)); Pns.append(Pn)
        shut = [y[0] < SHUT * p["xc"] for p, y in zip(ps, ys)]
        log += [(round(t, 1), i, "shut" if shut[i] else "open") for i in range(N) if shut[i] != prev[i]]; prev = shut
        ns = [y[3] for y in ys]; new = []
        for i, (p, y) in enumerate(zip(ps, ys)):
            u = urest if t < 10 else u_m
            if i == K and 10 <= t < 30: u = 0.6                      # a local surge shuts this one
            pe = p["P"] + 10 if (press and i == K and 100 <= t < 140) else 0.0
            pv = v.vector(p | {"P": Pn})
            cn = conduct * max([n for j, n in enumerate(ns) if j != i] or [0.0])
            def f(yy):
                d = rhs(yy, (u, pe), pv)
                if cn > 0:
                    ye = list(yy); ye[3] = 1 - (1 - yy[3]) * (1 - cn); d[0] = rhs(ye, (u, pe), pv)[0]
                return d
            k1 = f(y); k2 = f([a + dt/2*b for a, b in zip(y, k1)]); k3 = f([a + dt/2*b for a, b in zip(y, k2)]); k4 = f([a + dt*b for a, b in zip(y, k3)])
            y = [a + dt/6*(b + 2*c + 2*d + e) for a, b, c, d, e in zip(y, k1, k2, k3, k4)]
            y[0] = max(y[0], p["xc"]); y[1:] = [min(max(a, 0.0), 1.0) for a in y[1:]]; new.append(y)
        ys = new; t += dt
    return log, Pns

if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "press"
    for u_m in [float(x) for x in sys.argv[2:]] or (0.30, 0.32, 0.33, 0.34, 0.345, 0.35):
        kw = {"press": mode == "press", "root": 0.5 if mode == "root" else None, "conduct": 0.4 if mode == "conduct" else 0.0}
        log, Pns = run(u_m, **kw)
        before = {}
        for tt, i, s in log:
            if tt < 100: before[i] = s
        knots = sorted(i for i, s in before.items() if s == "shut")
        after = [f"#{i} {s} {tt:.0f}s" for tt, i, s in log if tt >= 100]
        print(f"{mode:7} u_m {u_m:.3f}  knots at 100 s: {knots}  node {Pns[int(99/0.02)]:.1f} mmHg  after: {', '.join(after) or 'no change'}", flush=True)
