"""The exam (observations/spec.yaml): versioned, quoted faithfully, and well formed."""

import json
import re
import unicodedata
from pathlib import Path

import yaml

SIM = Path(__file__).resolve().parents[1]
ROOT = SIM.parent
SPEC = SIM / "observations" / "spec.yaml"
SOURCES = {  # where each kind of quote can be checked
    "the introduction": ROOT / "src" / "data" / "tour.ts",
    "the author": SIM / "observations" / "author.md",
}


def _norm(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", unicodedata.normalize("NFKC", s))  # the introduction's text carries HTML tags
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip().lower()


def test_the_exam_says_what_changed_in_each_version():
    """The exam is versioned: its current version is dated and has an entry in `changes`, saying what changed and why."""
    spec = yaml.safe_load(SPEC.read_text())
    assert isinstance(spec["version"], int) and spec["updated"]
    entries = {c["version"]: c for c in spec["changes"]}
    assert spec["version"] in entries, "a new version needs an entry in `changes`"
    assert entries[spec["version"]]["items"], "say what changed, and why"
    assert sorted(entries, reverse=True) == [c["version"] for c in spec["changes"]], "changes run newest first"


def test_the_sealed_versions_stay_on_record():
    """Versions 1-3 were sealed by hash (observations/seal.yaml); that record is history and stays."""
    seals = yaml.safe_load((SIM / "observations" / "seal.yaml").read_text())["seals"]
    assert [s["version"] for s in seals[:3]] == [1, 2, 3]
    assert all(len(s["sha256"]) == 64 and s.get("commit") for s in seals)


def test_every_quote_is_in_its_source():
    spec = yaml.safe_load(SPEC.read_text())
    texts = {k: _norm(p.read_text()) for k, p in SOURCES.items()}
    for o in spec["observations"]:
        for w in o.get("words", []):
            source = next(k for k in SOURCES if w["from"].startswith(k))
            assert _norm(w["quote"]) in texts[source], f"{o['id']}: not found in {SOURCES[source].name}: {w['quote'][:60]}"


def test_the_exam_is_well_formed():
    spec = yaml.safe_load(SPEC.read_text())
    groups = {g["id"] for g in spec["groups"]}
    papers = {p["id"] for p in json.loads((ROOT / "src" / "data" / "papers.json").read_text())}
    ids = [o["id"] for o in spec["observations"]]
    assert len(ids) == len(set(ids))
    for o in spec["observations"]:
        assert o["group"] in groups and o["title"] and o["text"]
        assert o["evidence"] in ("S", "M")
        if o["evidence"] == "M":
            assert o.get("sources") and set(o["sources"]) <= papers
        else:
            assert o.get("words"), f"{o['id']}: a self-report needs its words"
