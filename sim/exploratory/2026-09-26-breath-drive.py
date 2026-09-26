"""Exploratory only: how many breaths does a knot of a given depth take, under different ways breath could act?"""
import numpy as np
from knots_sim.models import vessel as v
from knots_sim.scenarios import SHUT

p = v.params(); s = v.calibrate(p); band = s.Afold - s.Aopen
dt, T0, DUR = 0.02, 40.0, 400.0          # knot formed by t=40; breathing from t=40 to 400 (36 breaths)
t = np.arange(0, DUR, dt)
w = v.breath_wave(t)                      # +1 top of in-breath, -1 end of out-breath (4 s in, 6 s out)
on = t >= T0

def knot_inputs(depth):
    u = np.full(len(t), s.urest)
    u[t >= 10] = s.Afold + 0.03          # a surge shuts the vessel
    u[t >= T0] = s.Aopen + depth * band  # then stress falls back but stays raised: depth into the band
    return u

def released(u, pext):
    y = v.rk4(p, np.stack([np.clip(u, 0, 1), pext], 1), dt)
    x = y[:, 0]
    assert x[int(T0 / dt) - 1] < SHUT * p["xc"], "knot did not form"
    op = np.flatnonzero(on & (x >= SHUT * p["xc"]))
    return (t[op[0]] - T0) if len(op) else None

def variant(name, depth, amp):
    u, pe = knot_inputs(depth), np.zeros(len(t))
    if name == "even":        u[on] += amp * w[on]                    # drive swings both ways
    if name == "relaxing":    u[on] += amp * np.minimum(w, 0)[on]     # out-breath lowers, in-breath neutral
    if name == "settling":    u[on] -= amp * np.clip((t[on] - T0) / 60, 0, 1)  # drive eases over a minute and stays down
    if name == "local_press": pe[on] = amp * np.maximum(-w, 0)[on]    # tissue pressed on each out-breath (mmHg)
    return released(u, pe)

depths = [0.01, 0.05, 0.1, 0.2, 0.35, 0.65]
tests = [("even", 0.03), ("relaxing", 0.03), ("relaxing", 0.06), ("relaxing", 0.12),
         ("settling", 0.03), ("settling", 0.06), ("settling", 0.12),
         ("local_press", 10), ("local_press", 20), ("local_press", 40), ("local_press", 70)]
print(f"Aopen {s.Aopen:.3f}  Afold {s.Afold:.3f}  urest {s.urest:.3f}  band {band:.3f}")
print("variant/size        " + "".join(f"d={d:<8}" for d in depths))
for name, amp in tests:
    row = []
    for d in depths:
        r = variant(name, d, amp)
        row.append("holds   " if r is None else f"{r:5.0f}s  ")
    print(f"{name:12} {amp:<6} " + " ".join(row))
