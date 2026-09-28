# Knots — notes for working in this repo

A long-running visualisation project: a static Astro site with a Three.js atlas of the body's perforators and knots.
Owner: Eugene Jhong. Source essays: `docs/source/*.md` (the Substack posts are canonical).

**Now: the field guide.** Each theory, run as a model from its own physiology, grows its knots in the same patch of body and
meets the same scenes, and shows how its knots would feel, respond and move, and what an instrument would record; where
the theories differ, a measurement can decide. Read `sim/PLAN.md` (the plan: aim, theories, senses, scenes, stages) and
`docs/SIMULATION.md` (the pages' design) before any simulation work. (The exam of 26–28 Sep, which scored theories against
the author's reports, is retired: `sim/archive/`.)

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
- **Simulation: the models speak first.** Each theory, in its strongest form as `hypotheses.ts` states it (variants wherever the
  equations are a choice), is run from its own physiology through the same scenes, and its knots' behaviour is read off the
  runs; nothing is fitted to anyone's reports, and no theory is scored against them. Every parameter carries its source
  (`papers.json` id, locator, quoted line) or is marked guessed with a range: never a number from memory. Traits are generated,
  never written by hand, and say whether they hold in every plausible setting, depend on an unmeasured number (which), or
  never happen; numbers from guessed parameters are the map, not the finding. Calibration (the shared stress scale) is shown as
  calibration. The work ends in a measurement: favour what designs it over more breadth or polish.
- **No author quotes on the site.** The author's answers to questions are rough impressions, not written for presentation;
  the site speaks in its own words. On the site, simulated inputs are *scenes*.

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
- `src/pages/` — introduction, atlas, hypotheses (each theory's account beside its model, with the field guide's instrument),
  research (the case for researchers), traditions, library, about (`lab` is a dev bench); `simulation/` redirects to
  `hypotheses/#watch`, and `simulation/vessel/` is one perforator up close
- `src/sim/` — the simulation in the browser: `guide/` (the field guide: player, patches, plates, instruments, character),
  `models/*.ts` (generated from Python; never edit), `vessel.ts` and `bench.ts` (the live vessel bench), `draw.ts` and
  `figures.ts` (figures as SVG strings); `src/data/sim/` and `public/sim/` (generated)
- `scripts/body/build-body.ts` — regenerates `public/models/body.*` from MakeHuman (cached downloads)
- `scripts/shot.ts` — Playwright screenshot bench; use it to check visual changes
- `sim/` — the simulation (Python, uv; `sim/README.md` has the layout): `PLAN.md`; `knots_sim/guide/` the field guide's engine
  (patch, scenes, senses, one runner per theory, traits, export); `knots_sim/models/` the theories' models; `params/` every
  number with its source; `archive/` the exam phase
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
- Simulation (`cd sim`): `uv run pytest`; `uv run python -m knots_sim.guide` runs every theory through every scene and writes
  the field guide's data; `uv run python -m knots_sim.export` regenerates the vessel bench's data and the TypeScript models;
  `uv run python -m knots_sim.params --verify` checks every quote against its source; `uv run python -m knots_sim.pubmed
  search "…"` finds papers, and `knots_sim.library` adds them to `papers.json` from PubMed's own records.
- Research documents: `src/pages/research/preprint.astro` and `pilot.astro` read their numbers from `src/data/sim/`; after
  the guide's data changes, reprint their PDFs with `npx tsx scripts/pdf.ts` (a running dev server) into `public/research/`.
- Deploy: push to `main` (GitHub Actions → Pages at https://ejhong.github.io/knots/). Every push also runs `ci.yml`: the sim
  tests, plus the site checks on branches other than `main`.
- Roadmap and open questions: `docs/ROADMAP.md`; the simulation's stages: `sim/PLAN.md` §10.
