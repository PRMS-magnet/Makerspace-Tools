import { describe, it, expect } from 'vitest';
import { buildWallCutListPieces } from './cutlist';
import type { WallParams } from './types';

const DEFAULTS: WallParams = {
  widthIn: 8.0,
  heightIn: 5.33,
  studSpacingIn: 0.889,
  studWidthIn: 0.083,
  studDepthIn: 0.194,
  nStudsOverride: 6,
  topPlateHeightIn: 0.083,
  bottomPlateHeightIn: 0.083,
  doubleTopPlate: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.083,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('buildWallCutListPieces', () => {
  it('emits one bottom plate, one top plate, and N studs', () => {
    const { pieces } = buildWallCutListPieces(DEFAULTS, 'main');
    expect(pieces.filter((p) => p.placement?.kind === 'wall-bottom-plate').length).toBe(1);
    expect(pieces.filter((p) => p.placement?.kind === 'wall-top-plate').length).toBe(1);
    expect(pieces.filter((p) => p.placement?.kind === 'wall-stud').length).toBe(6);
  });

  it('emits two top plates when doubleTopPlate is true', () => {
    const { pieces } = buildWallCutListPieces({ ...DEFAULTS, doubleTopPlate: true }, 'main');
    expect(pieces.filter((p) => p.placement?.kind === 'wall-top-plate').length).toBe(2);
  });

  it('emits engrave marks for every stud on both plate faces (single top plate)', () => {
    const { pieces } = buildWallCutListPieces(DEFAULTS, 'main');
    const marks = pieces.filter((p) => p.placement?.kind === 'wall-stud-mark');
    expect(marks.length).toBe(12);
    expect(marks.every((p) => p.op === 'engrave')).toBe(true);
  });

  it('emits engrave marks even when doubled (still 2 sets, top plate marks live on the lower layer)', () => {
    const { pieces } = buildWallCutListPieces({ ...DEFAULTS, doubleTopPlate: true }, 'main');
    const marks = pieces.filter((p) => p.placement?.kind === 'wall-stud-mark');
    expect(marks.length).toBe(12);
  });

  it('emits blocks for half-mode blocking', () => {
    const { pieces } = buildWallCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'half', heightFraction: 0.5 } },
      'main',
    );
    const blocks = pieces.filter((p) => p.placement?.kind === 'wall-block');
    expect(blocks.length).toBe(5);
  });

  it('emits blocks for staggered 3-2-3 mode', () => {
    const { pieces } = buildWallCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true } },
      'main',
    );
    const blocks = pieces.filter((p) => p.placement?.kind === 'wall-block');
    expect(blocks.length).toBe(3 + 2 + 3 + 2 + 3);
  });

  it('plates split when widthIn exceeds maxPieceLengthIn', () => {
    const { pieces } = buildWallCutListPieces(
      { ...DEFAULTS, widthIn: 20, maxPieceLengthIn: 8 },
      'main',
    );
    expect(pieces.filter((p) => p.placement?.kind === 'wall-bottom-plate').length).toBe(3);
  });
});
