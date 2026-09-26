"""Run everything and write what the site reads. One command regenerates all of it:

    uv run python -m knots_sim.export

Writes
    src/sim/models/vessel.ts          the model's equations as TypeScript (codegen)
    src/data/sim/vessel.json          parameters with provenance, the switch, validation, robustness, scenarios, checks
    src/data/sim/golden-vessel.json   reference trajectories the TypeScript model must reproduce (tests/sim-vessel.test.ts)
    sim/findings/001-can-a-perforator-hold.md
    sim/results/<run>/manifest.json   what produced this run
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import platform
import subprocess
from dataclasses import asdict
from importlib.metadata import version
from pathlib import Path

import numpy as np

from . import breath, checks, codegen, robustness, scenarios
from .findings import write_findings
from .models import tree, vessel
from .params import load, papers

SIM = Path(__file__).resolve().parents[1]
SITE_DATA = SIM.parent / "src" / "data" / "sim"
FITTED = {
    "gasp_gain": "the fall in fingertip flow after a deep gasp (gasp_drop)",
    "tau_down": "the recovery of flow about 34 s after a gasp",
    "tau_nerve": "the timing of reactive hyperaemia (porh_peak_time)",
    "k_mv": "the widening of squeezed arteries after one squeeze, one long squeeze and five (clifford2006)",
    "tau_w": "the same widenings and when each peaks",
    "tau_z": "the same widenings and when each peaks",
}


def _git() -> dict:
    run = lambda *a: subprocess.run(["git", *a], cwd=SIM, capture_output=True, text=True).stdout.strip()
    return {"commit": run("rev-parse", "--short", "HEAD"), "dirty": bool(run("status", "--porcelain", "--", "."))}


def _inputs_hash() -> str:
    """A hash of everything a run depends on: the model code and the parameter tables."""
    h = hashlib.sha256()
    for f in sorted([*(SIM / "knots_sim").rglob("*.py"), *(SIM / "params").glob("*.yaml")]):
        h.update(f.relative_to(SIM).as_posix().encode())
        h.update(f.read_bytes())
    return h.hexdigest()[:12]


def _round(v, n=4):
    if isinstance(v, float):
        return float(f"{v:.{n}g}")
    if isinstance(v, dict):
        return {k: _round(x, n) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_round(x, n) for x in v]
    return v


def param_table(name: str, fitted: dict[str, float]) -> list[dict]:
    lib = papers()
    rows = []
    for p in load(name).values():
        row = {k: v for k, v in asdict(p).items() if v not in (None, "")}
        if p.key in fitted:
            row["value"] = fitted[p.key]
        if p.source:
            ref = lib[p.source]
            row["cite"] = f"{ref['authors'].split(',')[0].split(' et al')[0].rsplit(' ', 1)[0]} {ref['year']}"
        rows.append(row)
    return rows


def main() -> dict:
    p = vessel.params()
    s = vessel.calibrate(p)
    fitted = {k: p[k] for k in FITTED}
    low, when, back = vessel.gasp_response(p)
    rise, peak = vessel.hyperaemia(p)
    squeezed = {name: vessel.squeeze_response(p, pulses) for name, pulses in vessel.SQUEEZES.items()}
    robust = robustness.run()
    breath_maps = breath.maps(p)
    trees = {"figure": tree.figure(), "robustness": tree.robustness(), "siblings": tree.siblings(),
             "params": param_table("tree", {})}
    runs = scenarios.all_runs(p)
    sc = scenarios.scores(p)
    data = {
        "run": {
            "date": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"),
            "inputs": _inputs_hash(),
            **_git(),
            "python": platform.python_version(),
            "packages": {k: version(k) for k in ("numpy", "scipy", "sympy", "SALib")},
        },
        "params": {
            "values": {**{k: p[k] for k in vessel.PARAMS}, **{k: p[k] for k in (
                "porh_rise", "gasp_drop", "gasp_gain", "latency", "gasp_duration", "breath_swing", "breath_move")}},
            "vessel": param_table("vessel", fitted),
            "checks": param_table("checks", {}),
            "fitted": [{"key": k, "value": p[k], "target": t} for k, t in FITTED.items()],
        },
        "switch": asdict(s),
        "validation": {
            "gasp": {"lowest_flow": low, "at_s": when, "recovered_s": back,
                     "measured": {"lowest_flow": [0.286, 0.406], "at_s": [4.6, 5.2], "recovered_s": 34}},
            "flush": {"rise": rise, "peak_s": peak, "measured": {"rise": [1.26, 2.48], "peak_s": [6.0, 16.2]}},
            "squeeze": {name: {"rise": r, "peak_s": t, "measured": {"rise": p[f"squeeze_rise_{name}"],
                                                                     "peak_s": p[f"squeeze_peak_{name}"]}}
                        for name, (r, t) in squeezed.items()},
        },
        "breath": breath_maps,
        "tree": trees,
        "robustness": robust,
        "scenarios": {
            name: {"score": asdict(x), "summary": runs[name][1]}
            for name, x in sc.items()
        },
        "checks": {"collar": checks.collar(p), "cooling": checks.cooling()},
    }
    exact = data["params"]["values"]
    exact_scores = {k: x["score"] for k, x in data["scenarios"].items()}
    data = _round(data)
    # The live model and the golden test run on exact values and exact inputs.
    data["params"]["values"] = {k: float(v) for k, v in exact.items()}
    for k, score in exact_scores.items():
        data["scenarios"][k]["score"] = score
    SITE_DATA.mkdir(parents=True, exist_ok=True)
    (SITE_DATA / "vessel.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")

    # Golden trajectories: the site's stepper must reproduce these (fixed step, same inputs).
    golden = {"dt": 0.02, "every": 25, "params": data["params"]["values"], "runs": {}}
    for name in ("press_and_release", "relaxing_breath_at_threshold", "moving_breath"):
        r = runs[name][0]
        idx = np.arange(0, len(r["t"]), golden["every"])
        golden["runs"][name] = {
            "score": data["scenarios"][name]["score"],
            "states": np.stack([r[k][idx] for k in vessel.STATES], axis=1).tolist(),
        }
    (SITE_DATA / "golden-vessel.json").write_text(json.dumps(golden) + "\n")

    codegen.write()
    write_findings(data)
    run_dir = SIM / "results" / f"{data['run']['date']}-vessel"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "manifest.json").write_text(json.dumps(
        {"run": data["run"], "switch": data["switch"], "fitted": data["params"]["fitted"],
         "robustness": {k: robust[k] for k in ("samples", "share_bistable", "share_holds_at_rest")}},
        indent=1) + "\n")
    return data


if __name__ == "__main__":
    d = main()
    print(json.dumps({k: d[k] for k in ("run", "switch", "validation")}, indent=1))
