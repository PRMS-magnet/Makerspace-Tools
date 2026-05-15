import { describe, it, expect } from 'vitest';
import { buildWallDiagramSvg } from './diagram';
import type { WallParams } from './types';

const DEFAULTS: WallParams = {
  widthIn: 8.0,
  heightIn: 5.33,
  studSpacingIn: 0.889,
  studWidthIn: 0.083,
  studDepthIn: 0.194,
  nStudsOverride: 6,
  topPlateHeightIn: 0.125,
  bottomPlateHeightIn: 0.125,
  doubleTopPlate: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.083,
  stockThicknessIn: 0.125,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('buildWallDiagramSvg', () => {
  it('produces a valid SVG document', () => {
    const svg = buildWallDiagramSvg(DEFAULTS);
    expect(svg).toMatch(/^<\?xml/);
    expect(svg).toMatch(/<\/svg>\s*$/);
  });

  it('renders nStuds + 2 plates as rect elements (no blocks)', () => {
    const svg = buildWallDiagramSvg(DEFAULTS);
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    expect(rectCount).toBe(6 + 2);
  });

  it('includes blocks when blocking mode is half', () => {
    const svg = buildWallDiagramSvg({
      ...DEFAULTS,
      blocking: { mode: 'half', heightFraction: 0.5 },
    });
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    expect(rectCount).toBe(6 + 2 + 5);
  });
});
