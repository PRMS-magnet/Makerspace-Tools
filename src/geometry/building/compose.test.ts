import { describe, it, expect } from 'vitest';
import type { RoofParams } from '../roof/types';
import { roofCutlist } from '../roof';
import { buildingCutlist } from './compose';
import { simpleGablePreset } from './presets';

const DEFAULTS: RoofParams = {
  spanIn: 8.75, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 10.0, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: 2, sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
};

describe('buildingCutlist -- simple gable passthrough', () => {
  const legacy = roofCutlist(DEFAULTS);
  const out = buildingCutlist(simpleGablePreset(DEFAULTS));

  it('cut SVG equals roofCutlist output', () => {
    expect(out.cutSvg).toBe(legacy.cutSvg);
  });

  it('side diagram equals roofCutlist diagram', () => {
    expect(out.diagramSvg).toBe(legacy.diagramSvg);
  });

  it('derived per-unit matches legacy derived', () => {
    expect(out.derived.perUnit['main'].nRafters).toBe(legacy.derived.nRafters);
    expect(out.derived.perUnit['main'].geom.thetaDeg).toBeCloseTo(legacy.derived.geom.thetaDeg, 5);
  });

  it('warnings match', () => {
    expect(out.warnings).toEqual(legacy.warnings);
  });

  it('pieces3D length matches', () => {
    expect(out.pieces3D.length).toBe(legacy.pieces3D.length);
  });
});
