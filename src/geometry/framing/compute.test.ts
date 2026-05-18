import { describe, it, expect } from 'vitest';
import { computeFramingGeometry, computeMemberPositions, effectiveMemberCount } from './compute';
import type { FramingParams } from './types';

const DEFAULTS: FramingParams = {
  mode: 'wall',
  lengthIn: 8.0,
  spanIn: 5.33,
  memberSpacingIn: 0.889,
  memberDepthIn: 0.25,
  nMembersOverride: null,
  endCapHeightIn: 0.125,
  endCapBDoubled: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.125,
  stockThicknessIn: 0.125,
  engraveStyle: 'brackets',
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('computeFramingGeometry', () => {
  it('inter end cap span = spanIn - endCapA - nLayers*endCapB', () => {
    const g = computeFramingGeometry(DEFAULTS);
    expect(g.interEndCapSpanIn).toBeCloseTo(5.33 - 0.125 - 0.125, 6);
    expect(g.nEndCapBLayers).toBe(1);
  });

  it('doubled end cap B adds a layer to the span subtraction', () => {
    const g = computeFramingGeometry({ ...DEFAULTS, endCapBDoubled: true });
    expect(g.interEndCapSpanIn).toBeCloseTo(5.33 - 0.125 - 0.125 - 0.125, 6);
    expect(g.nEndCapBLayers).toBe(2);
  });

  it('bay width = effective spacing - stock thickness (derived from actual positions)', () => {
    const g = computeFramingGeometry(DEFAULTS);
    const n = Math.round(DEFAULTS.lengthIn / DEFAULTS.memberSpacingIn) + 1;
    const effective = DEFAULTS.lengthIn / (n - 1);
    expect(g.bayWidthIn).toBeCloseTo(effective - DEFAULTS.stockThicknessIn, 6);
  });

  it('bay width tracks nMembersOverride', () => {
    const g = computeFramingGeometry({ ...DEFAULTS, nMembersOverride: 5 });
    const effective = DEFAULTS.lengthIn / 4;
    expect(g.bayWidthIn).toBeCloseTo(effective - DEFAULTS.stockThicknessIn, 6);
  });
});

describe('effectiveMemberCount', () => {
  it('returns override when set, clamped to >= 2', () => {
    expect(effectiveMemberCount({ ...DEFAULTS, nMembersOverride: 7 })).toBe(7);
    expect(effectiveMemberCount({ ...DEFAULTS, nMembersOverride: 1 })).toBe(2);
  });
});

describe('computeMemberPositions', () => {
  it('respects nMembersOverride', () => {
    const pos = computeMemberPositions({ ...DEFAULTS, nMembersOverride: 5 });
    expect(pos.length).toBe(5);
    expect(pos[0]).toBeCloseTo(0, 6);
    expect(pos[4]).toBeCloseTo(8.0, 6);
  });

  it('auto-counts from spacing when override is null', () => {
    const pos = computeMemberPositions(DEFAULTS);
    expect(pos.length).toBeGreaterThanOrEqual(2);
    expect(pos[0]).toBeCloseTo(0, 6);
    expect(pos[pos.length - 1]).toBeCloseTo(8.0, 6);
  });

  it('always emits at least 2 members', () => {
    const pos = computeMemberPositions({ ...DEFAULTS, lengthIn: 0.5, memberSpacingIn: 10 });
    expect(pos.length).toBe(2);
  });
});
