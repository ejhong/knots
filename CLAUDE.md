# Knots — notes for working in this repo

A long-running visualisation project: a static Astro site with a Three.js atlas of the body's perforators and knots.
Owner: Eugene Jhong. Source essays: `docs/source/*.md` (the Substack posts are canonical).

## Principles

- **Look and feel of The OM Project** (ejhong.github.io/om): rice paper, ink-stone panels, small system type (sans, Georgia,
  SF Mono), earth palette — terracotta for knots, sage for release. The figure itself is sacred art: light in an ink-stone card.
  See `docs/DESIGN.md`.
- **Anatomical honesty.** Counts and clusters come from the literature (Taylor & Palmer 1987; Saint-Cyr 2009). Anything representative
  is labelled as such. The simulation illustrates a hypothesis; it is not a measurement. Keep the safety cautions (the base of the skull
  is anatomy, not a target).
- **Fair to rivals.** Each hypothesis gets its strongest form, its best evidence and its sharpest test (`src/data/hypotheses.ts`).
- **Verified references only.** Add papers to `src/data/papers.json` from PubMed E-utilities output (title/authors/venue/DOI), never
  from memory.

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
- `src/pages/` — introduction, atlas, hypotheses, traditions, library, about (`lab` is a dev bench)
- `scripts/body/build-body.ts` — regenerates `public/models/body.*` from MakeHuman (cached downloads)
- `scripts/shot.ts` — Playwright screenshot bench; use it to check visual changes

## Conventions

- Figure axes: +x is the figure's **left**, +y up, +z front; metres; feet on y = 0.
- Place anything on the body with a `Locator` (see `anchors/locate.ts`), resolved on `REFERENCE_SHAPE`; never hard-code coordinates.
- `MeshBVH` must be built with `{ indirect: true }` — anchors depend on triangle order and `body.triangles` is shared.
- Colours: 3D in `engine/theme.ts`, CSS in `src/styles/tokens.css` (+ `app.css` for the instrument layout); keep them in step.
- Astro trims a line break before an inline tag: end such lines with `{' '}`.
- Before pushing: `npm run check && npm test && npm run build`, and screenshot any visual change.

## Workflow

- `npm run dev` then `npx tsx scripts/shot.ts /knots/atlas shots/x.png --eval "…"` (`window.atlas` is the scene).
- Deploy: push to `main` (GitHub Actions → Pages at https://ejhong.github.io/knots/).
- Roadmap and open questions: `docs/ROADMAP.md`.
