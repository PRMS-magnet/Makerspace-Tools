import { describe, it, expect } from 'vitest';
import { computeRoofGeometry } from './compute';
import type { RoofParams } from './types';

const DEFAULTS: RoofParams = {
  spanIn: 8.75,
  pitchRise: 8,
  pitchRun: 12,
  rafterDepthIn: 0.5,
  wallThicknessIn: 0.25,
  overhangRunIn: 0.5,
  houseLengthIn: 10.0,
  rafterSpacingIn: 0.875,
  topPlateHeightIn: 0.25,
  nPairsOverride: 2,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('computeRoofGeometry — default params (matches Python reference)', () => {
  const g = computeRoofGeometry(DEFAULTS);

  it('theta matches atan2(rise, run)', () => {
    expect(g.theta).toBeCloseTo(0.5880026035475675, 12);
  });

  it('thetaDeg matches', () => {
    expect(g.thetaDeg).toBeCloseTo(33.690067525979785, 9);
  });

  it('sinT / cosT / tanT', () => {
    expect(g.sinT).toBeCloseTo(0.5547001962252291, 12);
    expect(g.cosT).toBeCloseTo(0.8320502943378437, 12);
    expect(g.tanT).toBeCloseTo(0.6666666666666666, 12);
  });

  it('half_span, half_ridge, R', () => {
    expect(g.halfSpan).toBe(4.375);
    expect(g.halfRidge).toBe(0.0625);
    expect(g.R).toBe(4.3125);
  });

  it('rises and heel height', () => {
    expect(g.riseAtRidgeFace).toBeCloseTo(4.3125 * (2 / 3), 9);
    expect(g.riseAtCenterline).toBeCloseTo(2.9166666666666665, 9);
    expect(g.heelHeight).toBeCloseTo(0.16666666666666666, 9);
  });

  it('plumb cut length and rafter slope length', () => {
    expect(g.plumbCutLength).toBeCloseTo(0.6009252125773315, 9);
    expect(g.rafterSlopeLength).toBeCloseTo((4.3125 - 0.25 + 0.5) / 0.8320502943378437, 9);
  });
});

describe('computeRoofGeometry — invariants', () => {
  it('plumbCutLength * cosT === rafterDepth', () => {
    const g = computeRoofGeometry(DEFAULTS);
    expect(g.plumbCutLength * g.cosT).toBeCloseTo(DEFAULTS.rafterDepthIn, 12);
  });

  it('rise_at_ridge_face === R * tanT', () => {
    const g = computeRoofGeometry(DEFAULTS);
    expect(g.riseAtRidgeFace).toBeCloseTo(g.R * g.tanT, 12);
  });

  it('R === halfSpan - halfRidge', () => {
    const g = computeRoofGeometry(DEFAULTS);
    expect(g.R).toBeCloseTo(g.halfSpan - g.halfRidge, 12);
  });

  it('heelHeight === wallThickness * tanT', () => {
    const g = computeRoofGeometry(DEFAULTS);
    expect(g.heelHeight).toBeCloseTo(DEFAULTS.wallThicknessIn * g.tanT, 12);
  });
});
