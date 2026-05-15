import { describe, it, expect } from 'vitest';
import { computeWallGeometry, computeStudPositions } from './compute';
import type { WallParams } from './types';

const DEFAULTS: WallParams = {
  widthIn: 8.0,
  heightIn: 5.33,
  studSpacingIn: 0.889,
  studWidthIn: 0.083,
  studDepthIn: 0.194,
  nStudsOverride: null,
  topPlateHeightIn: 0.125,
  bottomPlateHeightIn: 0.125,
  doubleTopPlate: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.083,
  stockThicknessIn: 0.125,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('computeWallGeometry', () => {
  it('computes inter-plate height with single top plate', () => {
    const g = computeWallGeometry(DEFAULTS);
    expect(g.interPlateHeightIn).toBeCloseTo(5.33 - 0.125 - 0.125, 6);
    expect(g.nTopPlateLayers).toBe(1);
  });

  it('subtracts two top plates when doubled', () => {
    const g = computeWallGeometry({ ...DEFAULTS, doubleTopPlate: true });
    expect(g.interPlateHeightIn).toBeCloseTo(5.33 - 0.125 - 0.125 - 0.125, 6);
    expect(g.nTopPlateLayers).toBe(2);
  });

  it('computes bay width as spacing minus stud width', () => {
    const g = computeWallGeometry(DEFAULTS);
    expect(g.bayWidthIn).toBeCloseTo(0.889 - 0.083, 6);
  });
});

describe('computeStudPositions', () => {
  it('respects nStudsOverride when set', () => {
    const pos = computeStudPositions({ ...DEFAULTS, nStudsOverride: 5 });
    expect(pos.length).toBe(5);
    expect(pos[0]).toBeCloseTo(0, 6);
    expect(pos[4]).toBeCloseTo(8.0, 6);
  });

  it('auto-computes stud count from spacing when override is null', () => {
    const pos = computeStudPositions(DEFAULTS);
    expect(pos.length).toBeGreaterThanOrEqual(2);
    expect(pos[0]).toBeCloseTo(0, 6);
    expect(pos[pos.length - 1]).toBeCloseTo(8.0, 6);
  });

  it('always emits at least 2 studs', () => {
    const pos = computeStudPositions({ ...DEFAULTS, widthIn: 0.5, studSpacingIn: 10 });
    expect(pos.length).toBe(2);
  });
});
