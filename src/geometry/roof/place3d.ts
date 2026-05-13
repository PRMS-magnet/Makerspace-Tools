import type { Piece, Piece3D, Polygon } from '../core/types';
import type { RoofParams, RoofGeometry, RoofDerived } from './types';
import { rafterInstalled, joistInstalled, collarTieInstalled } from './polygons';
import { buildRidgePolygon, type MortiseSpec } from './ridge';
import { shouldEmitPurlin, purlinPolygon } from './purlin';
import { buildContext, resolvePieces, type ResolveContext } from '../core/resolver';
import { simpleGablePreset } from '../building/presets';

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
  const t = opts.stockThicknessIn;
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

  const declared: Piece[] = [];

  for (let i = 0; i < counts.nPairs; i++) {
    declared.push({
      polygon: rafterLeftPoly,
      op: 'cut',
      label: 'rafter',
      placement: { kind: 'unit-rafter', unitId: 'main', indexAlongRidge: i, side: 'north' },
      extrudeDepthIn: t,
    });
    declared.push({
      polygon: rafterRightPoly,
      op: 'cut',
      label: 'rafter',
      placement: { kind: 'unit-rafter', unitId: 'main', indexAlongRidge: i, side: 'south' },
      extrudeDepthIn: t,
    });
    declared.push({
      polygon: joistPoly,
      op: 'cut',
      label: 'joist',
      placement: { kind: 'unit-joist', unitId: 'main', indexAlongRidge: i },
      extrudeDepthIn: t,
    });
    declared.push({
      polygon: collarPoly,
      op: 'cut',
      label: 'collar tie',
      placement: { kind: 'unit-collar', unitId: 'main', indexAlongRidge: i },
      extrudeDepthIn: t,
    });
  }

  const nominalTabHeight = g.plumbCutLength / 3;
  const ridgeHeightZ = g.plumbCutLength + 2 * opts.ridgeFaceMarginIn;
  const houseLen = (counts.nPairs - 1) * p.rafterSpacingIn;
  const xOffset = -houseLen / 2;
  const topMortiseCenterY = opts.ridgeFaceMarginIn + g.plumbCutLength - nominalTabHeight / 2;
  const bottomMortiseCenterY = opts.ridgeFaceMarginIn + nominalTabHeight / 2;

  for (let segIdx = 0; segIdx < counts.nRidgePieces; segIdx++) {
    const segStart = xOffset - opts.ridgeEndMarginIn + segIdx * counts.ridgePieceLengthIn;
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

    declared.push({
      polygon: ridgePoly,
      op: 'cut',
      label: 'ridge',
      placement: { kind: 'unit-ridge', unitId: 'main', segmentIndex: segIdx },
      extrudeDepthIn: t,
    });
  }

  if (shouldEmitPurlin(g)) {
    const purlinPoly = purlinPolygon(p, t, { nPairs: counts.nPairs });
    declared.push({
      polygon: purlinPoly,
      op: 'cut',
      label: 'purlin',
      placement: { kind: 'unit-purlin', unitId: 'main', side: 'south' },
      extrudeDepthIn: t,
    });
    declared.push({
      polygon: purlinPoly,
      op: 'cut',
      label: 'purlin',
      placement: { kind: 'unit-purlin', unitId: 'main', side: 'north' },
      extrudeDepthIn: t,
    });
  }

  const building = simpleGablePreset(p);
  const ctx: ResolveContext = buildContext(building, {
    stockThicknessIn: t,
    ridgeEndMarginIn: opts.ridgeEndMarginIn,
    ridgeFaceMarginIn: opts.ridgeFaceMarginIn,
  });
  return resolvePieces(declared, ctx);
}
