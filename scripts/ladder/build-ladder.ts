/**
 * Precomputes where the perforators are (the expensive blue-noise placement)
 * and writes public/models/ladder.bin, so the site does not compute it on
 * every visit. Runs before each build (npm run build); the viewer falls back
 * to computing if the file does not match the body or the parameters.
 *
 *   npx tsx scripts/ladder/build-ladder.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BodyModel, REFERENCE_SHAPE, type BodyMeta } from '../../src/viewer/body/BodyModel';
import { perforatorDensity } from '../../src/viewer/data/perforatorDensity';
import { Locator3D, type Vec3 } from '../../src/viewer/anchors/locate';
import { DEFAULT_LADDER, placeLadder } from '../../src/viewer/perforators/generate';
import { encodePlacement, placementKey } from '../../src/viewer/perforators/placementFile';

const models = resolve(import.meta.dirname, '../../public/models');
const text = readFileSync(`${models}/body.json`, 'utf8');
const bin = readFileSync(`${models}/body.bin`);
const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer;
const body = BodyModel.fromBuffers(JSON.parse(text) as BodyMeta, buf, text);
body.setShape(REFERENCE_SHAPE);

const t0 = performance.now();
const joint = (n: string) => body.joint(n) as Vec3;
const P = Float32Array.from(body.positions);
const T = body.triangles;
const locator = new Locator3D(P, Float32Array.from(body.normals), T, joint);
const locate = (l: Parameters<Locator3D['resolve']>[0]): Vec3 | null => {
  const a = locator.resolve(l);
  if (!a) return null;
  const w = 1 - a.u - a.v;
  const [i, j, k] = [T[a.tri * 3] * 3, T[a.tri * 3 + 1] * 3, T[a.tri * 3 + 2] * 3];
  return [0, 1, 2].map((c) => P[i + c] * w + P[j + c] * a.u + P[k + c] * a.v) as Vec3;
};
const placement = placeLadder({ positions: body.positions, triangles: body.triangles, density: () => perforatorDensity({ joint, locate }) }, DEFAULT_LADDER);
const out = encodePlacement(placement, placementKey(DEFAULT_LADDER, body.sourceKey));
writeFileSync(`${models}/ladder.bin`, new Uint8Array(out));
console.log(
  `ladder.bin: ${placement.tri.length} perforators (${placement.nMaj} major, ${placement.nMed} medium) placed in ${(performance.now() - t0).toFixed(0)} ms — ${(out.byteLength / 1024).toFixed(0)} KB`,
);
