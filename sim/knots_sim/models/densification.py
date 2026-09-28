"""T4, fascial densification, as the gliding layer's thixotropy (params/densification.yaml): the loose layer between the
fasciae rebuilds a structure at rest and loses it under shear, and its viscosity rises steeply with that structure.
Coussot's model of thixotropic, yield-stress materials (coussot2002), with a cap on how much structure builds:

    θ dx/dt = (1 − x / x_max) − u e^{β ΔT} x / (1 + xⁿ)

x: the structure (0: broken, a liquid; x_max: fully built). u: the shear the layer is under, from movement, the breath's
movement and a roller, in units that make the rebuilding 1 (dimensionless). ΔT: how much warmer the layer is than usual;
warmth thins it (β, cowman2015). The sliding it allows is u e^{β ΔT} / (1 + xⁿ).

With n > 1, between two drives u_c < u < u_j both states are stable: a fluid layer stays fluid under ordinary movement,
and a jammed patch stays jammed under it. Below u_c a still layer builds until it jams; above u_j a jammed patch gives
way, slowly and then all at once (coussot2002: the viscosity bifurcation, and avalanches). A knot is a jammed patch:
one past the fold of the jammed branch (x > x_j), where the layers have stopped gliding.
"""

from __future__ import annotations

import numpy as np


def curve(n, x_max, x):
    """The drive at which structure x is steady: u(x) = (1 − x/x_max)(1 + xⁿ)/x."""
    return (1 - x / x_max) * (1 + x**n) / x


def band(n: float, x_max: float) -> tuple[float, float, float, float]:
    """(u_c, u_j, x_c, x_j): the band's edges (the curve's local minimum and maximum) and the structures there. Below u_c
    only the jammed state exists; above u_j only the fluid one."""
    x = np.geomspace(1e-3, x_max * 0.999, 4000)
    u = curve(n, x_max, x)
    d = np.diff(u)  # the local minimum, then the local maximum after it
    mins = np.flatnonzero((d[:-1] < 0) & (d[1:] >= 0)) + 1
    maxs = np.flatnonzero((d[:-1] > 0) & (d[1:] <= 0)) + 1
    if not len(mins) or not len(maxs):
        return float("nan"), float("nan"), float("nan"), float("nan")
    i, j = int(mins[0]), int(maxs[maxs > mins[0]][0])
    return float(u[i]), float(u[j]), float(x[i]), float(x[j])


def step(P: dict, x, u, dT, dt: float):
    """One step, linearly implicit in x (stable and positive at any step): P holds theta, x_max, steep, warm_coeff."""
    k = dt / P["theta"]
    return (x + k) / (1 + k * (1 / P["x_max"] + u * np.exp(P["warm_coeff"] * dT) / (1 + x ** P["steep"])))


def sliding(P: dict, x, u, dT=0.0):
    """How fast the layers slide over each other, in the drive's units."""
    return u * np.exp(P["warm_coeff"] * dT) / (1 + x ** P["steep"])


def steady(n: float, x_max: float, u: float) -> list[float]:
    """The steady structures at drive u (one or three), from low to high."""
    x = np.geomspace(1e-4, x_max * 0.9999, 20000)
    f = curve(n, x_max, x) - u
    s = np.flatnonzero(np.sign(f[:-1]) != np.sign(f[1:]))
    return [float(x[i]) for i in s]
