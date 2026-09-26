"""Feasibility checks beside the vessel switch: numbers that decide, before any sweep, whether a mechanism can hold a
knot or release it within a breath (sim/PLAN.md §3, structural results first).

1. The collar: can hyaluronan around the vessel hold it? A viscous liquid resists motion, not position: at rest its stress
   is zero. At its fastest, with the most viscous hyaluronan fluid measured, how does its drag compare with the pressure
   holding the vessel open?
2. Cooling: could a thermal loop release a knot within a breath? How long does a patch of skin take to warm when its
   vessel opens, at the body's maximal skin blood flow?
3. The latch: does it remember? (Answered by the sources, quoted in checks.yaml.)
"""

from __future__ import annotations

from .models import vessel
from .params import values

MMHG = 133.322


def collar(p: dict[str, float] | None = None) -> dict[str, float]:
    c = values("checks")
    p = p or vessel.params()
    s = vessel.calibrate(p)
    opening = (s.xrest - p["xc"]) * p["r100"]  # m, from shut to resting radius
    t_open = 1.0  # s: in the model, a released vessel reaches rest within about a second (press_and_release)
    delta_min = 20e-6  # the thinnest collar considered (collar_thickness range)
    shear = opening / t_open / delta_min
    drag = c["eta_max"] * shear  # Pa, the collar's best case
    pressure = p["P"] * MMHG
    return {
        "opening_um": opening * 1e6,
        "shear_per_s": shear,
        "drag_Pa": drag,
        "pressure_Pa": pressure,
        "pressure_over_drag": pressure / drag,
        "synovial_over_fascia_min": c["ha_synovial"] * 1000 / c["ha_fascia_high"],
        "synovial_over_fascia_max": c["ha_synovial"] * 1000 / c["ha_fascia_low"],
    }


def cooling() -> dict[str, float]:
    c = values("checks")
    q_max = c["skin_flow_max"] / 1000 / 60 / c["skin_area"]  # m³/s per m² of skin
    blood = c["blood_heat_capacity"] * q_max  # W/m²·K carried by blood at maximal flow
    h = c["h_radiative"] + c["h_convective"]
    C = c["tissue_heat_capacity"] * c["layer_depth"]  # J/m²·K
    return {
        "blood_W_m2K_max": blood,
        "h_W_m2K": h,
        "heat_capacity_J_m2K": C,
        "tau_s_at_max_flow": C / (blood + h),
        "tau_s_at_tenth_flow": C / (blood / 10 + h),
    }


if __name__ == "__main__":
    for k, v in (collar() | cooling()).items():
        print(f"{k:26} {v:,.3g}")
