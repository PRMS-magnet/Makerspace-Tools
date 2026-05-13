import type { Building, BuildingOutput } from './types';
import type { RoofCutlistOptions } from '../roof';
import { roofPieces, composeRoofCutSvg } from '../roof';
import { layoutOnSheet } from '../core/layout';
import type { Sheet } from '../core/types';

function unitToRoofParams(b: Building, unitIndex: number) {
  const u = b.units[unitIndex];
  return {
    spanIn: u.spanIn,
    pitchRise: u.pitchRise,
    pitchRun: u.pitchRun,
    rafterDepthIn: u.rafterDepthIn,
    wallThicknessIn: u.wallThicknessIn,
    overhangRunIn: u.overhangRunIn,
    houseLengthIn: u.houseLengthIn,
    rafterSpacingIn: u.rafterSpacingIn,
    topPlateHeightIn: u.topPlateHeightIn,
    nPairsOverride: u.nPairsOverride,
    sheetWidthIn: b.sheetWidthIn,
    maxPieceLengthIn: b.maxPieceLengthIn,
    marginIn: b.marginIn,
    pieceSpacingIn: b.pieceSpacingIn,
    ridgeEndMarginIn: b.ridgeEndMarginIn,
    ridgeFaceMarginIn: b.ridgeFaceMarginIn,
  };
}

export function buildingCutlist(
  b: Building,
  opts: RoofCutlistOptions = {},
): BuildingOutput {
  if (b.units.length === 0) {
    throw new Error('Building must have at least one unit');
  }
  if (b.intersections.length > 1) {
    throw new Error('Cycle A supports at most one intersection per Building');
  }

  if (b.intersections.length === 0) {
    const hostParams = unitToRoofParams(b, 0);
    const r = roofPieces(hostParams, opts);
    const sheet: Sheet = {
      widthIn: b.sheetWidthIn,
      marginIn: b.marginIn,
      pieceSpacingIn: b.pieceSpacingIn,
    };
    const layout = layoutOnSheet(r.pieces, sheet);
    const cutSvg = composeRoofCutSvg(layout.placed, layout.totalHeightIn, b.sheetWidthIn);
    return {
      cutSvg,
      diagramSvg: r.diagramSvg,
      planDiagramSvg: '',
      derived: {
        perUnit: { [b.units[0].id]: r.derived },
        perIntersection: {},
      },
      warnings: [...r.warnings, ...layout.warnings],
      pieces3D: r.pieces3D,
    };
  }

  throw new Error('Intersections not yet implemented');
}
