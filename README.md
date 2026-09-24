# Knots of Existence 結

**An atlas of the body’s held places.** A three-dimensional, open, long-running visualisation of what a “knot” might be — built
around the perforator hypothesis — knots as stuck perforators, with the fascial sheet as a second system — in Eugene Jhong’s essay
[Knots of Existence Hypotheses](https://ejhong.substack.com/p/knots-of-existence-hypotheses) (2026), set beside its rivals and beside the
maps the contemplative traditions drew of the same ground.

**Live:** <https://ejhong.github.io/knots/>

- **Introduction** — a guided tour in twelve chapters: press ▶ and the figure illustrates each one.
- **Atlas** — the body drawn as ~100,000 perforators; knots as stuck ones. Press a knot and breathe out; drag age from 1 to 90; aggravate a
  back ache; watch release climb the vessel trees toward their roots.
- **Hypotheses** — seven answers, each at its strongest, with a comparison table.
- **Traditions** — Chinese medicine, Daoist alchemy, yoga and tantra, Tibetan tsa lung and Dzogchen, Buddhist practice.
- **Library** — verified references and a short history of knots.

> A hypothesis drawn carefully; not medical advice. Perforator positions are representative, not a map of any one person.

The look follows [The OM Project](https://ejhong.github.io/om/): rice paper, ink-stone panels, small system type.

## Develop

```sh
npm install
npm run dev        # http://127.0.0.1:4321/knots/
npm test           # vitest: data integrity, body model, simulation
npm run check      # astro/TypeScript check
npm run build      # static site → dist/
npm run body       # rebuild public/models/body.{json,bin} from MakeHuman (CC0)
npx tsx scripts/shot.ts /knots/atlas shots/atlas.png   # screenshot bench (dev server running)
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## How it is made

| Piece | Where | Notes |
| --- | --- | --- |
| Figure | `scripts/body/`, `src/viewer/body/` | MakeHuman hm08 base mesh + age targets (CC0), morphed female↔male and 1–90 y, Catmull–Clark at runtime |
| Anatomical placement | `src/viewer/anchors/` | Landmark “locators” (rays from skeletal points) → anchors pinned to mesh topology, so everything follows the figure through a life |
| Perforator ladder | `src/viewer/perforators/generate.ts` | ~40 source roots → 374 major → ~3,600 medium → ~100,000 small, blue-noise sampled; trees are shortest paths along the skin |
| Knot simulation | `src/viewer/sim/` | Per-site vessel tone / collar gel / nerve, breath-gated, tree-coupled, age-settled; scenarios add drive |
| Hypotheses, maps, references | `src/data/` | Plain typed data; one registry feeds the atlas and the pages |
| Pages | `src/pages/` | Astro, static |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/DATA.md`](docs/DATA.md), [`docs/DESIGN.md`](docs/DESIGN.md) and
[`docs/ROADMAP.md`](docs/ROADMAP.md).

## Contributing

Corrections from anatomists, surgeons, clinicians and practitioners of the traditions are especially welcome — open an issue or a pull
request. References are verified against PubMed before they are added. New maps are written against the skeleton (see `docs/DATA.md`),
not as raw coordinates.

## License

Code: MIT ([LICENSE](LICENSE)). Writing and data: CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)). Figure: MakeHuman assets, CC0.
The essays in `docs/source/` are © Eugene Jhong, archived here for reference.
