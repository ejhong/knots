"""The reports and the models: the observations the Introduction lists, in the site's own words, set against what each
model's knots do in its runs (sim/PLAN.md §2: predictions first, comparison after). For each report and theory: in how
many of the settings where it could happen the model produces it, or why it cannot say (not modelled; set by the shared
scale). Generated with the rest of the guide; nothing here is written per theory, and nothing is fitted to the reports.
"""

from __future__ import annotations

import numpy as np

from .base import GONE, formations, releases


def _release_of(run, k: int, j: int) -> float:
    for kk, jj, t in releases(run.t, run.held):
        if kk == k and jj == j:
            return t
    return np.inf


def _cell(ok: np.ndarray, valid: np.ndarray, note: str = "") -> dict:
    n = int(valid.sum())
    return {"n": n, "k": int((ok & valid).sum()), "share": round(float((ok & valid).sum() / n), 3) if n else None, "note": note}


# (id, the report in the site's words, what it is read from)
REPORTS = (
    ("breath", "They let go on a slow out-breath", "thirty slow breaths: some held knot lets go"),
    ("attention", "Deeper ones let go to focused attention", "attention without touch frees the knot at the spot, or sooner"),
    ("hand", "A patient hand releases them, one at a time", "a resting hand frees the knot at the spot, under it or as it lifts, where the same breaths alone would not, or sooner"),
    ("roller", "A foam roller releases them", "rolled over: the knot at the spot lets go while rolled or within a minute"),
    ("warmth", "A hot shower softens many at once", "five minutes of heat frees a quarter or more of the patch's knots beyond what the same breaths do"),
    ("stress", "They gather where stress is held", "set by the shared scale in every theory: not a finding"),
    ("stiff", "They limit movement: a stretch meets a dull block", "held half an hour: the knot at the spot blocks a stretch"),
    ("spark", "A pop, or a tingle across a patch of skin, as one goes", "a spark or a twitch at a release"),
    ("migrate", "When one lets go, another moves in nearby", "after one lets go: a new knot holds within 10 mm"),
    ("trees", "A big one frees small ones nearby, not the reverse", "a parent's release frees its children; a child's does not free its parent"),
    ("back", "One comes back to roughly the same place", "after one lets go: the same knot holds again"),
    ("mirror", "Working one side eases the other", ""),
    ("water", "Drinking water eases release", ""),
    ("euphoria", "A release brings a wave of well-being", ""),
    ("peel", "Layers peel apart, and fill in again", ""),
)


def reports(results: dict, modules) -> list[dict]:
    """results: theory id -> run_theory's result (runner, runs, extra)."""
    out = []
    for rid, label, basis in REPORTS:
        row = {"id": rid, "label": label, "basis": basis, "theories": {}}
        for m in modules:
            R = results[m.ID]
            runs, extra, runner = R["runs"], R["extra"], R["runner"]
            K = runner.K
            forms = runs["forms"]
            held0 = forms.held[-1]
            anyk = held0.any(axis=1)
            target = runs["breathing"].target
            tgt = held0[np.arange(K), target]
            if rid == "breath":
                br = runs["breathing"]
                some = np.zeros(K, bool)
                for k, j, _ in releases(br.t, br.held):
                    some[k] |= bool(held0[k, j])
                c = _cell(some, anyk)
            elif rid == "attention":
                t_b = np.array([_release_of(runs["breathing"], k, target[k]) for k in range(K)])
                t_a = np.array([_release_of(runs["attention"], k, target[k]) for k in range(K)])
                c = _cell(tgt & np.isfinite(t_a) & (~np.isfinite(t_b) | (t_a + 5.0 < t_b)), tgt)
            elif rid == "hand":
                t_b = np.array([_release_of(runs["breathing"], k, target[k]) for k in range(K)])
                t_h = np.array([_release_of(runs["hand"], k, target[k]) for k in range(K)])
                c = _cell(tgt & (t_h < 65.0) & (~np.isfinite(t_b) | (t_h + 5.0 < t_b)), tgt)
            elif rid == "roller":
                rk = runs["rolled"]
                there = rk.held[0, np.arange(K), rk.target]
                t_r = np.array([_release_of(rk, k, rk.target[k]) for k in range(K)])
                c = _cell(there & (t_r < 240.0), there)
            elif rid == "warmth":
                if m.WORDS.get("no_warmth"):
                    c = {"silent": True, "note": "no route in the model"}
                else:
                    gone = {}
                    for sid in ("warmth", "breathing"):
                        n_ = np.zeros(K)
                        for k, j in {(k, j) for k, j, _ in releases(runs[sid].t, runs[sid].held) if held0[k, j]}:
                            n_[k] += 1
                        gone[sid] = n_
                    more = gone["warmth"] - gone["breathing"]
                    c = _cell(anyk & (more >= 0.25 * np.maximum(held0.sum(axis=1), 1)), anyk)
            elif rid == "stress":
                c = {"calibration": True, "note": "set by the shared scale"}
            elif rid == "stiff":
                lin = runs["lingers"]
                if lin.stiff is None:
                    c = _cell(np.zeros(K, bool), np.ones(K, bool), "nothing at the knot resists a stretch")
                else:
                    kk, tg = np.arange(K), lin.target
                    valid = lin.held[-1, kk, tg]
                    c = _cell(valid & (lin.stiff[-1, kk, tg] >= 0.5), valid)
            elif rid == "spark":
                with_, some = np.zeros(K, bool), np.zeros(K, bool)
                for run in (runs["breathing"], runs["hand"]):
                    for k, j, _ in releases(run.t, run.held):
                        some[k] = True
                    for e in run.events:
                        if e["kind"] in ("spark", "twitch"):
                            with_[e["k"]] = True
                note = "a tingle when pressed, not as it goes" if m.ID == "T5" else ""
                c = _cell(with_, some, note)
            elif rid in ("migrate", "back"):
                af = runs["after"]
                lay = runner.lay
                t_r = np.array([_release_of(af, k, target[k]) for k in range(K)])
                went = tgt & np.isfinite(t_r)
                hit = np.zeros(K, bool)
                for k, j, tf in formations(af.t, af.held):
                    if not went[k] or tf <= t_r[k] + GONE or tf > t_r[k] + 600.0:
                        continue
                    j0 = target[k]
                    if rid == "back":
                        hit[k] |= j == j0
                    else:
                        hit[k] |= j != j0 and np.hypot(*(lay.pos[j] - lay.pos[j0])) <= 10.0
                c = _cell(hit, went)
            elif rid == "trees":
                fam = extra.get("family")
                if fam is None:
                    c = {"silent": True, "note": "no trees in the model"}
                else:
                    ch, pa = fam["child"], fam["parent"]
                    both = ch["has"] & pa["has"] & ch["self"] & pa["self"]
                    ok = both & ~ch["parent"] & (pa["children"] >= 1)
                    c = _cell(ok, both)
            else:
                c = {"silent": True, "note": "not modelled"}
            row["theories"][m.ID] = c
        out.append(row)
    return out
