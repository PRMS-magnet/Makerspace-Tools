import type { Piece, Polygon } from '../core/types';
import { installedToFlat } from '../core/polygon';
import type { RoofParams, RoofGeometry, RoofDerived } from './types';
import { rafterFlat, joistInstalled, collarTieInstalled } from './polygons';
import { buildRidgePolygon, type MortiseSpec } from './ridge';
import { shouldEmitPurlin, purlinPolygon } from './purlin';

function rect(w: number, h: number): Polygon {
  return [[0, 0], [w, 0], [w, h], [0, h]];
}

export function computeRoofCounts(
  p: RoofParams,
  stockThicknessIn = 0.125,
  ridgeEndMarginIn = 0,
): Omit<RoofDerived, 'geom'> {
  let nPairs: number;
  let effectiveHouseLengthIn: number;
  if (p.nPairsOverride !== null) {
    nPairs = p.nPairsOverride;
    effectiveHouseLengthIn = Math.max(p.rafterSpacingIn, (nPairs - 1) * p.rafterSpacingIn);
  } else {
    nPairs = Math.max(2, Math.round(p.houseLengthIn / p.rafterSpacingIn) + 1);
    effectiveHouseLengthIn = p.houseLengthIn;
  }
  const nRafters = nPairs * 2;



  const ridgeTotalLengthIn = nPairs >= 2
    ? (nPairs - 1) * p.rafterSpacingIn + stockThicknessIn + 2 * ridgeEndMarginIn
    : 0;
  const nRidgePieces = nPairs >= 2
    ? Math.max(1, Math.ceil(ridgeTotalLengthIn / p.maxPieceLengthIn))
    : 0;
  const ridgePieceLengthIn = nRidgePieces > 0 ? ridgeTotalLengthIn / nRidgePieces : 0;

  const joistDepthIn = p.rafterDepthIn;
  const collarFraction = 1 / 3;
  const tanT = Math.tan(Math.atan2(p.pitchRise, p.pitchRun));
  const rise = ((p.spanIn / 2) - stockThicknessIn / 2) * tanT;

  const joistBottomLengthIn = p.spanIn - 2 * p.wallThicknessIn;
  const joistTopLengthIn = joistBottomLengthIn - (2 * joistDepthIn) / tanT;
  const collarBottomLengthIn = p.spanIn - 2 * p.wallThicknessIn;
  const collarTopLengthIn =
    p.spanIn - 2 * p.wallThicknessIn - (2 * rise * (1 - collarFraction)) / tanT;

  return {
    nPairs, nRafters, effectiveHouseLengthIn,
    nRidgePieces, ridgePieceLengthIn,
    joistTopLengthIn, joistBottomLengthIn,
    collarTopLengthIn, collarBottomLengthIn,
  };
}

export interface BuildCutListPiecesOpts {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
  mortiseClearanceIn?: number;
  ridgeEndMarginIn: number;
  ridgeFaceMarginIn: number;






  smartPacking?: boolean;
}

export function buildCutListPieces(
  p: RoofParams,
  g: RoofGeometry,
  counts: Omit<RoofDerived, 'geom'>,
  opts: BuildCutListPiecesOpts,
): { pieces: Piece[]; warnings: string[] } {
  const pieces: Piece[] = [];
  const warnings: string[] = [];

  const joistDepthIn = p.rafterDepthIn;
  const collarDepthIn = p.rafterDepthIn * 0.6;
  const collarFraction = 1 / 3;

  const nominalTabHeight = g.plumbCutLength / 3;
  const tabKerf = opts.fitMode === 'press' ? opts.kerfPerSideIn : 0;
  const tabOpts = counts.nRidgePieces > 0
    ? { tabLengthIn: g.halfRidge + tabKerf, tabHeightIn: nominalTabHeight + 2 * tabKerf }
    : null;

  const rafterPoly = rafterFlat(g, p, tabOpts);





  const rafterRotations: readonly number[] | undefined = opts.smartPacking
    ? Object.freeze([
        0, 90, 180, 270,
        g.thetaDeg, 90 + g.thetaDeg, 180 + g.thetaDeg, 270 + g.thetaDeg,
      ])
    : undefined;
  for (let i = 0; i < counts.nRafters; i++) {
    pieces.push({ polygon: rafterPoly, op: 'cut', label: 'rafter', rotations: rafterRotations });
  }

  const mortiseKerf = opts.fitMode === 'slip' ? opts.kerfPerSideIn : 0;
  const mortiseClearanceIn = opts.mortiseClearanceIn ?? 0;
  const mortiseWidth = opts.stockThicknessIn + 2 * mortiseKerf + 2 * mortiseClearanceIn;
  const mortiseHeight = nominalTabHeight + 2 * mortiseKerf + 2 * mortiseClearanceIn;
  const ridgeHeightZ = g.plumbCutLength + 2 * opts.ridgeFaceMarginIn;
  const xOffsetIn = (counts.nPairs - 1) * p.rafterSpacingIn / 2;
  const ridgeLeftXHouse = -xOffsetIn - opts.ridgeEndMarginIn;
  const topMortiseCenterY = opts.ridgeFaceMarginIn + g.plumbCutLength - nominalTabHeight / 2;
  const bottomMortiseCenterY = opts.ridgeFaceMarginIn + nominalTabHeight / 2;

  for (let segIdx = 0; segIdx < counts.nRidgePieces; segIdx++) {
    const segStartXHouse = ridgeLeftXHouse + segIdx * counts.ridgePieceLengthIn;
    const segEndXHouse = segStartXHouse + counts.ridgePieceLengthIn;
    const mortises: MortiseSpec[] = [];
    for (let i = 0; i < counts.nPairs; i++) {
      const rafterXHouse = -xOffsetIn + i * p.rafterSpacingIn;
      if (rafterXHouse < segStartXHouse - 1e-9 || rafterXHouse > segEndXHouse + 1e-9) continue;
      const cx = rafterXHouse - segStartXHouse + opts.stockThicknessIn / 2;
      mortises.push({ cx, cy: topMortiseCenterY, halfW: mortiseWidth / 2, halfH: mortiseHeight / 2 });
      mortises.push({ cx, cy: bottomMortiseCenterY, halfW: mortiseWidth / 2, halfH: mortiseHeight / 2 });
    }
    const ridgePoly = buildRidgePolygon({
      lengthIn: counts.ridgePieceLengthIn,
      heightZ: ridgeHeightZ,
      mortises,
    });
    pieces.push({ polygon: ridgePoly, op: 'cut', label: 'ridge' });
  }

  const joistPolyInstalled = joistInstalled(g, p, joistDepthIn);
  const joistPoly = installedToFlat(joistPolyInstalled);
  const joistBBoxWidth = Math.max(...joistPoly.map(([x]) => x)) - Math.min(...joistPoly.map(([x]) => x));
  if (joistBBoxWidth > p.maxPieceLengthIn) {
    warnings.push(`joist length ${joistBBoxWidth.toFixed(2)}" exceeds max_piece_length`);
  }
  for (let i = 0; i < counts.nPairs; i++) {
    pieces.push({ polygon: joistPoly, op: 'cut', label: 'joist' });
  }

  const collarPolyInstalled = collarTieInstalled(g, p, collarDepthIn, collarFraction);
  const collarPoly = installedToFlat(collarPolyInstalled);
  const collarBBoxWidth = Math.max(...collarPoly.map(([x]) => x)) - Math.min(...collarPoly.map(([x]) => x));
  if (collarBBoxWidth > p.maxPieceLengthIn) {
    warnings.push(`collar tie length ${collarBBoxWidth.toFixed(2)}" exceeds max_piece_length`);
  }
  for (let i = 0; i < counts.nPairs; i++) {
    pieces.push({ polygon: collarPoly, op: 'cut', label: 'collar tie' });
  }

  const topPlatePoly = rect(p.spanIn, p.topPlateHeightIn);
  for (let i = 0; i < counts.nPairs; i++) {
    pieces.push({ polygon: topPlatePoly, op: 'cut', label: 'top plate' });
  }

  if (shouldEmitPurlin(g)) {
    const purlinPoly = purlinPolygon(p, opts.stockThicknessIn, { nPairs: counts.nPairs });
    pieces.push({ polygon: purlinPoly, op: 'cut', label: 'purlin' });
    pieces.push({ polygon: purlinPoly, op: 'cut', label: 'purlin' });
  }

  return { pieces, warnings };
}
