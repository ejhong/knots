"""T2, the vascular latch, as Johnson's vasocomputation states it (params/latch.yaml): a region's small vessels, held
contracted by a held prediction, clamp the region and cut it off from awareness, so the prediction cannot update.

Per region i (all 0 to 1):

    φ_i    = rest + U_v s_i + g_c c_i                        the command to its vessels: stress, and the held prediction
    df/dt  = (φ − f) / τ_on    if φ > f,   (φ − f) / τ_L   if φ < f     contraction; a latched one relaxes slowly
    e_i    = (e₀ + a_att att_i + a_p p_i) (1 − b f_i)         awareness: attention and a hand raise it; the clamp cuts it off
    dc/dt  = (1 − c)(w_s s_i + w_f h(f)) / τ_c − c (u₀ + u_e e_i)       taken up under stress, kept by the clamp, let go
                                                             as awareness updates it; h(f) = 1 / (1 + exp(−n (f − f_½))):
                                                             only a region clamped well past f_½ keeps its prediction

A knot is a region whose prediction is held and whose vessels are clamped (c > ½ and f > ½). The loop through h(f) makes
it a switch: stress writes a prediction; the clamp keeps it written after the stress has gone, for as long as awareness
stays out; awareness lets it update, and then the latch lets go slowly. The latch holds cheaply while commanded; its
memory here is the held prediction, as the account has it, not the latch-bridge itself (hai1988, rembold1991).

The loop is set from the account's two claims, at the holding stress where stress is held most (`derive`): a latched
region keeps its prediction while unattended, and the holding stress alone does not latch one. f_½ and n are placed on
the prediction's reach (θ, ν), and w_f a margin above the least that keeps a prediction held unattended (m_f), kept
well below the most before a region would latch by itself. Where the loop sits is sampled; that it is a switch at all
is the account's claim. Whether attention or a hand frees it is left to the model.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

HELD = 0.5


@dataclass
class State:
    c: np.ndarray  # the held prediction
    f: np.ndarray  # the clamp: the region's vessels' contraction


def keep(P: dict, f):
    return 1.0 / (1.0 + np.exp(-P["steep"] * (f - P["f_half"])))


def derive(P: dict, s_hold, rest=0.2) -> tuple[dict, np.ndarray]:
    """f_half, steep and keep per setting (arrays in P, one per setting), set at the holding stress s_hold without a
    hand or attention and with w_s = 0 (the shared rule then sets w_s). Returns them, and whether the loop can be a
    switch there at all (the least keep that holds a prediction is below the most that leaves a region unlatched)."""
    phi0 = rest + P["stress_tone"] * s_hold
    reach = np.minimum(phi0 + P["gain"], 1.0) - phi0
    out = {"f_half": phi0 + P["loop_point"] * reach, "steep": P["sharpness"] / reach}
    c = np.linspace(0.005, 0.995, 397)[:, None]
    phi = np.clip(phi0 + P["gain"] * c, 0.0, 1.0)
    h = 1.0 / (1.0 + np.exp(-out["steep"] * (phi - out["f_half"])))
    loss = P["erode"] + P["update"] * P["aware0"] * (1 - P["block"] * phi)
    need = P["tau_c"] * c * loss / ((1 - c) * np.maximum(h, 1e-300))  # the keep at which c is a steady state
    kmin = np.where((c > HELD) & (phi > HELD), need, np.inf).min(axis=0)  # any more, and a held state exists
    kmax = np.where(c < HELD, need, 0.0).max(axis=0)  # any less, and a region at rest stays unlatched
    out["keep"] = np.minimum(P["keep_margin"] * kmin, np.sqrt(kmin * np.maximum(kmax, kmin)))
    return out, kmax > kmin


def step(P: dict, st: State, s_eff, att, press, dt: float, rest=0.2):
    """One Euler step. s_eff: stress reaching each region (the shared unit times its share); att, press: attention and a
    hand at each region (0-1). P holds per-region arrays of params/latch.yaml, and w_s: how strongly stress writes a
    prediction, set by the shared rule."""
    phi = np.clip(rest + P["stress_tone"] * s_eff + P["gain"] * st.c, 0.0, 1.0)
    tau = np.where(phi > st.f, P["tau_on"], P["tau_latch"])
    st.f = np.clip(st.f + dt * (phi - st.f) / tau, 0.0, 1.0)
    e = np.clip((P["aware0"] + P["attend"] * att + P["press_aware"] * press) * (1 - P["block"] * st.f), 0.0, 1.0)
    dc = ((1 - st.c) * (P["w_s"] * np.maximum(s_eff, 0.0) + P["keep"] * keep(P, st.f)) / P["tau_c"]
          - st.c * (P["erode"] + P["update"] * e))
    st.c = np.clip(st.c + dt * dc, 0.0, 1.0)
    return e


def held(st: State) -> np.ndarray:
    return (st.c > HELD) & (st.f > HELD)
