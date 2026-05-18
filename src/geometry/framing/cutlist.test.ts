import { describe, it, expect } from 'vitest';
import { buildFramingCutListPieces } from './cutlist';
import type { FramingParams } from './types';

const DEFAULTS: FramingParams = {
  mode: 'wall',
  lengthIn: 8.0,
  spanIn: 5.33,
  memberSpacingIn: 0.889,
  memberDepthIn: 0.25,
  nMembersOverride: 6,
  endCapHeightIn: 0.125,
  endCapBDoubled: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.125,
  stockThicknessIn: 0.125,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('buildFramingCutListPieces', () => {
  it('emits endCapA + endCapB + N members for default wall mode', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    expect(pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'A').length).toBe(1);
    expect(pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B').length).toBe(1);
    expect(pieces.filter((p) => p.placement?.kind === 'framing-member').length).toBe(6);
  });

  it('emits two endCapB segments when doubled', () => {
    const { pieces } = buildFramingCutListPieces({ ...DEFAULTS, endCapBDoubled: true }, 'main');
    expect(pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B').length).toBe(2);
  });

  it('end caps carry member-position engrave marks (2 ticks per member)', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const endCapA = pieces.find((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'A');
    expect(endCapA?.engravedFeatures?.length).toBe(12);
  });

  it('only layer 0 of a doubled end-cap B carries marks', () => {
    const { pieces } = buildFramingCutListPieces({ ...DEFAULTS, endCapBDoubled: true }, 'main');
    const tops = pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B');
    const layer0 = tops.find((p) => (p.placement as { layer: number }).layer === 0)!;
    const layer1 = tops.find((p) => (p.placement as { layer: number }).layer === 1)!;
    expect(layer0.engravedFeatures?.length).toBe(12);
    expect(layer1.engravedFeatures?.length).toBe(0);
  });

  it('member cut piece dimension is memberDepth x interEndCapSpan', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const member = pieces.find((p) => p.placement?.kind === 'framing-member')!;
    const poly = member.polygon as readonly (readonly [number, number])[];
    const xs = poly.map((v) => v[0]); const ys = poly.map((v) => v[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(0.25, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(5.33 - 0.125 - 0.125, 6);
  });

  it('end cap cut piece length = lengthIn + stockThickness', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const endCapA = pieces.find((p) => p.placement?.kind === 'framing-end-cap')!;
    const poly = endCapA.polygon as readonly (readonly [number, number])[];
    const xs = poly.map((v) => v[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(8.0 + 0.125, 6);
  });

  it('end cap cut piece height = memberDepth (on-edge plate)', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const endCapA = pieces.find((p) => p.placement?.kind === 'framing-end-cap')!;
    const poly = endCapA.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.25, 6);
  });

  it('emits blocks for half-mode blocking', () => {
    const { pieces } = buildFramingCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    expect(pieces.filter((p) => p.placement?.kind === 'framing-block').length).toBe(5);
  });

  it('block cut piece is bayWidth x memberDepth (tracks memberDepth, not blockingThickness)', () => {
    const params = { ...DEFAULTS, blocking: { mode: 'half' as const, positionFraction: 0.5 }, memberDepthIn: 0.4, blockingThicknessIn: 0.0625 };
    const { pieces } = buildFramingCutListPieces(params, 'main');
    const block = pieces.find((p) => p.placement?.kind === 'framing-block')!;
    const poly = block.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.4, 6);
  });

  it('splits end caps when length exceeds maxPieceLength', () => {
    const { pieces, warnings } = buildFramingCutListPieces(
      { ...DEFAULTS, lengthIn: 20, maxPieceLengthIn: 8 },
      'main',
    );
    const segs = pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'A');
    expect(segs.length).toBeGreaterThanOrEqual(3);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('floor mode produces the same piece counts as wall mode given equivalent params', () => {
    const wall = buildFramingCutListPieces(DEFAULTS, 'main').pieces;
    const floor = buildFramingCutListPieces({ ...DEFAULTS, mode: 'floor' }, 'main').pieces;
    expect(wall.length).toBe(floor.length);
  });
});
