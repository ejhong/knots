"""Exploratory only. Sibling perforators on one feed artery; each a vessel switch with its own wall; coupled by the pressure
they share (and, as a variant, by conducted dilation). A surge of stress shuts some; stress falls back but stays raised; then
one knot is pressed and released, or the root (the feed artery) eases. Who changes state?"""
import numpy as np
from knots_sim.models import vessel as v
from knots_sim.scenarios import SHUT

rhs, _ = v.numeric()
base = v.params()
PS, PV, RP, RD = 90.0, 20.0, 1.0, 1.0   # guessed tree: node at 60 mmHg with every branch at rest

def run(walls, u_s, u_m, act="press", conduct=0.0, dur=300.0, dt=0.02, t_act=100.0):
    N = len(walls)
    ps = [base | {"wall": w} for w in walls]
    for p in ps: p["xrest"] = v.calibrate(p).xrest
    R0 = (PS - 60) * (RP + RD) / ((60 - PV) * N)
    ys = [list(v.rest_state(p)) for p in ps]
    target = None; log = []; prev = [False] * N; Pn_hist = []
    t = 0.0; k = 0
    while t < dur:
        u = base_u = ps[0]["xrest"] * 0 + (v.calibrate(ps[0]).urest if t < 10 else (u_s if t < 30 else u_m))
        r0 = R0 * (0.5 if (act == "root" and t >= t_act) else 1.0)
        G = [1.0 / (RP * (p["xrest"] / max(y[0], 1e-3)) ** 4 + RD) for p, y in zip(ps, ys)]
        Pn = (PS / r0 + PV * sum(G)) / (1 / r0 + sum(G)); Pn_hist.append(Pn)
        shut = [y[0] < SHUT * p["xc"] for p, y in zip(ps, ys)]
        if act == "press" and target is None and t >= t_act:
            cands = [i for i in range(N) if shut[i]]
            target = cands[len(cands) // 2] if cands else -1
        for i in range(N):
            if shut[i] != prev[i]: log.append((round(t, 1), i, "shut" if shut[i] else "open"))
        prev = shut
        ns = [y[3] for y in ys]
        new = []
        for i, (p, y) in enumerate(zip(ps, ys)):
            pe = p["P"] + 10 if (act == "press" and i == target and t_act <= t < t_act + 40) else 0.0
            pv = v.vector(p | {"P": Pn})
            cn = conduct * max([n for j, n in enumerate(ns) if j != i] or [0.0])
            def f(yy):
                d = rhs(yy, (u, pe), pv)
                if cn > 0:
                    ye = list(yy); ye[3] = 1 - (1 - yy[3]) * (1 - cn); d[0] = rhs(ye, (u, pe), pv)[0]
                return d
            k1 = f(y); k2 = f([a + dt/2*b for a, b in zip(y, k1)]); k3 = f([a + dt/2*b for a, b in zip(y, k2)]); k4 = f([a + dt*b for a, b in zip(y, k3)])
            y = [a + dt/6*(b + 2*c + 2*d + e) for a, b, c, d, e in zip(y, k1, k2, k3, k4)]
            y[0] = max(y[0], p["xc"]); y[1:] = [min(max(a, 0.0), 1.0) for a in y[1:]]
            new.append(y)
        ys = new; t += dt; k += 1
    return log, target, Pn_hist

if __name__ == "__main__":
    import sys
    walls = [0.25 + 0.1 * i / 7 for i in range(8)]
    for p_ in [base | {"wall": w} for w in walls]:
        s = v.calibrate(p_); print(f"wall {p_['wall']:.3f}: Aopen {s.Aopen:.3f} Afold {s.Afold:.3f}")
    for act, conduct in (("press", 0.0), ("press", 0.4), ("root", 0.0)):
        for u_m in (0.30, 0.40, 0.46, 0.50):
            log, target, Pn = run(walls, u_s=0.52, u_m=u_m, act=act, conduct=conduct)
            before = [e for e in log if e[0] < 100]
            after = [e for e in log if e[0] >= 100]
            shut_before = sorted({e[1] for e in before if e[2] == "shut"} - {e[1] for e in before if e[2] == "open" and e[0] > max([b[0] for b in before if b[1] == e[1] and b[2] == "shut"] or [0])})
            print(f"{act:5} conduct {conduct} u_m {u_m:.2f}  knots before: {sum(1 for i in range(8) if any(e[1]==i and e[2]=='shut' for e in before) and not any(e[1]==i and e[2]=='open' and e[0]>max(b[0] for b in before if b[1]==i and b[2]=='shut') for e in before))}"
                  f"  pressed #{target}  after 100 s: " + (", ".join(f"#{i} {s} {tt:.0f}s" for tt, i, s in after) or "no change"))
