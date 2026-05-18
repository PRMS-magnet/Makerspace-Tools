import { composeMultiOpCutSvg } from '../core/svg';
import type { Sheet, Piece, PlacedPiece, Piece3D } from '../core/types';
import type { FramingParams } from './types';
import { buildFramingCutListPieces } from './cutlist';
import { computeFramingPieces3D } from './place3d';
import { buildFramingDiagramSvg } from './diagram';

export * from './types';
export * from './compute';
export * from './blocking';
export { buildFramingCutListPieces, type FramingCutListResult } from './cutlist';
export { computeFramingPieces3D } from './place3d';
export { buildFramingDiagramSvg } from './diagram';

export interface FramingPiecesResult {
  pieces: Piece[];
  pieces3D: Piece3D[];
  sheet: Sheet;
  diagramSvg: string;
  warnings: string[];
}

export function framingPieces(p: FramingParams): FramingPiecesResult {
  const { pieces, warnings } = buildFramingCutListPieces(p, 'main');
  const pieces3D = computeFramingPieces3D(p, 'main');
  const sheet: Sheet = {
    widthIn: p.sheetWidthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
  };
  return { pieces, pieces3D, sheet, diagramSvg: buildFramingDiagramSvg(p), warnings };
}

export function composeFramingCutSvg(
  placed: PlacedPiece[],
  totalHeightIn: number,
  sheetWidthIn: number,
): string {
  return composeMultiOpCutSvg(placed, totalHeightIn, sheetWidthIn);
}
