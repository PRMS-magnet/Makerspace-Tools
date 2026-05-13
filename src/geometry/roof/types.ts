export interface RoofParams {
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
  sheetWidthIn: number;
  maxPieceLengthIn: number;
  marginIn: number;
  pieceSpacingIn?: number;
  ridgeEndMarginIn?: number;
  ridgeFaceMarginIn?: number;
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
