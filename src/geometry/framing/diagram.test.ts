import { describe, it, expect } from 'vitest';
import { buildFramingDiagramSvg } from './diagram';
import type { FramingParams } from './types';

const BASE: FramingParams = {
  mode: 'wall', lengthIn: 8.0, spanIn: 5.33, memberSpacingIn: 0.889,
  memberDepthIn: 0.25, nMembersOverride: 6, endCapHeightIn: 0.125,
  endCapBDoubled: false, blocking: { mode: 'none' }, blockingThicknessIn: 0.125,
  stockThicknessIn: 0.125, engraveStyle: 'brackets',
  spares: { members: 0, endCaps: 0, blocks: 0, spliceGussets: 0 },
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};

describe('buildFramingDiagramSvg', () => {
  it('returns an SVG string', () => {
    expect(buildFramingDiagramSvg(BASE).startsWith('<?xml')).toBe(true);
  });

  it('wall mode includes nMembers + 2 end-cap rects', () => {
    const svg = buildFramingDiagramSvg(BASE);
    expect((svg.match(/<rect /g) || []).length).toBe(6 + 2);
  });

  it('floor mode emits the same shape', () => {
    const svg = buildFramingDiagramSvg({ ...BASE, mode: 'floor' });
    expect((svg.match(/<rect /g) || []).length).toBe(6 + 2);
  });

  it('doubled endCapB adds an extra rect', () => {
    const svg = buildFramingDiagramSvg({ ...BASE, endCapBDoubled: true });
    expect((svg.match(/<rect /g) || []).length).toBe(6 + 3);
  });
});
