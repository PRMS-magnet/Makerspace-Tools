import { describe, it, expect } from 'vitest';
import { computeWallPieces3D } from './place3d';
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

describe('computeWallPieces3D', () => {
  it('returns nStuds + 2 plates for a default wall (engrave marks are features on plates)', () => {
    const pieces = computeWallPieces3D(DEFAULTS, 'main');
    expect(pieces.length).toBe(6 + 2);
  });

  it('bottom plate is at z=0', () => {
    const pieces = computeWallPieces3D(DEFAULTS, 'main');
    const bottom = pieces.find((p) => p.placement?.kind === 'wall-bottom-plate');
    expect(bottom?.origin[2]).toBe(0);
  });

  it('top plate sits one plate-height below wall height', () => {
    const pieces = computeWallPieces3D(DEFAULTS, 'main');
    const top = pieces.find((p) => p.placement?.kind === 'wall-top-plate');
    expect(top?.origin[2]).toBeCloseTo(5.33 - 0.125, 6);
  });

  it('plates extend by stockThicknessIn/2 past the outer studs (on-edge model)', () => {
    const pieces = computeWallPieces3D(DEFAULTS, 'main');
    const bottom = pieces.find((p) => p.placement?.kind === 'wall-bottom-plate')!;
    expect(bottom.origin[0]).toBeCloseTo(-0.125 / 2, 6);
  });

  it('first stud x = position - stockThicknessIn/2 (on-edge model)', () => {
    const pieces = computeWallPieces3D(DEFAULTS, 'main');
    const studs = pieces.filter((p) => p.placement?.kind === 'wall-stud');
    studs.sort((a, b) => a.origin[0] - b.origin[0]);
    expect(studs[0].origin[0]).toBeCloseTo(0 - 0.125 / 2, 6);
  });

  it('no standalone stud-mark pieces remain', () => {
    const pieces = computeWallPieces3D(DEFAULTS, 'main');
    expect(pieces.filter((p) => p.placement?.kind === 'wall-stud-mark').length).toBe(0);
  });

  it('place3d emits the same plate segment count as the cut list', async () => {
    const { buildWallCutListPieces } = await import('./cutlist');
    const wide: WallParams = { ...DEFAULTS, widthIn: 20, maxPieceLengthIn: 8 };
    const cutPieces = buildWallCutListPieces(wide, 'main').pieces;
    const pieces3D = computeWallPieces3D(wide, 'main');
    const cutBottoms = cutPieces.filter((p) => p.placement?.kind === 'wall-bottom-plate').length;
    const cutTops = cutPieces.filter((p) => p.placement?.kind === 'wall-top-plate').length;
    const d3Bottoms = pieces3D.filter((p) => p.placement?.kind === 'wall-bottom-plate').length;
    const d3Tops = pieces3D.filter((p) => p.placement?.kind === 'wall-top-plate').length;
    expect(d3Bottoms).toBe(cutBottoms);
    expect(d3Tops).toBe(cutTops);
    expect(d3Bottoms).toBeGreaterThan(1);
  });
});
