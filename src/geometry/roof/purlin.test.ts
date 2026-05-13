import { describe, it, expect } from 'vitest';
import { shouldEmitPurlin, purlinPolygon, purlinPositions, PURLIN_TRIGGER_SLOPE_LENGTH_IN } from './purlin';
import type { RoofParams } from './types';
import { computeRoofGeometry } from './compute';

const SMALL: RoofParams = {
  spanIn: 10, pitchRise: 8, pitchRun: 12,
  rafterDepthIn: 0.5, wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 12, rafterSpacingIn: 0.875,
  topPlateHeightIn: 0.25, nPairsOverride: null,
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};

const BIG: RoofParams = {
  ...SMALL,
  spanIn: 24,
};

describe('shouldEmitPurlin', () => {
  it('returns false for small roofs (slope <= 8 in)', () => {
    const g = computeRoofGeometry(SMALL);
    expect(shouldEmitPurlin(g)).toBe(false);
  });

  it('returns true for big roofs (slope > 8 in)', () => {
    const g = computeRoofGeometry(BIG);
    expect(shouldEmitPurlin(g)).toBe(true);
  });

  it('exposes the trigger threshold as a constant', () => {
    expect(PURLIN_TRIGGER_SLOPE_LENGTH_IN).toBe(8);
  });
});

describe('purlinPositions', () => {
  it('returns south at H/2 and north at 3H/2', () => {
    const pos = purlinPositions(BIG);
    expect(pos.southYAlongHalfSpan).toBeCloseTo(6, 6);
    expect(pos.northYAlongHalfSpan).toBeCloseTo(18, 6);
    expect(pos.zAtPurlin).toBeCloseTo(4, 6);
  });
});

describe('purlinPolygon', () => {
  it('returns a rectangle the length of the rafter span', () => {
    const poly = purlinPolygon(BIG, 0.125, { nPairs: 14 });
    expect(poly.length).toBe(4);
    const xs = poly.map(([x]) => x);
    expect(Math.max(...xs)).toBeGreaterThan(10);
  });
});
