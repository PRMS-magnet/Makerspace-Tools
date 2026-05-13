export interface RoofUnit {
  id: string;
  spanIn: number;
  pitchRise: number;
  pitchRun: number;
  rafterDepthIn: number;
  wallThicknessIn: number;
  overhangRunIn: number;
  houseLengthIn: number;
  rafterSpacingIn: number;
  topPlateHeightIn: number;
  nPairsOverride: number | null;
}

export interface SheetParams {
  sheetWidthIn: number;
  maxPieceLengthIn: number;
  marginIn: number;
  pieceSpacingIn?: number;
  ridgeEndMarginIn?: number;
  ridgeFaceMarginIn?: number;
}

export type RoofParams = Omit<RoofUnit, 'id'> & SheetParams;

export function roofParamsToUnit(p: RoofParams, id = 'main'): RoofUnit {
  return {
    id,
    spanIn: p.spanIn,
    pitchRise: p.pitchRise,
    pitchRun: p.pitchRun,
    rafterDepthIn: p.rafterDepthIn,
    wallThicknessIn: p.wallThicknessIn,
    overhangRunIn: p.overhangRunIn,
    houseLengthIn: p.houseLengthIn,
    rafterSpacingIn: p.rafterSpacingIn,
    topPlateHeightIn: p.topPlateHeightIn,
    nPairsOverride: p.nPairsOverride,
  };
}

export function roofParamsToSheet(p: RoofParams): SheetParams {
  return {
    sheetWidthIn: p.sheetWidthIn,
    maxPieceLengthIn: p.maxPieceLengthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
    ridgeEndMarginIn: p.ridgeEndMarginIn,
    ridgeFaceMarginIn: p.ridgeFaceMarginIn,
  };
}

export interface RoofGeometry {
  theta: number;
  thetaDeg: number;
  sinT: number;
  cosT: number;
  tanT: number;
  halfSpan: number;
  halfRidge: number;
  R: number;
  riseAtRidgeFace: number;
  riseAtCenterline: number;
  heelHeight: number;
  plumbCutLength: number;
  rafterSlopeLength: number;
}

export interface RoofDerived {
  geom: RoofGeometry;
  nPairs: number;
  nRafters: number;
  effectiveHouseLengthIn: number;
  nRidgePieces: number;
  ridgePieceLengthIn: number;
  joistTopLengthIn: number;
  joistBottomLengthIn: number;
  collarTopLengthIn: number;
  collarBottomLengthIn: number;
}

import type { Piece3D } from '../core/types';

export interface RoofOutput {
  cutSvg: string;
  diagramSvg: string;
  derived: RoofDerived;
  warnings: string[];
  pieces3D: Piece3D[];
}
