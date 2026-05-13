import { describe, it, expect } from 'vitest';
import type { Piece, PiecePlacement } from './types';
import { buildContext, resolvePiece } from './resolver';
import { simpleGablePreset, lPlanPreset } from '../building/presets';

const DEFAULTS = {
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

describe('resolver: unit-rafter placement', () => {
  const b = simpleGablePreset(DEFAULTS);
  const ctx = buildContext(b, {});

  it('rafter at indexAlongRidge=0 sits at x = xOffset (centered local frame)', () => {
    const houseLen = (2 - 1) * 0.875;
    const xOffset = -houseLen / 2;

    const piece: Piece = {
      polygon: [[0, 0], [1, 0], [1, 1], [0, 1]],
      op: 'cut',
      extrudeDepthIn: 0.125,
      placement: { kind: 'unit-rafter', unitId: 'main', indexAlongRidge: 0, side: 'north' },
    };
    const resolved = resolvePiece(piece, ctx);
    expect(resolved.origin[0]).toBeCloseTo(xOffset, 9);
    expect(resolved.origin[1]).toBe(0);
    expect(resolved.origin[2]).toBe(0);
    expect(resolved.uAxis).toEqual([0, 1, 0]);
    expect(resolved.vAxis).toEqual([0, 0, 1]);
  });

  it('rafter indices step by rafterSpacingIn', () => {
    const piece0: Piece = {
      polygon: [[0, 0]],
      op: 'cut',
      extrudeDepthIn: 0.125,
      placement: { kind: 'unit-rafter', unitId: 'main', indexAlongRidge: 0, side: 'north' },
    };
    const piece1: Piece = {
      ...piece0,
      placement: { ...(piece0.placement as PiecePlacement), indexAlongRidge: 1 } as PiecePlacement,
    };
    const r0 = resolvePiece(piece0, ctx);
    const r1 = resolvePiece(piece1, ctx);
    expect(r1.origin[0] - r0.origin[0]).toBeCloseTo(0.875, 9);
  });
});

describe('resolver: unit-ridge placement', () => {
  const b = simpleGablePreset(DEFAULTS);
  const ctx = buildContext(b, {});

  it('ridge piece sits along +x at ridge height', () => {
    const piece: Piece = {
      polygon: [[0, 0]],
      op: 'cut',
      extrudeDepthIn: 0.125,
      placement: { kind: 'unit-ridge', unitId: 'main', segmentIndex: 0 },
    };
    const resolved = resolvePiece(piece, ctx);
    expect(resolved.uAxis).toEqual([1, 0, 0]);
    expect(resolved.vAxis).toEqual([0, 0, 1]);
    expect(resolved.origin[2]).toBeGreaterThan(0);
  });
});

describe('resolver: L-plan wing unit frame', () => {
  const MAIN = { ...DEFAULTS, spanIn: 12, houseLengthIn: 24 };
  const WING = { ...DEFAULTS, spanIn: 8, houseLengthIn: 10 };

  it('NW wing rotates +pi/2 and translates to (W_wing/2, Y_main + L_wing/2, 0)', () => {
    const b = lPlanPreset(MAIN, WING, 'NW');
    const ctx = buildContext(b, {});
    const frame = ctx.unitFrames.get('wing');
    if (!frame) throw new Error('expected wing unit frame');
    expect(frame.rotationZRadians).toBeCloseTo(Math.PI / 2, 9);
    expect(frame.translation[0]).toBeCloseTo(WING.spanIn / 2, 5);
    expect(frame.translation[1]).toBeCloseTo(MAIN.spanIn + WING.houseLengthIn / 2, 5);
    expect(frame.translation[2]).toBeCloseTo(0, 9);
  });
});

describe('resolver: throws for not-yet-implemented kinds', () => {
  const b = simpleGablePreset(DEFAULTS);
  const ctx = buildContext(b, {});

  it('dormer placements throw with informative error', () => {
    const piece: Piece = {
      polygon: [[0, 0]],
      op: 'cut',
      extrudeDepthIn: 0.125,
      placement: { kind: 'dormer-cheek-wall', dormerId: 'd1', side: 'east' },
    };
    expect(() => resolvePiece(piece, ctx)).toThrow(/not yet implemented|dormer/i);
  });
});
