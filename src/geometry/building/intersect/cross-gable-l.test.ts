import { describe, it, expect } from 'vitest';
import { computeCrossGableL } from './cross-gable-l';
import type { RoofUnit } from '../../roof/types';
import type { CrossGableLPlacement } from '../types';

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
  spanIn: 12, houseLengthIn: 12,
};

const NW: CrossGableLPlacement = { hostCorner: 'NW' };

describe('computeCrossGableL canonical equal-pitch equal-span', () => {
  const result = computeCrossGableL(MAIN, WING, NW, {
    stockThicknessIn: 0.125, kerfPerSideIn: 0.006, fitMode: 'press',
  });

  it('produces exactly one valley', () => {
    expect(result.derived.valleyLines.length).toBe(1);
  });

  it('wing ridge endpoint is at the SW corner of the main ridge', () => {
    expect(result.derived.wingRidgeEndpoint[0]).toBeCloseTo(6, 5);
    expect(result.derived.wingRidgeEndpoint[1]).toBeCloseTo(6, 5);
    expect(result.derived.wingRidgeEndpoint[2]).toBeCloseTo((8 / 12) * 6, 4);
  });

  it('wing ridge length L_wing + W_wing/2', () => {
    expect(result.derived.wingRidgeLengthIn).toBeCloseTo(18, 5);
  });

  it('emits one trimmer extra', () => {
    expect(result.derived.trimmerExtraCount).toBe(1);
  });
});

describe('computeCrossGableL mirror corners', () => {
  for (const corner of ['NW', 'NE', 'SW', 'SE'] as const) {
    it(`${corner} produces one valley`, () => {
      const r = computeCrossGableL(MAIN, WING, { hostCorner: corner }, {
        stockThicknessIn: 0.125, kerfPerSideIn: 0.006, fitMode: 'press',
      });
      expect(r.derived.valleyLines.length).toBe(1);
    });
  }
});
