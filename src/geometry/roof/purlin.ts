import type { RoofParams, RoofGeometry } from './types';
import type { Polygon } from '../core/types';

export const PURLIN_TRIGGER_SLOPE_LENGTH_IN = 8;

export function shouldEmitPurlin(geom: RoofGeometry): boolean {
  return geom.rafterSlopeLength > PURLIN_TRIGGER_SLOPE_LENGTH_IN;
}

export function purlinPolygon(p: RoofParams, stockThicknessIn: number, counts: { nPairs: number }): Polygon {
  const lengthIn = (counts.nPairs - 1) * p.rafterSpacingIn + stockThicknessIn;
  return [
    [0, 0],
    [lengthIn, 0],
    [lengthIn, stockThicknessIn],
    [0, stockThicknessIn],
  ];
}

export interface PurlinPositions {
  southYAlongHalfSpan: number;
  northYAlongHalfSpan: number;
  zAtPurlin: number;
}

export function purlinPositions(p: RoofParams): PurlinPositions {
  const H = p.spanIn / 2;
  const m = p.pitchRise / p.pitchRun;
  return {
    southYAlongHalfSpan: H / 2,
    northYAlongHalfSpan: (3 * H) / 2,
    zAtPurlin: (H * m) / 2,
  };
}
