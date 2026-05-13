import type { Building, BuildingOutput, IntersectionDerived } from './types';
import type { RoofCutlistOptions } from '../roof';
import { roofPieces, composeRoofCutSvg } from '../roof';
import { computeIntersection } from './intersect';
import { buildPlanDiagram } from './diagram';
import { unitPlacement, applyPlacementToPiece3D } from './place3d';
import { layoutOnSheet } from '../core/layout';
import type { Sheet, Piece, Piece3D } from '../core/types';

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

  const stockThicknessIn = opts.stockThicknessIn ?? 0.125;
  const kerfPerSideIn = opts.kerfPerSideIn ?? 0.006;
  const fitMode = opts.fitMode ?? 'press';

  const unitOutputs = b.units.map((u, i) => {
    const r = roofPieces(unitToRoofParams(b, i), opts);
    const placement = unitPlacement(b, i);
    const transformed3D = r.pieces3D.map((p) => applyPlacementToPiece3D(p, placement));
    return {
      unit: u,
      pieces: r.pieces,
      pieces3D: transformed3D,
      derived: r.derived,
      diagramSvg: r.diagramSvg,
      warnings: r.warnings,
    };
  });

  let allPieces: Piece[] = [];
  let all3D: Piece3D[] = [];
  const allWarnings: string[] = [];
  for (const u of unitOutputs) {
    allPieces.push(...u.pieces);
    all3D.push(...u.pieces3D);
    allWarnings.push(...u.warnings);
  }

  const perIntersection: Record<string, IntersectionDerived> = {};
  for (const inter of b.intersections) {
    const host = b.units.find((u) => u.id === inter.hostId);
    const guest = b.units.find((u) => u.id === inter.guestId);
    if (!host || !guest) {
      throw new Error(`Intersection ${inter.id} refers to unknown unit`);
    }
    const hostOutput = unitOutputs.find((u) => u.unit.id === inter.hostId);
    const r = computeIntersection(host, guest, inter, { stockThicknessIn, kerfPerSideIn, fitMode });
    perIntersection[inter.id] = r.derived;

    if (r.guestPiecesToReplace.length) {
      allPieces = allPieces.filter((p) => !r.guestPiecesToReplace.includes(p.label ?? ''));
      all3D = all3D.filter((p) => !r.guestPiecesToReplace.includes(p.label ?? ''));
    }
    allPieces.push(...r.newPieces, ...r.hostPiecesToAdd);
    all3D.push(...r.new3D, ...r.host3DToAdd);

    if (hostOutput && r.derived.trimmerExtraCount > 0) {
      const rafter = hostOutput.pieces.find((p) => p.label === 'rafter');
      if (rafter) {
        for (let i = 0; i < r.derived.trimmerExtraCount; i++) {
          allPieces.push({
            polygon: rafter.polygon,
            op: rafter.op,
            label: 'trimmer-extra',
            rotations: rafter.rotations,
          });
        }
      }
    }
  }

  const sheet: Sheet = {
    widthIn: b.sheetWidthIn,
    marginIn: b.marginIn,
    pieceSpacingIn: b.pieceSpacingIn,
  };
  const layout = layoutOnSheet(allPieces, sheet);
  const cutSvg = composeRoofCutSvg(layout.placed, layout.totalHeightIn, b.sheetWidthIn);

  const perUnit: BuildingOutput['derived']['perUnit'] = {};
  for (const u of unitOutputs) {
    perUnit[u.unit.id] = u.derived;
  }

  return {
    cutSvg,
    diagramSvg: unitOutputs[0].diagramSvg,
    planDiagramSvg: buildPlanDiagram(b),
    derived: { perUnit, perIntersection },
    warnings: [...allWarnings, ...layout.warnings],
    pieces3D: all3D,
    pieces: allPieces,
    sheet,
  };
}
