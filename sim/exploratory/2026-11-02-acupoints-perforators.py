"""Do WHO acupoints sit on the measured perforator clusters more than chance would put them there?

An exploratory test, 2 Nov 2026. Along each limb line where a measured perforator group and a run of WHO
acupoints share the same intermuscular septum, both are written as a fraction of the segment, and the
acupoints are compared with points placed at random on the same line.

Perforators (all from PubMed abstracts; PMID, quote):
  23249983 Martin 2013, CTA, 5 cadavers: anterior tibial "clustered into three groups centered at 83 ± 6
           percent (percent of tibial height ± SD), 59 ± 7 percent, and 28 ± 9 percent. Peroneal artery
           perforators were clustered in two groups centered at 61 ± 9 percent and 27 ± 11 percent."
           The abstract does not say which end the percent is measured from: both are run (variant).
  20134364 Saint-Cyr 2010, 26 forearms: radial artery "two main clusters ... at a relative distance of 17.6
           percent and 61.7 percent along the radial styloid-to-lateral epicondyle interval." No SD: guessed.
  30836442 Lu 2019, CTA, 20 patients: ALT "average perforator distance/thigh length ratio was 0.358 ±
           0.08"; reference end not in the abstract: both run (variant).
  22659354 Ulatowski 2012, Doppler, 60 thighs: ASIS-patella line in 10 segments, "most abundant in segments
           from 5 to 7 (74.6%)" -- a third ALT variant: centre 0.6 from the ASIS, SD 0.13 (fitted to 75% in
           0.4-0.7; a reading of the abstract, not a reported SD).
  20335865 Kao 2010, 29 legs: medial sural "11.4 +/- 2.7 cm" below the popliteal crease. Leg length guessed
           38-42 cm to make it a fraction.
  24595698 2015, 30 legs: lowest posterior tibial perforator median 6.75 cm above the medial malleolus, 5th-95th
           percentile 4-8.1 cm, "ratio ... total leg length was 21%". Other PTA perforators "more evenly
           spaced" (23249983), so the medial line is reported, not tested.

Acupoints: WHO 2008 proportional cun as placed in src/viewer/data/meridians.ts (leg: 16 cun popliteal crease
to lateral malleolus, 13 cun medial knee to medial malleolus; forearm 12 cun; thigh: ASIS-patella base taken
as 18-20 cun, guessed). The cun segment and the anatomists' segment (tibial height, styloid-epicondyle) are
not the same length; the difference is folded into the location error tau.

Run: cd sim && uv run python exploratory/2026-11-02-acupoints-perforators.py [--write]  (--write: src/data/sim/acupoints.json, read by Research)
"""

from __future__ import annotations

import itertools
import json
import sys
from pathlib import Path

import numpy as np

RNG = np.random.default_rng(20261102)
N_NULL = 20000
LO, HI = 0.05, 0.95  # points in the outer 5% of a segment (at the joints) are left out of every line


def lines(variant: dict) -> dict:
    """Each line: acupoints (name -> fraction) and perforator clusters [(mu, sd, weight)], all from the same end."""
    from_ankle = variant["leg_from_ankle"]
    flip = (lambda c: c) if from_ankle else (lambda c: [(1 - m, s, w) for m, s, w in c])
    L = variant["thigh_cun"]
    alt = {
        "cta_from_knee": [(1 - 0.358, 0.08, 1)],
        "cta_from_asis": [(0.358, 0.08, 1)],
        "doppler": [(0.6, 0.13, 1)],
    }[variant["alt"]]
    sd_radial = variant["radial_sd"]
    leg_cm = variant["leg_cm"]
    return {
        # Fractions above the ankle (16 cun, popliteal crease to lateral malleolus).
        "anterior leg (anterior tibial; ST on tibialis anterior, GB in front of the fibula)": dict(
            points={"ST36": 13 / 16, "ST37": 10 / 16, "ST38": 8 / 16, "ST39": 7 / 16, "ST40": 8 / 16,
                    "GB36": 7 / 16, "GB37": 5 / 16, "GB38": 4 / 16, "GB39": 3 / 16},
            clusters=flip([(0.83, 0.06, 1), (0.59, 0.07, 1), (0.28, 0.09, 1)])),
        "lateral leg (peroneal; behind the fibula)": dict(
            points={"GB35": 7 / 16, "BL58": 7 / 16, "BL59": 3 / 16},
            clusters=flip([(0.61, 0.09, 1), (0.27, 0.11, 1)])),
        # Fractions from the ASIS along the ASIS-patella line.
        "front of thigh (ALT; ASIS to patella line)": dict(
            points={"ST32": 1 - 6 / L, "ST33": 1 - 3 / L, "ST34": 1 - 2 / L},
            clusters=alt),
        # Fractions above the wrist (12 cun).
        "forearm (radial artery; lung channel)": dict(
            points={"LU6": 7 / 12, "LU7": 1.5 / 12, "LU8": 1 / 12},
            clusters=[(0.176, sd_radial, 1), (0.617, sd_radial, 1)]),
        # Fractions below the popliteal crease.
        "back of calf (medial sural; bladder channel)": dict(
            points={"BL55": 2 / 16, "BL56": 5 / 16, "BL57": 8 / 16},
            clusters=[(11.4 / leg_cm, 2.7 / leg_cm, 1)]),
    }


def density(x: np.ndarray, clusters, tau: float) -> np.ndarray:
    """Expected perforator density at x for a point located with error tau (mixture of widened normals)."""
    d = np.zeros_like(x, dtype=float)
    for mu, sd, w in clusters:
        s = np.hypot(sd, tau)
        d += w * np.exp(-0.5 * ((x - mu) / s) ** 2) / (s * np.sqrt(2 * np.pi))
    return d


def run(variant: dict, tau: float):
    out = {}
    pooled_obs, pooled_null = 0.0, np.zeros(N_NULL)
    grid = np.linspace(LO, HI, 2001)
    for name, ln in lines(variant).items():
        pts = {k: v for k, v in ln["points"].items() if LO <= v <= HI}
        x = np.array(list(pts.values()))
        base = density(grid, ln["clusters"], tau).mean()  # what a random point on the line gets
        obs = density(x, ln["clusters"], tau).mean() / base
        rnd = RNG.uniform(LO, HI, size=(N_NULL, len(x)))
        null = density(rnd, ln["clusters"], tau).mean(axis=1) / base
        # The best a map of this many points could do: every point on a cluster centre.
        best = max(density(np.array([m for m, _, _ in ln["clusters"]]), ln["clusters"], tau)) / base
        out[name] = dict(ratio=obs, p=(null >= obs).mean(), best=best,
                         per_point={k: density(np.array([v]), ln["clusters"], tau)[0] / base for k, v in pts.items()})
        pooled_obs += obs * len(x)
        pooled_null += null * len(x)
    n = sum(len([v for v in ln["points"].values() if LO <= v <= HI]) for ln in lines(variant).values())
    return out, pooled_obs / n, (pooled_null >= pooled_obs).mean()


def main():
    grid = dict(
        leg_from_ankle=[True, False],
        alt=["doppler", "cta_from_knee", "cta_from_asis"],
        thigh_cun=[18, 20],
        radial_sd=[0.05, 0.10],
        leg_cm=[38, 42],
    )
    taus = [0.0, 0.04, 0.08]  # location error as a fraction of the segment: ~0, ~1.5 cm, ~3 cm on a 38 cm leg
    rows = []
    for combo in itertools.product(*grid.values()):
        v = dict(zip(grid.keys(), combo))
        for tau in taus:
            per, ratio, p = run(v, tau)
            rows.append((v, tau, per, ratio, p))

    print("Pooled enrichment (mean perforator density at acupoints / at random points on the same lines)")
    print("over every variant: ratio, one-sided p against uniform random placement\n")
    for key in ["leg_from_ankle", "alt"]:
        for val in grid[key]:
            sel = [r for r in rows if r[0][key] == val]
            rs = np.array([r[3] for r in sel])
            ps = np.array([r[4] for r in sel])
            print(f"  {key}={val!s:14}  ratio {rs.min():.2f}-{rs.max():.2f}  p {ps.min():.3f}-{ps.max():.3f}")
    rs = np.array([r[3] for r in rows])
    ps = np.array([r[4] for r in rows])
    print(f"\n  all {len(rows)} variants: ratio {rs.min():.2f}-{rs.max():.2f} (median {np.median(rs):.2f}), "
          f"p {ps.min():.3f}-{ps.max():.3f} (median {np.median(ps):.3f}); p<0.05 in {(ps < 0.05).mean():.0%}")

    print("\nPer line (tau = 0.04; ranges over the other choices)")
    names = list(rows[0][2].keys())
    for name in names:
        for fa in [True, False]:
            sel = [r for r in rows if r[1] == 0.04 and r[0]["leg_from_ankle"] == fa]
            if "leg" not in name.split("(")[0] and not fa:
                continue
            rr = np.array([r[2][name]["ratio"] for r in sel])
            pp = np.array([r[2][name]["p"] for r in sel])
            bb = np.array([r[2][name]["best"] for r in sel])
            tag = ("  [Martin % from ankle]" if fa else "  [Martin % from knee]") if "leg" in name.split("(")[0] else ""
            print(f"  {name}{tag}\n     ratio {rr.min():.2f}-{rr.max():.2f}  p {pp.min():.3f}-{pp.max():.3f}  "
                  f"(a point on a cluster centre scores {bb.min():.2f}-{bb.max():.2f})")
            pts = sel[0][2][name]["per_point"]
            print("     " + "  ".join(f"{k} {np.mean([r[2][name]['per_point'][k] for r in sel]):.2f}" for k in pts))

    # The medial line, reported: SP6 and the lowest posterior tibial perforator, in cm on a 32 cm leg.
    leg = 6.75 / 0.21
    print(f"\nMedial leg: lowest posterior tibial perforator median 6.75 cm (4-8.1 cm, 5th-95th) above the malleolus;"
          f" leg {leg:.0f} cm by its 21% ratio.")
    for name, cun in [("KI8", 2), ("SP6", 3), ("SP7", 6)]:
        print(f"  {name}: {cun} of 13 cun = {cun / 13 * leg:.1f} cm above the malleolus")

    # What the test can see: the same lines with every acupoint moved onto its nearest cluster centre.
    orig = lines

    def perfect(vv):
        L = orig(vv)
        for ln in L.values():
            cs = [c[0] for c in ln["clusters"]]
            ln["points"] = {k: min(cs, key=lambda c: abs(c - x)) for k, x in ln["points"].items()}
        return L

    globals()["lines"] = perfect
    best = [run(dict(zip(grid.keys(), combo)), tau)[1:] for combo in itertools.product(*grid.values()) for tau in taus]
    globals()["lines"] = orig
    br = np.array([b[0] for b in best])
    bp = np.array([b[1] for b in best])
    print(f"\nA map on the cluster centres: ratio {br.min():.2f}-{br.max():.2f}, p {bp.max():.4f} at most")

    # The base rate: 374 major perforators scattered evenly over an adult's skin (1.6-2.0 m2, guessed), the chance
    # that a random spot lies within r of one. Real perforators cluster, so this is a reference, not a null.
    base = {r: [1 - np.exp(-374 / (a * 1e4) * np.pi * r * r) for a in (2.0, 1.6)] for r in (1, 2, 3)}
    for r, (lo, hi) in base.items():
        print(f"  within {r} cm of one of 374 evenly scattered: {lo:.0%}-{hi:.0%}")

    if "--write" in sys.argv:
        at4 = [r for r in rows if r[1] == 0.04]
        out = dict(
            note="Generated by sim/exploratory/2026-11-02-acupoints-perforators.py; do not edit.",
            variants=len(rows),
            points=sum(len([v for v in ln["points"].values() if LO <= v <= HI]) for ln in lines(rows[0][0]).values()),
            ratio=dict(min=rs.min(), max=rs.max(), median=float(np.median(rs))),
            p=dict(min=ps.min(), max=ps.max(), median=float(np.median(ps)), share_below_05=float((ps < 0.05).mean())),
            perfect=dict(min=br.min(), max=br.max(), p_max=bp.max()),
            base_rate={str(r): dict(lo=lo, hi=hi) for r, (lo, hi) in base.items()},
            lines=[
                dict(name=name,
                     ratio=dict(min=min(r[2][name]["ratio"] for r in at4), max=max(r[2][name]["ratio"] for r in at4)),
                     p=dict(min=min(r[2][name]["p"] for r in at4), max=max(r[2][name]["p"] for r in at4)),
                     points={k: float(np.mean([r[2][name]["per_point"][k] for r in at4])) for k in at4[0][2][name]["per_point"]})
                for name in names
            ],
            medial=dict(leg_cm=leg, points={n: c / 13 * leg for n, c in [("KI8", 2), ("SP6", 3), ("SP7", 6)]}),
        )
        path = Path(__file__).resolve().parents[2] / "src" / "data" / "sim" / "acupoints.json"
        path.write_text(json.dumps(out, indent=1, default=float) + "\n")
        print(f"\nwrote {path}")


if __name__ == "__main__":
    main()
