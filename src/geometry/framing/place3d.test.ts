import { describe, it, expect } from 'vitest';
import { computeFramingPieces3D } from './place3d';
import type { FramingParams } from './types';

const DEFAULTS: FramingParams = {
  mode: 'wall',
  lengthIn: 8.0, spanIn: 5.33, memberSpacingIn: 0.889, memberDepthIn: 0.25,
  nMembersOverride: 6, endCapHeightIn: 0.125, endCapBDoubled: false,
  blocking: { mode: 'none' }, blockingThicknessIn: 0.125, stockThicknessIn: 0.125,
  engraveStyle: 'brackets',
  sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
};

describe('computeFramingPieces3D (wall mode)', () => {
  it('returns N members + 2 end caps for default config', () => {
    const pieces = computeFramingPieces3D(DEFAULTS, 'main');
    expect(pieces.length).toBe(6 + 2);
  });

  it('endCap A is at z=0, endCap B at z=spanIn-endCapHeight', () => {
    const pieces = computeFramingPieces3D(DEFAULTS, 'main');
    const a = pieces.find((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'A');
    const b = pieces.find((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B');
    expect(a?.origin[2]).toBeCloseTo(0, 6);
    expect(b?.origin[2]).toBeCloseTo(5.33 - 0.125, 6);
  });

  it('first member x = position - stockThickness/2', () => {
    const pieces = computeFramingPieces3D(DEFAULTS, 'main');
    const members = pieces.filter((p) => p.placement?.kind === 'framing-member');
    members.sort((a, b) => a.origin[0] - b.origin[0]);
    expect(members[0].origin[0]).toBeCloseTo(0 - 0.125 / 2, 6);
  });

  it('members extrude by interEndCapSpan', () => {
    const pieces = computeFramingPieces3D(DEFAULTS, 'main');
    const member = pieces.find((p) => p.placement?.kind === 'framing-member')!;
    expect(member.extrudeDepthIn).toBeCloseTo(5.33 - 0.125 - 0.125, 6);
  });
});

describe('computeFramingPieces3D (floor mode)', () => {
  it('endCap B sits at y=spanIn-endCapHeight', () => {
    const pieces = computeFramingPieces3D({ ...DEFAULTS, mode: 'floor' }, 'main');
    const b = pieces.find((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B');
    expect(b?.origin[1]).toBeCloseTo(5.33 - 0.125, 6);
  });

  it('members extrude vertically by memberDepth', () => {
    const pieces = computeFramingPieces3D({ ...DEFAULTS, mode: 'floor' }, 'main');
    const member = pieces.find((p) => p.placement?.kind === 'framing-member')!;
    expect(member.extrudeDepthIn).toBeCloseTo(0.25, 6);
  });

  it('floor joist polygon spans interEndCapSpanIn in the Y dimension (not memberDepth)', () => {
    const pieces = computeFramingPieces3D({ ...DEFAULTS, mode: 'floor' }, 'main');
    const member = pieces.find((p) => p.placement?.kind === 'framing-member')!;
    const poly = member.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    const yExtent = Math.max(...ys) - Math.min(...ys);
    expect(yExtent).toBeCloseTo(5.33 - 0.125 - 0.125, 6);
  });

  it('floor rim polygon Y dimension is stockThickness (rim is on-edge)', () => {
    const pieces = computeFramingPieces3D({ ...DEFAULTS, mode: 'floor' }, 'main');
    const rim = pieces.find((p) => p.placement?.kind === 'framing-end-cap')!;
    const poly = rim.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    const yExtent = Math.max(...ys) - Math.min(...ys);
    expect(yExtent).toBeCloseTo(0.125, 6);
  });

  it('floor block polygon Y is stockThickness, extrudes vertically by memberDepth', () => {
    const pieces = computeFramingPieces3D(
      { ...DEFAULTS, mode: 'floor', blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    const block = pieces.find((p) => p.placement?.kind === 'framing-block')!;
    const poly = block.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.125, 6);
    expect(block.extrudeDepthIn).toBeCloseTo(0.25, 6);
  });
});

describe('block sizing tracks memberDepth (was blockingThickness)', () => {
  it('wall block extrudes by stockThickness, not blockingThickness', () => {
    const pieces = computeFramingPieces3D(
      { ...DEFAULTS, blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    const block = pieces.find((p) => p.placement?.kind === 'framing-block')!;
    expect(block.extrudeDepthIn).toBeCloseTo(0.125, 6);
  });

  it('wall block polygon Y matches memberDepth (so cut + 3D top-down agree)', () => {
    const pieces = computeFramingPieces3D(
      { ...DEFAULTS, blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    const block = pieces.find((p) => p.placement?.kind === 'framing-block')!;
    const poly = block.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.25, 6);
  });
});
