"""Exploratory only. A parent vessel feeding four children (walls 0.25-0.35), each a vessel switch. Source 100 mmHg,
beds drain to 20 mmHg; resistances guessed so the children sit at 60 mmHg and the parent at 80 at rest.
A local surge shuts the parent; drive elsewhere is raised (u_m). At 100-140 s the parent is pressed, then released;
at 220 s drive falls to rest everywhere."""
import sys
from knots_sim.models import vessel as v
from knots_sim.scenarios import SHUT

rhs, _ = v.numeric(); base = v.params()
PS, PV, RPAR, RC = 100.0, 20.0, 0.5, 2.0

def run(u_m, dur=300.0, dt=0.02):
    walls = [0.25, 0.283, 0.317, 0.35]
    ps = [base] + [base | {"wall": w} for w in walls]      # 0 = parent
    for p in ps: p["xrest"] = v.calibrate(p).xrest
    urest = v.calibrate(base).urest
    ys = [list(v.rest_state(p)) for p in ps]; prev = [False] * 5; log = []; t = 0.0
    while t < dur:
        g = [1.0 / (R * (p["xrest"] / max(y[0], 1e-3)) ** 4) for R, p, y in zip([RPAR] + [RC] * 4, ps, ys)]
        Pn = (g[0] * PS + sum(g[1:]) * PV) / (g[0] + sum(g[1:]))
        Ps_ = [(PS + Pn) / 2] + [Pn] * 4
        shut = [y[0] < SHUT * p["xc"] for p, y in zip(ps, ys)]
        log += [(round(t, 1), i, "shut" if shut[i] else "open", round(Pn)) for i in range(5) if shut[i] != prev[i]]; prev = shut
        new = []
        for i, (p, y) in enumerate(zip(ps, ys)):
            u = urest if (t < 10 or t >= 220) else u_m
            if i == 0 and 10 <= t < 30: u = 0.7
            pe = p["P"] + 10 if (i == 0 and 100 <= t < 140) else 0.0
            pv = v.vector(p | {"P": Ps_[i]})
            f = lambda yy: rhs(yy, (u, pe), pv)
            k1 = f(y); k2 = f([a + dt/2*b for a, b in zip(y, k1)]); k3 = f([a + dt/2*b for a, b in zip(y, k2)]); k4 = f([a + dt*b for a, b in zip(y, k3)])
            y = [a + dt/6*(b + 2*c + 2*d + e) for a, b, c, d, e in zip(y, k1, k2, k3, k4)]
            y[0] = max(y[0], p["xc"]); y[1:] = [min(max(a, 0.0), 1.0) for a in y[1:]]; new.append(y)
        ys = new; t += dt
    return log

for u_m in [float(x) for x in sys.argv[1:]] or (0.26, 0.30, 0.34):
    log = run(u_m)
    name = lambda i: "parent" if i == 0 else f"child{i}"
    print(f"u_m {u_m:.2f}: " + "; ".join(f"{name(i)} {s} {tt:.0f}s (node {P} mmHg)" for tt, i, s, P in log), flush=True)
