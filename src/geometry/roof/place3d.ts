import type { Piece3D, Polygon } from '../core/types';
import type { RoofParams, RoofGeometry, RoofDerived } from './types';
import { rafterInstalled, joistInstalled, collarTieInstalled } from './polygons';
import { buildRidgePolygon, type MortiseSpec } from './ridge';

const CROSS_SECTION_U: readonly [number, number, number] = [0, 1, 0];
const CROSS_SECTION_V: readonly [number, number, number] = [0, 0, 1];

interface Place3DParams {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
  ridgeEndMarginIn: number;
  ridgeFaceMarginIn: number;
}

export function computeRoofPieces3D(
  p: RoofParams,
  g: RoofGeometry,
  counts: Omit<RoofDerived, 'geom'>,
  opts: Place3DParams,
): Piece3D[] {
  const pieces: Piece3D[] = [];
  const t = opts.stockThicknessIn;
  const houseLen = (counts.nPairs - 1) * p.rafterSpacingIn;
  const xOffset = -houseLen / 2;
  const halfSpan = p.spanIn / 2;

  const centerY = (poly: Polygon): Polygon =>
    poly.map(([x, y]) => [x - halfSpan, y]) as Polygon;

  const rafterTabOpts = counts.nRidgePieces > 0
    ? { tabLengthIn: g.halfRidge, tabHeightIn: g.plumbCutLength / 3 }
    : null;

  const rafterLeftPoly = centerY(rafterInstalled(g, p, false, rafterTabOpts));
  const rafterRightPoly = centerY(rafterInstalled(g, p, true, rafterTabOpts));
  const joistDepthIn = p.rafterDepthIn;
  const joistPoly = centerY(joistInstalled(g, p, joistDepthIn));
  const collarDepthIn = p.rafterDepthIn * 0.6;
  const collarPoly = centerY(collarTieInstalled(g, p, collarDepthIn, 1 / 3));

  for (let i = 0; i < counts.nPairs; i++) {
    const xPos = xOffset + i * p.rafterSpacingIn;
    const origin: readonly [number, number, number] = [xPos, 0, 0];

    pieces.push({
      polygon: rafterLeftPoly,
      origin,
      uAxis: CROSS_SECTION_U,
      vAxis: CROSS_SECTION_V,
      extrudeDepthIn: t,
      label: 'rafter',
      op: 'cut',
    });

    pieces.push({
      polygon: rafterRightPoly,
      origin,
      uAxis: CROSS_SECTION_U,
      vAxis: CROSS_SECTION_V,
      extrudeDepthIn: t,
      label: 'rafter',
      op: 'cut',
    });

    pieces.push({
      polygon: joistPoly,
      origin,
      uAxis: CROSS_SECTION_U,
      vAxis: CROSS_SECTION_V,
      extrudeDepthIn: t,
      label: 'joist',
      op: 'cut',
    });

    pieces.push({
      polygon: collarPoly,
      origin,
      uAxis: CROSS_SECTION_U,
      vAxis: CROSS_SECTION_V,
      extrudeDepthIn: t,
      label: 'collar tie',
      op: 'cut',
    });
  }

  const nominalTabHeight = g.plumbCutLength / 3;
  const ridgeHeightZ = g.plumbCutLength + 2 * opts.ridgeFaceMarginIn;
  const yBotR = g.tanT * (g.R - p.wallThicknessIn);
  const ridgeBottomZ = yBotR - opts.ridgeFaceMarginIn;
  const ridgeLeftWorldX = xOffset - opts.ridgeEndMarginIn;
  const topMortiseCenterY = opts.ridgeFaceMarginIn + g.plumbCutLength - nominalTabHeight / 2;
  const bottomMortiseCenterY = opts.ridgeFaceMarginIn + nominalTabHeight / 2;
  const ridgeAlongAxis: readonly [number, number, number] = [1, 0, 0];
  const ridgeUpAxis: readonly [number, number, number] = [0, 0, 1];

  for (let segIdx = 0; segIdx < counts.nRidgePieces; segIdx++) {
    const segStart = ridgeLeftWorldX + segIdx * counts.ridgePieceLengthIn;
    const segEnd = segStart + counts.ridgePieceLengthIn;
    const mortises: MortiseSpec[] = [];
    for (let i = 0; i < counts.nPairs; i++) {
      const rafterX = xOffset + i * p.rafterSpacingIn;
      if (rafterX < segStart - 1e-9 || rafterX > segEnd + 1e-9) continue;
      const cx = rafterX - segStart + t / 2;
      mortises.push({ cx, cy: topMortiseCenterY, halfW: t / 2, halfH: nominalTabHeight / 2 });
      mortises.push({ cx, cy: bottomMortiseCenterY, halfW: t / 2, halfH: nominalTabHeight / 2 });
    }
    const ridgePoly = buildRidgePolygon({
      lengthIn: counts.ridgePieceLengthIn,
      heightZ: ridgeHeightZ,
      mortises,
    });

    pieces.push({
      polygon: ridgePoly,
      origin: [segStart, t / 2, ridgeBottomZ],
      uAxis: ridgeAlongAxis,
      vAxis: ridgeUpAxis,
      extrudeDepthIn: t,
      label: 'ridge',
      op: 'cut',
    });
  }

  return pieces;
}
