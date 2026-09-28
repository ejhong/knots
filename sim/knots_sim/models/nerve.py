"""T5, peripheral nerve sensitivity, at nerves of the skin where they pierce the fascia (params/nerve.yaml). A sensitised
segment, left by a neuritis and lasting weeks (dilley2005, dilley2008), fires when it is pressed, and, like injured
nerves, when the sympathetic drive rises, after a delay of about fourteen seconds (devor1994). Per site j:

    σ_j(t):  the sympathetic drive as it reaches the site: the stress t_d seconds before, through a first-order rise
             (τ_up) and fall (τ_down)
    F_j = S_j (f₀ + A (φ σ_j + (1 − φ) s z_j)) + S_j a_p p / 40

S_j its sensitivity (log-normal across sites), s the shared stress, z_j its share of it (the muscle's load around it, at
once), p a hand's pressure (mmHg). A is set by the shared rule: the typical site, where stress is held most, is felt
(F = 1) from s_on times the holding stress. A knot is a site felt without touch (its firing, less what a press adds,
above 1). Nothing here is a switch: the sensitivity lasts weeks, and what is felt follows its drive.
"""

from __future__ import annotations

import numpy as np


class Delay:
    """The input t_d seconds ago, per setting (t_d per setting), from a ring of past inputs sampled every dt."""

    def __init__(self, delays: np.ndarray, shape: tuple, dt: float):
        self.lag = np.maximum(np.round(delays / dt).astype(int), 1)
        self.buf = np.zeros((int(self.lag.max()) + 1, *shape))
        self.i = 0
        self.k = np.arange(shape[0])

    def push(self, x: np.ndarray) -> np.ndarray:
        """Store x as now; return what was stored lag steps ago (per setting)."""
        n = len(self.buf)
        self.buf[self.i % n] = x
        out = self.buf[(self.i - self.lag) % n, self.k]
        self.i += 1
        return out


def follow(sig: np.ndarray, target: np.ndarray, up: np.ndarray, down: np.ndarray, dt: float) -> np.ndarray:
    """One step of a first-order rise (τ up) or fall (τ down) toward the target."""
    tau = np.where(target > sig, up, down)
    return sig + dt * (target - sig) / tau


def firing(P: dict, S: np.ndarray, sig: np.ndarray, load: np.ndarray, A: np.ndarray) -> np.ndarray:
    """What a site fires on its own (1 = felt as a knot), from its sympathetic drive and the muscle's load around it."""
    return S * (P["ongoing"] + A * (P["symp_share"] * sig + (1 - P["symp_share"]) * load))
