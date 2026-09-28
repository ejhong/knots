"""The senses (sim/PLAN.md §5): what a hand would feel, from what a theory's tissue does. The same rules for every theory.

A hand feels stiffness through skin and fat. A stiff region with half-sizes a_along and a_across (along and across the
fibres; as deep as it is wide) at depth d is felt over about √(a² + d²) along each axis, and more weakly the deeper it
lies: its stiffness contrast times (a/√(a² + d²)) along each of the three axes (the far field of a stiff inclusion in an
elastic half-space: (a/d)³ for a small lump, (a/d)² for a long band). Overlapping regions add. Divided by the least that
a hand can find (`touch`), 1 is the edge of touch. Numbers: params/senses.yaml, sampled across their ranges.
"""

from __future__ import annotations

import numpy as np
from scipy.stats import qmc

from ..params import load

SIGMA = 0.6  # the felt profile's spread, as a share of its width √(a² + d²): drawing and summing only


def sample(n: int, seed: int) -> list[dict]:
    """The senses' numbers in n settings (Sobol, their own draw, so each theory's own sampling is unchanged)."""
    t = load("senses")
    keys = tuple(t)
    X = qmc.Sobol(len(keys), seed=seed + 101).random(n)
    out = []
    for x in X:
        d = {}
        for k, u in zip(keys, x):
            lo, hi = t[k].range
            d[k] = float(np.exp(np.log(lo) + u * (np.log(hi) - np.log(lo)))) if lo > 0 and hi / lo > 4 else lo + u * (hi - lo)
        out.append(d)
    return out


def values() -> dict:
    return {k: p.value for k, p in load("senses").items()}


def fall(a, d):
    a = np.asarray(a, float)
    return a / np.sqrt(a * a + np.asarray(d, float) ** 2)


def felt(k, a_along, a_across, depth, touch):
    """How firmly a stiff region is felt at the surface above it, in units of the least a hand can find."""
    return np.asarray(k, float) * fall(a_along, depth) * fall(a_across, depth) ** 2 / touch


def widths(a_along, a_across, depth):
    """How wide it is felt, along and across the fibres (mm)."""
    d2 = np.asarray(depth, float) ** 2
    return np.sqrt(np.asarray(a_along, float) ** 2 + d2), np.sqrt(np.asarray(a_across, float) ** 2 + d2)


def field(points: np.ndarray, pos: np.ndarray, amp: np.ndarray, w_along: np.ndarray, w_across: np.ndarray) -> np.ndarray:
    """The felt firmness at surface points (P, 2) from units at pos (N, 2) with amplitudes amp (..., N): (..., P). The
    fibres run along x."""
    dx = (points[:, None, 0] - pos[None, :, 0]) / (SIGMA * w_along)
    dy = (points[:, None, 1] - pos[None, :, 1]) / (SIGMA * w_across)
    kern = np.exp(-0.5 * (dx * dx + dy * dy))  # (P, N)
    return np.asarray(amp) @ kern.T
