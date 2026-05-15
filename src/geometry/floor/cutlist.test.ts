import { describe, it, expect } from 'vitest';
import { buildFloorCutListPieces } from './cutlist';
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

describe('buildFloorCutListPieces', () => {
  it('emits 2 rims + nJoists pieces for a simple floor with no blocking', () => {
    const { pieces } = buildFloorCutListPieces(DEFAULTS, 'main');
    expect(pieces.length).toBe(2 + 6);
  });

  it('rim pieces carry joist engrave marks (2 per joist)', () => {
    const { pieces } = buildFloorCutListPieces(DEFAULTS, 'main');
    const rims = pieces.filter((p) => p.placement?.kind === 'floor-rim');
    expect(rims.length).toBe(2);
    for (const rim of rims) {
      expect(rim.engravedFeatures?.length).toBe(12);
    }
  });

  it('rim cut length equals widthIn + joistThicknessIn', () => {
    const { pieces } = buildFloorCutListPieces(DEFAULTS, 'main');
    const rim = pieces.find((p) => p.placement?.kind === 'floor-rim');
    expect(rim).toBeDefined();
    const poly = rim!.polygon as readonly (readonly [number, number])[];
    const xs = poly.map((v) => v[0]);
    const len = Math.max(...xs) - Math.min(...xs);
    expect(len).toBeCloseTo(8.0 + 0.083, 6);
  });

  it('appends blocking pieces when configured', () => {
    const { pieces } = buildFloorCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    const blocks = pieces.filter((p) => p.placement?.kind === 'floor-block');
    expect(blocks.length).toBe(5);
  });

  it('warns and splits when rim total length exceeds max piece length', () => {
    const { pieces, warnings } = buildFloorCutListPieces(
      { ...DEFAULTS, widthIn: 24, maxPieceLengthIn: 12 },
      'main',
    );
    const rims = pieces.filter((p) => p.placement?.kind === 'floor-rim');
    expect(rims.length).toBeGreaterThan(2);
    expect(warnings.some((w) => w.includes('rim'))).toBe(true);
  });
});
