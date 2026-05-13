import { describe, it, expect } from 'vitest';
import { roofPieces } from '../../roof';
import { BUILTIN_ROOF_PRESETS } from '../../../state/presets/tool';
import { pack } from './nfp-packer';
import { bboxLayoutOnSheet } from './bbox-fallback';
import { isPolygonWithHoles } from '../types';
import { translate, bboxOf, convexHull, ensureCCW } from './geom';
import type { PlacedPiece } from '../types';

function placedHull(pp: PlacedPiece) {
  const outline = isPolygonWithHoles(pp.polygon) ? pp.polygon.outline : pp.polygon;
  return ensureCCW(convexHull(translate(outline, pp.offsetIn)));
}

function hullsOverlap(a: PlacedPiece, b: PlacedPiece, tol = 1e-6): boolean {
  const ha = placedHull(a);
  const hb = placedHull(b);

  const ba = bboxOf(ha), bb = bboxOf(hb);
  if (ba.maxX < bb.minX - tol || bb.maxX < ba.minX - tol) return false;
  if (ba.maxY < bb.minY - tol || bb.maxY < ba.minY - tol) return false;

  for (const p of ha) if (strictlyInside(p, hb, tol)) return true;
  for (const p of hb) if (strictlyInside(p, ha, tol)) return true;

  for (let i = 0; i < ha.length; i++) {
    const a1 = ha[i], a2 = ha[(i + 1) % ha.length];
    for (let j = 0; j < hb.length; j++) {
      const b1 = hb[j], b2 = hb[(j + 1) % hb.length];
      if (segmentsProperlyCross(a1, a2, b1, b2, tol)) return true;
    }
  }
  return false;
}

function strictlyInside(p: readonly [number, number], poly: readonly (readonly [number, number])[], tol: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1])) {
      const x = ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
      if (Math.abs(p[0] - x) < tol) return false;
      if (p[0] < x) inside = !inside;
    }
  }
  return inside;
}

function segmentsProperlyCross(a1: readonly [number, number], a2: readonly [number, number], b1: readonly [number, number], b2: readonly [number, number], tol: number): boolean {
  const d1 = (a2[0] - a1[0]) * (b1[1] - a1[1]) - (a2[1] - a1[1]) * (b1[0] - a1[0]);
  const d2 = (a2[0] - a1[0]) * (b2[1] - a1[1]) - (a2[1] - a1[1]) * (b2[0] - a1[0]);
  const d3 = (b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]);
  const d4 = (b2[0] - b1[0]) * (a2[1] - b1[1]) - (b2[1] - b1[1]) * (a2[0] - b1[0]);
  return ((d1 > tol && d2 < -tol) || (d1 < -tol && d2 > tol)) &&
         ((d3 > tol && d4 < -tol) || (d3 < -tol && d4 > tol));
}

describe('NFP packer real-world benchmark vs bbox baseline', () => {
  for (const preset of BUILTIN_ROOF_PRESETS) {
    it(`${preset.name}: NFP beats or matches bbox`, () => {
      const r = roofPieces(preset.params);
      const baseline = bboxLayoutOnSheet(r.pieces, r.sheet);
      const realtime = pack(r.pieces, r.sheet, {
        rotations: [0, 90, 180, 270],
        pieceSpacingIn: r.sheet.pieceSpacingIn ?? 0,
        effort: 'realtime',
      });
      const high = pack(r.pieces, r.sheet, {
        rotations: [0, 90, 180, 270],
        pieceSpacingIn: r.sheet.pieceSpacingIn ?? 0,
        effort: 'high',
      });
      console.log(
        `${preset.name.padEnd(28)} ` +
        `bbox=${baseline.totalHeightIn.toFixed(2)}" ` +
        `nfp_rt=${realtime.totalHeightIn.toFixed(2)}" (${(((baseline.totalHeightIn - realtime.totalHeightIn) / baseline.totalHeightIn) * 100).toFixed(1)}% saved, ${realtime.solveTimeMs}ms) ` +
        `nfp_hi=${high.totalHeightIn.toFixed(2)}" (${(((baseline.totalHeightIn - high.totalHeightIn) / baseline.totalHeightIn) * 100).toFixed(1)}% saved, ${high.solveTimeMs}ms)`,
      );
      expect(realtime.totalHeightIn).toBeLessThanOrEqual(baseline.totalHeightIn + 1e-3);
      expect(high.totalHeightIn).toBeLessThanOrEqual(realtime.totalHeightIn + 1e-3);

      for (let i = 0; i < high.placed.length; i++) {
        for (let j = i + 1; j < high.placed.length; j++) {
          const overlaps = hullsOverlap(high.placed[i], high.placed[j]);
          if (overlaps) {
            console.log(`OVERLAP ${high.placed[i].label} #${i} <> ${high.placed[j].label} #${j}`);
            console.log(`  i.offset=${high.placed[i].offsetIn}, hull=${JSON.stringify(placedHull(high.placed[i]))}`);
            console.log(`  j.offset=${high.placed[j].offsetIn}, hull=${JSON.stringify(placedHull(high.placed[j]))}`);
          }
          expect(overlaps).toBe(false);
        }
      }
    });
  }
});
