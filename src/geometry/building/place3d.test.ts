import { describe, it, expect } from 'vitest';
import { unitPlacement, applyPlacementToPiece3D } from './place3d';
import { tPlanPreset, lPlanPreset } from './presets';
import type { Piece3D } from '../core/types';

const MAIN = {
  spanIn: 12, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5, houseLengthIn: 24,
  rafterSpacingIn: 0.875, topPlateHeightIn: 0.25, nPairsOverride: null,
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};
const WING = { ...MAIN, spanIn: 8, houseLengthIn: 10 };

describe('unitPlacement', () => {
  it('main unit is at the origin with no rotation', () => {
    const b = tPlanPreset(MAIN, WING, 12);
    const p = unitPlacement(b, 0);
    expect(p.translation).toEqual([0, 0, 0]);
    expect(p.rotationZRadians).toBeCloseTo(0, 9);
  });

  it('T-plan wing translates to (xCenter, Y_main, 0) and rotates 90 deg', () => {
    const b = tPlanPreset(MAIN, WING, 12);
    const p = unitPlacement(b, 1);
    expect(p.translation[0]).toBeCloseTo(12, 5);
    expect(p.translation[1]).toBeCloseTo(MAIN.spanIn, 5);
    expect(p.rotationZRadians).toBeCloseTo(Math.PI / 2, 5);
  });

  it('L-plan NW wing translates to (0, Y_main, 0)', () => {
    const b = lPlanPreset(MAIN, WING, 'NW');
    const p = unitPlacement(b, 1);
    expect(p.translation[0]).toBeCloseTo(0, 5);
    expect(p.translation[1]).toBeCloseTo(MAIN.spanIn, 5);
  });
});

describe('applyPlacementToPiece3D', () => {
  const piece: Piece3D = {
    polygon: [[0, 0], [1, 0], [1, 1], [0, 1]],
    origin: [1, 0, 0],
    uAxis: [1, 0, 0],
    vAxis: [0, 1, 0],
    extrudeDepthIn: 0.125,
  };

  it('identity placement returns piece unchanged', () => {
    const out = applyPlacementToPiece3D(piece, { translation: [0, 0, 0], rotationZRadians: 0 });
    expect(out).toBe(piece);
  });

  it('90-degree rotation around z swaps x and y axes', () => {
    const out = applyPlacementToPiece3D(piece, { translation: [0, 0, 0], rotationZRadians: Math.PI / 2 });
    expect(out.uAxis[0]).toBeCloseTo(0, 9);
    expect(out.uAxis[1]).toBeCloseTo(1, 9);
    expect(out.vAxis[0]).toBeCloseTo(-1, 9);
    expect(out.vAxis[1]).toBeCloseTo(0, 9);
  });

  it('translation moves the origin', () => {
    const out = applyPlacementToPiece3D(piece, { translation: [5, 7, 0], rotationZRadians: 0 });
    expect(out.origin[0]).toBeCloseTo(6, 9);
    expect(out.origin[1]).toBeCloseTo(7, 9);
  });
});
