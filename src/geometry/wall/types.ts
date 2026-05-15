export interface WallUnit {
  id: string;
  widthIn: number;
  heightIn: number;
  studSpacingIn: number;
  studWidthIn: number;
  studDepthIn: number;
  nStudsOverride: number | null;
  topPlateHeightIn: number;
  bottomPlateHeightIn: number;
  doubleTopPlate: boolean;
  blocking: BlockingSpec;
  blockingThicknessIn: number;
  stockThicknessIn: number;
}

export type BlockingSpec =
  | { mode: 'none' }
  | { mode: 'half'; heightFraction: number }
  | { mode: 'staggered'; denseCount: number; sparseCount: number; startDense: boolean }
  | { mode: 'custom'; rows: ReadonlyArray<{ bayIndex: number; heightFraction: number }> };

export interface SheetParams {
  sheetWidthIn: number;
  maxPieceLengthIn: number;
  marginIn: number;
  pieceSpacingIn?: number;
}

export type WallParams = Omit<WallUnit, 'id'> & SheetParams;

export interface WallGeometry {
  interPlateHeightIn: number;
  bayWidthIn: number;
  nTopPlateLayers: number;
}

export interface BlockRow {
  bayIndex: number;
  heightFromBottomPlateIn: number;
  spanFullWidth: boolean;
}

export function wallParamsToUnit(p: WallParams, id = 'main'): WallUnit {
  return {
    id,
    widthIn: p.widthIn,
    heightIn: p.heightIn,
    studSpacingIn: p.studSpacingIn,
    studWidthIn: p.studWidthIn,
    studDepthIn: p.studDepthIn,
    nStudsOverride: p.nStudsOverride,
    topPlateHeightIn: p.topPlateHeightIn,
    bottomPlateHeightIn: p.bottomPlateHeightIn,
    doubleTopPlate: p.doubleTopPlate,
    blocking: p.blocking,
    blockingThicknessIn: p.blockingThicknessIn,
    stockThicknessIn: p.stockThicknessIn,
  };
}

export function effectivePlateCutHeight(plateHeightIn: number, stockThicknessIn: number): number {
  return Math.max(plateHeightIn, stockThicknessIn);
}
