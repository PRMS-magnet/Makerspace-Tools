export interface FloorUnit {
  id: string;
  widthIn: number;
  depthIn: number;
  joistSpacingIn: number;
  joistThicknessIn: number;
  joistDepthIn: number;
  nJoistsOverride: number | null;
  rimThicknessIn: number;
  blocking: BlockingSpec;
  blockingThicknessIn: number;
  stockThicknessIn: number;
}

export type BlockingSpec =
  | { mode: 'none' }
  | { mode: 'half'; positionFraction: number }
  | { mode: 'staggered'; denseCount: number; sparseCount: number; startDense: boolean }
  | { mode: 'custom'; rows: ReadonlyArray<{ bayIndex: number; positionFraction: number }> };

export interface SheetParams {
  sheetWidthIn: number;
  maxPieceLengthIn: number;
  marginIn: number;
  pieceSpacingIn?: number;
}

export type FloorParams = Omit<FloorUnit, 'id'> & SheetParams;

export interface FloorGeometry {
  interRimDepthIn: number;
  bayWidthIn: number;
}

export interface FloorBlockRow {
  bayIndex: number;
  distanceFromFrontRimIn: number;
  spanFullWidth: boolean;
}

export function floorParamsToUnit(p: FloorParams, id = 'main'): FloorUnit {
  return {
    id,
    widthIn: p.widthIn,
    depthIn: p.depthIn,
    joistSpacingIn: p.joistSpacingIn,
    joistThicknessIn: p.joistThicknessIn,
    joistDepthIn: p.joistDepthIn,
    nJoistsOverride: p.nJoistsOverride,
    rimThicknessIn: p.rimThicknessIn,
    blocking: p.blocking,
    blockingThicknessIn: p.blockingThicknessIn,
    stockThicknessIn: p.stockThicknessIn,
  };
}

export function effectiveRimCutHeight(rimThicknessIn: number, stockThicknessIn: number): number {
  return Math.max(rimThicknessIn, stockThicknessIn);
}
