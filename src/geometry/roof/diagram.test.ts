import { describe, it, expect } from 'vitest';
import type { RoofParams } from './types';
import { computeRoofGeometry } from './compute';
import { buildDiagramSvg } from './diagram';
import { LIGHT_TOKENS, DARK_TOKENS } from '../../lib/diagram-tokens';

const DEFAULTS: RoofParams = {
  spanIn: 8.75, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 10.0, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: 2, sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
};

describe('buildDiagramSvg', () => {
  const g = computeRoofGeometry(DEFAULTS);
  const svg = buildDiagramSvg(DEFAULTS, g);

  it('starts with the SVG XML preamble', () => {
    expect(svg).toMatch(/^<\?xml/);
  });

  it('declares a viewBox', () => {
    expect(svg).toContain('viewBox=');
  });

  it('contains at least four closed path polygons (rafters, joist, collar tie)', () => {
    const pathMatches = svg.match(/<path d="M [^"]+Z"/g) ?? [];
    expect(pathMatches.length).toBeGreaterThanOrEqual(4);
  });

  it('contains an arc for the pitch angle', () => {
    expect(svg).toContain('A ');
  });

  it('shows the pitch angle in degrees in a text label', () => {
    expect(svg).toMatch(/33\.\d+/);
  });

  it('shows the span dimension', () => {
    expect(svg).toContain('8.75');
  });
});

describe('buildDiagramSvg theming', () => {
  const g = computeRoofGeometry(DEFAULTS);

  it('defaults to LIGHT_TOKENS hex values', () => {
    const svg = buildDiagramSvg(DEFAULTS, g);
    expect(svg).toContain(LIGHT_TOKENS.strokeWood);
    expect(svg).toContain(LIGHT_TOKENS.fillStruct);
    expect(svg).toContain(LIGHT_TOKENS.text);
    expect(svg).not.toContain(DARK_TOKENS.strokeWood);
  });

  it('emits DARK_TOKENS hex values when given DARK_TOKENS', () => {
    const svg = buildDiagramSvg(DEFAULTS, g, undefined, undefined, undefined, undefined, DARK_TOKENS);
    expect(svg).toContain(DARK_TOKENS.strokeWood);
    expect(svg).toContain(DARK_TOKENS.text);
    expect(svg).not.toContain(LIGHT_TOKENS.strokeWood);
  });

  it("emits CSS var references in 'css-vars' mode", () => {
    const svg = buildDiagramSvg(DEFAULTS, g, undefined, undefined, undefined, undefined, 'css-vars');
    expect(svg).toContain('var(--mt-diag-stroke-wood)');
    expect(svg).toContain('var(--mt-diag-fill-struct)');
    expect(svg).toContain('var(--mt-diag-text)');
    expect(svg).not.toContain(LIGHT_TOKENS.strokeWood);
  });
});
