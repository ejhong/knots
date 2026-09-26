# Knots — notes for working in this repo

A long-running visualisation project: a static Astro site with a Three.js atlas of the body's perforators and knots.
Owner: Eugene Jhong. Source essays: `docs/source/*.md` (the Substack posts are canonical).

**Next phase: simulation.** Every theory as a dynamical model, run against the reported observations; from the survivors, what
an instrument would record at a release under each, and the measurement that would settle it; a new section of the site to
show all of it. Read `sim/PLAN.md` (the research plan: its path, next steps, papers to get and open decisions) and
`docs/SIMULATION.md` (the section's design) before any simulation work.

## Principles

- **Look and feel of The OM Project** (ejhong.github.io/om), cooled: warm rice paper, cool ink (slate-indigo) panels and night
  view, small system type (sans, Georgia, SF Mono) — terracotta for knots and nothing else (the same in every theory, the brightest
  thing on the body), jade for release and the characters, an indigo seal; perforators are one neutral colour, told apart by size
  and brightness. The figure itself is sacred art: light in an ink-stone card. See `docs/DESIGN.md`.
- **Anatomical honesty.** Counts and clusters come from the literature (Taylor & Palmer 1987; Saint-Cyr 2009). Anything representative
  is labelled as such. The atlas's simulation illustrates a hypothesis; it is not a measurement.
- **Describe, never prescribe.** Nothing is a protocol. Keep the moderation guidance (Varieties of Contemplative Experience, Cheetah
  House) and keep the narrative general; check with the author before adding anything about technique or intensity.
- **Words.** Say *fascia* (not “sheet”) and *knots* or *perforators* (not “staples”). State things directly: the essays are credited in
  About and listed in the Library (sources run newest first), not narrated (“the essay says”).
- **Fair to every theory.** Each gets its strongest form, its best evidence and its sharpest test (`src/data/hypotheses.ts`); the
  atlas menu uses its one- or two-word `label`.
- **Verified references only.** Add papers to `src/data/papers.json` from PubMed E-utilities output (title/authors/venue/DOI), never
  from memory.
- **Simulation: *can*, not *is*.** The models ask which theories can produce which observations, at what parameter cost, and what
  would tell them apart; never which theory is true. Each theory in its strongest form, as `hypotheses.ts` states it, with
  variants wherever the equations are a choice. Every parameter carries its source (`papers.json` id, locator, quoted line) or is
  marked as guessed: never a number from memory. The exam (`sim/observations/spec.yaml`) is frozen before any sweep (the site
  shows it sealed) and changes only by a new, dated version. Results are generated, never edited by hand, and each names its
  run. On the site, simulated inputs are *trials*. How the breath acts is kept open: it enters every model as routes (drive,
  movement, local nerve, attention, chemistry), each a variant, never one assumed mechanism (`sim/PLAN.md` §2).

## Layout

- `src/viewer/` — the 3D atlas (framework-free TypeScript + Three.js)
  - `AtlasScene.ts` assembles everything; `engine/` renderer, camera, bloom, backdrop
  - `body/` MakeHuman figure, morphs, subdivision, fascial layers & materials
  - `anchors/` landmark locators → topology anchors (`{ tri, u, v }` on the fine mesh)
  - `perforators/` ladder generation, point cloud, trees, pulses, root markers
  - `sim/` breath, knot dynamics, scenarios
  - `interaction/` picking and tools; `ui/` DOM bindings for the atlas and hero
  - `data/` roots, knot zones, perforator density (anatomical data used by the viewer)
- `src/data/` — site-wide registries: hypotheses, references (+ `papers.json`), timeline, map index
- `src/pages/` — introduction, atlas, hypotheses, traditions, library, about, simulation (unlisted; `lab` is a dev bench)
- `src/sim/` — the simulation in the browser: `models/*.ts` (generated from Python; never edit), `vessel.ts` (stepper,
  calibration, inputs), `draw.ts` (figures as SVG strings), `bench.ts` (the live instrument); `src/data/sim/` (generated)
- `scripts/body/build-body.ts` — regenerates `public/models/body.*` from MakeHuman (cached downloads)
- `scripts/shot.ts` — Playwright screenshot bench; use it to check visual changes
- `sim/` — the simulation phase (Python, uv), built stage by stage (`sim/README.md` has the layout as it grows): `PLAN.md` (its
  source brief is `BRIEF.md`); `knots_sim/` models, trials, scoring, sweeps, codegen, export; `observations/` and `params/` (the
  data people review); `results/` (run manifests)
- `docs/` — `DESIGN.md` (look), `ARCHITECTURE.md`, `DATA.md` (formats), `SIMULATION.md` (the simulation section), `ROADMAP.md`

## Conventions

- Figure axes: +x is the figure's **left**, +y up, +z front; metres; feet on y = 0.
- Place anything on the body with a `Locator` (see `anchors/locate.ts`), resolved on `REFERENCE_SHAPE`; never hard-code coordinates.
- `MeshBVH` must be built with `{ indirect: true }` — anchors depend on triangle order and `body.triangles` is shared.
- Colours: 3D in `engine/theme.ts`, CSS in `src/styles/tokens.css` (+ `app.css` for the instrument layout); keep them in step.
- Astro trims a line break before an inline tag: end such lines with `{' '}`.
- Before pushing: `npm run check && npm test && npm run build`, and screenshot any visual change; after changes in `sim/`, also
  `cd sim && uv run pytest`.

## Workflow

- `npm run dev` then `npx tsx scripts/shot.ts /knots/atlas shots/x.png --eval "…"` (`window.atlas` is the scene).
- `SHOT_CHROMIUM=<path>` points `scripts/shot.ts` at another Chromium (cloud sessions set it to the pre-installed one).
- Simulation (`cd sim`): `uv run pytest`; `uv run python -m knots_sim.export` regenerates everything the site shows (the
  TypeScript models, `src/data/sim/*.json`, the findings note; a test fails if it is stale); `uv run python -m
  knots_sim.params --verify` checks every quote against its source; `uv run python -m knots_sim.pubmed search "…"` finds
  papers, and `knots_sim.library` adds them to `papers.json` from PubMed's own records.
- Deploy: push to `main` (GitHub Actions → Pages at https://ejhong.github.io/knots/). Every push also runs `ci.yml`: the sim
  tests, plus the site checks on branches other than `main`.
- Roadmap and open questions: `docs/ROADMAP.md`; the simulation's next steps and papers to get: `sim/PLAN.md` §11; its open
  decisions: §13.
