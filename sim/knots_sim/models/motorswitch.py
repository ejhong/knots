"""T7, the motor switch: motor units that latch on, and the loop that keeps them on.

Spinal motor neurons have persistent inward currents: a brief input starts self-sustained firing that outlasts it,
measured in people (gorassini1998); the currents amplify synaptic input up to fivefold or more under serotonin and
noradrenaline, and switching them off usually needs inhibitory input (heckman2008). The metabolites of a sustained
contraction drive the muscle's own sensors and, through them, the same motor neurons: johansson1991's proposed loop.

A unit is recruited when its input passes its threshold and, once firing, keeps firing until its input falls below the
threshold times max(1 - H M (1 + k_w w), FLOOR): M the monoamine facilitation, which follows stress over tau_M; w its
warm-up (the currents grow with repeated activation, heckman2008), over tau_w. A unit with no floor left fires on no input
at all, until something inhibits it. Its input is the descending drive (reaching it with a lag, tau_d), what a hand or attention adds (a hand may excite
or inhibit; attention at a place inhibits), and g_m times its metabolites and g_n times its neighbours'. Firing squeezes
its own supply (as a contracture does, T3's squeeze): its metabolites build towards that over tau_m and wash out once it
stops.

A knot is a firing unit: a contraction beneath the skin, as a shut vessel is a knot in T1, whatever keeps it (so its
count is taken as theirs is). The latch and the loop are what let it outlast the stress that recruited it. It lets go when
the unit falls silent, and the patch of muscle it drove unclenches at once.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

FLOOR = 0.02  # the latch's floor, as a share of the threshold: a unit below it fires until something inhibits it


@dataclass
class State:
    on: np.ndarray
    M: np.ndarray
    w: np.ndarray
    m: np.ndarray
    D: np.ndarray | None = None  # the descending drive as it reaches the neuron (it lags the drive by tau_d)


def rest(n: int) -> State:
    return State(on=np.zeros(n, bool), M=np.zeros(n), w=np.zeros(n), m=np.zeros(n), D=np.zeros(n))


def latch(P: dict, M, w) -> np.ndarray:
    """How far below its threshold a firing unit keeps firing, as a share of the threshold."""
    return np.maximum(1 - P["H"] * np.clip(M, 0, 1) * (1 + P["k_w"] * w), FLOOR)


def simulate(P: dict[str, np.ndarray], theta: np.ndarray, inputs, duration: float, dt: float = 0.1, every: int = 10,
             state: State | None = None, neighbours: np.ndarray | None = None) -> dict:
    """Integrate every unit at once (Euler). P: parameters per unit; theta: recruitment thresholds. inputs(t, state)
    returns (stress per unit, descending drive per unit, other input per unit: a hand, attention). neighbours: an
    (N, N) averaging matrix for groups of N consecutive units, or None. Records which units fire (the knots), which would
    be silent on their descending drive alone (held by the latch and the loop), and their metabolites."""
    n = len(theta)
    st = state or rest(n)
    ts, ons, latched, ms = [], [], [], []
    for i in range(int(round(duration / dt))):
        t = i * dt
        s, drive, extra = inputs(t, st)
        if st.D is None:
            st.D = np.broadcast_to(drive, (n,)).astype(float)
        st.D = st.D + dt * (drive - st.D) / P["tau_d"]  # through synapses and dendrites: a lag of about a second
        st.M = st.M + dt * (np.clip(s, 0, None) - st.M) / P["tau_M"]
        loop = P["g_m"] * st.m
        if neighbours is not None:
            loop = loop + P["g_n"] * (st.m.reshape(-1, neighbours.shape[0]) @ neighbours.T).reshape(-1)
        total = st.D + extra + loop
        st.on = np.where(st.on, total > theta * latch(P, st.M, st.w), total > theta)
        st.w = st.w + dt * (st.on - st.w) / P["tau_w"]
        st.m = st.m + dt * (P["squeeze"] * st.on - st.m) / P["tau_m"]
        if i % every == 0:
            ts.append(t)
            ons.append(st.on.copy())
            latched.append(st.on & (st.D < theta))
            ms.append(st.m.astype(np.float32))
    knots = np.array(ons)
    return {"t": np.array(ts), "on": knots, "knot": knots, "latched": np.array(latched), "m": np.array(ms), "state": st}
