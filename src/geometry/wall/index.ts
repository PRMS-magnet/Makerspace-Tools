import { composeMultiOpCutSvg } from '../core/svg';
import { layoutOnSheet } from '../core/layout';
import type { Sheet, Piece, PlacedPiece, Piece3D } from '../core/types';
import type { WallParams } from './types';
import { buildWallCutListPieces } from './cutlist';
import { computeWallPieces3D } from './place3d';
import { buildWallDiagramSvg } from './diagram';

export interface WallCutlistOptions {
  kerfPerSideIn?: number;
  fitMode?: 'press' | 'slip';
  mortiseClearanceIn?: number;
}

export interface WallPiecesResult {
  pieces: Piece[];
  pieces3D: Piece3D[];
  sheet: Sheet;
  diagramSvg: string;
  warnings: string[];
}

export interface WallOutput {
  cutSvg: string;
  diagramSvg: string;
  warnings: string[];
  pieces3D: Piece3D[];
}

export function wallPieces(p: WallParams, _opts: WallCutlistOptions = {}): WallPiecesResult {
  const { pieces, warnings } = buildWallCutListPieces(p, 'main');
  const pieces3D = computeWallPieces3D(p, 'main');
  const sheet: Sheet = {
    widthIn: p.sheetWidthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
  };
  return { pieces, pieces3D, sheet, diagramSvg: buildWallDiagramSvg(p), warnings };
}

export function composeWallCutSvg(
  placed: PlacedPiece[],
  totalHeightIn: number,
  sheetWidthIn: number,
): string {
  return composeMultiOpCutSvg(placed, totalHeightIn, sheetWidthIn);
}

export function wallCutlist(p: WallParams, opts: WallCutlistOptions = {}): WallOutput {
  const r = wallPieces(p, opts);
  const layout = layoutOnSheet(r.pieces, r.sheet);
  const cutSvg = composeWallCutSvg(layout.placed, layout.totalHeightIn, p.sheetWidthIn);
  return {
    cutSvg,
    diagramSvg: r.diagramSvg,
    warnings: [...r.warnings, ...layout.warnings],
    pieces3D: r.pieces3D,
  };
}

export type { WallParams, WallUnit, WallGeometry, BlockingSpec, BlockRow } from './types';
