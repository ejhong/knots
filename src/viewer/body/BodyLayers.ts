import { BufferAttribute, BufferGeometry, Mesh } from 'three';
import type { SceneTheme } from '../engine/theme';
import type { BodyModel } from './BodyModel';
import { applyFloorTheme, applySheetTheme, createFloorMaterial, createSheetMaterial } from './materials';

/**
 * The two surfaces of the essay's second system:
 *  - the floor — deep fascia, an opaque surface a few millimetres in, which
 *    also hides the far side of the constellation;
 *  - the sheet — skin and superficial fascia, an engraved veil that can be
 *    lifted off the floor to open the interstitial plane between them.
 */
export class BodyLayers {
  readonly floorGeometry = new BufferGeometry();
  readonly sheetGeometry = new BufferGeometry();
  readonly floor: Mesh;
  readonly sheet: Mesh;
  readonly floorMaterial = createFloorMaterial();
  readonly sheetMaterial = createSheetMaterial();
  private posAttr: BufferAttribute;
  private nrmAttr: BufferAttribute;
  /** Per-vertex floor inset (m). */
  readonly inset: Float32Array;
  /** Per-vertex explode weight (0 fingers … 1 broad surfaces). */
  readonly liftWeight: Float32Array;
  /** Per-vertex depth of the superficial fascia below the skin (m). */
  readonly sup: Float32Array;

  constructor(readonly body: BodyModel) {
    const n = body.fineCount;
    this.posAttr = new BufferAttribute(body.positions, 3);
    this.nrmAttr = new BufferAttribute(body.normals, 3);
    const index = new BufferAttribute(body.triangles, 1);
    this.inset = new Float32Array(n).fill(0.0022);
    this.liftWeight = new Float32Array(n).fill(1);
    this.sup = new Float32Array(n).fill(0.001);

    for (const g of [this.floorGeometry, this.sheetGeometry]) {
      g.setAttribute('position', this.posAttr);
      g.setAttribute('normal', this.nrmAttr);
      g.setIndex(index);
    }
    this.floorGeometry.setAttribute('aInset', new BufferAttribute(this.inset, 1));
    this.floorGeometry.setAttribute('aTerritory', new BufferAttribute(new Float32Array(n * 3), 3));
    this.sheetGeometry.setAttribute('aLift', new BufferAttribute(this.liftWeight, 1));
    this.sheetGeometry.setAttribute('aSup', new BufferAttribute(this.sup, 1));
    this.sheetGeometry.setAttribute('aStone', new BufferAttribute(new Float32Array(n * 3), 3));
    this.sheetGeometry.setAttribute('aStoneWeight', new BufferAttribute(new Float32Array(n), 1));

    this.floor = new Mesh(this.floorGeometry, this.floorMaterial);
    this.floor.renderOrder = 0;
    this.sheet = new Mesh(this.sheetGeometry, this.sheetMaterial);
    this.sheet.renderOrder = 1.5;
    this.sheet.visible = false;
    for (const m of [this.floor, this.sheet]) m.frustumCulled = false;
  }

  /** Call after BodyModel.setShape. */
  refresh() {
    this.posAttr.needsUpdate = true;
    this.nrmAttr.needsUpdate = true;
    this.floorGeometry.computeBoundingSphere();
  }

  setTerritoryColors(colors: Float32Array) {
    const a = this.floorGeometry.getAttribute('aTerritory') as BufferAttribute;
    (a.array as Float32Array).set(colors);
    a.needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    applyFloorTheme(this.floorMaterial, t);
    applySheetTheme(this.sheetMaterial, t);
  }
}
