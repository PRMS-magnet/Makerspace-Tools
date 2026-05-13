import { describe, it, expect } from 'vitest';
import type { RoofParams } from '../roof/types';
import { roofCutlist } from '../roof';
import { buildingCutlist } from './compose';
import { simpleGablePreset, lPlanPreset, tPlanPreset } from './presets';
import baselinePieces3D from './__snapshots__/simple-gable-pieces3d.json';

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

const MAIN_PARAMS = {
  spanIn: 12, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5, houseLengthIn: 24,
  rafterSpacingIn: 0.875, topPlateHeightIn: 0.25, nPairsOverride: null,
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};

describe('buildingCutlist with cross-gable-T', () => {
  const wing = { ...MAIN_PARAMS, spanIn: 8, houseLengthIn: 10 };
  const b = tPlanPreset(MAIN_PARAMS, wing, 12);
  const out = buildingCutlist(b);

  it('emits a non-empty cut SVG', () => {
    expect(out.cutSvg.length).toBeGreaterThan(100);
  });

  it('derived has per-intersection data with two valleys', () => {
    const i = Object.values(out.derived.perIntersection)[0];
    expect(i.valleyLines.length).toBe(2);
    expect(i.trimmerExtraCount).toBe(2);
  });

  it('produces more pieces than simple gable baseline', () => {
    const baseline = buildingCutlist(simpleGablePreset(MAIN_PARAMS));
    expect(out.pieces3D.length).toBeGreaterThanOrEqual(baseline.pieces3D.length);
  });
});

describe('buildingCutlist with cross-gable-L', () => {
  const wing = { ...MAIN_PARAMS, spanIn: 12, houseLengthIn: 12 };
  const b = lPlanPreset(MAIN_PARAMS, wing, 'NW');
  const out = buildingCutlist(b);

  it('emits a non-empty cut SVG', () => {
    expect(out.cutSvg.length).toBeGreaterThan(100);
  });

  it('derived has exactly one valley', () => {
    const i = Object.values(out.derived.perIntersection)[0];
    expect(i.valleyLines.length).toBe(1);
  });
});

describe('Bit-identical pieces3D baseline (refactor regression gate)', () => {
  it('roofCutlist with DEFAULTS produces pieces3D matching the frozen baseline', () => {
    const out = roofCutlist(DEFAULTS);
    expect(out.pieces3D.length).toBe(baselinePieces3D.length);
    for (let i = 0; i < out.pieces3D.length; i++) {
      const got = out.pieces3D[i];
      const want = baselinePieces3D[i];
      expect(got.label).toBe(want.label);
      expect(got.origin).toEqual(want.origin);
      expect(got.uAxis).toEqual(want.uAxis);
      expect(got.vAxis).toEqual(want.vAxis);
      expect(got.extrudeDepthIn).toBeCloseTo(want.extrudeDepthIn, 9);
    }
  });
});
