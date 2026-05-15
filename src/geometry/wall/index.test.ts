import { describe, it, expect } from 'vitest';
import { wallPieces, wallCutlist } from './index';
import type { WallParams } from './types';

const DEFAULTS: WallParams = {
  widthIn: 8.0,
  heightIn: 5.33,
  studSpacingIn: 0.889,
  studWidthIn: 0.083,
  studDepthIn: 0.194,
  nStudsOverride: 6,
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

describe('wallPieces', () => {
  it('returns a full result with pieces, pieces3D, sheet, diagramSvg', () => {
    const r = wallPieces(DEFAULTS);
    expect(r.pieces.length).toBeGreaterThan(0);
    expect(r.pieces3D.length).toBeGreaterThan(0);
    expect(r.sheet.widthIn).toBe(12.0);
    expect(r.diagramSvg).toMatch(/<svg/);
  });
});

describe('wallCutlist', () => {
  it('returns a cutSvg', () => {
    const r = wallCutlist(DEFAULTS);
    expect(r.cutSvg).toMatch(/<svg/);
  });
});
