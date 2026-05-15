import { describe, it, expect } from 'vitest';
import { buildFloorDiagramSvg } from './diagram';
import type { FloorParams } from './types';

const DEFAULTS: FloorParams = {
  widthIn: 8.0,
  depthIn: 6.67,
  joistSpacingIn: 0.889,
  joistThicknessIn: 0.083,
  joistDepthIn: 0.514,
  nJoistsOverride: 6,
  rimThicknessIn: 0.125,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.083,
  stockThicknessIn: 0.125,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('buildFloorDiagramSvg', () => {
  it('produces a valid SVG document', () => {
    const svg = buildFloorDiagramSvg(DEFAULTS);
    expect(svg).toMatch(/^<\?xml/);
    expect(svg).toMatch(/<\/svg>\s*$/);
  });

  it('renders nJoists + 2 rims as rect elements (no blocks)', () => {
    const svg = buildFloorDiagramSvg(DEFAULTS);
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    expect(rectCount).toBe(6 + 2);
  });

  it('includes blocks when blocking mode is half', () => {
    const svg = buildFloorDiagramSvg({
      ...DEFAULTS,
      blocking: { mode: 'half', positionFraction: 0.5 },
    });
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    expect(rectCount).toBe(6 + 2 + 5);
  });
});
