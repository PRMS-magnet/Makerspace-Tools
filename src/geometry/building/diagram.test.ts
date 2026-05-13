import { describe, it, expect } from 'vitest';
import { buildPlanDiagram } from './diagram';
import { simpleGablePreset, lPlanPreset, tPlanPreset } from './presets';

const PARAMS = {
  spanIn: 12, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5, houseLengthIn: 24,
  rafterSpacingIn: 0.875, topPlateHeightIn: 0.25, nPairsOverride: null,
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};

describe('buildPlanDiagram', () => {
  it('simple gable produces an SVG with eave and ridge', () => {
    const svg = buildPlanDiagram(simpleGablePreset(PARAMS));
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('data-kind="eave"');
    expect(svg).toContain('data-kind="ridge"');
    expect(svg).not.toContain('data-kind="valley"');
  });

  it('L-plan produces one valley', () => {
    const wing = { ...PARAMS, spanIn: 12, houseLengthIn: 12 };
    const svg = buildPlanDiagram(lPlanPreset(PARAMS, wing, 'NW'));
    const valleys = svg.match(/data-kind="valley"/g) ?? [];
    expect(valleys.length).toBe(1);
  });

  it('T-plan produces two valleys', () => {
    const wing = { ...PARAMS, spanIn: 8, houseLengthIn: 10 };
    const svg = buildPlanDiagram(tPlanPreset(PARAMS, wing, 12));
    const valleys = svg.match(/data-kind="valley"/g) ?? [];
    expect(valleys.length).toBe(2);
  });
});
