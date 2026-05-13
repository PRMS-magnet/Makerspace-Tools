import { describe, it, expect } from 'vitest';
import { computeCrossGableT } from './cross-gable-t';
import type { RoofUnit } from '../../roof/types';
import type { CrossGableTPlacement } from '../types';

const MAIN: RoofUnit = {
  id: 'main',
  spanIn: 12, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 24, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: null,
};

const WING: RoofUnit = {
  ...MAIN,
  id: 'wing',
  spanIn: 8,
  houseLengthIn: 10,
};

const PLACEMENT: CrossGableTPlacement = { xAlongHostRidge: 12 };

describe('computeCrossGableT', () => {
  const result = computeCrossGableT(MAIN, WING, PLACEMENT, {
    stockThicknessIn: 0.125, kerfPerSideIn: 0.006, fitMode: 'press',
  });

  it('produces two valley lines (east and west)', () => {
    expect(result.derived.valleyLines.length).toBe(2);
  });

  it('wing ridge endpoint matches research 2.4 formula', () => {
    expect(result.derived.wingRidgeEndpoint[1]).toBeCloseTo(8, 5);
    expect(result.derived.wingRidgeEndpoint[0]).toBeCloseTo(12, 5);
    expect(result.derived.wingRidgeEndpoint[2]).toBeCloseTo(8 / 3, 4);
  });

  it('wing ridge length is L_wing + S_wing/2 for equal pitches', () => {
    expect(result.derived.wingRidgeLengthIn).toBeCloseTo(14, 5);
  });

  it('emits two trimmer extras (one per cheek wall x)', () => {
    expect(result.derived.trimmerExtraCount).toBe(2);
    expect(result.hostPiecesToAdd.length).toBeGreaterThanOrEqual(2);
  });

  it('replaces the guest near-end gable wall', () => {
    expect(result.guestPiecesToReplace).toContain('gable-end-near');
  });
});
