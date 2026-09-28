"""The perforator's sleeve (params/sleeve.yaml): the loose, hyaluronan-rich sliding tissue around a perforator's bundle
where it passes through the fascia, which lets the layers glide past the vessel (guimberteau2005). Its structure follows
the gliding layer's thixotropy (models/densification.py, coussot2002); its water follows the flow through the vessel it
surrounds:

    τ_w dw/dt = w*(q) − w,     w*(q) = clip(1 + d (q − 1), 1 − d, 1 + d)
    the structure x: densification.step with the drive u w^α

q the flow through its vessel (1 at rest), w the sleeve's water (1 as usual), α how steeply its viscosity rises as it
dries (the third or fourth power, cowman2015). Ordinary movement keeps a wet sleeve free; a shut vessel dries its
sleeve over minutes, and a dry sleeve jams at the same movement, pinning the layers at the vessel: a stretch meets a
block there, which cowman2015 ties to felt stiffness. When the vessel reopens, its flow wets the sleeve again, a little
past its usual water in the flood; whether that frees it, or it stays jammed until the layer is sheared (a roller, a
moving hand), depends on how wide its band is.

The scale, set as every theory's is: ordinary movement lies midway (in log) between the least that keeps a wet sleeve
free and the most at which a dried one jams, at the band's lower edge.
"""

from __future__ import annotations

import numpy as np

from . import densification as dm


def water_target(q, d):
    """The water a sleeve tends to at flow q through its vessel."""
    return np.clip(1 + d * (q - 1), 1 - d, 1 + d)


def step(P: dict, x, w, u, q, dt: float):
    """One step of water and structure (x, w), both linearly implicit: P holds theta, x_max, steep, crowd, dry, tau_w
    (and warm_coeff, 0 if absent); u the shear from movement; q the flow through the vessel."""
    k = dt / P["tau_w"]
    w = (w + k * water_target(q, P["dry"])) / (1 + k)
    x = dm.step(P, x, u * w ** P["crowd"], 0.0, dt)
    return x, w


def scale(steep, x_max, crowd, dry) -> tuple[float, float, float, float, float]:
    """(U, u_c, u_j, x_c, x_j): the ordinary movement's drive by the rule above, the band's edges and structures."""
    uc, uj, xc, xj = dm.band(steep, x_max)
    U = uc * (1 - dry) ** (-crowd / 2)
    return U, uc, uj, xc, xj
