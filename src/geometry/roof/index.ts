import { composeMultiOpCutSvg } from '../core/svg';
import { layoutOnSheet } from '../core/layout';
import type { Sheet, Piece, PlacedPiece } from '../core/types';
import type { RoofParams, RoofOutput, RoofDerived } from './types';
import { computeRoofGeometry } from './compute';
import { buildCutListPieces, computeRoofCounts } from './cutlist';
import { buildDiagramSvg, type DiagramColorMode } from './diagram';
import { computeRoofPieces3D } from './place3d';
import type { Piece3D } from '../core/types';

export interface RoofCutlistOptions {
  stockThicknessIn?: number;
  kerfPerSideIn?: number;
  fitMode?: 'press' | 'slip';
  mortiseClearanceIn?: number;
  ridgeEndMarginIn?: number;
  ridgeFaceMarginIn?: number;
  colorMode?: DiagramColorMode;



  smartPacking?: boolean;
}

export interface RoofPiecesResult {
  pieces: Piece[];
  sheet: Sheet;
  diagramSvg: string;
  derived: RoofDerived;
  pieces3D: Piece3D[];
  warnings: string[];
}




export function roofPieces(p: RoofParams, opts: RoofCutlistOptions = {}): RoofPiecesResult {
  const stockThicknessIn = opts.stockThicknessIn ?? 0.125;
  const kerfPerSideIn = opts.kerfPerSideIn ?? 0.006;
  const fitMode = opts.fitMode ?? 'press';
  const mortiseClearanceIn = opts.mortiseClearanceIn ?? 0.005;
  const ridgeEndMarginIn = opts.ridgeEndMarginIn ?? 0;
  const ridgeFaceMarginIn = opts.ridgeFaceMarginIn ?? 0.125;

  const geom = computeRoofGeometry(p, stockThicknessIn);
  const counts = computeRoofCounts(p, stockThicknessIn, ridgeEndMarginIn);
  const { pieces, warnings: cutWarnings } = buildCutListPieces(p, geom, counts, {
    stockThicknessIn,
    kerfPerSideIn,
    fitMode,
    mortiseClearanceIn,
    ridgeEndMarginIn,
    ridgeFaceMarginIn,
    smartPacking: opts.smartPacking,
  });

  const sheet: Sheet = {
    widthIn: p.sheetWidthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
  };
  const diagramSvg = buildDiagramSvg(p, geom, stockThicknessIn, ridgeFaceMarginIn, counts.nRidgePieces > 0, undefined, opts.colorMode);
  const pieces3D = computeRoofPieces3D(p, geom, counts, {
    stockThicknessIn,
    kerfPerSideIn,
    fitMode,
    mortiseClearanceIn,
    ridgeEndMarginIn,
    ridgeFaceMarginIn,
  });

  return {
    pieces,
    sheet,
    diagramSvg,
    derived: { geom, ...counts },
    pieces3D,
    warnings: cutWarnings,
  };
}


export function composeRoofCutSvg(
  placed: PlacedPiece[],
  totalHeightIn: number,
  sheetWidthIn: number,
): string {
  return composeMultiOpCutSvg(placed, totalHeightIn, sheetWidthIn);
}



export function roofCutlist(p: RoofParams, opts: RoofCutlistOptions = {}): RoofOutput {
  const r = roofPieces(p, opts);
  const layout = layoutOnSheet(r.pieces, r.sheet);
  const cutSvg = composeRoofCutSvg(layout.placed, layout.totalHeightIn, p.sheetWidthIn);
  return {
    cutSvg,
    diagramSvg: r.diagramSvg,
    derived: r.derived,
    warnings: [...r.warnings, ...layout.warnings],
    pieces3D: r.pieces3D,
  };
}

export type { RoofParams, RoofOutput, RoofGeometry, RoofDerived } from './types';
export type { DiagramColorMode } from './diagram';
