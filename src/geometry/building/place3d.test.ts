import { describe, it, expect } from 'vitest';
import { unitPlacement } from './place3d';
import { tPlanPreset, lPlanPreset } from './presets';

const MAIN = {
  spanIn: 12, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5, houseLengthIn: 24,
  rafterSpacingIn: 0.875, topPlateHeightIn: 0.25, nPairsOverride: null,
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};
const WING = { ...MAIN, spanIn: 8, houseLengthIn: 10 };

describe('unitPlacement', () => {
  it('main unit is at the origin with no rotation', () => {
    const b = tPlanPreset(MAIN, WING, 12);
    const p = unitPlacement(b, 0);
    expect(p.translation).toEqual([0, 0, 0]);
    expect(p.rotationZRadians).toBeCloseTo(0, 9);
  });

  it('T-plan wing translates to (xCenter, Y_main + L_wing/2, 0) centering footprint on xCenter', () => {
    const b = tPlanPreset(MAIN, WING, 12);
    const p = unitPlacement(b, 1);
    expect(p.translation[0]).toBeCloseTo(12, 5);
    expect(p.translation[1]).toBeCloseTo(MAIN.spanIn + WING.houseLengthIn / 2, 5);
    expect(p.rotationZRadians).toBeCloseTo(Math.PI / 2, 5);
  });

  it('L-plan NW wing translates to (W_wing/2, Y_main + L_wing/2, 0) so footprint sits in x in [0, W_wing]', () => {
    const b = lPlanPreset(MAIN, WING, 'NW');
    const p = unitPlacement(b, 1);
    expect(p.translation[0]).toBeCloseTo(WING.spanIn / 2, 5);
    expect(p.translation[1]).toBeCloseTo(MAIN.spanIn + WING.houseLengthIn / 2, 5);
  });
});
