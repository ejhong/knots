"""T6, perception: knots as places the nervous system makes tender (params/perception.yaml).

Its strongest form (src/data/hypotheses.ts): central plasticity, kept up by threat, attention and poor sleep; released by
safety, sleep and a change of attention; overbreathing makes tingling anywhere. As dynamics, per place i in a body:

    felt   F_i = G · g_i · u_i · (1 + α att_i) · (1 - φ w⁺) · (1 - β · M_i)
    G      = 1 + κ a                       central gain, raised by arousal a
    da/dt  = (s + breath - a) / τ_a        arousal follows stress; a slow breath eases it (the shared breath quantities)
    u_i    = u₀ b_i (1 + γ s zone_i) + g_p p_i / 40     ordinary input, raised where stress is held, and by a pressing hand
    M_i    = the loudest other knot's excess over threshold (0 to 1): pain inhibits pain
    held   a knot is felt once F_i > 1, and fades below 1 - h
    dg_i/dt = held_i (g0_i (1 + σ_max) - g_i) / τ_s  -  att_i · breathing · (g_i - g0_i / 2) / τ_e

w⁺ is the in-breath (felt a little less then; arsenault2013). When a knot fades, arousal drops at once by `relief`.
Overbreathing's tingling (macefield1991) needs a fall in CO2 the slow breath does not make, so the account makes no
sparks in the trials; when it does make them, they are everywhere at once.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..exam import breath_wave


@dataclass
class State:
    a: np.ndarray  # arousal, per person (group)
    g: np.ndarray  # local gain, per place
    h: np.ndarray  # felt as a knot, per place
    F: np.ndarray  # felt intensity, per place


def simulate(P: dict[str, np.ndarray], group: np.ndarray, b: np.ndarray, g0: np.ndarray, zone: np.ndarray, inputs,
             duration: float, dt: float = 0.1, every: int = 10, state: State | None = None) -> dict:
    """Integrate every place at once (Euler; everything here is slower than a tenth of a second).

    P: parameters per person (arrays over groups). group: each place's person. inputs(t, state) returns
    (stress per person, breathing or not, attention per place (0-1), pressure per place in mmHg)."""
    n_groups = int(group.max()) + 1
    per = np.bincount(group, minlength=n_groups)
    width = int(per.max())
    same = bool((per == width).all())
    Pp = {k: v[group] for k, v in P.items()}  # per place
    st = state or State(a=np.zeros(n_groups), g=g0.copy(), h=np.zeros(len(b), bool), F=np.zeros(len(b)))
    ts, hs, Fs = [], [], []
    for i in range(int(round(duration / dt))):
        t = i * dt
        s, breathing, att, press = inputs(t, st)
        w = float(breath_wave(np.array([t]))[0]) if breathing else 0.0
        drive = s + (P["breath_fall"] * (P["breath_in_share"] * max(w, 0.0) + min(w, 0.0)) if breathing else 0.0)
        st.a = st.a + dt * (drive - st.a) / P["tau_arousal"]
        G = 1.0 + Pp["kappa"] * np.maximum(st.a[group], 0.0)
        u = Pp["u_scale"] * b * (1 + Pp["guard"] * np.maximum(s[group], 0.0) * zone) + Pp["press_gain"] * press / 40.0
        excess = np.clip(st.F - 1.0, 0.0, 1.0) * st.h
        if same:
            ex = excess.reshape(n_groups, width)
            top = ex.max(axis=1)
            arg = ex.argmax(axis=1)
            second = np.partition(ex, -2, axis=1)[:, -2] if width > 1 else np.zeros(n_groups)
            other = np.repeat(top, width)
            other[arg + np.arange(n_groups) * width] = second
        else:
            other = np.zeros(len(b))
        F = G * st.g * u * (1 + Pp["attention_gain"] * att) * (1 - Pp["phase_amp"] * max(w, 0.0)) * (1 - Pp["cpm"] * other)
        h = np.where(F > 1.0, True, np.where(F < 1.0 - Pp["hysteresis"], False, st.h))
        faded = st.h & ~h
        if faded.any():
            st.a = st.a - P["relief"] * (np.bincount(group, weights=faded, minlength=n_groups) > 0)
        st.g = st.g + dt * (h * (g0 * (1 + Pp["sens_max"]) - st.g) / Pp["tau_sens"]
                            - att * (1.0 if breathing else 0.0) * (st.g - g0 / 2) / Pp["tau_extinct"])
        st.h, st.F = h, F
        if i % every == 0:
            ts.append(t)
            hs.append(h.copy())
            Fs.append(F.astype(np.float32))
    return {"t": np.array(ts), "h": np.array(hs), "F": np.array(Fs), "state": st}
