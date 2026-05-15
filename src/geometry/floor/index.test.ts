import { describe, it, expect } from 'vitest';
import { floorPieces, floorCutlist } from './index';
import type { FloorParams } from './types';

const DEFAULTS: FloorParams = {
  widthIn: 8.0,
  depthIn: 6.67,
  joistSpacingIn: 0.889,
  joistThicknessIn: 0.083,
  joistDepthIn: 0.514,
  nJoistsOverride: 6,
  rimThicknessIn: 0.125,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.083,
  stockThicknessIn: 0.125,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('floorPieces', () => {
  it('returns a full result with pieces, pieces3D, sheet, diagramSvg', () => {
    const r = floorPieces(DEFAULTS);
    expect(r.pieces.length).toBeGreaterThan(0);
    expect(r.pieces3D.length).toBeGreaterThan(0);
    expect(r.sheet.widthIn).toBe(12.0);
    expect(r.diagramSvg).toMatch(/<svg/);
  });
});

describe('floorCutlist', () => {
  it('returns a cutSvg', () => {
    const r = floorCutlist(DEFAULTS);
    expect(r.cutSvg).toMatch(/<svg/);
  });
});
