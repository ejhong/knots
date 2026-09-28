"""Every modelled theory through every scene: the field guide's data for the site, and a findings note.

    uv run python -m knots_sim.guide            # K = 32 settings per theory (a few minutes)
    uv run python -m knots_sim.guide --k 8      # quicker, for development

Writes src/data/sim/guide.json (the index: patch, scenes, theories, their layouts and characters), one file per film
scene in public/sim/guide/ (the typical setting's run of each theory), and sim/findings/guide.md.
"""

from __future__ import annotations

import base64
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np

from ..exam import out_breath
from ..theories import t1 as a1, t3 as a3, t6 as a6, t7 as a7
from . import patch, senses, t1, t3, t6, t7, traits
from .base import K, SEED, releases, formations, typical, wave
from .scenes import SCENES, SURGE

ROOT = Path(__file__).resolve().parents[3]
INDEX = ROOT / "src" / "data" / "sim" / "guide.json"
FILMS = ROOT / "public" / "sim" / "guide"
NOTE = ROOT / "sim" / "findings" / "guide.md"
MODULES = (t1, t3, t7, t6)  # the order on the page: the site's own order (perforators, trigger points, motor switch, perception)
NOT_YET = (
    {"id": "T2", "key": "latch", "name": "Vascular latch", "glyph": "閂",
     "why": "It shares the vessel and how a held vessel sets; the latch itself needs its rate constants (Hai & Murphy 1988). "
            "The latch saves energy and does not remember: as a knot it would hold only while its drive lasts, and let go "
            "over tens of seconds once drive falls."},
    {"id": "T4", "key": "densification", "name": "Densification", "glyph": "膠",
     "why": "To model as a loose layer that stiffens at rest and thins with movement and warmth: its knots would be broad and "
            "slow, freed by movement over minutes."},
    {"id": "T5", "key": "nerve", "name": "Nerves", "glyph": "神経",
     "why": "To model as a sensitised nerve where it pierces the fascia: tender, with nothing firm to feel, tingling along its "
            "branches when pressed, and freed only when what presses on it lets go."},
)


def inputs_hash() -> str:
    pkg = Path(__file__).resolve().parents[1]
    files = sorted([*(pkg / "guide").glob("*.py"), *(pkg / "models").glob("*.py"), *(pkg / "theories").glob("*.py"),
                    pkg / "exam.py", pkg / "adapt.py", *(pkg.parent / "params").glob("*.yaml")])
    h = hashlib.sha256()
    for f in files:
        h.update(f.name.encode())
        h.update(f.read_bytes())
    return h.hexdigest()[:12]


def _git() -> dict:
    from ..export import _git as g

    return g()


def run_theory(m, k: int) -> dict:
    t0 = time.time()
    runner = m.Runner(k)
    runs = {}
    for s in SCENES:
        runs[s.id] = runner.run(s)
        print(f"  {m.ID} {s.id:10s} {time.time() - t0:6.1f} s", flush=True)
    extra = {}
    if m is t1:
        extra["attention_aimed"] = runner.run(_scene("attention"), variant="aimed")
        extra["breathing_aimed"] = runner.run(_scene("breathing"), variant="aimed")
        age = a1.ageing(runner.ps, "both")
        extra["ageing"] = (age.brief_released, age.long_persists)
        age = a1.ageing(runner.ps, "both+adaptation")
        extra["ageing_adapt"] = (age.brief_released, age.long_persists)
    elif m is t3:
        extra["attention_aimed"] = runner.run(_scene("attention"), variant="aimed")
        extra["breathing_aimed"] = runner.run(_scene("breathing"), variant="aimed")
    elif m is t6:
        age = a6.ageing(runner.ps, "arousal")
        extra["ageing"] = (age.brief_released, age.long_persists)
    elif m is t7:
        extra["hand_excite"] = runner.run(_scene("hand"), variant="excite")
        age = a7.ageing(runner.ps, "inhibit")
        extra["ageing"] = (age.brief_released, age.long_persists)
    print(f"  {m.ID} extra      {time.time() - t0:6.1f} s", flush=True)
    ch = traits.character(m, runner, runs, extra)
    held0 = runs["forms"].held[-1]
    tgt = runs["breathing"].target
    ok = held0.any(axis=1) & held0[np.arange(k), tgt]
    if not ok.any():
        ok = held0.any(axis=1)
    X = runner.settings()
    typ = typical(X, ok if ok.any() else np.ones(k, bool))
    return {"runner": runner, "runs": runs, "character": ch, "typical": typ}


def _scene(sid: str):
    return next(s for s in SCENES if s.id == sid)


# ---------- the site's data ----------


def _layout(m, runner, k: int) -> dict:
    lay = runner.lay
    out = {"n": lay.n, "pos": np.round(lay.pos, 2).tolist(), "kind": lay.kind, "parent": lay.parent.tolist(),
           "note": lay.note, "focal": lay.focal}
    if m.WORDS["stiff"]:
        wa, wx = traits._widths(m, runner)
        out["felt_along"] = np.round(np.broadcast_to(wa[k], (lay.n,)), 2).tolist()
        out["felt_across"] = np.round(np.broadcast_to(wx[k], (lay.n,)), 2).tolist()
    if m is t7:
        out["territory_along"] = np.round(runner.a_along[k], 2).tolist()
        out["territory_across"] = np.round(runner.a_across[k], 2).tolist()
    if m is t3:
        out["zone_x"] = lay.extra["zone_x"]
        out["nodule"] = [round(float(runner.a_along[k]), 2), round(float(runner.a_across[k]), 2)]
    if m is t6:
        out["spacing"] = lay.extra["spacing"]
    return out


def _pack(run, k: int) -> str:
    """Two bytes per unit and frame: held (bit 7), active (bit 6) and tenderness (0-63, to 2x tender); then the felt bump
    (0-255, to 4x the edge of touch)."""
    held = run.held[:, k].astype(np.uint8)
    act = run.active[:, k].astype(np.uint8)
    ten = np.clip(np.round(run.tender[:, k] / 2.0 * 63), 0, 63).astype(np.uint8)
    b0 = (held << 7) | (act << 6) | ten
    b1 = np.clip(np.round(run.bump[:, k] / 4.0 * 255), 0, 255).astype(np.uint8)
    return base64.b64encode(np.stack([b0, b1], axis=-1).tobytes()).decode()


def _round(x, nd=3) -> list:
    return [None if not np.isfinite(v) else round(float(v), nd) for v in np.asarray(x, float)]


def _captions(m, run, k: int, scene, lay) -> list:
    """The moments worth saying, from the run: [t, text]."""
    t, held = run.t, run.held[:, k]
    tgt = int(run.target[k])
    out = []
    n0 = int(held[0].sum())
    if scene.surge:
        out.append([0.0, "At rest."])
        out.append([SURGE[0], "A stressful moment begins."])
        forms = [(tf, j) for kk, j, tf in formations(t, run.held) if kk == k]
        if forms:
            out.append([forms[0][0], "The first knot holds."])
        out.append([SURGE[1], f"The stress eases to a level that is held; {int(held[np.searchsorted(t, SURGE[1] + 5)].sum())} knots are held."])
    else:
        out.append([0.0, f"{n0} knot{'s' if n0 != 1 else ''} held." if n0 else "No knot is held in this patch."])
    rel = [(tr, j) for kk, j, tr in releases(t, run.held) if kk == k]
    sparks = {(e["unit"], round(e["t"], 1)): e["kind"] for e in run.events if e["k"] == k}
    gone = 0
    marks = {max(1, round(n0 * q)) for q in (0.25, 0.5, 0.75, 1.0)} if n0 else set()
    for tr, j in rel:
        gone += 1
        if j == tgt:
            how = ""
            if scene.hand_until:
                hand_on = bool(run.hand[np.searchsorted(t, tr) - 1, k]) if run.hand is not None else False
                how = " under the hand" if hand_on else (" as the hand lifts" if tr < scene.hand_until + 5 else "")
            elif scene.breath_until and tr < scene.breath_until:
                how = " on the out-breath" if out_breath(tr) else " on the in-breath"
            kind = next((v for (u, tt), v in sparks.items() if u == j and abs(tt - tr) < 1.0), None)
            tail = {"spark": "; its patch tingles", "twitch": "; it twitches"}.get(kind, "")
            out.append([tr, f"The knot at the spot lets go{how}{tail}."])
        elif gone in marks and scene.id != "forms":
            out.append([tr, f"{gone} of {n0} have let go."])
    if not scene.surge:
        new = [(tf, j) for kk, j, tf in formations(t, run.held) if kk == k and tf > 0]
        for tf, j in new[:3]:
            where = "at the spot again" if j == tgt else ("nearby" if np.hypot(*(lay.pos[j] - lay.pos[tgt])) < 10 else "elsewhere")
            out.append([tf, f"A knot holds {where}."])
    out.append([float(t[-1]), f"{int(held[-1].sum())} held at the end."])
    return sorted(out, key=lambda c: c[0])


def _film(scene, results: dict) -> dict:
    t = next(iter(results.values()))["runs"][scene.id].t
    out = {"scene": scene.id, "duration": scene.duration, "frame": scene.frame, "frames": len(t),
           "breath": _round([wave(scene, x) for x in t], 2),
           "attend": [int(scene.attending(x)) for x in t], "roll": [int(scene.rolling(x)) for x in t], "theories": {}}
    for m in MODULES:
        R = results[m.ID]
        run, k = R["runs"][scene.id], R["typical"]
        out["theories"][m.ID] = {
            "setting": k, "target": int(run.target[k]), "cells": _pack(run, k),
            "events": [[e["unit"], round(e["t"], 2), e["kind"], round(e["size"], 3)] for e in run.events if e["k"] == k],
            "focal": {q: _round(v[:, k]) for q, v in run.focal.items()},
            "inst": {q: _round(v[:, k]) for q, v in run.inst.items()},
            "stress": _round(run.stress[:, k]), "hand": [int(x) for x in run.hand[:, k]],
            "captions": [[round(c[0], 1), c[1]] for c in _captions(m, run, k, scene, R["runner"].lay)],
        }
    return out


def main(k: int = K) -> dict:
    t0 = time.time()
    results = {}
    for m in MODULES:
        print(f"{m.ID} {m.NAME}", flush=True)
        results[m.ID] = run_theory(m, k)
    run_id = {"inputs": inputs_hash(), "settings": k, "seed": SEED, **_git()}
    xs = np.linspace(0.5, patch.SIZE - 0.5, 40)
    grid = np.stack(np.meshgrid(xs, xs), -1).reshape(-1, 2)
    index = {
        "run": run_id,
        "patch": {"size": patch.SIZE, "spot": patch.SPOT.tolist(), "hand_r": patch.HAND_R, "sham": patch.SHAM.tolist(),
                  "roi_r": patch.ROI_R, "roll": [patch.ROLL[0].tolist(), patch.ROLL[1].tolist()],
                  "share": np.round(patch.share(grid), 3).reshape(40, 40).tolist()},
        "scenes": [{"id": s.id, "name": s.name, "what": s.what, "duration": s.duration, "frame": s.frame, "film": s.film}
                   for s in SCENES],
        "theories": [],
        "not_yet": list(NOT_YET),
    }
    for m in MODULES:
        R = results[m.ID]
        index["theories"].append({"id": m.ID, "key": m.KEY, "name": m.NAME, "glyph": m.GLYPH, "typical": R["typical"],
                                  "layout": _layout(m, R["runner"], R["typical"]), "traits": R["character"]["traits"],
                                  "counts": R["character"]["counts"]})
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n")
    FILMS.mkdir(parents=True, exist_ok=True)
    for s in SCENES:
        if s.film:
            (FILMS / f"{s.id}.json").write_text(json.dumps({"run": run_id["inputs"], **_film(s, results)},
                                                           ensure_ascii=False, separators=(",", ":")) + "\n")
    _note(index)
    print(f"done in {time.time() - t0:.0f} s", flush=True)
    return index


MARK = {"all": "●", "some": "◐", "none": "○", "silent": "—", "not": "·"}


def _note(index: dict) -> None:
    lines = [f"# The field guide: how each theory's knots would behave\n",
             f"*Generated by `uv run python -m knots_sim.guide` (inputs {index['run']['inputs']}, {index['run']['settings']} "
             f"settings per theory, commit {index['run'].get('commit', '?')}). Every line comes from the runs; the site shows "
             f"the same at /simulation/. ● in every setting, ◐ in some, ○ in none.*\n"]
    for th in index["theories"]:
        lines.append(f"\n## {th['glyph']} {th['name']}\n")
        for tr_ in th["traits"]:
            dep = f" ({tr_['depends']})" if tr_.get("depends") else ""
            lines.append(f"- {MARK.get(tr_['mark'], '')} **{tr_['label']}.** {tr_['text']}{dep}")
    NOTE.write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    kk = int(sys.argv[sys.argv.index("--k") + 1]) if "--k" in sys.argv else K
    main(kk)
