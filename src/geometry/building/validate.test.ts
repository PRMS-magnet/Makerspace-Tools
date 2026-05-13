import { describe, it, expect } from 'vitest';
import type { Building } from './types';
import { validateBuilding } from './validate';

const MAIN_UNIT = {
  id: 'main',
  spanIn: 12, pitchRise: 8, pitchRun: 12,
  rafterDepthIn: 0.5, wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 24, rafterSpacingIn: 0.875,
  topPlateHeightIn: 0.25, nPairsOverride: null,
};

const SHEET = {
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};

function dormerGable(id: string, xAlongHostRidge: number, widthIn: number, yFromHostRidge = 2): import('./types').Intersection {
  return {
    id, hostId: 'main', guestId: 'unused', kind: 'dormer-gable',
    placement: {
      hostId: 'main', xAlongHostRidge, yFromHostRidge, widthIn,
      ridgeHeightIn: 2, pitchRise: 8, pitchRun: 12, side: 'north',
    },
  };
}

describe('validateBuilding -- dormer placement rules', () => {
  it('warns when a dormer is too close to the main ridge', () => {
    const b: Building = {
      units: [MAIN_UNIT],
      intersections: [dormerGable('d1', 10, 4, 0.3)],
      ...SHEET,
    };
    const warnings = validateBuilding(b);
    expect(warnings.some((w) => /too close to.*ridge/i.test(w.message))).toBe(true);
  });

  it('warns when a dormer is wider than 1/3 of the host length', () => {
    const b: Building = {
      units: [MAIN_UNIT],
      intersections: [dormerGable('d1', 10, 12)],
      ...SHEET,
    };
    const warnings = validateBuilding(b);
    expect(warnings.some((w) => /wider than one-third/i.test(w.message))).toBe(true);
  });

  it('warns when two dormers overlap or violate min spacing', () => {
    const b: Building = {
      units: [MAIN_UNIT],
      intersections: [
        dormerGable('d1', 5, 3),
        dormerGable('d2', 7, 3),
      ],
      ...SHEET,
    };
    const warnings = validateBuilding(b);
    expect(warnings.some((w) => /too close.*dormer/i.test(w.message))).toBe(true);
  });

  it('warns when per-slope cap is exceeded (max 3 gable dormers)', () => {
    const b: Building = {
      units: [MAIN_UNIT],
      intersections: [
        dormerGable('d1', 4, 2),
        dormerGable('d2', 8, 2),
        dormerGable('d3', 12, 2),
        dormerGable('d4', 16, 2),
      ],
      ...SHEET,
    };
    const warnings = validateBuilding(b);
    expect(warnings.some((w) => /maximum 3 gable/i.test(w.message))).toBe(true);
  });

  it('warns when a window is too wide', () => {
    const b: Building = {
      units: [MAIN_UNIT],
      intersections: [{
        id: 'd1', hostId: 'main', guestId: 'unused', kind: 'dormer-gable',
        placement: {
          hostId: 'main', xAlongHostRidge: 10, yFromHostRidge: 2,
          widthIn: 3, ridgeHeightIn: 2, pitchRise: 8, pitchRun: 12, side: 'north',
          window: { widthIn: 2.5, heightIn: 1.0, sillIn: 0.6 },
        },
      }],
      ...SHEET,
    };
    const warnings = validateBuilding(b);
    expect(warnings.some((w) => /window.*too wide/i.test(w.message))).toBe(true);
  });

  it('returns no warnings for a valid Building', () => {
    const b: Building = {
      units: [MAIN_UNIT],
      intersections: [dormerGable('d1', 8, 3)],
      ...SHEET,
    };
    const warnings = validateBuilding(b);
    expect(warnings).toEqual([]);
  });
});
