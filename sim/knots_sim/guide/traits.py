"""The character (sim/PLAN.md §7): the same questions for every theory, answered from its runs in every setting.

Each trait makes one main claim, in words generated here from the numbers, and its mark says how often that claim holds
across the plausible settings: in every one (●, structural for that theory), in some (◐, with the sampled number that best
splits the settings where it holds from those where it does not, among the numbers that can bear on it), or in none (○).
Traits set by the shared scale (a stressful moment forms knots at the typical place; the holding stress keeps them) are
calibration and are not claimed as findings.
"""

from __future__ import annotations

import numpy as np

from ..exam import INHALE, PERIOD, START
from ..params import load
from . import patch, senses
from .base import GONE, formations, releases

AREA_CM2 = (patch.SIZE / 10.0) ** 2
BREATH = ("breath_fall", "breath_in_share", "breath_calm", "tau_calm", "breath_strain")
RELEVANT = {  # which sampled numbers can bear on each trait: "model" is the theory's own table
    "bump": ("model", "hold", "skin", "fat", "into_muscle", "touch", "k_nodule", "k_unit", "k_vessel", "territory",
             "unit_length", "nodule_area"),
    "inside": ("model", "hold", "tender_debt", "tender_milieu", "tender_metab"),
    "where": ("model", "hold"),
    "many": ("model", "hold"),
    "forms": ("model", "hold"),
    "lingers": ("model", "hold"),
    "rolling": ("model", "hold", "palpation", "press_strain"),
    "moods": ("model", "hold", "mood_sd", "mood_tau"),
    "breath": ("model", "hold", *BREATH),
    "attention": ("model", "hold", *BREATH, "focus_gain"),
    "micro": ("model", "hold", *BREATH, "focus_gain"),
    "needs": ("model", "hold", *BREATH),
    "hand": ("model", "hold", "palpation", "press_strain", *BREATH),
    "spark": ("model", "hold", "spark", "palpation", *BREATH),
    "move": ("model", "hold", "palpation", "press_strain", *BREATH),
    "time": ("model", "hold"),
}
PHASES = (  # where in the breath: seconds after the out-breath begins (it lasts 6 s; the in-breath 4)
    (0.0, 3.0, "early in the out-breath"),
    (3.0, 6.0, "late in the out-breath"),
    (6.0, 8.0, "at the bottom of the breath, as the in-breath begins"),
    (8.0, 10.0, "late in the in-breath"),
)


# ---------- how often, and what it depends on ----------


def mark(ok: np.ndarray, valid: np.ndarray) -> str:
    n, k = int(valid.sum()), int((ok & valid).sum())
    if n == 0:
        return "not"
    return "all" if k == n else ("none" if k == 0 else "some")


def how_often(ok: np.ndarray, valid: np.ndarray) -> str:
    n, k = int(valid.sum()), int((ok & valid).sum())
    if n == 0:
        return "in no setting where it could happen"
    if n == 1:
        return "in the one setting where it could happen" if k else "not in the one setting where it could happen"
    if k == n:
        return f"in all {n} settings" if n > 2 else "in both settings"
    if k == 0:
        return f"in none of {n} settings"
    return f"in {k} of {n} settings"


class Numbers:
    """The sampled numbers per setting that a theory's traits could depend on, with their labels and kinds."""

    def __init__(self, m, runner):
        self.ps = runner.ps
        self.cols: dict[str, tuple[np.ndarray, str, str]] = {}
        for q, p in load(m.TABLES[0]).items():
            if p.range and q in runner.ps[0]:
                self.cols[q] = (np.array([s[q] for s in runner.ps], float), p.label, "model")
        for q, p in load("interface").items():
            if q in runner.ps[0]:
                self.cols[q] = (np.array([s[q] for s in runner.ps], float), p.label, "interface")
        for q, p in load("senses").items():
            self.cols[q] = (np.array([s[q] for s in runner.se], float), p.label, "senses")

    def for_trait(self, tid: str) -> list[tuple[np.ndarray, str]]:
        keep = RELEVANT.get(tid, ("model",))
        return [(v, lab) for q, (v, lab, kind) in self.cols.items() if (kind == "model" and "model" in keep) or q in keep]


def depends(ok: np.ndarray, valid: np.ndarray, cols: list[tuple[np.ndarray, str]]) -> dict | None:
    """The sampled number that best tells the settings where the claim holds from those where it does not (by the area
    under the curve of one threshold), if one does it well: AUC ≥ 0.8, with at least four settings each way."""
    y = ok[valid]
    n1, n0 = int(y.sum()), int((~y).sum())
    if n1 < 4 or n0 < 4:
        return None
    best, lab, higher = 0.5, None, True
    for v, label in cols:
        x = v[valid]
        if not np.isfinite(x).all() or np.ptp(x) == 0:
            continue
        r = np.argsort(np.argsort(x)) + 1.0
        auc = (r[y].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)
        if max(auc, 1 - auc) > best:
            best, lab, higher = max(auc, 1 - auc), label, auc > 0.5
    if lab is None or best < 0.8:
        return None
    return {"label": lab, "higher": bool(higher), "auc": round(float(best), 2)}


def trait(id_: str, group: str, label: str, text: str, ok: np.ndarray | None = None, valid: np.ndarray | None = None,
          nums: Numbers | None = None, cell: str = "", silent: bool = False) -> dict:
    """One trait: its words, and how often its main claim holds (ok per setting, over the valid settings)."""
    out = {"id": id_, "group": group, "label": label, "text": text, "cell": cell}
    if silent:
        out["mark"] = "silent"
        return out
    if ok is None:
        out["mark"] = "all"
        return out
    out["mark"] = mark(ok, valid)
    out["k"], out["n"] = int((ok & valid).sum()), int(valid.sum())
    if out["mark"] == "some" and nums is not None:
        d = depends(ok, valid, nums.for_trait(id_))
        if d:
            out["depends"] = f"depends most on {d['label']}: likelier the {'higher' if d['higher'] else 'lower'} it is"
            out["depends_on"] = d
    return out


# ---------- helpers ----------


def _median(x) -> float:
    x = np.asarray([v for v in np.ravel(x) if np.isfinite(v)], float)
    return float(np.median(x)) if len(x) else float("nan")


def _mmss(s: float) -> str:
    if not np.isfinite(s):
        return "never"
    if s < 90:
        return f"{s:.0f} s"
    return f"{s / 60:.0f} min" if s < 5400 else f"{s / 3600:.1f} h"


def _widths(m, runner):
    if m.ID == "T3":
        n = runner.lay.n
        return senses.widths(runner.a_along[:, None] * np.ones(n), runner.a_across[:, None] * np.ones(n), runner.depth[:, None])
    return senses.widths(runner.a_along, runner.a_across, runner.depth[:, None])


def _felt_at_knots(run, lay, wa, wx) -> np.ndarray:
    """Per setting, the firmest a hand would find at any held knot at the end of a run (1 = the edge of touch)."""
    K = run.held.shape[1]
    out = np.zeros(K)
    for k in range(K):
        held = run.held[-1, k]
        if held.any():
            out[k] = float(senses.field(lay.pos[held], lay.pos, run.bump[-1, k], wa[k], wx[k]).max())
    return out


def _release_of(run, k: int, j: int) -> float:
    for kk, jj, t in releases(run.t, run.held):
        if kk == k and jj == j:
            return t
    return np.inf


def _half_fall(t: np.ndarray, x: np.ndarray, t0: float) -> float:
    i0 = int(np.searchsorted(t, t0))
    if i0 >= len(t) or x[i0] <= 1e-6:
        return np.nan
    below = np.flatnonzero(x[i0:] <= 0.5 * x[i0])
    return float(t[i0 + below[0]] - t0) if len(below) else np.inf


def _pace(s: float) -> str:
    if not np.isfinite(s):
        return "not within the scene"
    if s <= 2.0:
        return "at once"
    if s <= 20.0:
        return "within seconds"
    if s <= 120.0:
        return "over a minute or so"
    return "over minutes"


def _phase(times: np.ndarray) -> tuple[str, float]:
    """The part of the breath where most releases fall, and its share."""
    ph = np.mod(times + START - INHALE, PERIOD)
    shares = [((ph >= a) & (ph < b)).mean() for a, b, _ in PHASES]
    i = int(np.argmax(shares))
    return PHASES[i][2], float(shares[i])


def _majority(options: list[tuple[str, np.ndarray]], valid: np.ndarray) -> tuple[str, np.ndarray]:
    """The outcome that holds in the most valid settings."""
    return max(options, key=lambda o: int((o[1] & valid).sum()))


# ---------- the character ----------


def character(m, runner, runs: dict, extra: dict) -> dict:
    """Every trait for one theory. m: the runner's module (ID, NAME, WORDS, TABLES); runs: scene id -> Run (default
    variant); extra: other runs (the aimed attention and its breathing baseline; the hand that only excites) and the
    adapters' ageing results."""
    lay, K, words, se = runner.lay, runner.K, m.WORDS, runner.se
    nums = Numbers(m, runner)
    forms = runs["forms"]
    held0 = forms.held[-1]  # the knots a stressful moment leaves (K, N)
    anyk = held0.any(axis=1)
    counts = held0.sum(axis=1)
    target = runs["breathing"].target
    tgt = held0[np.arange(K), target]  # settings with a knot at the spot
    all_ = np.ones(K, bool)
    T = []

    # --- what it feels like: from inside, and to a finger ---
    tender_ok = np.array([(forms.tender[-1, k][held0[k]] >= 1.0).any() if anyk[k] else False for k in range(K)])
    T.append(trait("inside", "feel", "Felt from inside", f"{words['inside']} A held, tender place, {how_often(tender_ok, anyk)}.",
                   tender_ok, anyk, nums, cell=words["inside_cell"] if tender_ok[anyk].mean() >= 0.5 else "faintly"))
    if words["stiff"]:
        wa, wx = _widths(m, runner)
        felt = _felt_at_knots(forms, lay, wa, wx)
        palp = felt >= 1.0
        depth = _median([s["skin"] + s["fat"] + s["into_muscle"] for s in se])
        T.append(trait("bump", "feel", "Found by a finger",
                       f"{words['bump']} About {depth:.0f} mm down, {words['layer']}. A finger can find it {how_often(palp, anyk)} "
                       f"where knots hold; in the rest it lies below the edge of touch.", palp, anyk, nums,
                       cell=words["bump_cell"] if palp[anyk].mean() >= 0.5 else f"{words['bump_cell']}, often too faint"))
    elif forms.bump.max() > 0:  # computed, and too faint: the perforators' shut vessel
        felt = np.array([forms.bump[-1, k][held0[k]].max() if anyk[k] else 0.0 for k in range(K)])
        palp = felt >= 1.0
        size = _median([2 * p["r100"] * 1e3 for p in runner.ps])
        depth = _median([s["skin"] + s["fat"] for s in se])
        T.append(trait("bump", "feel", "Found by a finger",
                       f"{words['bump']} Its shut artery, about {size:.2f} mm across and {depth:.0f} mm down, is felt at about "
                       f"{100 * _median(felt[anyk]):.0f}% of what a finger can find (at most {100 * felt[anyk].max():.0f}%, where the "
                       f"fat is thinnest): nothing firm, {how_often(~palp, anyk)}.", ~palp, anyk, nums, cell=words["bump_cell"]))
    else:
        T.append(trait("bump", "feel", "Found by a finger", words["bump"], all_, all_, cell=words["bump_cell"]))

    # --- where they are, and how many ---
    zone = lay.zone
    top, bottom = zone >= np.quantile(zone, 2 / 3), zone <= np.quantile(zone, 1 / 3)
    gather = np.array([held0[k][top].sum() >= 1 and held0[k][top].mean() >= 2 * max(held0[k][bottom].mean(), 1e-9)
                       for k in range(K)])
    if (gather & anyk).sum() >= (~gather & anyk).sum():
        say, ok = f"They gather where stress is held most, {how_often(gather, anyk)}.", gather
    else:
        say, ok = (f"They do not gather where stress is held, {how_often(~gather, anyk)}: "
                   f"{words.get('scatter', 'they sit where their own thresholds are lowest')}."), ~gather
    T.append(trait("where", "where", "Where", f"{words['where']} {say}", ok, anyk, nums, cell=words["where_cell"]))
    med = _median(counts[anyk]) if anyk.any() else 0.0
    none_n = int((~anyk).sum())
    many = (f"{words['units']}: {lay.n / AREA_CM2:.1f} to the square centimetre. After a stressful moment about {med:.0f} hold "
            f"in this 4 cm patch ({med / AREA_CM2:.1f} to the square centimetre)"
            + (f"; in {none_n} of {K} settings none can hold at all." if none_n else "."))
    if words.get("body"):
        many += f" {words['body']}"
    T.append(trait("many", "many", "How many", many, anyk, all_, nums, cell=f"about {med:.0f}"))

    # --- how and when they form ---
    first = np.full(K, np.inf)
    for k, j, tf in formations(forms.t, forms.held):
        first[k] = min(first[k], tf - 5.0)  # the stressful moment starts at 5 s
    at_rest = anyk & (first < 0)
    during = anyk & (first >= 0) & (first < 180.0)
    fast = during & (first <= 15.0)
    slow = during & (first > 15.0)
    eases = anyk & (first >= 180.0)
    which, ok = _majority([("fast", fast | at_rest), ("slow", slow), ("eases", eases)], anyk)
    sel = ok & anyk & ~at_rest
    fmed = _median(first[sel]) if sel.any() else 0.0
    say = {"fast": f"They appear within seconds of a stressful moment (the first after about {max(fmed, 0):.0f} s)",
           "slow": f"They build during a stressful moment, over a minute or two (the first after about {fmed:.0f} s)",
           "eases": "They appear as a stressful moment passes: what stays held once the stress eases"}[which]
    say += f", {how_often(ok, anyk)}."
    if at_rest.any():
        say += f" Some places are felt as knots even at rest, before any stress, {how_often(at_rest, anyk)}."
    T.append(trait("forms", "form", "How they form", f"{words['forms']} {say}", ok, anyk, nums,
                   cell={"fast": "within seconds", "slow": "over a minute or two", "eases": "as the stress eases"}[which]))
    lin = runs["lingers"]
    c0, c1 = lin.held[0].sum(axis=1), lin.held[-1].sum(axis=1)
    grow, fade = anyk & (c1 > 1.2 * c0 + 0.5), anyk & (c1 < 0.8 * c0 - 0.5)
    stay = anyk & ~grow & ~fade
    which, ok = _majority([("stay", stay), ("spread", grow), ("fade", fade)], anyk)
    say = {"stay": "While the stress lingers they stay as they are", "spread": "While the stress lingers they spread",
           "fade": "While the stress lingers they fade on their own"}[which]
    T.append(trait("lingers", "form", "While stress lingers", f"{say}, {how_often(ok, anyk)}.", ok, anyk, nums, cell=which))
    ro = runs["rolling"]
    corner = lay.in_roll()
    out_ = np.array([any(corner[j] and tf <= 180.0 for kk, j, tf in formations(ro.t, ro.held) if kk == k) for k in range(K)])
    i210 = min(int(np.searchsorted(ro.t, 210.0)), len(ro.t) - 1)
    stays = np.array([bool(ro.held[i210, k][corner].any()) for k in range(K)]) & out_
    if out_.sum() * 2 >= K:
        say, ok = f"Rolling a quiet place brings knots out, {how_often(out_, all_)}; they stay after it stops {how_often(stays, out_)}.", out_
    else:
        say, ok = (f"Rolling a quiet place brings none out, {how_often(~out_, all_)}: {words['rolling']}"
                   + (f" In the rest it brings one out, which stays after it stops {how_often(stays, out_)}." if out_.any() else "")), ~out_
    T.append(trait("rolling", "form", "Pressed or rolled", say, ok, all_, nums,
                   cell="brings them out" if out_.sum() * 2 >= K else ("seldom brings one out" if out_.any() else "brings none out")))
    mo = runs["moods"]
    rel_mo, form_mo = releases(mo.t, mo.held), formations(mo.t, mo.held)
    cyc = np.zeros(K, bool)
    for k in range(K):
        r = [j for kk, j, _ in rel_mo if kk == k]
        f2 = [j for kk, j, _ in form_mo if kk == k]
        cyc[k] = any(r.count(j) >= 2 and f2.count(j) >= 2 for j in set(r))
    if cyc.sum() * 2 >= K:
        say, ok = f"Over an hour of moods, knots come and go (some form and let go at least twice), {how_often(cyc, all_)}.", cyc
    else:
        say, ok = (f"Over an hour of moods they hold steady, {how_often(~cyc, all_)}"
                   + ("; some come and go in the rest." if cyc.any() else "."), ~cyc)
    T.append(trait("moods", "form", "With moods", say, ok, all_, nums, cell="come and go" if cyc.sum() * 2 >= K else "steady"))

    # --- how and when they let go ---
    br = runs["breathing"]
    rel_b = [(k, j, t) for k, j, t in releases(br.t, br.held) if held0[k, j]]
    share_rel = np.array([len({j for kk, j, _ in rel_b if kk == k}) / max(counts[k], 1) for k in range(K)])
    some_go = anyk & (share_rel > 0)
    times = np.array([t for _, _, t in rel_b])
    if not some_go.any():
        say = f"Thirty slow breaths let none go. {words['breath']}"
    else:
        say = (f"Over thirty slow breaths some let go, {how_often(some_go, anyk)}; where they do, about "
               f"{100 * _median(share_rel[some_go]):.0f}% of them")
        if len(times) >= 5:
            where, share = _phase(times)
            first2 = np.array([any(t < 20.0 for kk, _, t in rel_b if kk == k) for k in range(K)])
            say += (f", {'most' if share >= 0.5 else 'most often'} {where} ({100 * share:.0f}% of releases), the typical one at breath "
                    f"{_median(times // PERIOD + 1):.0f}; one within the first two breaths {how_often(first2, some_go)}")
        say += f". {words['breath']}"
    T.append(trait("breath", "release", "To slow breathing", say, some_go, anyk, nums,
                   cell=(f"{100 * _median(share_rel[anyk]):.0f}% let go (typical)" if some_go.any() else "none let go")))
    at = runs["attention"]
    t_b = np.array([_release_of(br, k, target[k]) for k in range(K)])
    t_a = np.array([_release_of(at, k, target[k]) for k in range(K)])
    helped = tgt & np.isfinite(t_a) & (~np.isfinite(t_b) | (t_a + 5.0 < t_b))
    say = (f"With attention resting on the spot and no touch, the knot there lets go where the same breaths alone would not, "
           f"or sooner, {how_often(helped, tgt)}. {words['attention']}")
    aim = extra.get("attention_aimed")
    if aim is not None:
        base_ = extra["breathing_aimed"]
        t_aim = np.array([_release_of(aim, k, target[k]) for k in range(K)])
        t_ab = np.array([_release_of(base_, k, target[k]) for k in range(K)])
        aimed = tgt & np.isfinite(t_aim) & (~np.isfinite(t_ab) | (t_aim + 5.0 < t_ab))
        say += f" If attention could aim the breath's calming at one place (a hypothesis), it would {how_often(aimed, tgt)}."
    T.append(trait("attention", "release", "To attention, without touch", say, helped, tgt, nums,
                   cell=("often" if helped[tgt].mean() >= 0.5 else ("sometimes" if helped.any() else "no")) if tgt.any() else "—"))
    mi = runs.get("micro")
    if mi is not None:
        t_m = np.array([_release_of(mi, k, target[k]) for k in range(K)])
        went_m = tgt & np.isfinite(t_m)
        rel_m = [(k, j) for k, j, _ in releases(mi.t, mi.held) if held0[k, j]]
        share_m = np.array([len({j for kk, j in rel_m if kk == k}) / max(counts[k], 1) for k in range(K)])
        say = (f"With subtle breaths, a third the size of a slow breath, and attention resting on the spot, the knot there "
               f"lets go {how_often(went_m, tgt)}"
               + (f", after about {_median(t_m[went_m]):.0f} s" if went_m.any() else "")
               + f"; across the patch about {100 * _median(share_m[anyk]):.0f}% let go (with thirty slow breaths, "
               f"{100 * _median(share_rel[anyk]):.0f}%). {words['micro']}")
        T.append(trait("micro", "release", "To subtle breaths, attending", say, went_m, tgt, nums,
                       cell=(f"at the spot {how_often(went_m, tgt).replace('in ', '')}" if went_m.any() else "no") if tgt.any() else "—"))
    envl = extra.get("envelope")
    if envl is not None:
        T.append(_needs(envl, words, K, nums))
    ha = runs["hand"]
    t_h = np.array([_release_of(ha, k, target[k]) for k in range(K)])
    under, lift = tgt & (t_h < 60.0), tgt & (t_h >= 60.0) & (t_h < 65.0)
    later, never = tgt & (t_h >= 65.0) & np.isfinite(t_h), tgt & ~np.isfinite(t_h)
    which, ok = _majority([("under", under), ("lift", lift), ("later", later), ("never", never)], tgt)
    lead = {"under": f"It lets go under the hand, {how_often(under, tgt)}, after about {_median(t_h[under]):.0f} s" if under.any() else "",
            "lift": f"It lets go within seconds of the hand lifting, {how_often(lift, tgt)}",
            "later": f"It lets go well after the hand has lifted, {how_often(later, tgt)}",
            "never": f"It does not let go within the scene, {how_often(never, tgt)}"}[which]
    rest = [r for r in (f"under the hand {how_often(under, tgt)}" if which != "under" and under.any() else "",
                        f"as it lifts {how_often(lift, tgt)}" if which != "lift" and lift.any() else "") if r]
    if not under.any() and tgt.any():  # the structural claim: never under a hand that still presses
        lead = f"Never while the hand still presses, {how_often(~under, tgt)}. " + lead
        ok = ~under
    say = f"{lead}{'; ' + ', '.join(rest) if rest else ''}. {words['hand']}"
    exc = extra.get("hand_excite")
    if exc is not None:
        t_e = np.array([_release_of(exc, k, target[k]) for k in range(K)])
        say += f" If a held hand only excited the units under it, it would let go under the hand {how_often(tgt & (t_e < 60.0), tgt)}."
    T.append(trait("hand", "release", "Under a resting hand", say, ok, tgt, nums,
                   cell={"under": "under the hand", "lift": "as the hand lifts", "later": "later",
                         "never": "not within a minute"}[which] + (" (never under it)" if not under.any() and which != "under" else "")))
    fall_b, fall_t = [], []
    for run in (br, ha):
        for k, j, tr_ in releases(run.t, run.held):
            fall_b.append(_half_fall(run.t, run.bump[:, k, j], tr_ - run.t[1]))
            fall_t.append(_half_fall(run.t, run.tender[:, k, j], tr_ - run.t[1]))
    fb, ft = _median(fall_b), _median(fall_t)
    tend = "the tenderness stays through the scene" if not np.isfinite(ft) else f"the tenderness fades {_pace(ft)}"
    firm = words["stiff"] and np.isfinite(fb)
    say = f"The firmness goes {_pace(fb)}; {tend}." if firm else f"Nothing firm to go; {tend}."
    T.append(trait("letgo", "release", "How it lets go", f"{say} {words['letgo']}",
                   cell=(f"at once" if _pace(fb) == "at once" else _pace(fb)) if firm else f"tenderness fades {_pace(ft)}"))
    ev = [e for run in (br, ha) for e in run.events]
    nrel = sum(len(releases(run.t, run.held)) for run in (br, ha))
    if words["spark"] and nrel:
        with_ = np.zeros(K, bool)
        for e in ev:
            with_[e["k"]] = True
        say = (f"{words['spark']} {len(ev)} of the {nrel} releases in the breathing and hand scenes came with one, "
               f"{how_often(with_, anyk)}." if ev else f"{words['spark']} None of the {nrel} releases here was one.")
        T.append(trait("spark", "release", "A spark", say, with_, anyk, nums, cell=words["spark_cell"] if ev else "none here"))
    else:
        T.append(trait("spark", "release", "A spark", words["no_spark"], all_, all_, cell=words["spark_cell"]))

    # --- how they move ---
    af = runs["after"]
    t_r = np.array([_release_of(af, k, target[k]) for k in range(K)])
    went = tgt & np.isfinite(t_r)
    if not went.any():
        T.append(trait("move", "move", "After one lets go",
                       f"Worked by a resting hand for a minute, the knot at the spot let go in no setting, so there is nothing to "
                       f"follow. {words['move']}", cell="—"))
    else:
        others, nearby, same = np.zeros(K, int), np.zeros(K, bool), np.zeros(K, bool)
        back_t = np.full(K, np.nan)
        rel_af, form_af = releases(af.t, af.held), formations(af.t, af.held)
        for k in np.flatnonzero(went):
            tk, j0 = t_r[k], target[k]
            others[k] = sum(1 for kk, j, t in rel_af if kk == k and j != j0 and tk - 1.0 <= t <= tk + 10.0)
            d = np.sqrt(((lay.pos - lay.pos[j0]) ** 2).sum(axis=1))
            for kk, j, t in form_af:
                if kk != k or t <= tk + GONE or t > tk + 600.0:
                    continue
                if j == j0 or d[j] <= 10.0:
                    same[k] |= j == j0
                    nearby[k] |= j != j0
                    back_t[k] = t - tk if np.isnan(back_t[k]) else min(back_t[k], t - tk)
        together = others >= 1
        say = (f"When the knot at the spot lets go, others go with it within ten seconds {how_often(together, went)}"
               + (f" (about {_median(others[went & together]):.0f})" if (went & together).any() else "")
               + f"; within ten minutes a new one holds nearby {how_often(nearby, went)}, and the same one holds again "
               f"{how_often(same, went)}" + (f" (the first return after about {_mmss(_median(back_t[went]))})" if np.isfinite(_median(back_t[went])) else "")
               + f". {words['move']}")
        parts = [c for c, on in (("others go with it", together[went].mean() >= 0.5), ("one moves in nearby", nearby[went].mean() >= 0.3),
                                 ("it comes back", same[went].mean() >= 0.3)) if on]
        T.append(trait("move", "move", "After one lets go", say, together | nearby | same, went, nums,
                       cell=" · ".join(parts) or "nothing follows"))

    # --- over time ---
    age = extra.get("ageing")
    if age is None:
        T.append(trait("time", "time", "Held for hours", words["no_time"], cell="not modelled", silent=True))
    else:
        brief, long_ = age
        adapt = extra.get("ageing_adapt")
        if adapt is not None:
            b2, l2 = adapt
            say = (f"When its stress ends, a knot held three hours lets go with it, {how_often(~long_, all_)}. If the wall's muscle "
                   f"adapts to being shut, as smooth muscle held at a new length does, an old knot outlasts its stress "
                   f"{how_often(l2, all_)}, while one held half an hour lets go {how_often(b2, all_)}.")
            ok, cell = l2, ("an old one can stay" if l2.any() else "goes with the stress")
        elif long_.sum() * 2 >= K:
            say, ok, cell = (f"When its stress ends, a knot held three hours stays held, {how_often(long_, all_)}, while one held "
                             f"half an hour lets go {how_often(brief, all_)}."), long_, "an old one stays"
        else:
            say, ok, cell = (f"When its stress ends a knot lets go, however long it was held, {how_often(~long_, all_)}. "
                             f"{words['time']}".strip()), ~long_, "goes with the stress"
        T.append(trait("time", "time", "Held for hours", say, ok, all_, nums, cell=cell))

    # --- what an instrument would record ---
    T.append(trait("record", "record", "What an instrument would record", _record(m, runs, target, tgt), cell=words["record_cell"]))
    return {"traits": T, "counts": counts.tolist(), "any": anyk.tolist()}


def _needs(envl, words, K, nums) -> dict:
    """What a breath would have to do, whatever its pattern: the least calming of the knot's own drive that frees it."""
    env, summ = envl
    rows, br = summ["rows"], summ["breath"]
    held = env["held"]
    pct = lambda x: f"{100 * x:.0f}%"
    # the claim: no single breath (a step as large as a slow out-breath's, for as long as one, 4 s) frees it through drive
    i4 = env["durations"].index(4.0)
    one = np.array([p["breath_fall"] / p["hold"] for p in nums.ps])
    single = held & np.isfinite(env["need"][i4]) & (env["need"][i4] <= one)
    first = next((r for r in rows if r["median"] is not None), None)
    what = words.get("needs_what", "its drive")
    if first is None:
        easy = next((r for r in rows if r["q25"] is not None), None)
        lead = ("No fall in it frees the typical knot, even to rest for a minute"
                + (f"; the easiest quarter need about {pct(easy['q25'])} of the holding stress taken away for {easy['d']:.0f} s"
                   if easy else "") + ".")
    else:
        last = rows[-1]
        lead = (f"To free the typical knot it must fall by about {pct(first['median'])} of the holding stress for "
                f"{first['d']:.0f} s" + (f", or {pct(last['median'])} for a minute" if last["median"] is not None and last["d"] != first["d"] else "")
                + (f"; nothing shorter than {first['d']:.0f} s frees it" if first["d"] > 1 else "") + ".")
    say = (f"Whatever its pattern, a breath reaches this knot through {what}. {lead} A slow out-breath lowers it by about "
           f"{pct(br['out_breath'])} for a few seconds, a subtle breath by {pct(br['subtle'])}, minutes of slow breathing by about "
           f"{pct(br['minutes'])}, sustained. So one breath frees it {how_often(single, held)}. {words.get('needs', '')}").strip()
    return trait("needs", "release", "What a breath would have to do", say, ~single, held, nums,
                 cell=(f"{pct(first['median'])} for {first['d']:.0f} s" if first else "not by calming alone"))


def _record(m, runs, target, tgt) -> str:
    """At the knot at the spot's release under the hand (or with the breath): what the theory's instruments read."""
    K = len(target)
    ch = {}
    for sid in ("hand", "breathing"):
        run = runs[sid]
        for k in range(K):
            if k in ch or not tgt[k]:
                continue
            tr_ = _release_of(run, k, target[k])
            if not np.isfinite(tr_):
                continue
            before = (run.t >= max(tr_ - 30.0, 1.0)) & (run.t < tr_ - 5.0)
            after = (run.t >= tr_ + 5.0) & (run.t < tr_ + 30.0)
            if before.any() and after.any():
                ch[k] = {q: (float(v[after, k].mean()), float(v[before, k].mean())) for q, v in run.inst.items()}
    if not ch:
        return m.WORDS["record_none"]
    rows = list(ch.values())
    med = {q: (_median([r[q][0] for r in rows]), _median([r[q][1] for r in rows])) for q in rows[0]}
    return m.WORDS["record"](med, len(rows))
