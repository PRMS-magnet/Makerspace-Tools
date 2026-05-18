import type { SheetParams } from '../roof/types';

export type FramingMode = 'wall' | 'floor';

export type BlockingSpec =
  | { mode: 'none' }
  | { mode: 'half'; positionFraction: number }
  | { mode: 'staggered'; denseCount: number; sparseCount: number; startDense: boolean }
  | { mode: 'custom'; rows: ReadonlyArray<{ bayIndex: number; positionFraction: number }> };

export interface FramingUnit {
  id: string;
  mode: FramingMode;
  lengthIn: number;
  spanIn: number;
  memberSpacingIn: number;
  memberDepthIn: number;
  nMembersOverride: number | null;
  endCapHeightIn: number;
  endCapBDoubled: boolean;
  blocking: BlockingSpec;
  blockingThicknessIn: number;
  stockThicknessIn: number;
}

export type FramingParams = Omit<FramingUnit, 'id'> & SheetParams;

export interface FramingGeometry {
  interEndCapSpanIn: number;
  bayWidthIn: number;
  nEndCapBLayers: number;
}

export interface BlockRow {
  bayIndex: number;
  positionFromEndCapAIn: number;
  spanFullLength: boolean;
}

export function framingParamsToUnit(p: FramingParams, id = 'main'): FramingUnit {
  return {
    id,
    mode: p.mode,
    lengthIn: p.lengthIn,
    spanIn: p.spanIn,
    memberSpacingIn: p.memberSpacingIn,
    memberDepthIn: p.memberDepthIn,
    nMembersOverride: p.nMembersOverride,
    endCapHeightIn: p.endCapHeightIn,
    endCapBDoubled: p.endCapBDoubled,
    blocking: p.blocking,
    blockingThicknessIn: p.blockingThicknessIn,
    stockThicknessIn: p.stockThicknessIn,
  };
}
