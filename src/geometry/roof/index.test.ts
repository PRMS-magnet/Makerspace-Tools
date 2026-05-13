import { describe, it, expect } from 'vitest';
import type { RoofParams } from './types';
import { roofCutlist } from './index';

const DEFAULTS: RoofParams = {
  spanIn: 8.75, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 10.0, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: 2, sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
};

describe('roofCutlist — integration', () => {
  const out = roofCutlist(DEFAULTS);

  it('returns both SVGs as non-empty strings', () => {
    expect(out.cutSvg.length).toBeGreaterThan(100);
    expect(out.diagramSvg.length).toBeGreaterThan(100);
  });

  it('cut SVG declares inch units', () => {
    expect(out.cutSvg).toContain('in"');
  });

  it('derived values match Python reference for default params', () => {
    expect(out.derived.geom.thetaDeg).toBeCloseTo(33.69, 1);
    expect(out.derived.geom.rafterSlopeLength).toBeCloseTo(5.483, 2);
    expect(out.derived.geom.plumbCutLength).toBeCloseTo(0.601, 2);
    expect(out.derived.nRafters).toBe(4);
    expect(out.derived.nPairs).toBe(2);
    expect(out.derived.nRidgePieces).toBe(1);
  });

  it('warnings is an array', () => {
    expect(Array.isArray(out.warnings)).toBe(true);
  });

  it('idempotent — same input produces same output', () => {
    const a = roofCutlist(DEFAULTS);
    const b = roofCutlist(DEFAULTS);
    expect(a.cutSvg).toBe(b.cutSvg);
    expect(a.diagramSvg).toBe(b.diagramSvg);
  });
});
