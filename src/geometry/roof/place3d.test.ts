import { describe, it, expect } from 'vitest';
import type { RoofParams } from './types';
import { computeRoofGeometry } from './compute';
import { computeRoofCounts } from './cutlist';
import { computeRoofPieces3D } from './place3d';
import { isPolygonWithHoles } from '../core/types';

const DEFAULTS: RoofParams = {
  spanIn: 8.75, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 10.0, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: 2, sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
};

describe('computeRoofPieces3D', () => {
  const g = computeRoofGeometry(DEFAULTS, 0.125);
  const counts = computeRoofCounts(DEFAULTS, 0.125, 0);
  const pieces = computeRoofPieces3D(DEFAULTS, g, counts, {
    stockThicknessIn: 0.125,
    kerfPerSideIn: 0.006,
    fitMode: 'press',
    ridgeEndMarginIn: 0,
    ridgeFaceMarginIn: 0.125,
  });

  it('does not emit wall pieces (visual clutter rejected)', () => {
    expect(pieces.filter((p) => p.label === 'wall').length).toBe(0);
  });

  it('emits at least rafters and joists', () => {
    expect(pieces.some((p) => p.label === 'rafter')).toBe(true);
    expect(pieces.some((p) => p.label === 'joist')).toBe(true);
  });
});
