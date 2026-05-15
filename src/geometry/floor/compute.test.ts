import { describe, it, expect } from 'vitest';
import { computeFloorGeometry, computeJoistPositions } from './compute';
import type { FloorParams } from './types';

const DEFAULTS: FloorParams = {
  widthIn: 8.0,
  depthIn: 6.67,
  joistSpacingIn: 0.889,
  joistThicknessIn: 0.083,
  joistDepthIn: 0.514,
  nJoistsOverride: null,
  rimThicknessIn: 0.125,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.083,
  stockThicknessIn: 0.125,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('computeFloorGeometry', () => {
  it('computes inter-rim depth', () => {
    const g = computeFloorGeometry(DEFAULTS);
    expect(g.interRimDepthIn).toBeCloseTo(6.67 - 0.125 - 0.125, 6);
  });

  it('computes bay width as spacing minus joist thickness', () => {
    const g = computeFloorGeometry(DEFAULTS);
    expect(g.bayWidthIn).toBeCloseTo(0.889 - 0.083, 6);
  });
});

describe('computeJoistPositions', () => {
  it('respects nJoistsOverride when set', () => {
    const pos = computeJoistPositions({ ...DEFAULTS, nJoistsOverride: 5 });
    expect(pos.length).toBe(5);
    expect(pos[0]).toBeCloseTo(0, 6);
    expect(pos[4]).toBeCloseTo(8.0, 6);
  });

  it('auto-computes joist count from spacing when override is null', () => {
    const pos = computeJoistPositions(DEFAULTS);
    expect(pos.length).toBeGreaterThanOrEqual(2);
    expect(pos[0]).toBeCloseTo(0, 6);
    expect(pos[pos.length - 1]).toBeCloseTo(8.0, 6);
  });

  it('always emits at least 2 joists', () => {
    const pos = computeJoistPositions({ ...DEFAULTS, widthIn: 0.5, joistSpacingIn: 10 });
    expect(pos.length).toBe(2);
  });
});
