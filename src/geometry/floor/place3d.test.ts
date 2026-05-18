import { describe, it, expect } from 'vitest';
import { computeFloorPieces3D } from './place3d';
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

describe('computeFloorPieces3D', () => {
  it('returns nJoists + 2 rims for a default floor', () => {
    const pieces = computeFloorPieces3D(DEFAULTS, 'main');
    expect(pieces.length).toBe(6 + 2);
  });

  it('front rim sits at y=0', () => {
    const pieces = computeFloorPieces3D(DEFAULTS, 'main');
    const front = pieces.find((p) => p.placement?.kind === 'floor-rim' && p.placement.side === 'front');
    expect(front?.origin[1]).toBe(0);
  });

  it('back rim sits at depthIn - rimThicknessIn in y', () => {
    const pieces = computeFloorPieces3D(DEFAULTS, 'main');
    const back = pieces.find((p) => p.placement?.kind === 'floor-rim' && p.placement.side === 'back');
    expect(back?.origin[1]).toBeCloseTo(6.67 - 0.125, 6);
  });

  it('rims extend by stockThicknessIn/2 past the outer joists (on-edge model)', () => {
    const pieces = computeFloorPieces3D(DEFAULTS, 'main');
    const front = pieces.find((p) => p.placement?.kind === 'floor-rim' && p.placement.side === 'front')!;
    expect(front.origin[0]).toBeCloseTo(-0.125 / 2, 6);
  });

  it('first joist x = position - stockThicknessIn/2 (on-edge model)', () => {
    const pieces = computeFloorPieces3D(DEFAULTS, 'main');
    const joists = pieces.filter((p) => p.placement?.kind === 'floor-joist');
    joists.sort((a, b) => a.origin[0] - b.origin[0]);
    expect(joists[0].origin[0]).toBeCloseTo(0 - 0.125 / 2, 6);
  });

  it('joists sit at y=rimThicknessIn (front rim inside face)', () => {
    const pieces = computeFloorPieces3D(DEFAULTS, 'main');
    const joist = pieces.find((p) => p.placement?.kind === 'floor-joist');
    expect(joist?.origin[1]).toBeCloseTo(0.125, 6);
  });

  it('extrudes all pieces by joistDepthIn', () => {
    const pieces = computeFloorPieces3D(DEFAULTS, 'main');
    for (const p of pieces) {
      expect(p.extrudeDepthIn).toBeCloseTo(0.514, 6);
    }
  });

  it('place3d emits the same rim segment count as the cut list', async () => {
    const { buildFloorCutListPieces } = await import('./cutlist');
    const wide = { ...DEFAULTS, widthIn: 20, maxPieceLengthIn: 8 } as FloorParams;
    const cutPieces = buildFloorCutListPieces(wide, 'main').pieces;
    const pieces3D = computeFloorPieces3D(wide, 'main');
    const cutRims = cutPieces.filter((p) => p.placement?.kind === 'floor-rim').length;
    const d3Rims = pieces3D.filter((p) => p.placement?.kind === 'floor-rim').length;
    expect(d3Rims).toBe(cutRims);
    expect(d3Rims).toBeGreaterThan(2);
  });
});
