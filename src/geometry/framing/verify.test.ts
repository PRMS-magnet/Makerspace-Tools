import { describe, it, expect } from 'vitest';
import { verifyFraming } from './verify';
import { buildFramingCutListPieces } from './cutlist';
import { computeFramingPieces3D } from './place3d';
import type { FramingParams } from './types';
import type { Piece, Piece3D } from '../core/types';

const BASE: FramingParams = {
  mode: 'wall',
  lengthIn: 8,
  spanIn: 5.33,
  memberSpacingIn: 0.889,
  memberDepthIn: 0.5,
  nMembersOverride: 6,
  endCapHeightIn: 0.125,
  endCapBDoubled: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.125,
  stockThicknessIn: 0.125,
  engraveStyle: 'brackets',
  sheetWidthIn: 12,
  maxPieceLengthIn: 12,
  marginIn: 0.12,
  pieceSpacingIn: 0.06,
};

function build(p: FramingParams) {
  const cut = buildFramingCutListPieces(p, 'main').pieces;
  const three = computeFramingPieces3D(p, 'main');
  return { cut, three };
}

describe('verifyFraming - sanity layer', () => {
  it('passes for a default wall with no blocking', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.ok).toBe(true);
    expect(r.errors.filter((e) => e.layer === 'sanity')).toEqual([]);
  });

  it('detects a count mismatch between cut and 3D for any piece kind', () => {
    const { cut, three } = build(BASE);
    const truncatedThree = three.filter((p) => p.placement?.kind !== 'framing-member' || (p.placement as { indexAlongLength: number }).indexAlongLength !== 0) as Piece3D[];
    const r = verifyFraming(BASE, cut, truncatedThree);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.layer === 'sanity' && e.message.includes('framing-member'))).toBe(true);
  });

  it('detects a dimension mismatch between paired cut and 3D pieces', () => {
    const { cut, three } = build(BASE);
    const tampered: Piece3D[] = three.map((p) => {
      if (p.placement?.kind !== 'framing-end-cap') return p;
      return { ...p, polygon: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]] };
    });
    const r = verifyFraming(BASE, cut, tampered);
    expect(r.errors.some((e) => e.layer === 'sanity' && e.message.includes('does not match'))).toBe(true);
  });

  it('passes when blocks have matching dims (cuts at memberDepth like 3D)', () => {
    const params = { ...BASE, blocking: { mode: 'half' as const, positionFraction: 0.5 } };
    const { cut, three } = build(params);
    const r = verifyFraming(params, cut, three);
    expect(r.errors.filter((e) => e.layer === 'sanity')).toEqual([]);
  });
});

describe('verifyFraming - geometric layer', () => {
  it('passes for a default wall (no overlaps)', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.errors.filter((e) => e.layer === 'geometric')).toEqual([]);
  });

  it('detects an overlap when two pieces are placed at the same position', () => {
    const { cut, three } = build(BASE);
    // Duplicate one stud at exactly the same origin -> overlap with itself
    const studIdx = three.findIndex((p) => p.placement?.kind === 'framing-member');
    if (studIdx < 0) throw new Error('no member');
    const duplicated = [...three, { ...three[studIdx] }];
    const r = verifyFraming(BASE, cut, duplicated);
    expect(r.errors.some((e) => e.layer === 'geometric' && e.message.includes('overlap'))).toBe(true);
  });
});

describe('verifyFraming - fabrication layer', () => {
  it('passes for the default wall (all pieces above min feature size)', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.errors.filter((e) => e.layer === 'fabrication')).toEqual([]);
  });

  it('warns when a piece is smaller than 3x kerf width', () => {
    const params = { ...BASE, memberDepthIn: 0.03 };
    const { cut, three } = build(params);
    const r = verifyFraming(params, cut, three);
    expect(r.errors.some((e) => e.layer === 'fabrication' && e.severity === 'warning' && e.message.includes('min'))).toBe(true);
  });

  it('errors when a piece can never fit the sheet', () => {
    const params = { ...BASE, lengthIn: 50, sheetWidthIn: 4, maxPieceLengthIn: 4 };
    const { cut, three } = build(params);
    const r = verifyFraming(params, cut, three);
    expect(r.errors.some((e) => e.layer === 'fabrication' && e.severity === 'error' && e.message.includes('cannot fit'))).toBe(true);
  });
});

describe('verifyFraming - overall', () => {
  it('ok=true when there are no errors (warnings allowed)', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.ok).toBe(true);
  });

  it('ok=false when any error is present', () => {
    const cut: Piece[] = [];
    const { three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.ok).toBe(false);
  });
});
