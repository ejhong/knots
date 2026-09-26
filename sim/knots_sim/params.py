"""Parameter tables (`sim/params/*.yaml`) and the check that every quoted line is really in its source.

    uv run python -m knots_sim.params --verify     # fetches abstracts and open full texts (cached)
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
PARAMS = ROOT / "params"
PAPERS = ROOT.parent / "src" / "data" / "papers.json"
CONFIDENCE = ("measured", "inferred", "fitted", "guessed")


@dataclass(frozen=True)
class Param:
    key: str
    symbol: str
    label: str
    value: float
    unit: str
    confidence: str
    range: tuple[float, float] | None = None
    source: str | None = None
    locator: str | None = None
    quote: str | None = None
    fit: str | None = None
    note: str = ""


def load(name: str) -> dict[str, Param]:
    raw = yaml.safe_load((PARAMS / f"{name}.yaml").read_text())
    out = {}
    for key, p in raw["parameters"].items():
        rng = tuple(float(v) for v in p["range"]) if "range" in p else None
        out[key] = Param(
            key=key,
            symbol=str(p["symbol"]),
            label=p.get("label", key),
            value=float(p["value"]),
            unit=str(p["unit"]),
            confidence=p["confidence"],
            range=rng,
            source=p.get("source"),
            locator=p.get("locator"),
            quote=p.get("quote"),
            fit=p.get("fit"),
            note=p.get("note", ""),
        )
    return out


def values(name: str) -> dict[str, float]:
    return {k: p.value for k, p in load(name).items()}


def papers() -> dict[str, dict]:
    return {p["id"]: p for p in json.loads(PAPERS.read_text())}


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).replace("µ", "μ").replace("−", "-").replace("–", "-")
    return re.sub(r"\s+", "", s).lower()


def problems(name: str) -> list[str]:
    """Structural problems: missing sources, unknown confidence, values outside their range."""
    lib = papers()
    out = []
    for p in load(name).values():
        if p.confidence not in CONFIDENCE:
            out.append(f"{name}.{p.key}: confidence {p.confidence!r}")
        if p.confidence != "guessed" and not (p.source and p.quote and p.locator):
            out.append(f"{name}.{p.key}: {p.confidence} but no source, locator and quote")
        if p.source and p.source not in lib:
            out.append(f"{name}.{p.key}: source {p.source} is not in papers.json")
        if p.range and not (p.range[0] <= p.value <= p.range[1]):
            out.append(f"{name}.{p.key}: value {p.value} outside {p.range}")
    return out


def verify(name: str) -> list[tuple[str, str, str]]:
    """(key, verdict, where) for every quote: found in the abstract, in a full-text section, or missing."""
    from . import pubmed

    lib = papers()
    out = []
    for p in load(name).values():
        if not p.quote:
            continue
        pmid = lib[p.source]["pmid"]
        q = _norm(p.quote)
        if q in _norm(pubmed.abstract(pmid)):
            out.append((p.key, "ok", "abstract"))
            continue
        text = pubmed.fulltext(pmid) or ""
        section = None
        for line in text.split("\n"):
            if line.startswith("## "):
                section = line[3:]
            elif q in _norm(line):
                out.append((p.key, "ok", f"full text, {section}" if section else "full text"))
                break
        else:
            out.append((p.key, "MISSING", ""))
    return out


if __name__ == "__main__":
    names = sorted(f.stem for f in PARAMS.glob("*.yaml"))
    bad = [msg for n in names for msg in problems(n)]
    for msg in bad:
        print("problem:", msg)
    if "--verify" in sys.argv:
        for n in names:
            for key, verdict, where in verify(n):
                print(f"{verdict:8} {n}.{key:<22} {where}")
                bad += [key] if verdict != "ok" else []
    sys.exit(1 if bad else 0)
