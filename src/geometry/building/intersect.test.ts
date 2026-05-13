import { describe, it, expect } from 'vitest';
import { computeIntersection } from './intersect';
import type { RoofUnit } from '../roof/types';
import type { Intersection } from './types';

const UNIT_A: RoofUnit = {
  id: 'a', spanIn: 12, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5, houseLengthIn: 24,
  rafterSpacingIn: 0.875, topPlateHeightIn: 0.25, nPairsOverride: null,
};
const UNIT_B: RoofUnit = { ...UNIT_A, id: 'b', spanIn: 8, houseLengthIn: 10 };

const OPTS = { stockThicknessIn: 0.125, kerfPerSideIn: 0.006, fitMode: 'press' as const };

describe('computeIntersection dispatch', () => {
  it('dispatches cross-gable-T to computeCrossGableT', () => {
    const i: Intersection = {
      id: 'i1', hostId: 'a', guestId: 'b', kind: 'cross-gable-T',
      placement: { xAlongHostRidge: 12 },
    };
    const r = computeIntersection(UNIT_A, UNIT_B, i, OPTS);
    expect(r.derived.valleyLines.length).toBe(2);
  });

  it('dispatches cross-gable-L to computeCrossGableL', () => {
    const i: Intersection = {
      id: 'i1', hostId: 'a', guestId: 'b', kind: 'cross-gable-L',
      placement: { hostCorner: 'NW' },
    };
    const r = computeIntersection(UNIT_A, UNIT_B, i, OPTS);
    expect(r.derived.valleyLines.length).toBe(1);
  });

  it('dispatches dormer-gable to computeDormerGable', () => {
    const i: Intersection = {
      id: 'd1', hostId: 'a', guestId: 'a', kind: 'dormer-gable',
      placement: {
        hostId: 'a', xAlongHostRidge: 12, yFromHostRidge: 2,
        widthIn: 3, ridgeHeightIn: 2.5,
        pitchRise: 8, pitchRun: 12, side: 'north',
      },
    };
    const r = computeIntersection(UNIT_A, UNIT_B, i, OPTS);
    expect(r.newPieces.length).toBeGreaterThan(0);
  });

  it('dispatches dormer-shed to computeDormerShed', () => {
    const i: Intersection = {
      id: 'd1', hostId: 'a', guestId: 'a', kind: 'dormer-shed',
      placement: {
        hostId: 'a', xAlongHostRidge: 12,
        yBackFromHostRidge: 1, yFrontFromHostRidge: 4,
        widthIn: 3, frontWallHeightIn: 1.5,
        pitchRise: 2, pitchRun: 12, side: 'north',
      },
    };
    const r = computeIntersection(UNIT_A, UNIT_B, i, OPTS);
    expect(r.newPieces.length).toBeGreaterThan(0);
  });
});
