import type { Vec3 } from '../anchors/locate';

/**
 * Where major perforators crowd. Taylor & Palmer (1987): "Arteries follow
 * closely the connective tissue framework of the body" — so the larger
 * cutaneous perforators come up along intermuscular septa, beside the
 * midlines, and where skin is fixed near joints. Surgeons' maps agree on the
 * clusters encoded here: the paraspinal rows of the back, the parasternal
 * row, the periumbilical field (DIEP), the anterolateral thigh (ALT), and
 * the dense small arteries of the face and scalp.
 *
 * Returns a relative density (1 = body average). Positions are metres in
 * the reference adult, +x the figure's left, +z front.
 */
export function majorDensity(joint: (n: string) => Vec3) {
  const J = (n: string) => joint(n);
  const pelvis = J('pelvis');
  const neck = J('neck');
  const head = J('head');
  const s1 = J('spine-1');
  const s4 = J('spine-4');
  const umbilicus: Vec3 = [0, s4[1] - 0.01, s4[2] + 0.1];

  const gauss = (d2: number, r: number) => Math.exp(-d2 / (2 * r * r));
  const lineDist2 = (p: Vec3, a: Vec3, b: Vec3) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L));
    const q = [a[0] + ab[0] * t - p[0], a[1] + ab[1] * t - p[1], a[2] + ab[2] * t - p[2]];
    return q[0] ** 2 + q[1] ** 2 + q[2] ** 2;
  };

  const joints = ['elbow', 'knee', 'ankle', 'hand'].flatMap((j) => [J(`l-${j}`), J(`r-${j}`)]);
  const altL: [Vec3, Vec3] = [J('l-upper-leg'), J('l-knee')];
  const altR: [Vec3, Vec3] = [J('r-upper-leg'), J('r-knee')];

  return (x: number, y: number, z: number): number => {
    const p: Vec3 = [x, y, z];
    let d = 1;
    const onTorso = y > pelvis[1] - 0.12 && y < neck[1] && Math.abs(x) < 0.2;
    // Paraspinal rows (back): two rows each side.
    if (onTorso && z < s1[2]) {
      const ax = Math.abs(x);
      d += 1.2 * gauss((ax - 0.025) ** 2, 0.012) + 0.9 * gauss((ax - 0.07) ** 2, 0.015);
    }
    // Parasternal row (chest front).
    if (y > s1[1] - 0.05 && y < neck[1] - 0.02 && z > s1[2]) d += 1.1 * gauss((Math.abs(x) - 0.03) ** 2, 0.012);
    // Periumbilical field.
    d += 1.8 * gauss((x - umbilicus[0]) ** 2 + (y - umbilicus[1]) ** 2 + Math.max(0, umbilicus[2] - z) ** 2 * 4, 0.06);
    // Face and scalp.
    if (y > head[1] - 0.05) d += 0.9;
    // Fixed skin near joints.
    for (const j of joints) d += 0.6 * gauss((x - j[0]) ** 2 + (y - j[1]) ** 2 + (z - j[2]) ** 2, 0.05);
    // Anterolateral thigh septum (between rectus femoris and vastus lateralis).
    for (const [a, b] of [altL, altR]) {
      if (z > a[2] - 0.02) {
        const side = Math.sign(a[0]);
        const lateral = (x - a[0]) * side > 0.02;
        if (lateral) d += 0.8 * gauss(lineDist2(p, a, b), 0.05);
      }
    }
    return d;
  };
}
