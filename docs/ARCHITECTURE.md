# Architecture

```
src/viewer/AtlasScene.ts   assembles everything below and steps it each frame
 ├─ engine/Engine          WebGLRenderer + OrbitControls + EffectComposer (bloom only at night) + camera flights
 ├─ engine/Backdrop        full-screen void: mandorla halo, vignette, grain; drifting dust
 ├─ body/BodyModel         MakeHuman quads → (age, sex) morph → Catmull–Clark (sparse stencil) → normals
 ├─ body/BodyLayers        floor (deep fascia, opaque, occludes the far side) + superficial fascia (engraved veil)
 ├─ anchors/Locator3D      landmark locators → { tri, u, v } anchors via BVH ray casts (indirect BVH!)
 ├─ perforators/generate   blue-noise ladder + multi-source Dijkstra trees (territories = angiosomes)
 ├─ perforators/PerforatorCloud   100k points, relief-lit; knots swell into embers; stars
 ├─ perforators/TreeLines  unique tree edges with flow weight; pulses; drifting light toward roots
 ├─ perforators/RootMarkers  rings at the roots (gates)
 ├─ sim/KnotSim            per-site tone/gel/nerve; breath; tree coupling; release events
 ├─ interaction/*          picking (refit BVH), tools, hover
 └─ ui/AtlasUI, ui/HeroScene  DOM bindings
```

## Data flow

1. `BodyModel.setShape(REFERENCE_SHAPE)` — the adult reference used for all placement.
2. Roots, zones and maps resolve their locators on the reference figure into anchors.
3. The ladder is generated on the reference figure; perforators are anchors too.
4. Any later `setShape` (age, sex) re-evaluates every anchor; nothing is re-placed.
5. `KnotSim` runs on node indices (perforators, then roots); the cloud reads `sim.knot` / `sim.flash` each tick.

## Simulation (planned)

`sim/` (Python, uv) writes each theory's model once, in SymPy. Code generation emits the bench's TypeScript (`src/sim/models/`)
and the equations; sweeps and scoring export small JSON to `src/data/sim/`, which the pages read at build time. The Pages build
runs no simulation. Details: `docs/SIMULATION.md` (How it fits together) and `sim/PLAN.md` §9.

## Performance notes

- Ladder generation takes ~0.7 s on a fast laptop (main thread). Moving it to a worker is on the roadmap.
- The point cloud is one draw call; attributes for knots/flash are re-uploaded at the sim rate (30 Hz).
- Bloom is disabled in the paper theme.
