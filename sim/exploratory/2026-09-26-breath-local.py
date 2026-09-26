"""Exploratory only. (1) Does how fast tone fades decide one breath vs many? (2) A local channel acting on the wall
itself (z lowers active tension directly: a local dilator, or stretch lowering the muscle's force), on each out-breath."""
import numpy as np
from knots_sim.models import vessel as v
from knots_sim.scenarios import SHUT

dt, T0, DUR = 0.02, 40.0, 400.0
t = np.arange(0, DUR, dt); w = v.breath_wave(t); on = t >= T0
depths = [0.01, 0.05, 0.1, 0.2, 0.35, 0.65]

def rk4z(p, u, z, dt):
    rhs, _ = v.numeric(); pv = v.vector(p); xc = p["xc"]
    y = [float(a) for a in v.rest_state(p)]; xs = np.empty(len(u))
    def f(y, ui, zi):
        d = rhs(y, ui, pv)
        if zi > 0:  # the wall's active tension scaled by (1 - z): n_eff = 1 - (1 - n)(1 - z), used for dx only
            ye = list(y); ye[3] = 1 - (1 - y[3]) * (1 - zi); d[0] = rhs(ye, ui, pv)[0]
        return d
    for i in range(len(u)):
        xs[i] = y[0]; ui = (u[i, 0], u[i, 1]); zi = z[i]
        k1 = f(y, ui, zi); k2 = f([a + dt/2*b for a, b in zip(y, k1)], ui, zi)
        k3 = f([a + dt/2*b for a, b in zip(y, k2)], ui, zi); k4 = f([a + dt*b for a, b in zip(y, k3)], ui, zi)
        y = [a + dt/6*(b + 2*c + 2*d + e) for a, b, c, d, e in zip(y, k1, k2, k3, k4)]
        y[0] = max(y[0], xc); y[1:] = [min(max(a, 0.0), 1.0) for a in y[1:]]
    return xs

def probe(p, depth, breath="none", amp=0.0, z_amp=0.0, z_tau=0.0):
    s = v.calibrate(p); band = s.Afold - s.Aopen
    u = np.full(len(t), s.urest); u[t >= 10] = s.Afold + 0.03; u[t >= T0] = s.Aopen + depth * band
    if breath == "relaxing": u[on] += amp * np.minimum(w, 0)[on]
    drive = np.where(on, np.maximum(-w, 0), 0.0) * z_amp   # local effect on each out-breath
    z = drive.copy()
    if z_tau > 0:                                          # lagged, like the sensory nerves (fitted 4.6 s)
        for i in range(1, len(z)): z[i] = z[i-1] + dt * (drive[i] - z[i-1]) / z_tau
    x = rk4z(p, np.stack([np.clip(u, 0, 1), np.zeros(len(t))], 1), z, dt)
    assert x[int(T0/dt) - 1] < SHUT * p["xc"]
    op = np.flatnonzero(on & (x >= SHUT * p["xc"]))
    return None if not len(op) else t[op[0]] - T0

def row(label, fn):
    print(f"{label:34}" + " ".join("holds " if (r := fn(d)) is None else f"{r:4.0f}s " for d in depths))

p = v.params()
print(" " * 34 + " ".join(f"{d:<5}" for d in depths))
print("(1) relaxing breath 0.06, tone fading with tau_down:")
for td in (14.3, 6.0, 3.0, 1.5):
    q = p | {"tau_down": td}
    row(f"    tau_down {td:>4} s", lambda d: probe(q, d, "relaxing", 0.06))
print("(2) local, on each out-breath (no change in drive):")
for za in (0.1, 0.2, 0.4):
    row(f"    wall force -{za:.0%} at once", lambda d: probe(p, d, z_amp=za))
for za in (0.2, 0.4):
    row(f"    wall force -{za:.0%} via nerve (4.6 s)", lambda d: probe(p, d, z_amp=za, z_tau=p['tau_nerve']))
