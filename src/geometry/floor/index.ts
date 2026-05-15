import { composeMultiOpCutSvg } from '../core/svg';
import { layoutOnSheet } from '../core/layout';
import type { Sheet, Piece, PlacedPiece, Piece3D } from '../core/types';
import type { FloorParams } from './types';
import { buildFloorCutListPieces } from './cutlist';
import { computeFloorPieces3D } from './place3d';
import { buildFloorDiagramSvg } from './diagram';

export interface FloorCutlistOptions {
  kerfPerSideIn?: number;
  fitMode?: 'press' | 'slip';
  mortiseClearanceIn?: number;
}

export interface FloorPiecesResult {
  pieces: Piece[];
  pieces3D: Piece3D[];
  sheet: Sheet;
  diagramSvg: string;
  warnings: string[];
}

export interface FloorOutput {
  cutSvg: string;
  diagramSvg: string;
  warnings: string[];
  pieces3D: Piece3D[];
}

export function floorPieces(p: FloorParams, _opts: FloorCutlistOptions = {}): FloorPiecesResult {
  const { pieces, warnings } = buildFloorCutListPieces(p, 'main');
  const pieces3D = computeFloorPieces3D(p, 'main');
  const sheet: Sheet = {
    widthIn: p.sheetWidthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
  };
  return { pieces, pieces3D, sheet, diagramSvg: buildFloorDiagramSvg(p), warnings };
}

export function composeFloorCutSvg(
  placed: PlacedPiece[],
  totalHeightIn: number,
  sheetWidthIn: number,
): string {
  return composeMultiOpCutSvg(placed, totalHeightIn, sheetWidthIn);
}

export function floorCutlist(p: FloorParams, opts: FloorCutlistOptions = {}): FloorOutput {
  const r = floorPieces(p, opts);
  const layout = layoutOnSheet(r.pieces, r.sheet);
  const cutSvg = composeFloorCutSvg(layout.placed, layout.totalHeightIn, p.sheetWidthIn);
  return {
    cutSvg,
    diagramSvg: r.diagramSvg,
    warnings: [...r.warnings, ...layout.warnings],
    pieces3D: r.pieces3D,
  };
}

export type { FloorParams, FloorUnit, FloorGeometry, BlockingSpec, FloorBlockRow } from './types';
